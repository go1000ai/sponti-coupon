import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/social/crypto';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/social/connect/facebook/callback
 * Handles the OAuth callback from Meta, exchanges code for tokens,
 * fetches the user's Pages, and stores the Page access token.
 */
export async function GET(request: NextRequest) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').trim();
  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  if (error || !code || !stateParam) {
    const errorReason = request.nextUrl.searchParams.get('error_reason') || 'access_denied';
    return NextResponse.redirect(new URL(`/vendor/settings?social_error=${errorReason}`, appUrl));
  }

  // Decode state
  let state: { userId: string; isBrand: boolean };
  try {
    state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
  } catch {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=invalid_state', appUrl));
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(new URL('/vendor/settings?social_error=not_configured', appUrl));
  }

  const callbackUrl = `${appUrl}/api/social/connect/facebook/callback`;

  try {
    // Step 1: Exchange code for short-lived user access token
    const tokenRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error('[FB OAuth] Token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/vendor/settings?social_error=token_exchange_failed', appUrl));
    }

    // Step 2: Exchange for long-lived user token (60 days)
    const longLivedRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const longLivedData = await longLivedRes.json();
    const userToken = longLivedData.access_token || tokenData.access_token;

    // Step 3: Get user's Pages
    const pagesRes = await fetch(
      `${META_GRAPH_URL}/me/accounts?access_token=${userToken}&fields=id,name,access_token,picture`
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(new URL('/vendor/settings?social_error=no_pages', appUrl));
    }

    // Use the first page (most vendors have one page)
    // TODO: If vendor has multiple pages, let them choose
    const page = pagesData.data[0];
    const pageToken = page.access_token; // Page tokens from long-lived user tokens never expire
    const pageId = page.id;
    const pageName = page.name;
    const pageAvatar = page.picture?.data?.url || null;

    // Step 4: Store in social_connections
    const supabase = await createServiceRoleClient();

    // Upsert — replace existing connection for this vendor/platform
    const { error: upsertError } = await supabase
      .from('social_connections')
      .upsert({
        vendor_id: state.isBrand ? null : state.userId,
        is_brand_account: state.isBrand,
        platform: 'facebook',
        access_token: encrypt(pageToken),
        refresh_token: null, // Page tokens don't expire
        token_expires_at: null,
        platform_user_id: null,
        platform_page_id: pageId,
        account_name: pageName,
        account_username: null,
        account_avatar_url: pageAvatar,
        is_active: true,
        last_error: null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'vendor_id,platform,is_brand_account',
      });

    if (upsertError) {
      console.error('[FB OAuth] Upsert error:', upsertError);
      return NextResponse.redirect(new URL('/vendor/settings?social_error=db_error', appUrl));
    }

    const redirectPath = state.isBrand ? '/admin/social' : '/vendor/settings';
    return NextResponse.redirect(new URL(`${redirectPath}?social_connected=facebook`, appUrl));
  } catch (err) {
    console.error('[FB OAuth] Error:', err);
    return NextResponse.redirect(new URL('/vendor/settings?social_error=unknown', appUrl));
  }
}
