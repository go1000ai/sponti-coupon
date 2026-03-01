import type { SocialPostResult } from './types';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Post a deal to a Facebook Page.
 * Uses the Page access token to create a photo post with caption + link.
 */
export async function postToFacebook(
  accessToken: string,
  pageId: string,
  caption: string,
  imageUrl: string,
  claimUrl: string,
  connectionId: string
): Promise<SocialPostResult> {
  try {
    // Post as a photo with caption (includes the claim link in the caption)
    const fullCaption = caption.includes(claimUrl) ? caption : `${caption}\n\n${claimUrl}`;

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
