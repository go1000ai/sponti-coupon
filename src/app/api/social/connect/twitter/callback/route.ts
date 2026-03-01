import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/social/crypto';

/**
 * GET /api/social/connect/twitter/callback
 * Handles X/Twitter OAuth 2.0 PKCE callback, exchanges code for tokens.
 */
export async function GET(request: NextRequest) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  if (error || !code || !stateParam) {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=access_denied', appUrl));
  }

  let state: { userId: string; isBrand: boolean; codeVerifier: string };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=invalid_state', appUrl));
  }

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=not_configured', appUrl));
  }

  const callbackUrl = `${appUrl}/api/social/connect/twitter/callback`;

  try {
    // Step 1: Exchange authorization code for access + refresh tokens
    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
        code_verifier: state.codeVerifier,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error('[Twitter OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/vendor/settings?social_error=token_exchange_failed', appUrl));
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 7200;

    // Step 2: Fetch user info
    const userRes = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userData = await userRes.json();
    const twitterUser = userData.data;

    // Step 3: Store in social_connections
    const supabase = await createServiceRoleClient();

    const { error: upsertError } = await supabase
      .from('social_connections')
      .upsert({
        vendor_id: state.isBrand ? null : state.userId,
        is_brand_account: state.isBrand,
        platform: 'twitter',
        access_token: encrypt(accessToken),
        refresh_token: refreshToken ? encrypt(refreshToken) : null,
        token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        platform_user_id: twitterUser?.id || null,
        platform_page_id: null,
        account_name: twitterUser?.name || null,
        account_username: twitterUser?.username || null,
        account_avatar_url: twitterUser?.profile_image_url || null,
        is_active: true,
        last_error: null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'vendor_id,platform,is_brand_account',
      });

    if (upsertError) {
      console.error('[Twitter OAuth] Upsert error:', upsertError);
      return NextResponse.redirect(new URL('/vendor/settings?social_error=db_error', appUrl));
    }

    const redirectPath = state.isBrand ? '/admin/social' : '/vendor/settings';
    return NextResponse.redirect(new URL(`${redirectPath}?social_connected=twitter`, appUrl));
  } catch (err) {
    console.error('[Twitter OAuth] Error:', err);
    return NextResponse.redirect(new URL('/vendor/settings?social_error=unknown', appUrl));
  }
}
