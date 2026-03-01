import type { SupabaseClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from './crypto';
import type { SocialConnection } from './types';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * Ensure a connection's access token is valid, refreshing if needed.
 * Returns the decrypted, valid access token or null if refresh failed.
 */
export async function ensureValidToken(
  supabase: SupabaseClient,
  connection: SocialConnection
): Promise<string | null> {
  const decryptedToken = decrypt(connection.access_token);

  // If no expiration set, token is long-lived (e.g., Facebook Page tokens)
  if (!connection.token_expires_at) {
    return decryptedToken;
  }

  const expiresAt = new Date(connection.token_expires_at);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer

  // Token is still valid
  if (expiresAt.getTime() - now.getTime() > bufferMs) {
    return decryptedToken;
  }

  // Token is expired or about to expire — refresh
  try {
    const refreshed = await refreshToken(connection);
    if (!refreshed) return null;

    // Update the stored token
    await supabase
      .from('social_connections')
      .update({
        access_token: encrypt(refreshed.accessToken),
        refresh_token: refreshed.refreshToken ? encrypt(refreshed.refreshToken) : connection.refresh_token,
        token_expires_at: refreshed.expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return refreshed.accessToken;
  } catch (err) {
    console.error(`[Token Refresh] Failed for ${connection.platform} connection ${connection.id}:`, err);

    // Mark connection as errored
    await supabase
      .from('social_connections')
      .update({
        last_error: `Token refresh failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id);

    return null;
  }
}

interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
}

async function refreshToken(connection: SocialConnection): Promise<RefreshResult | null> {
  switch (connection.platform) {
    case 'facebook':
    case 'instagram':
      return refreshMetaToken(connection);
    case 'twitter':
      return refreshTwitterToken(connection);
    case 'tiktok':
      return refreshTikTokToken(connection);
    default:
      return null;
  }
}

async function refreshMetaToken(connection: SocialConnection): Promise<RefreshResult | null> {
  // Facebook Page tokens obtained via long-lived user token flow don't expire
  // But if the user token was used directly, refresh it
  const decryptedToken = decrypt(connection.access_token);
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) return null;

  const res = await fetch(
    `${META_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${decryptedToken}`
  );

  if (!res.ok) return null;

  const data = await res.json();
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 5184000) * 1000).toISOString(),
  };
}

async function refreshTwitterToken(connection: SocialConnection): Promise<RefreshResult | null> {
  if (!connection.refresh_token) return null;

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const decryptedRefresh = decrypt(connection.refresh_token);

  const res = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: decryptedRefresh,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString(),
  };
}

async function refreshTikTokToken(connection: SocialConnection): Promise<RefreshResult | null> {
  if (!connection.refresh_token) return null;

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return null;

  const decryptedRefresh = decrypt(connection.refresh_token);

  const res = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: decryptedRefresh,
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in || 86400) * 1000).toISOString(),
  };
}
