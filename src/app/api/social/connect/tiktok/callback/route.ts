import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/social/crypto';

const TIKTOK_API_URL = 'https://open.tiktokapis.com/v2';

/**
 * GET /api/social/connect/tiktok/callback
 * Handles TikTok OAuth callback, exchanges code for tokens.
 */
export async function GET(request: NextRequest) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  if (error || !code || !stateParam) {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=access_denied', appUrl));
  }

  let state: { userId: string; isBrand: boolean };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=invalid_state', appUrl));
  }

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const clientSecret = process.env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=not_configured', appUrl));
  }

  const callbackUrl = `${appUrl}/api/social/connect/tiktok/callback`;

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch(`${TIKTOK_API_URL}/oauth/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: clientKey,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error?.code) {
      console.error('[TikTok OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/vendor/settings?social_error=token_exchange_failed', appUrl));
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 86400;
    const openId = tokenData.open_id;

    // Step 2: Fetch user info
    const userRes = await fetch(`${TIKTOK_API_URL}/user/info/?fields=display_name,avatar_url,username`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();
    const tiktokUser = userData.data?.user;

    // Step 3: Store in social_connections
    const supabase = await createServiceRoleClient();

    const { error: upsertError } = await supabase
      .from('social_connections')
      .upsert({
        vendor_id: state.isBrand ? null : state.userId,
        is_brand_account: state.isBrand,
        platform: 'tiktok',
        access_token: encrypt(accessToken),
        refresh_token: refreshToken ? encrypt(refreshToken) : null,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        platform_user_id: openId || null,
        platform_page_id: null,
        account_name: tiktokUser?.display_name || null,
        account_username: tiktokUser?.username || null,
        account_avatar_url: tiktokUser?.avatar_url || null,
        is_active: true,
        last_error: null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'vendor_id,platform,is_brand_account',
      });

    if (upsertError) {
      console.error('[TikTok OAuth] Upsert error:', upsertError);
      return NextResponse.redirect(new URL('/vendor/settings?social_error=db_error', appUrl));
    }

    const redirectPath = state.isBrand ? '/admin/social' : '/vendor/settings';
    return NextResponse.redirect(new URL(`${redirectPath}?social_connected=tiktok`, appUrl));
  } catch (err) {
    console.error('[TikTok OAuth] Error:', err);
    return NextResponse.redirect(new URL('/vendor/settings?social_error=unknown', appUrl));
  }
}
