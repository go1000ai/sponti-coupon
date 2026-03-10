import type { SupabaseClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '@/lib/social/crypto';

const SQUARE_TOKEN_URL = 'https://connect.squareup.com/oauth2/token';

/**
 * Get a valid Square access token for a vendor.
 * Decrypts the stored token, checks expiry, and auto-refreshes if needed.
 * Returns the decrypted access token ready for API calls.
 */
export async function getValidSquareToken(
  supabase: SupabaseClient,
  vendorId: string
): Promise<string | null> {
  const { data: vendor } = await supabase
    .from('vendors')
    .select('square_connect_access_token_encrypted, square_connect_refresh_token_encrypted, square_connect_token_expires_at')
    .eq('id', vendorId)
    .single();

  if (!vendor?.square_connect_access_token_encrypted) {
    return null;
  }

  const expiresAt = vendor.square_connect_token_expires_at
    ? new Date(vendor.square_connect_token_expires_at)
    : null;

  // If token expires in more than 5 minutes, return it as-is
  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);
  if (expiresAt && expiresAt > fiveMinFromNow) {
    return decrypt(vendor.square_connect_access_token_encrypted);
  }

  // Token is expired or expiring soon — refresh it
  if (!vendor.square_connect_refresh_token_encrypted) {
    return null;
  }

  const refreshToken = decrypt(vendor.square_connect_refresh_token_encrypted);

  const response = await fetch(SQUARE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APP_ID,
      client_secret: process.env.SQUARE_APP_SECRET,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    console.error('[Square Token] Refresh failed:', await response.text());
    // Mark vendor as charges disabled since token is dead
    await supabase
      .from('vendors')
      .update({ square_connect_charges_enabled: false })
      .eq('id', vendorId);
    return null;
  }

  const data = await response.json();
  const newAccessToken = data.access_token as string;
  const newRefreshToken = data.refresh_token as string;
  const newExpiresAt = data.expires_at as string; // ISO 8601

  // Encrypt and store new tokens
  await supabase
    .from('vendors')
    .update({
      square_connect_access_token_encrypted: encrypt(newAccessToken),
      square_connect_refresh_token_encrypted: encrypt(newRefreshToken),
      square_connect_token_expires_at: newExpiresAt,
    })
    .eq('id', vendorId);

  return newAccessToken;
}
