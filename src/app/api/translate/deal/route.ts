import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

// POST /api/translate/deal — translate deal content to a target locale
// Accepts: { dealId: string, locale: string }
// Returns cached translation or generates one via Gemini
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { dealId, locale } = body;

  if (!dealId || !locale || locale === 'en') {
    return NextResponse.json({ error: 'dealId and non-English locale required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // 1. Check cache
  const { data: cached } = await supabase
    .from('deal_translations')
    .select('title, description, how_it_works, fine_print, terms_and_conditions, highlights, amenities')
    .eq('deal_id', dealId)
    .eq('locale', locale)
    .single();

  if (cached) {
    return NextResponse.json({ translation: cached, source: 'cache' });
  }

  // 2. Fetch original deal content
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('title, description, how_it_works, fine_print, terms_and_conditions, highlights, amenities')
    .eq('id', dealId)
    .single();

  if (dealError || !deal) {
    return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
  }

  // 3. Build fields to translate (skip nulls/empties)
  const fieldsToTranslate: Record<string, string | string[]> = {};
  if (deal.title) fieldsToTranslate.title = deal.title;
  if (deal.description) fieldsToTranslate.description = deal.description;
  if (deal.how_it_works) fieldsToTranslate.how_it_works = deal.how_it_works;
  if (deal.fine_print) fieldsToTranslate.fine_print = deal.fine_print;
  if (deal.terms_and_conditions) fieldsToTranslate.terms_and_conditions = deal.terms_and_conditions;
  if (deal.highlights?.length) fieldsToTranslate.highlights = deal.highlights;
  if (deal.amenities?.length) fieldsToTranslate.amenities = deal.amenities;

  if (Object.keys(fieldsToTranslate).length === 0) {
    return NextResponse.json({ translation: null, source: 'empty' });
  }

  // 4. Translate via Gemini
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }

  const localeNames: Record<string, string> = { es: 'Spanish' };
  const targetLang = localeNames[locale] || locale;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `You are a professional translator. Translate the following deal/coupon content from English to ${targetLang}.

Rules:
- Keep brand names, business names, and proper nouns unchanged
- Keep monetary values and numbers unchanged (e.g. "$25.00" stays "$25.00")
- Maintain the same tone — promotional, friendly, concise
- For arrays (highlights, amenities), return the same number of items in the same order
- Return ONLY a valid JSON object with the same keys, translated values

Content to translate:
${JSON.stringify(fieldsToTranslate, null, 2)}

Return ONLY the JSON object, no markdown, no explanation.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI translation' }, { status: 500 });
    }

    const translated = JSON.parse(jsonMatch[0]);

    // 5. Store in cache
    const translationRow: Record<string, unknown> = {
      deal_id: dealId,
      locale,
    };
    if (translated.title) translationRow.title = translated.title;
    if (translated.description) translationRow.description = translated.description;
    if (translated.how_it_works) translationRow.how_it_works = translated.how_it_works;
    if (translated.fine_print) translationRow.fine_print = translated.fine_print;
    if (translated.terms_and_conditions) translationRow.terms_and_conditions = translated.terms_and_conditions;
    if (translated.highlights) translationRow.highlights = translated.highlights;
    if (translated.amenities) translationRow.amenities = translated.amenities;

    await supabase.from('deal_translations').upsert(translationRow, { onConflict: 'deal_id,locale' });

    return NextResponse.json({ translation: translated, source: 'ai' });
  } catch (err) {
    console.error('Deal translation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Translation failed: ${errorMessage}` }, { status: 500 });
  }
}

// POST /api/translate/deal — also support batch translation
// To batch: POST with { dealIds: string[], locale: string }
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { dealIds, locale } = body;

  if (!dealIds?.length || !locale || locale === 'en') {
    return NextResponse.json({ error: 'dealIds array and non-English locale required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Fetch all cached translations at once
  const { data: cached } = await supabase
    .from('deal_translations')
    .select('deal_id, title, description, how_it_works, fine_print, terms_and_conditions, highlights, amenities')
    .in('deal_id', dealIds)
    .eq('locale', locale);

  const cachedMap: Record<string, unknown> = {};
  const uncachedIds: string[] = [];

  for (const id of dealIds) {
    const found = cached?.find(c => c.deal_id === id);
    if (found) {
      const { deal_id, ...fields } = found;
      cachedMap[id] = fields;
    } else {
      uncachedIds.push(id);
    }
  }

  // For uncached deals, translate them one by one (fire in parallel)
  if (uncachedIds.length > 0) {
    const baseUrl = request.nextUrl.origin;
    const results = await Promise.allSettled(
      uncachedIds.map(async (id) => {
        const res = await fetch(`${baseUrl}/api/translate/deal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dealId: id, locale }),
        });
        const data = await res.json();
        return { id, translation: data.translation };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.translation) {
        cachedMap[result.value.id] = result.value.translation;
      }
    }
  }

  return NextResponse.json({ translations: cachedMap });
}
