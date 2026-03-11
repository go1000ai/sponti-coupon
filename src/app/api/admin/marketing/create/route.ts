import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { brandStorageUrl } from '@/lib/utils';

/**
 * POST /api/admin/marketing/create
 * Creates a marketing post from specific admin instructions.
 * AI generates Facebook & Instagram captions + image prompt.
 * Optionally auto-generates an image and/or starts video generation.
 */
export async function POST(request: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const {
    instructions,
    content_type,
    image_url,
    generate_image = true,
    generate_video = false,
  } = await request.json();

  if (!instructions?.trim()) {
    return NextResponse.json({ error: 'Instructions are required' }, { status: 400 });
  }

  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

    // Step 1: Generate captions + image/video prompts using JSON mode
    const result = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: JSON.stringify({
        role: 'senior social media marketing expert for SpontiCoupon',
        context: {
          about: 'Deal marketplace connecting local businesses with customers in Orlando, FL',
          vendor_model: 'Vendors pay $49-$499/month subscription to list deals',
          customer_model: 'Customers browse and claim deals for free, redeem via QR code',
          deal_types: ['Sponti Deals (flash deals, 4-24 hours, urgency-driven)', 'Steady Deals (ongoing)'],
          website: 'sponticoupon.com',
          promotions: 'Founders 20 — first 20 vendors get lifetime discount',
          vendor_value: 'reach new customers, fill empty seats, boost foot traffic, affordable marketing',
          customer_value: 'save money at local restaurants, salons, auto shops, services',
          brand_colors: { primary: 'orange #E8632B', secondary: 'blue #29ABE2', forbidden: 'no purple/violet' },
        },
        task: {
          admin_instructions: instructions,
          content_type: content_type || 'brand_awareness',
          generate_image_prompt: generate_image,
          generate_video_prompt: generate_video,
        },
        output_format: {
          facebook: 'Facebook caption (200-400 chars). Include links to sponticoupon.com. Emojis, hashtags, engaging.',
          instagram: 'Instagram caption (200-350 chars). No links. Use "Link in bio". 5-8 hashtags.',
          image_prompt: 'MUST directly illustrate the SPECIFIC topic of the caption. E.g. if caption talks about restaurants filling empty seats, show a busy Orlando restaurant with happy customers. If about a salon deal, show a salon interior. Photorealistic photography style, warm natural lighting. NEVER generic stock imagery. NEVER include any text, words, letters, signs, logos, or overlays.',
          video_prompt: 'MUST directly match the caption topic. Describe a SPECIFIC scene that brings the caption to life as a vertical 9:16 Reel. Include: (1) the exact subject from the caption, (2) camera movement (slow zoom, pan, dolly), (3) mood/energy level, (4) setting that matches the post. E.g. if caption is about local restaurants, show a real Orlando restaurant scene with diners, food being served, warm lighting. If about business growth, show a storefront getting busy with customers. 2-3 sentences.',
          reasoning: 'Brief explanation of your marketing strategy for this post.',
          target_audience: 'vendors | customers | both',
          hashtags: ['#SpontiCoupon', '...other relevant hashtags'],
        },
        rules: [
          'Follow admin instructions precisely',
          'Use engagement tactics: questions, CTAs, urgency, social proof, FOMO',
          'Use relevant emojis (fire, money, food, celebration — NEVER purple/violet emojis)',
          'Always include #SpontiCoupon',
          'Match tone to content type',
          'Include specific details (prices, numbers, names) exactly as given',
          'Natural and engaging, not corporate',
          'CRITICAL: image_prompt and video_prompt MUST be about the SAME specific topic as the captions. If the post is about filling empty restaurant seats, the image/video must show a restaurant scene — NOT a generic business office or skyline.',
          'image_prompt: ALWAYS photorealistic (real photography). NEVER include ANY text, words, letters, numbers, signs, screens, digital displays, watermarks, logos, or overlays of any kind.',
          'NEVER use purple, violet, or indigo in image/video prompts — brand colors are orange and blue',
          'Return ONLY valid JSON, no markdown fences',
        ],
      }),
    });

    const text = (result.text || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    let parsed: {
      facebook: string;
      instagram: string;
      image_prompt?: string;
      video_prompt?: string;
      reasoning?: string;
      target_audience?: string;
      hashtags?: string[];
    };

    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'AI generated invalid response. Try again.' }, { status: 500 });
    }

    // Clean captions — strip any nested JSON wrapping, literal \n, extra quotes
    const cleanCaption = (raw: unknown): string => {
      if (!raw) return '';
      let s = typeof raw === 'string' ? raw : JSON.stringify(raw);
      // If AI wrapped in JSON like {"caption":"..."}, extract the value
      if (s.startsWith('{') && s.includes('"caption"')) {
        try { s = JSON.parse(s).caption || s; } catch { /* use as-is */ }
      }
      // Replace literal \n with actual newlines
      s = s.replace(/\\n/g, '\n');
      // Trim leading/trailing whitespace and quotes
      s = s.replace(/^["']+|["']+$/g, '').trim();
      return s;
    };

    parsed.facebook = cleanCaption(parsed.facebook);
    parsed.instagram = cleanCaption(parsed.instagram);

    const supabase = await createServiceRoleClient();
    let finalImageUrl = image_url || null;
    let videoOperationName: string | null = null;

    // Step 2: Auto-generate image if requested and no image_url provided
    if (generate_image && !image_url && parsed.image_prompt) {
      try {
        const imagePrompt = `${parsed.image_prompt}. Professional, photorealistic, high quality commercial photography, vibrant natural lighting, clean modern style. Do NOT include any text, watermarks, logos, or overlays on the image.`;

        const imageResult = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: imagePrompt,
          config: {
            responseModalities: ['IMAGE'],
          },
        });

        const parts = imageResult.candidates?.[0]?.content?.parts;
        let imageData: string | null = null;
        let mimeType = 'image/png';

        if (parts) {
          for (const part of parts) {
            if (part.inlineData) {
              imageData = part.inlineData.data as string;
              mimeType = part.inlineData.mimeType || 'image/png';
              break;
            }
          }
        }

        if (imageData) {
          const buffer = Buffer.from(imageData, 'base64');

          if (buffer.length >= 5000) {
            const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
            const filename = `marketing/${Date.now()}-ai-generated.${ext}`;

            // Ensure bucket exists
            const { data: buckets } = await supabase.storage.listBuckets();
            if (!buckets?.some(b => b.name === 'deal-images')) {
              await supabase.storage.createBucket('deal-images', {
                public: true,
                fileSizeLimit: 5 * 1024 * 1024,
                allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
              });
            }

            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('deal-images')
              .upload(filename, buffer, { contentType: mimeType, cacheControl: '3600' });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabase.storage
                .from('deal-images')
                .getPublicUrl(uploadData.path);

              finalImageUrl = brandStorageUrl(urlData.publicUrl);
            }
          }
        }
      } catch (imgErr) {
        // Image generation failed — continue without image, log the error
        console.error('Marketing image generation failed (continuing without image):', imgErr);
      }
    }

    // Step 3: Start video generation if requested
    if (generate_video && parsed.video_prompt) {
      try {
        const videoPrompt = `${parsed.video_prompt}. Professional marketing video, smooth transitions, engaging pacing.`;

        // If we have an image, fetch it as base64 for Veo
        let imagePayload: { imageBytes: string; mimeType: string } | undefined;
        if (finalImageUrl) {
          try {
            let fetchUrl = finalImageUrl;
            if (fetchUrl.startsWith('/media/')) {
              const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
              fetchUrl = `${supabaseUrl}/storage/v1/object/public/${fetchUrl.replace('/media/', '')}`;
            }
            const imgRes = await fetch(fetchUrl);
            if (imgRes.ok) {
              const imgBuf = Buffer.from(await imgRes.arrayBuffer());
              imagePayload = {
                imageBytes: imgBuf.toString('base64'),
                mimeType: imgRes.headers.get('content-type') || 'image/png',
              };
            }
          } catch {
            // Continue without image for video
          }
        }

        const videoResult = await ai.models.generateVideos({
          model: 'veo-3.1-generate-preview',
          prompt: videoPrompt,
          ...(imagePayload ? { image: imagePayload } : {}),
          config: {
            aspectRatio: '9:16',
            numberOfVideos: 1,
            durationSeconds: 8,
          },
        });

        videoOperationName = videoResult.name || null;
      } catch (vidErr) {
        console.error('Marketing video generation failed to start:', vidErr);
      }
    }

    // Step 4: Insert into marketing_content_queue
    const { data: item, error } = await supabase
      .from('marketing_content_queue')
      .insert({
        content_type: content_type || 'brand_awareness',
        platforms: ['facebook', 'instagram'],
        caption_facebook: parsed.facebook,
        caption_instagram: parsed.instagram,
        hashtags: parsed.hashtags || ['#SpontiCoupon'],
        image_url: finalImageUrl,
        image_prompt: parsed.image_prompt || null,
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

    return NextResponse.json({
      item,
      image_generated: !!finalImageUrl && !image_url,
      video_operation: videoOperationName,
    });
  } catch (err) {
    console.error('Marketing create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}
