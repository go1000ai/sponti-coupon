import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { brandStorageUrl } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';

const MAX_POLL_TIME_MS = 5 * 60 * 1000; // 5 minutes max
const POLL_INTERVAL_MS = 10_000; // 10 seconds between polls

// POST /api/vendor/generate-video — Generate a promo video from a deal image using Veo 3.1
export async function POST(request: NextRequest) {
  // Rate limit: 5 video generations per hour (most expensive AI operation)
  const limited = rateLimit(request, { maxRequests: 5, windowMs: 60 * 60 * 1000, identifier: 'ai-generate-video' });
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
    return NextResponse.json({ error: 'Only vendors can generate videos' }, { status: 403 });
  }

  // Get vendor info
  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, subscription_tier')
    .eq('id', user.id)
    .single();

  // Check tier access (Business+)
  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_deal_assistant) {
    return NextResponse.json(
      { error: 'AI Video Generation requires a Business plan or higher. Upgrade at /vendor/subscription.' },
      { status: 403 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'Video generation service not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { image_url, title, description } = body;

  if (!image_url) {
    return NextResponse.json({ error: 'An image URL is required to generate a video' }, { status: 400 });
  }

  try {
    // Fetch the image and convert to base64
    const imageResponse = await fetch(image_url);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch the deal image' }, { status: 400 });
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    const imageBase64 = imageBuffer.toString('base64');
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/png';

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = `Smooth cinematic camera movement showcasing this ${vendor?.category || 'business'} deal: "${title || 'Special Deal'}". ${description || ''} Professional commercial quality, engaging and appealing, warm inviting atmosphere.`;

    // Start video generation with image as starting frame (Veo 3.1)
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: imageMimeType,
      },
      config: {
        aspectRatio: '16:9',
        numberOfVideos: 1,
      },
    });

    // Poll until done
    const startTime = Date.now();
    while (!operation.done) {
      if (Date.now() - startTime > MAX_POLL_TIME_MS) {
        return NextResponse.json(
          { error: 'Video generation timed out. Please try again.' },
          { status: 504 }
        );
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    // Get the generated video
    const generatedVideos = operation.response?.generatedVideos;
    if (!generatedVideos || generatedVideos.length === 0 || !generatedVideos[0].video) {
      return NextResponse.json({ error: 'No video was generated. Please try again.' }, { status: 500 });
    }

    const video = generatedVideos[0].video;

    // Download the video data using the file API
    // The video object has a uri we can fetch
    const videoUri = video.uri;
    if (!videoUri) {
      return NextResponse.json({ error: 'No video URI returned' }, { status: 500 });
    }

    // Fetch the video content from Gemini's file API
    const videoFetchUrl = `${videoUri}?key=${geminiKey}`;
    const videoResponse = await fetch(videoFetchUrl);
    if (!videoResponse.ok) {
      return NextResponse.json({ error: 'Failed to download generated video' }, { status: 500 });
    }

    const videoArrayBuffer = await videoResponse.arrayBuffer();
    const videoBuffer = Buffer.from(videoArrayBuffer);

    // Upload to Supabase Storage
    const serviceClient = await createServiceRoleClient();
    const filename = `${user.id}/${Date.now()}-ai-generated.mp4`;

    // Ensure bucket exists
    const { data: buckets } = await serviceClient.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'deal-videos');
    if (!bucketExists) {
      await serviceClient.storage.createBucket('deal-videos', {
        public: true,
        fileSizeLimit: 100 * 1024 * 1024,
        allowedMimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
      });
    }

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('deal-videos')
      .upload(filename, videoBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
      });

    if (uploadError) {
      console.error('Video upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to save generated video' }, { status: 500 });
    }

    const { data: urlData } = serviceClient.storage
      .from('deal-videos')
      .getPublicUrl(uploadData.path);

    const brandedUrl = brandStorageUrl(urlData.publicUrl);

    // Auto-record in vendor media library
    await serviceClient.from('vendor_media').insert({
      vendor_id: user.id,
      type: 'video',
      url: brandedUrl,
      storage_path: filename,
      bucket: 'deal-videos',
      filename: filename.split('/').pop(),
      source: 'ai_video',
      file_size: videoBuffer.length,
      mime_type: 'video/mp4',
    });

    return NextResponse.json({ url: brandedUrl, source: 'sponticoupon' });
  } catch (err) {
    console.error('Veo video generation error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to generate video: ${errorMessage}` },
      { status: 500 }
    );
  }
}
