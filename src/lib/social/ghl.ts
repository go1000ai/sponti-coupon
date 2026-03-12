import type { SocialPostResult } from './types';

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';

interface GHLAccount {
  id: string;
  name: string;
  platform: string;
  type: string;
  isExpired: boolean;
}

interface GHLPostResult {
  success: boolean;
  statusCode: number;
  message: string;
  results?: { id?: string; postId?: string };
}

function getHeaders(): Record<string, string> {
  const apiKey = process.env.GHL_API_KEY;
  if (!apiKey) throw new Error('GHL_API_KEY is not configured');
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Version': '2021-07-28',
    'Content-Type': 'application/json',
  };
}

function getLocationId(): string {
  const id = process.env.GHL_LOCATION_ID;
  if (!id) throw new Error('GHL_LOCATION_ID is not configured');
  return id;
}

function getUserId(): string {
  const id = process.env.GHL_USER_ID;
  if (!id) throw new Error('GHL_USER_ID is not configured');
  return id;
}

/**
 * Fetch all connected social accounts from GHL Social Planner.
 */
export async function getGHLAccounts(): Promise<GHLAccount[]> {
  const locationId = getLocationId();
  const res = await fetch(`${GHL_BASE_URL}/social-media-posting/${locationId}/accounts`, {
    headers: getHeaders(),
  });
  const data = await res.json();
  if (!data.success || !data.results?.accounts) {
    console.error('[GHL] Failed to fetch accounts:', data);
    return [];
  }
  return data.results.accounts.filter((a: GHLAccount) => !a.isExpired);
}

/**
 * Post content to GHL Social Planner — posts to all connected accounts for the given platforms.
 * GHL handles the actual Facebook/Instagram/TikTok posting through their approved app.
 */
export async function postViaGHL(
  caption: string,
  imageUrl: string | null,
  videoUrl: string | null,
  platforms: string[],
  connectionId: string,
  scheduleDate?: string,
): Promise<SocialPostResult[]> {
  const results: SocialPostResult[] = [];

  try {
    const locationId = getLocationId();
    const userId = getUserId();
    const accounts = await getGHLAccounts();

    if (!accounts.length) {
      return [{
        platform: 'facebook',
        connectionId,
        success: false,
        error: 'No connected social accounts found in GHL',
      }];
    }

    // Map our platform names to GHL platform names
    const platformMap: Record<string, string> = {
      facebook: 'facebook',
      instagram: 'instagram',
      tiktok: 'tiktok',
      twitter: 'twitter',
    };

    // Find matching GHL accounts for requested platforms
    const targetAccounts = accounts.filter(a =>
      platforms.some(p => platformMap[p] === a.platform)
    );

    if (!targetAccounts.length) {
      return [{
        platform: 'facebook',
        connectionId,
        success: false,
        error: `No GHL accounts connected for platforms: ${platforms.join(', ')}. Connect them in GHL Social Planner.`,
      }];
    }

    const accountIds = targetAccounts.map(a => a.id);

    // Build media array
    const media: { url: string; type: string }[] = [];
    if (videoUrl) {
      media.push({ url: videoUrl, type: 'video/mp4' });
    } else if (imageUrl) {
      const isJpg = imageUrl.includes('.jpg') || imageUrl.includes('.jpeg');
      media.push({ url: imageUrl, type: isJpg ? 'image/jpeg' : 'image/png' });
    }

    // Build post payload
    const postType = videoUrl ? 'reel' : 'post';
    const payload: Record<string, unknown> = {
      type: postType,
      accountIds,
      userId,
      summary: caption,
      ...(media.length > 0 ? { media } : {}),
    };

    // Set status — required by GHL to appear in Social Planner
    if (scheduleDate) {
      payload.status = 'scheduled';
      payload.scheduleDate = scheduleDate;
    } else {
      payload.status = 'published';
    }

    console.log('[GHL] Creating post:', JSON.stringify({
      type: postType,
      accountCount: accountIds.length,
      platforms: targetAccounts.map(a => `${a.platform}:${a.name}`),
      hasMedia: media.length > 0,
      scheduled: !!scheduleDate,
    }));

    const res = await fetch(`${GHL_BASE_URL}/social-media-posting/${locationId}/posts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    const data: GHLPostResult = await res.json();
    console.log('[GHL] Post response:', res.status, JSON.stringify(data).slice(0, 500));

    if (data.success || res.status === 201) {
      // Return a success result for each platform
      for (const account of targetAccounts) {
        results.push({
          platform: account.platform as 'facebook' | 'instagram' | 'tiktok' | 'twitter',
          connectionId,
          success: true,
          platformPostId: data.results?.postId || data.results?.id || undefined,
        });
      }
    } else {
      for (const account of targetAccounts) {
        results.push({
          platform: account.platform as 'facebook' | 'instagram' | 'tiktok' | 'twitter',
          connectionId,
          success: false,
          error: data.message || `GHL post failed (HTTP ${res.status})`,
        });
      }
    }
  } catch (err) {
    results.push({
      platform: 'facebook',
      connectionId,
      success: false,
      error: err instanceof Error ? err.message : 'GHL posting error',
    });
  }

  return results;
}
