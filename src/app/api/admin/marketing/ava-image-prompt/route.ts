import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';

/**
 * POST /api/admin/marketing/ava-image-prompt
 * Ava helps refine an image/video prompt based on the post content and user feedback.
 * Returns a refined prompt ready for generation.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const { caption, current_prompt, feedback, mode } = await request.json();

  if (!caption?.trim()) {
    return NextResponse.json({ error: 'Post caption is required' }, { status: 400 });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    const isVideo = mode === 'video';

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: JSON.stringify({
        role: 'Ava — expert visual creative director for SpontiCoupon social media',
        context: {
          brand: 'SpontiCoupon — deal marketplace for local Orlando businesses',
          brand_colors: { primary: 'orange #E8632B', secondary: 'blue #29ABE2', forbidden: 'no purple/violet' },
          post_caption: caption.substring(0, 500),
          current_image_prompt: current_prompt || null,
          user_feedback: feedback || null,
          media_type: isVideo ? 'video' : 'image',
        },
        task: isVideo
          ? 'Create a refined VIDEO prompt. Describe motion, camera movement, transitions, pacing, music mood, and visual style. The video should match the post content and feel engaging for social media (Instagram Reels / Facebook).'
          : 'Create a refined IMAGE prompt. Describe the scene, composition, lighting, colors, mood, and style. The image should visually match the post content and be eye-catching on social media feeds.',
        rules: [
          'CRITICAL: Images MUST be photorealistic unless the user explicitly requests illustration/cartoon style. Always default to real photography look.',
          'ABSOLUTE RULE: NEVER include ANY text, words, letters, numbers, signs, displays, screens, watermarks, logos, or overlays in the image/video. Not even on storefronts, signs, or digital displays. Describe scenes without any readable content.',
          'If user gave feedback about what they disliked, address it specifically',
          'If no feedback given, analyze the caption and create the best possible visual',
          'Use warm, vibrant, inviting aesthetics — match the SpontiCoupon brand feel',
          'Be specific: describe exact scene elements, lighting type, camera angle, color palette',
          'NEVER use purple, violet, or indigo tones — brand colors are orange #E8632B and blue #29ABE2',
          isVideo ? 'For video: include music mood, pacing (fast/slow), camera movement type, transition style' : '',
          'Return ONLY valid JSON, no markdown fences',
        ].filter(Boolean),
        output_format: {
          refined_prompt: 'The full refined prompt ready to use for AI generation (2-4 sentences)',
          explanation: 'Brief explanation of what Ava changed and why (1-2 sentences)',
          tips: ['1-3 quick tips for even better results'],
        },
      }),
    });

    const text = (result.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    let parsed: { refined_prompt: string; explanation: string; tips: string[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'Ava generated an invalid response. Try again.' }, { status: 500 });
    }

    return NextResponse.json({
      refined_prompt: parsed.refined_prompt,
      explanation: parsed.explanation,
      tips: parsed.tips || [],
    });
  } catch (err) {
    console.error('Ava image prompt error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate prompt' },
      { status: 500 },
    );
  }
}
