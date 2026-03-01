import type { SocialPostResult } from './types';

const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2';

/**
 * Post a deal to TikTok.
 * TikTok Content Posting API supports photo mode (photo posts) and video.
 * For deals with only images, we use photo mode.
 */
export async function postToTikTok(
  accessToken: string,
  caption: string,
  imageUrl: string,
  connectionId: string
): Promise<SocialPostResult> {
  try {
    // TikTok photo post via Content Posting API
    // Uses the "direct post" photo mode
    const postRes = await fetch(`${TIKTOK_API_URL}/post/publish/content/init/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        post_info: {
          title: caption.substring(0, 150), // TikTok title limit
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_comment: false,
          auto_add_music: true,
        },
        source_info: {
          source: 'PULL_FROM_URL',
          photo_cover_index: 0,
          photo_images: [imageUrl],
        },
        post_mode: 'DIRECT_POST',
        media_type: 'PHOTO',
      }),
    });

    const postData = await postRes.json();

    if (!postRes.ok || postData.error?.code) {
      // If photo mode isn't supported, skip gracefully
      const errorMsg = postData.error?.message || postData.error?.code || `HTTP ${postRes.status}`;
      return {
        platform: 'tiktok',
        connectionId,
        success: false,
        error: errorMsg,
      };
    }

    const publishId = postData.data?.publish_id;
    return {
      platform: 'tiktok',
      connectionId,
      success: true,
      platformPostId: publishId,
    };
  } catch (err) {
    return {
      platform: 'tiktok',
      connectionId,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
