import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/admin/marketing/create
 * Creates a marketing post from specific admin instructions.
 * AI generates Facebook & Instagram captions based on what the admin wants to say.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { instructions, content_type, image_url } = await request.json();

  if (!instructions?.trim()) {
    return NextResponse.json({ error: 'Instructions are required' }, { status: 400 });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a senior social media marketing expert for SpontiCoupon.

ABOUT SPONTICOUPON:
- Deal marketplace connecting local businesses with customers
- Vendors (local businesses) pay $49-$499/month subscription to list deals
- Customers browse and claim deals for free, redeem via QR code at the business
- Two deal types: Sponti Deals (flash deals, 4-24 hours, urgency-driven) and Steady Deals (ongoing)
- Launching in Orlando, FL — expanding to more cities
- Website: sponticoupon.com
- Current promotions: Founders 20 (first 20 vendors get lifetime discount)
- Value for vendors: reach new customers, fill empty seats, boost foot traffic, affordable marketing
- Value for customers: save money at local restaurants, salons, auto shops, services

THE ADMIN WANTS YOU TO CREATE A POST ABOUT:
"${instructions}"

POST TYPE: ${content_type || 'brand_awareness'}

Generate two captions:
1. FACEBOOK caption (200-400 chars): Can include links to sponticoupon.com. Engaging, professional, with emojis and hashtags.
2. INSTAGRAM caption (200-350 chars): No clickable links. Use "Link in bio" if needed. Focus on hashtags (5-8), visual language, and engagement.

RULES:
- Follow the admin's instructions precisely — they know what they want to say
- Use proven engagement tactics: questions, CTAs, urgency, social proof, FOMO where appropriate
- Use relevant emojis (fire, money, food, celebration — NEVER purple/violet emojis)
- Always include #SpontiCoupon hashtag
- Match the tone to the content type and admin's intent
- If the admin mentions specific details (prices, numbers, names), include them exactly
- Make it sound natural and engaging, not corporate

Return as JSON:
{"facebook":"...","instagram":"...","reasoning":"brief explanation of your strategy","target_audience":"vendors|customers|both","hashtags":["#SpontiCoupon","..."]}

Return ONLY valid JSON, no markdown fences.`,
    });

    const text = (result.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let parsed: { facebook: string; instagram: string; reasoning?: string; target_audience?: string; hashtags?: string[] };

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'AI generated invalid response. Try again.' }, { status: 500 });
    }

    // Insert into marketing_content_queue as a draft
    const supabase = await createServiceRoleClient();

    const { data: item, error } = await supabase
      .from('marketing_content_queue')
      .insert({
        content_type: content_type || 'brand_awareness',
        platforms: ['facebook', 'instagram'],
        caption_facebook: parsed.facebook,
        caption_instagram: parsed.instagram,
        hashtags: parsed.hashtags || ['#SpontiCoupon'],
        image_url: image_url || null,
        ai_reasoning: parsed.reasoning || instructions,
        ai_content_score: 0.9,
        target_audience: parsed.target_audience || 'both',
        language: 'en',
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (err) {
    console.error('Marketing create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}
