import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { rateLimit } from '@/lib/rate-limit';

const SYSTEM_PROMPT_IMAGE = `You are Ava, a creative AI assistant for SpontiCoupon — a deal marketplace for local businesses. A vendor is creating a social media post for their deal and needs help with the image.

Your job:
1. Understand what the vendor wants
2. Give a brief, encouraging response (2-3 sentences)
3. Create a refined, ready-to-use image generation prompt

The generation prompt should be specific and professional:
- Describe lighting, composition, style, colors
- Reference the product/service type
- Always end with: "Do NOT include any text, watermarks, logos, or overlays on the image."
- Keep it under 200 words

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "message": "your brief conversational response to the vendor",
  "suggestion": "the refined image generation prompt ready to use"
}`;

const SYSTEM_PROMPT_VIDEO = `You are Ava, a creative AI assistant for SpontiCoupon — a deal marketplace for local businesses. A vendor is creating a social media video (Facebook video or Instagram Reel) for their deal and needs help.

Your job:
1. Understand what the vendor wants
2. Give a brief, encouraging response (2-3 sentences)
3. Create a refined, ready-to-use video generation prompt

The video prompt should include:
- Music style/genre and mood (e.g., "upbeat Latin pop", "calm acoustic guitar")
- Pacing and energy level (e.g., "fast-paced with quick cuts", "slow cinematic reveal")
- Camera movements and angles (e.g., "close-up of food details", "smooth pan across the venue")
- Transitions (e.g., "fade between scenes", "zoom-in on product")
- Overall style reference (e.g., "TikTok-style vertical", "professional commercial")
- Keep it under 200 words

Respond ONLY in valid JSON (no markdown, no backticks):
{
  "message": "your brief conversational response to the vendor",
  "suggestion": "the refined video generation prompt ready to use"
}`;

/**
 * POST /api/vendor/ava-social-assist
 * Ava helps vendors craft prompts for social media image/video generation.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { maxRequests: 30, windowMs: 60 * 60 * 1000, identifier: 'ava-social-assist' });
  if (limited) return limited;

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { prompt, deal_title, media_mode } = body as {
    prompt: string;
    deal_title?: string;
    media_mode?: 'image' | 'video';
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  // Get vendor info for context
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, city, state')
    .eq('id', user.id)
    .single();

  const businessName = vendor?.business_name || 'My Business';
  const category = vendor?.category || '';
  const location = vendor?.city && vendor?.state ? `${vendor.city}, ${vendor.state}` : '';

  const userMessage = `Business: ${businessName}
Category: ${category}
Location: ${location}
Deal: ${deal_title || 'N/A'}

Vendor's request: ${prompt}`;

  const systemPrompt = media_mode === 'video' ? SYSTEM_PROMPT_VIDEO : SYSTEM_PROMPT_IMAGE;

  const anthropicKey = process.env.SPONTI_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;

  if (anthropicKey) {
    try {
      const client = new Anthropic({ apiKey: anthropicKey });
      const message = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{ role: 'user', content: userMessage }],
        system: systemPrompt,
        temperature: 0.8,
      });

      const content = message.content[0];
      if (content.type === 'text') {
        try {
          const parsed = JSON.parse(content.text.trim());
          return NextResponse.json({
            message: parsed.message || '',
            suggestion: parsed.suggestion || '',
          });
        } catch {
          // If JSON parsing fails, treat whole response as message
          return NextResponse.json({
            message: content.text.trim(),
            suggestion: '',
          });
        }
      }
    } catch (err) {
      console.error('[Ava Social Assist] Error:', err);
    }
  }

  // Fallback when no API key
  const fallbackSuggestion = media_mode === 'video'
    ? `Professional promotional video for a ${category || 'local business'} deal. Upbeat background music, smooth camera pans showcasing the product/service, warm natural lighting, quick engaging cuts, modern and inviting style.`
    : `Professional, photorealistic promotional photograph for a ${category || 'local business'} deal titled "${deal_title || 'Special Offer'}". High quality commercial photography, vibrant natural lighting, appetizing and appealing composition, clean modern style. Do NOT include any text, watermarks, logos, or overlays on the image.`;

  return NextResponse.json({
    message: media_mode === 'video'
      ? "I've created a video prompt based on your request. Feel free to edit it before generating!"
      : "I've created an image prompt based on your request. Feel free to edit it before generating!",
    suggestion: fallbackSuggestion,
  });
}
