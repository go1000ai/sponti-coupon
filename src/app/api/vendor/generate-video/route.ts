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
    // Fetch the deal image with retry (Supabase storage can return transient 502s)
    let imageResponse: Response | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      imageResponse = await fetch(resolvedImageUrl);
      if (imageResponse.ok) break;
      console.warn(`[VideoGen] Image fetch attempt ${attempt + 1} failed: ${imageResponse.status}`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 2000));
    }
    if (!imageResponse || !imageResponse.ok) {
      return NextResponse.json({ error: `Failed to fetch the deal image (status ${imageResponse?.status || 'unknown'}). The image may still be processing — try again in a few seconds.` }, { status: 400 });
    }

    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBuffer = Buffer.from(imageArrayBuffer);
    if (imageBuffer.length < 1000) {
      return NextResponse.json({ error: 'The deal image appears to be empty or corrupt. Please re-generate the image first.' }, { status: 400 });
    }
    const imageBase64 = imageBuffer.toString('base64');
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/png';

    const ai = new GoogleGenAI({ apiKey: geminiKey });

    const prompt = video_prompt
      ? `${video_prompt}. Professional commercial quality for ${vendor?.business_name || 'this business'}'s ${vendor?.category || ''} deal: "${title || 'Special Deal'}". ${description || ''}`
      : `Smooth cinematic camera movement showcasing this ${vendor?.category || 'business'} deal: "${title || 'Special Deal'}". ${description || ''} Professional commercial quality, engaging and appealing, warm inviting atmosphere.`;

    // Pre-flight: verify Veo model is accessible with this API key
    const modelCheckUrl = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview?key=${geminiKey}`;
    const modelCheck = await fetch(modelCheckUrl);
    if (!modelCheck.ok) {
      const modelErr = await modelCheck.text().catch(() => '');
      console.error('[VideoGen] Model pre-flight failed:', modelCheck.status, modelErr);
      if (modelCheck.status === 404) {
        return NextResponse.json({ error: 'The Veo video model is not available for your API key. Please check your Google AI Studio billing and API access.' }, { status: 403 });
      }
      if (modelCheck.status === 403) {
        return NextResponse.json({ error: 'Your API key does not have access to video generation. Enable billing in Google AI Studio.' }, { status: 403 });
      }
    }
    console.log('[VideoGen] Model pre-flight OK');

    console.log('[VideoGen] Starting Veo generation for vendor:', user.id, 'image size:', imageBuffer.length, 'bytes, mime:', imageMimeType);
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
    console.log('[VideoGen] Operation response:', JSON.stringify({
      name: operation.name,
      done: operation.done,
      hasResponse: !!operation.response,
      hasError: !!((operation as unknown) as Record<string, unknown>).error,
      keys: Object.keys(operation),
    }));

    if (!operationName) {
      console.error('[VideoGen] No operation name. Full:', JSON.stringify(operation).slice(0, 1000));
      return NextResponse.json({ error: 'Failed to start video generation — no operation ID returned.' }, { status: 500 });
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
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errLower = errorMessage.toLowerCase();

    // Billing / access errors
    if (errLower.includes('permission') || errLower.includes('billing') || errLower.includes('not available') || errLower.includes('not found') || errLower.includes('403') || errLower.includes('does not exist')) {
      return NextResponse.json({ error: 'Video generation requires a paid Gemini API plan with Veo access. Please enable billing in Google AI Studio.' }, { status: 403 });
    }
    // Quota / rate limit
    if (errLower.includes('429') || errLower.includes('resource_exhausted') || errLower.includes('quota')) {
      return NextResponse.json({ error: 'Video generation quota exceeded. Please try again later.' }, { status: 429 });
    }
    // Content safety
    if (errLower.includes('safety') || errLower.includes('policy') || errLower.includes('blocked') || errLower.includes('harm')) {
      return NextResponse.json({ error: 'The image or prompt was blocked by safety filters. Please try different content.' }, { status: 400 });
    }
    // Invalid model
    if (errLower.includes('model') && (errLower.includes('invalid') || errLower.includes('unsupported'))) {
      return NextResponse.json({ error: 'The video generation model is not available. This may be a billing or region issue.' }, { status: 500 });
    }
    return NextResponse.json({ error: `Failed to generate video: ${errorMessage}` }, { status: 500 });
  }
}

// ─── Poll handler — uses REST API to check operation status ───
async function handlePoll(operationName: string, userId: string, geminiKey: string) {
  try {
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${geminiKey}`;
    const pollRes = await fetch(pollUrl);

    if (!pollRes.ok) {
      const errText = await pollRes.text().catch(() => '');
      console.error('[VideoGen] Poll API error:', pollRes.status, errText);
      // Return processing instead of error for transient failures — let client retry
      if (pollRes.status >= 500) {
        return NextResponse.json({ status: 'processing', operation_name: operationName });
      }
      return NextResponse.json({ error: `Failed to check video status (${pollRes.status})` }, { status: 500 });
    }

    const opData = await pollRes.json();
    console.log('[VideoGen] Poll result — done:', opData.done, 'keys:', Object.keys(opData));

    if (!opData.done) {
      return NextResponse.json({ status: 'processing', operation_name: operationName });
    }

    // Check for LRO error (Google returns { done: true, error: {...} } on failure)
    if (opData.error) {
      const errCode = opData.error.code || 0;
      const errMsg = opData.error.message || 'Unknown error';
      const errStatus = opData.error.status || '';
      console.error('[VideoGen] Operation failed:', errCode, errStatus, errMsg);

      if (errCode === 403 || errStatus === 'PERMISSION_DENIED' || errMsg.includes('billing') || errMsg.includes('not available')) {
        return NextResponse.json({ error: 'Video generation requires a paid Gemini API plan. Please check your Google AI billing settings.' }, { status: 403 });
      }
      if (errCode === 429 || errStatus === 'RESOURCE_EXHAUSTED') {
        return NextResponse.json({ error: 'Video generation quota exceeded. Please try again later.' }, { status: 429 });
      }
      if (errMsg.includes('safety') || errMsg.includes('policy') || errMsg.includes('blocked')) {
        return NextResponse.json({ error: 'Video generation was blocked by content safety filters. Please try a different prompt or image.' }, { status: 400 });
      }
      return NextResponse.json({ error: `Video generation failed: ${errMsg}` }, { status: 500 });
    }

    // Operation is done — try multiple response structures (REST API format varies)
    // Google LRO format: { done: true, response: { "@type": "...", generatedSamples: [...] } }
    const generatedVideos = opData.response?.generatedSamples
      || opData.response?.generateVideoResponse?.generatedSamples
      || opData.response?.generatedVideos
      || opData.result?.generatedSamples
      || opData.result?.generatedVideos
      || opData.result?.generateVideoResponse?.generatedSamples;

    if (!generatedVideos || generatedVideos.length === 0) {
      // Log the full structure so we can see exactly what Google returned
      const responseKeys = opData.response ? Object.keys(opData.response) : [];
      const resultKeys = opData.result ? Object.keys(opData.result) : [];
      console.error('[VideoGen] No videos found. response keys:', responseKeys, 'result keys:', resultKeys, 'Full:', JSON.stringify(opData).slice(0, 3000));
      return NextResponse.json({ error: `No video was generated. API response keys: [${responseKeys.join(', ')}]. Please try again or contact support.` }, { status: 500 });
    }

    const video = generatedVideos[0].video || generatedVideos[0];
    const videoUri = video.uri;
    if (!videoUri) {
      console.error('[VideoGen] No video URI:', JSON.stringify(generatedVideos[0]).slice(0, 500));
      return NextResponse.json({ error: 'No video URI returned' }, { status: 500 });
    }

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
