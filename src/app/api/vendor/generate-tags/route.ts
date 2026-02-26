import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';

// POST /api/vendor/generate-tags — AI-generate search tags for a deal
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify vendor role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can generate tags' }, { status: 403 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { title, description, deal_type, original_price, deal_price } = body;

  // Get vendor info for context
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, description, city, state')
    .eq('id', user.id)
    .single();

  if (!title) {
    return NextResponse.json({ error: 'Deal title is required to generate tags' }, { status: 400 });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const discount = original_price && deal_price
      ? Math.round(((original_price - deal_price) / original_price) * 100)
      : null;

    const prompt = `You are a search keyword expert for a local deals platform (like Groupon). Generate search tags/keywords for this deal so customers can find it easily.

Deal info:
- Title: ${title}
- Description: ${description || 'N/A'}
- Type: ${deal_type === 'sponti_coupon' ? 'Sponti deal (time-limited)' : 'Steady deal'}
- Business: ${vendor?.business_name || 'N/A'}
- Category: ${vendor?.category || 'N/A'}
- Business description: ${vendor?.description || 'N/A'}
- Location: ${vendor?.city || ''} ${vendor?.state || ''}
${discount ? `- Discount: ${discount}% off` : ''}

Generate 15-25 search keywords/tags that customers might type when looking for this kind of deal. Include:
1. Direct terms (what the deal IS)
2. Related activities (what someone might search for that leads to this)
3. Occasion/context words (date night, family, birthday, weekend, etc.)
4. Synonyms and alternative phrasings
5. Food/cuisine type terms if applicable
6. Experience-type words (fun, relaxing, adventure, etc.)

Return ONLY a JSON array of lowercase strings, nothing else. Example: ["sushi","japanese food","dinner","date night","seafood"]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '[]';
    // Extract JSON array from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const tags: string[] = JSON.parse(jsonMatch[0]);
    // Clean and deduplicate
    const cleanTags = Array.from(new Set(
      tags
        .map(t => t.toLowerCase().trim())
        .filter(t => t.length > 0 && t.length <= 50)
    )).slice(0, 30);

    return NextResponse.json({ tags: cleanTags });
  } catch (err) {
    console.error('Tag generation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate tags: ${errorMessage}` },
      { status: 500 }
    );
  }
}
