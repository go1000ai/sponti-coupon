import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { GoogleGenAI } from '@google/genai';
import { SUBSCRIPTION_TIERS } from '@/lib/types/database';
import type { SubscriptionTier } from '@/lib/types/database';
import { brandStorageUrl } from '@/lib/utils';
import { rateLimit } from '@/lib/rate-limit';

// Extend Vercel function timeout (Pro: up to 300s, Hobby: 60s)
export const maxDuration = 300;

// POST /api/vendor/generate-video
// Two-phase approach to avoid Vercel timeout:
//   Phase 1: { image_url, title, ... } → starts Veo, returns { operation_name }
//   Phase 2: { operation_name, vendor_id } → polls Veo, when done downloads + uploads, returns { url }
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'vendor') {
    return NextResponse.json({ error: 'Only vendors can generate videos' }, { status: 403 });
  }

  const { data: vendor } = await supabase
    .from('vendors')
    .select('business_name, category, subscription_tier')
    .eq('id', user.id)
    .single();

  const tier = (vendor?.subscription_tier as SubscriptionTier) || 'starter';
  if (!SUBSCRIPTION_TIERS[tier].ai_deal_assistant) {
    return NextResponse.json(
      { error: 'AI Video Generation requires a Business plan or higher.' },
      { status: 403 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return NextResponse.json({ error: 'Video generation service not configured' }, { status: 500 });
  }

  const body = await request.json();

  // ─── Phase 2: Poll an existing operation ─────────────────────
  if (body.operation_name) {
    return handlePoll(body.operation_name, user.id, geminiKey);
  }

  // ─── Phase 1: Start a new generation ─────────────────────────
  // Rate limit only new generations, not polls
  const limited = rateLimit(request, { maxRequests: 5, windowMs: 60 * 60 * 1000, identifier: 'ai-generate-video' });
  if (limited) return limited;

  const { image_url, title, description, video_prompt } = body;

  if (!image_url) {
    return NextResponse.json({ error: 'An image URL is required to generate a video' }, { status: 400 });
  }

  // Convert /media/ paths back to full Supabase storage URLs for server-side fetch
  let resolvedImageUrl = image_url;
  if (image_url.startsWith('/media/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    resolvedImageUrl = `${supabaseUrl}/storage/v1/object/public/${image_url.slice('/media/'.length)}`;
  }

  try {
    const imageResponse = await fetch(resolvedImageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch the deal image' }, { status: 400 });
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    const imageBase64 = imageBuffer.toString('base64');
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/png';

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = video_prompt
      ? `${video_prompt}. Professional commercial quality for ${vendor?.business_name || 'this business'}'s ${vendor?.category || ''} deal: "${title || 'Special Deal'}". ${description || ''}`
      : `Smooth cinematic camera movement showcasing this ${vendor?.category || 'business'} deal: "${title || 'Special Deal'}". ${description || ''} Professional commercial quality, engaging and appealing, warm inviting atmosphere.`;

    console.log('[VideoGen] Starting Veo generation for vendor:', user.id);
    const operation = await ai.models.generateVideos({
      model: 'veo-3.1-generate-preview',
      prompt,
      image: {
        imageBytes: imageBase64,
        mimeType: imageMimeType,
      },
      config: {
        aspectRatio: '16:9',
        numberOfVideos: 1,
        durationSeconds: 8,
      },
    });

    const operationName = operation.name;
    if (!operationName) {
      return NextResponse.json({ error: 'Failed to start video generation' }, { status: 500 });
    }

    console.log('[VideoGen] Operation started:', operationName);

    // If the operation is already done (unlikely but possible), handle it immediately
    if (operation.done) {
      return await finishOperation(operation, user.id, geminiKey);
    }

    // Return the operation name so the client can poll
    return NextResponse.json({
      status: 'processing',
      operation_name: operationName,
      message: 'Video generation started. Poll with operation_name to check progress.',
    });
  } catch (err) {
    console.error('[VideoGen] Start error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
      return NextResponse.json({ error: 'Video generation quota exceeded. Please try again later.' }, { status: 429 });
    }
    return NextResponse.json({ error: `Failed to generate video: ${errorMessage}` }, { status: 500 });
  }
}

// ─── Poll handler — uses raw REST API since SDK requires original operation object ───
async function handlePoll(operationName: string, userId: string, geminiKey: string) {
  try {
    // Call the Gemini REST API directly to check operation status
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
    const pollRes = await fetch(pollUrl, {
      headers: { 'x-goog-api-key': geminiKey },
    });

    if (!pollRes.ok) {
      const errText = await pollRes.text().catch(() => '');
      console.error('[VideoGen] Poll API error:', pollRes.status, errText);
      return NextResponse.json({ error: 'Failed to check video status' }, { status: 500 });
    }

    const opData = await pollRes.json();
    console.log('[VideoGen] Poll result — done:', opData.done, 'keys:', Object.keys(opData), 'metadata:', JSON.stringify(opData.metadata || {}).slice(0, 200));

    if (!opData.done) {
      return NextResponse.json({ status: 'processing', operation_name: operationName });
    }

    // Operation is done — extract the video URI from the raw response
    const generatedVideos = opData.response?.generateVideoResponse?.generatedSamples
      || opData.response?.generatedVideos
      || opData.result?.generatedVideos;

    if (!generatedVideos || generatedVideos.length === 0) {
      console.error('[VideoGen] No videos in response:', JSON.stringify(opData.response || opData.result || {}).slice(0, 500));
      return NextResponse.json({ error: 'No video was generated. Please try again.' }, { status: 500 });
    }

    const video = generatedVideos[0].video || generatedVideos[0];
    const videoUri = video.uri;
    if (!videoUri) {
      console.error('[VideoGen] No video URI:', JSON.stringify(generatedVideos[0]).slice(0, 300));
      return NextResponse.json({ error: 'No video URI returned' }, { status: 500 });
    }

    // Download and upload
    return await finishFromUri(videoUri, userId, geminiKey);
  } catch (err) {
    console.error('[VideoGen] Poll error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to check video status: ${errorMessage}` }, { status: 500 });
  }
}

// ─── Finish: download from Gemini + upload to Supabase ─────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function finishOperation(operation: any, userId: string, geminiKey: string) {
  const generatedVideos = operation.response?.generatedVideos;
  if (!generatedVideos || generatedVideos.length === 0 || !generatedVideos[0].video) {
    return NextResponse.json({ error: 'No video was generated. Please try again.' }, { status: 500 });
  }

  const video = generatedVideos[0].video;
  const videoUri = video.uri;
  if (!videoUri) {
    return NextResponse.json({ error: 'No video URI returned' }, { status: 500 });
  }

  return await finishFromUri(videoUri, userId, geminiKey);
}

// Download video from URI and upload to Supabase
async function finishFromUri(videoUri: string, userId: string, geminiKey: string) {
  const videoResponse = await fetch(videoUri, {
    headers: { 'x-goog-api-key': geminiKey },
    redirect: 'follow',
  });
  if (!videoResponse.ok) {
    console.error('[VideoGen] Download failed:', videoResponse.status);
    return NextResponse.json({ error: 'Failed to download generated video' }, { status: 500 });
  }

  const videoArrayBuffer = await videoResponse.arrayBuffer();
  const videoBuffer = Buffer.from(videoArrayBuffer);
  console.log(`[VideoGen] Downloaded: ${(videoBuffer.length / 1024 / 1024).toFixed(1)}MB`);

  if (videoBuffer.length < 1000) {
    return NextResponse.json({ error: 'Generated video data appears invalid. Please try again.' }, { status: 500 });
  }

  // Upload to Supabase Storage
  const serviceClient = await createServiceRoleClient();
  const filename = `${userId}/${Date.now()}-ai-generated.mp4`;

  const { data: uploadData, error: uploadError } = await serviceClient.storage
    .from('deal-videos')
    .upload(filename, videoBuffer, {
      contentType: 'video/mp4',
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) {
    console.error('[VideoGen] Upload error:', JSON.stringify(uploadError));
    // Fallback to deal-images bucket
    const fallbackFilename = `${userId}/${Date.now()}-ai-video.mp4`;
    const { data: fallbackData, error: fallbackError } = await serviceClient.storage
      .from('deal-images')
      .upload(fallbackFilename, videoBuffer, {
        contentType: 'video/mp4',
        cacheControl: '3600',
        upsert: true,
      });

    if (fallbackError) {
      return NextResponse.json({ error: `Failed to save video: ${uploadError.message}` }, { status: 500 });
    }

    const { data: fallbackUrl } = serviceClient.storage
      .from('deal-images')
      .getPublicUrl(fallbackData.path);

    const brandedUrl = brandStorageUrl(fallbackUrl.publicUrl);

    await serviceClient.from('vendor_media').insert({
      vendor_id: userId,
      type: 'video',
      url: brandedUrl,
      storage_path: fallbackFilename,
      bucket: 'deal-images',
      filename: fallbackFilename.split('/').pop(),
      source: 'ai_video',
      file_size: videoBuffer.length,
      mime_type: 'video/mp4',
    });

    return NextResponse.json({ status: 'done', url: brandedUrl, source: 'sponticoupon' });
  }

  const { data: urlData } = serviceClient.storage
    .from('deal-videos')
    .getPublicUrl(uploadData.path);

  const brandedUrl = brandStorageUrl(urlData.publicUrl);

  await serviceClient.from('vendor_media').insert({
    vendor_id: userId,
    type: 'video',
    url: brandedUrl,
    storage_path: filename,
    bucket: 'deal-videos',
    filename: filename.split('/').pop(),
    source: 'ai_video',
    file_size: videoBuffer.length,
    mime_type: 'video/mp4',
  });

  console.log('[VideoGen] Complete! URL:', brandedUrl);
  return NextResponse.json({ status: 'done', url: brandedUrl, source: 'sponticoupon' });
}
