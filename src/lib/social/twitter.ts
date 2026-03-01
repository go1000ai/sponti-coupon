import type { SocialPostResult } from './types';

/**
 * Post a deal to X/Twitter.
 * Uploads the image via media endpoint, then creates a tweet with the media attached.
 */
export async function postToTwitter(
  accessToken: string,
  caption: string,
  imageUrl: string,
  claimUrl: string,
  connectionId: string
): Promise<SocialPostResult> {
  try {
    // Ensure caption includes the link and stays within 280 chars
    let tweetText = caption.includes(claimUrl) ? caption : `${caption}\n${claimUrl}`;
    if (tweetText.length > 280) {
      // Truncate caption to fit, keeping the link
      const maxCaptionLen = 280 - claimUrl.length - 2; // -2 for \n
      tweetText = `${caption.substring(0, maxCaptionLen - 3)}...\n${claimUrl}`;
    }

    // Download the image and upload to Twitter media endpoint
    const mediaId = await uploadMediaToTwitter(accessToken, imageUrl);

    // Create the tweet
    const tweetBody: Record<string, unknown> = { text: tweetText };
    if (mediaId) {
      tweetBody.media = { media_ids: [mediaId] };
    }

    const tweetRes = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetBody),
    });

    const tweetData = await tweetRes.json();

    if (!tweetRes.ok || tweetData.errors) {
      return {
        platform: 'twitter',
        connectionId,
        success: false,
        error: tweetData.errors?.[0]?.message || tweetData.detail || `HTTP ${tweetRes.status}`,
      };
    }

    const tweetId = tweetData.data?.id;
    return {
      platform: 'twitter',
      connectionId,
      success: true,
      platformPostId: tweetId,
      platformPostUrl: tweetId ? `https://twitter.com/i/web/status/${tweetId}` : undefined,
    };
  } catch (err) {
    return {
      platform: 'twitter',
      connectionId,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Upload an image to Twitter's media endpoint.
 * Twitter v2 doesn't have its own media upload — uses v1.1 media/upload.
 * Returns the media_id_string or null if upload fails.
 */
async function uploadMediaToTwitter(
  accessToken: string,
  imageUrl: string
): Promise<string | null> {
  try {
    // Download the image
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) return null;

    const imageBuffer = await imageRes.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Upload via v1.1 media/upload (still requires OAuth 1.0a or Bearer token)
    // Note: For OAuth 2.0 with user context, Twitter now supports media upload via v1.1
    const formData = new URLSearchParams();
    formData.append('media_data', base64Image);
    formData.append('media_category', 'tweet_image');

    const uploadRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!uploadRes.ok) {
      console.warn('[Twitter] Media upload failed:', uploadRes.status);
      return null;
    }

    const uploadData = await uploadRes.json();
    return uploadData.media_id_string || null;
  } catch (err) {
    console.warn('[Twitter] Media upload error:', err);
    return null; // Post without image if upload fails
  }
}
