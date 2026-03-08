import type { SocialPostResult } from './types';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Post a deal to Instagram Business Account — image or Reel.
 * Two-step process: create media container, then publish.
 * Instagram captions cannot contain clickable links — directs users to "link in bio".
 */
export async function postToInstagram(
  accessToken: string,
  igBusinessAccountId: string,
  caption: string,
  imageUrl: string,
  connectionId: string,
  videoUrl?: string
): Promise<SocialPostResult> {
  try {
    // Build container payload — image or Reel
    const containerPayload: Record<string, string> = {
      caption,
      access_token: accessToken,
    };

    if (videoUrl) {
      // Instagram Reel: requires video_url and media_type REELS
      containerPayload.media_type = 'REELS';
      containerPayload.video_url = videoUrl;
      if (imageUrl) {
        containerPayload.cover_url = imageUrl; // optional thumbnail
      }
    } else {
      containerPayload.image_url = imageUrl;
    }

    // Step 1: Create media container
    const containerRes = await fetch(`${META_GRAPH_URL}/${igBusinessAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(containerPayload),
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

    // Wait for container processing — videos take longer than images
    const waitTime = videoUrl ? 15000 : 3000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // For videos, poll the container status (up to 60 seconds)
    if (videoUrl) {
      let ready = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        const statusRes = await fetch(
          `${META_GRAPH_URL}/${creationId}?fields=status_code&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();

        if (statusData.status_code === 'FINISHED') {
          ready = true;
          break;
        }
        if (statusData.status_code === 'ERROR') {
          return {
            platform: 'instagram',
            connectionId,
            success: false,
            error: 'Video processing failed on Instagram',
          };
        }
        // Still processing — wait 5 more seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      if (!ready) {
        return {
          platform: 'instagram',
          connectionId,
          success: false,
          error: 'Video processing timed out (60s)',
        };
      }
    }

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

    // Fetch the actual permalink from the Graph API — numeric IDs don't work in Instagram URLs
    let postUrl = `https://www.instagram.com/sponticoupon/`;
    try {
      const permalinkRes = await fetch(
        `${META_GRAPH_URL}/${postId}?fields=permalink&access_token=${accessToken}`
      );
      const permalinkData = await permalinkRes.json();
      if (permalinkData.permalink) {
        postUrl = permalinkData.permalink;
      }
    } catch {
      // Non-critical — fall back to profile URL
    }

    return {
      platform: 'instagram',
      connectionId,
      success: true,
      platformPostId: postId,
      platformPostUrl: postUrl,
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
