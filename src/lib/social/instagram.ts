import type { SocialPostResult } from './types';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Post a deal to Instagram Business Account.
 * Two-step process: create media container, then publish.
 * Instagram captions cannot contain clickable links — directs users to "link in bio".
 */
export async function postToInstagram(
  accessToken: string,
  igBusinessAccountId: string,
  caption: string,
  imageUrl: string,
  connectionId: string
): Promise<SocialPostResult> {
  try {
    // Step 1: Create media container
    const containerRes = await fetch(`${META_GRAPH_URL}/${igBusinessAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    });

    const containerData = await containerRes.json();

    if (!containerRes.ok || containerData.error) {
      return {
        platform: 'instagram',
        connectionId,
        success: false,
        error: containerData.error?.message || `Container creation failed: HTTP ${containerRes.status}`,
      };
    }

    const creationId = containerData.id;

    // Wait briefly for container processing
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 2: Publish the container
    const publishRes = await fetch(`${META_GRAPH_URL}/${igBusinessAccountId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken,
      }),
    });

    const publishData = await publishRes.json();

    if (!publishRes.ok || publishData.error) {
      return {
        platform: 'instagram',
        connectionId,
        success: false,
        error: publishData.error?.message || `Publish failed: HTTP ${publishRes.status}`,
      };
    }

    const postId = publishData.id;
    return {
      platform: 'instagram',
      connectionId,
      success: true,
      platformPostId: postId,
      platformPostUrl: `https://www.instagram.com/p/${postId}/`,
    };
  } catch (err) {
    return {
      platform: 'instagram',
      connectionId,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
