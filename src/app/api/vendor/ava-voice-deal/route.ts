import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/vendor/ava-voice-deal — Parse voice transcript into structured deal fields
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, identifier: 'ava-voice-deal' });
  if (limited) return limited;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const serviceClient = await createServiceRoleClient();

  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';
  if (profile?.role !== 'vendor' && !isAdmin) {
    return NextResponse.json({ error: 'Only vendors can use voice deal creation' }, { status: 403 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { transcript, vendor_id: bodyVendorId } = body;
  const vendorId = (isAdmin && bodyVendorId) ? bodyVendorId : user.id;

  if (!transcript || typeof transcript !== 'string' || transcript.trim().length < 5) {
    return NextResponse.json({ error: 'Voice transcript is too short. Please describe your deal.' }, { status: 400 });
  }

  // Get vendor info for context
  const { data: vendor } = await serviceClient
    .from('vendors')
    .select('business_name, category, description, city, state')
    .eq('id', vendorId)
    .single();

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `You are Ava, the AI deal creation assistant for SpontiCoupon — a local deals platform.

A vendor just described a deal using their voice. Parse their speech into structured deal fields.

Vendor info:
- Business: ${vendor?.business_name || 'Unknown'}
- Category: ${vendor?.category || 'General'}
- Description: ${vendor?.description || 'N/A'}
- Location: ${vendor?.city || ''} ${vendor?.state || ''}

Voice transcript:
"${transcript}"

Extract the following fields from the transcript. If a field is not mentioned, use reasonable defaults based on the business type and deal description. Be smart about interpreting casual speech.

Rules:
- Title should be catchy and marketing-friendly (max 80 chars)
- Description should be 1-3 sentences, professional but engaging
- If they mention a percentage off, calculate the deal_price from original_price
- If they say "half off" or "50% off $60", calculate accordingly
- deal_type: use "sponti_coupon" if they mention flash deal, limited time, today only, quick, rush, etc. Otherwise use "regular" for steady/ongoing deals
- duration_hours: for sponti deals, default 8 if not specified
- duration_days: for regular deals, default 7 if not specified
- deposit_amount: suggest 0 unless they mention a deposit or reservation fee
- max_claims: suggest 50 for sponti deals, 100 for regular deals, unless specified
- highlights: 2-4 short bullet points about what makes this deal great
- fine_print: standard restrictions like "One per customer. Cannot be combined with other offers."
- terms_and_conditions: brief terms if mentioned, otherwise leave empty
- search_tags: 10-15 keywords customers might search for

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "title": "string",
  "description": "string",
  "deal_type": "regular" | "sponti_coupon",
  "original_price": number,
  "deal_price": number,
  "deposit_amount": number,
  "max_claims": number,
  "duration_hours": number,
  "duration_days": number,
  "highlights": ["string"],
  "fine_print": "string",
  "terms_and_conditions": "string",
  "search_tags": ["string"],
  "image_prompt": "string (a prompt to generate a deal image — describe the product/service visually)"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '{}';
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    const result = {
      title: String(parsed.title || '').slice(0, 80),
      description: String(parsed.description || ''),
      deal_type: parsed.deal_type === 'sponti_coupon' ? 'sponti_coupon' : 'regular',
      original_price: Math.max(0, Number(parsed.original_price) || 0),
      deal_price: Math.max(0, Number(parsed.deal_price) || 0),
      deposit_amount: Math.max(0, Number(parsed.deposit_amount) || 0),
      max_claims: Math.max(1, Math.round(Number(parsed.max_claims) || 50)),
      duration_hours: Math.max(1, Math.min(24, Math.round(Number(parsed.duration_hours) || 8))),
      duration_days: Math.max(1, Math.min(90, Math.round(Number(parsed.duration_days) || 7))),
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.map((h: unknown) => String(h)).filter((h: string) => h.length > 0).slice(0, 6)
        : [],
      fine_print: String(parsed.fine_print || ''),
      terms_and_conditions: String(parsed.terms_and_conditions || ''),
      search_tags: Array.isArray(parsed.search_tags)
        ? parsed.search_tags.map((t: unknown) => String(t).toLowerCase().trim()).filter((t: string) => t.length > 0).slice(0, 30)
        : [],
      image_prompt: String(parsed.image_prompt || ''),
    };

    // Ensure deal_price <= original_price
    if (result.deal_price > result.original_price && result.original_price > 0) {
      result.deal_price = result.original_price;
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('Voice deal parsing error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to parse voice input: ${errorMessage}` },
      { status: 500 }
    );
  }
}
