import type { SocialPostResult } from './types';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Post a deal to a Facebook Page — image or video.
 * Uses the Page access token to create a photo/video post with caption + link.
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
      return {
        platform: 'facebook',
        connectionId,
        success: true,
        platformPostId: postId,
        platformPostUrl: `https://www.facebook.com/${postId}`,
      };
    }

    // Image post via /{pageId}/photos
    const res = await fetch(`${META_GRAPH_URL}/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption: fullCaption,
        access_token: accessToken,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return {
        platform: 'facebook',
        connectionId,
        success: false,
        error: data.error?.message || `HTTP ${res.status}`,
      };
    }

    const postId = data.id || data.post_id;
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
