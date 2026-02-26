import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { brandStorageUrl } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';

// POST /api/vendor/generate-image — Generate a deal image using Nano Banana (Gemini)
export async function POST(request: NextRequest) {
  // Rate limit: 10 image generations per hour
  const limited = rateLimit(request, { maxRequests: 10, windowMs: 60 * 60 * 1000, identifier: 'ai-generate-image' });
  if (limited) return limited;

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
    return NextResponse.json({ error: 'Only vendors can generate images' }, { status: 403 });
  }

  // Get vendor info for context
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, subscription_tier')
    .eq('id', user.id)
    .single();

  // Check tier access (same gate as AI deal assistant — Business+)
  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_deal_assistant) {
    return NextResponse.json(
      { error: 'AI Image Generation requires a Business plan or higher. Upgrade at /vendor/subscription.' },
      { status: 403 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'Image generation service not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { title, description, category, custom_prompt } = body;

  if (!title && !custom_prompt) {
    return NextResponse.json({ error: 'Deal title or custom prompt is required to generate an image' }, { status: 400 });
  }

  const dealCategory = category || vendor?.category || 'business';

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = custom_prompt
      ? `${custom_prompt}. Professional, photorealistic, high quality commercial photography, vibrant natural lighting, clean modern style. Do NOT include any text, watermarks, logos, or overlays on the image.`
      : `Professional, photorealistic promotional photograph for a ${dealCategory} deal titled "${title}". ${description || ''} High quality commercial photography, vibrant natural lighting, appetizing and appealing composition, clean modern style. Do NOT include any text, watermarks, logos, or overlays on the image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    // Extract image data from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return NextResponse.json({ error: 'No image generated. Please try again.' }, { status: 500 });
    }

    let imageData: string | null = null;
    let mimeType = 'image/png';

    for (const part of parts) {
      if (part.inlineData) {
        imageData = part.inlineData.data as string;
        mimeType = part.inlineData.mimeType || 'image/png';
        break;
      }
    }

    if (!imageData) {
      return NextResponse.json({ error: 'No image was generated. Try a different title or description.' }, { status: 500 });
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageData, 'base64');

    // Upload to Supabase Storage
    const serviceClient = await createServiceRoleClient();
    const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png';
    const filename = `${user.id}/${Date.now()}-ai-generated.${ext}`;

    // Ensure bucket exists
    const { data: buckets } = await serviceClient.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'deal-images');
    if (!bucketExists) {
      await serviceClient.storage.createBucket('deal-images', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
    }

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('deal-images')
      .upload(filename, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to save generated image' }, { status: 500 });
    }

    const { data: urlData } = serviceClient.storage
      .from('deal-images')
      .getPublicUrl(uploadData.path);

    const brandedUrl = brandStorageUrl(urlData.publicUrl);

    // Auto-record in vendor media library
    await serviceClient.from('vendor_media').insert({
      vendor_id: user.id,
      type: 'image',
      url: brandedUrl,
      storage_path: filename,
      bucket: 'deal-images',
      filename: filename.split('/').pop(),
      ai_prompt: prompt,
      source: 'ai_generated',
      file_size: buffer.length,
      mime_type: mimeType,
    });

    return NextResponse.json({ url: brandedUrl, source: 'sponticoupon' });
  } catch (err: unknown) {
    console.error('Gemini image generation error:', err);
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
      return NextResponse.json(
        { error: 'Image generation quota exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to generate image. Please try again.' },
      { status: 500 }
    );
  }
}
