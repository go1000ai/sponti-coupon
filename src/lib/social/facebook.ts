import type { SocialPostResult } from './types';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Generate an SRT subtitle file from caption text.
 * Splits into ~10-word chunks displayed over the video duration.
 */
function generateSrt(caption: string, durationSeconds: number = 15): string {
  // Strip URLs and hashtags for cleaner subtitles
  const cleanText = caption
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#\w+/g, '')
    .trim();

  if (!cleanText) return '';

  const words = cleanText.split(/\s+/).filter(Boolean);
  const wordsPerChunk = 8;
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk) {
    chunks.push(words.slice(i, i + wordsPerChunk).join(' '));
  }

  if (chunks.length === 0) return '';

  const chunkDuration = durationSeconds / chunks.length;
  const lines: string[] = [];

  chunks.forEach((chunk, i) => {
    const startSec = i * chunkDuration;
    const endSec = Math.min((i + 1) * chunkDuration, durationSeconds);
    lines.push(`${i + 1}`);
    lines.push(`${formatSrtTime(startSec)} --> ${formatSrtTime(endSec)}`);
    lines.push(chunk);
    lines.push('');
  });

  return lines.join('\n');
}

function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Upload SRT captions to a Facebook video after publishing.
 * Uses POST /{video-id}/captions endpoint.
 */
async function uploadVideoCaptions(
  accessToken: string,
  videoId: string,
  caption: string,
  locale: string = 'en_US'
): Promise<void> {
  try {
    const srtContent = generateSrt(caption);
    if (!srtContent) return;

    // Facebook expects the SRT content as a file upload via multipart/form-data
    const formData = new FormData();
    formData.append('captions_file', new Blob([srtContent], { type: 'application/x-subrip' }), 'captions.srt');
    formData.append('default_locale', locale);
    formData.append('locales_to_upload', JSON.stringify([locale]));
    formData.append('access_token', accessToken);

    await fetch(`${META_GRAPH_URL}/${videoId}/captions`, {
      method: 'POST',
      body: formData,
    });
    // Non-critical — don't fail the post if captions fail
  } catch (err) {
    console.warn('[Facebook] Caption upload failed (non-critical):', err instanceof Error ? err.message : err);
  }
}

/**
 * Post a deal to a Facebook Page — image or video.
 * Uses the Page access token to create a photo/video post with caption + link.
 * For videos: also uploads SRT captions since AI-generated videos are silent.
 */
export async function postToFacebook(
  accessToken: string,
  pageId: string,
  caption: string,
  imageUrl: string,
  claimUrl: string,
  connectionId: string,
  videoUrl?: string
): Promise<SocialPostResult> {
  try {
    const fullCaption = caption.includes(claimUrl) ? caption : `${caption}\n\n${claimUrl}`;

    // Video post via /{pageId}/videos
    if (videoUrl) {
      const res = await fetch(`${META_GRAPH_URL}/${pageId}/videos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_url: videoUrl,
          description: fullCaption,
          published: true,
          access_token: accessToken,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        return {
          platform: 'facebook',
          connectionId,
          success: false,
          error: data.error?.message || `Video upload HTTP ${res.status}`,
        };
      }

      const postId = data.id;

      // Upload SRT captions for the silent AI-generated video
      await uploadVideoCaptions(accessToken, postId, fullCaption);

      return {
        platform: 'facebook',
        connectionId,
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://www.facebook.com/${postId}`,
      };
    }

    // Image post: two-step approach to guarantee feed visibility
    // Step 1: Upload photo as unpublished to get media_fbid
    const uploadRes = await fetch(`${META_GRAPH_URL}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        published: false,
        access_token: accessToken,
      }),
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || uploadData.error) {
      return {
        platform: 'facebook',
        connectionId,
        success: false,
        error: uploadData.error?.message || `Photo upload HTTP ${uploadRes.status}`,
      };
    }

    const photoId = uploadData.id;

    // Step 2: Create a feed post with the photo attached
    const feedRes = await fetch(`${META_GRAPH_URL}/${pageId}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: fullCaption,
        attached_media: [{ media_fbid: photoId }],
        published: true,
        access_token: accessToken,
      }),
    });

    const feedData = await feedRes.json();

    if (!feedRes.ok || feedData.error) {
      // Fallback: try publishing the photo directly if feed post fails
      await fetch(`${META_GRAPH_URL}/${photoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          published: true,
          access_token: accessToken,
        }),
      });

      return {
        platform: 'facebook',
        connectionId,
        success: false,
        error: feedData.error?.message || `Feed post HTTP ${feedRes.status}`,
      };
    }

    const postId = feedData.id || feedData.post_id;
    return {
      platform: 'facebook',
      connectionId,
      success: true,
      platformPostId: postId,
      platformPostUrl: `https://www.facebook.com/${postId}`,
    };
  } catch (err) {
    return {
      platform: 'facebook',
      connectionId,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
