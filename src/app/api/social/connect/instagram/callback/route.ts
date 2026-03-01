import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/social/crypto';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/social/connect/instagram/callback
 * Handles Meta OAuth callback, finds the linked Instagram Business Account,
 * and stores the connection for Instagram posting.
 */
export async function GET(request: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  if (error || !code || !stateParam) {
    const errorReason = request.nextUrl.searchParams.get('error_reason') || 'access_denied';
    return NextResponse.redirect(new URL(`/vendor/settings?social_error=${errorReason}`, appUrl));
  }

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

  const callbackUrl = `${appUrl}/api/social/connect/instagram/callback`;

  try {
    // Step 1: Exchange code for user access token
    const tokenRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(callbackUrl)}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || tokenData.error) {
      return NextResponse.redirect(new URL('/vendor/settings?social_error=token_exchange_failed', appUrl));
    }

    // Step 2: Get long-lived token
    const longLivedRes = await fetch(
      `${META_GRAPH_URL}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${tokenData.access_token}`
    );
    const longLivedData = await longLivedRes.json();
    const userToken = longLivedData.access_token || tokenData.access_token;

    // Step 3: Get user's Pages with Instagram Business Account info
    const pagesRes = await fetch(
      `${META_GRAPH_URL}/me/accounts?access_token=${userToken}&fields=id,name,access_token,instagram_business_account`
    );
    const pagesData = await pagesRes.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.redirect(new URL('/vendor/settings?social_error=no_pages', appUrl));
    }

    // Find the first page with a linked Instagram Business Account
    const pageWithIG = pagesData.data.find(
      (p: { instagram_business_account?: { id: string } }) => p.instagram_business_account?.id
    );

    if (!pageWithIG || !pageWithIG.instagram_business_account) {
      return NextResponse.redirect(new URL('/vendor/settings?social_error=no_instagram_business', appUrl));
    }

    const igAccountId = pageWithIG.instagram_business_account.id;
    const pageToken = pageWithIG.access_token;

    // Step 4: Get IG account details
    const igRes = await fetch(
      `${META_GRAPH_URL}/${igAccountId}?fields=username,name,profile_picture_url&access_token=${pageToken}`
    );
    const igData = await igRes.json();

    // Step 5: Store in social_connections
    const supabase = await createServiceRoleClient();

    const { error: upsertError } = await supabase
      .from('social_connections')
      .upsert({
        vendor_id: state.isBrand ? null : state.userId,
        is_brand_account: state.isBrand,
        platform: 'instagram',
        access_token: encrypt(pageToken), // Use Page token for IG API calls
        refresh_token: null,
        token_expires_at: null, // Page tokens don't expire
        platform_user_id: igAccountId,
        platform_page_id: igAccountId, // IG Business Account ID is used as the "page" for API calls
        account_name: igData.name || pageWithIG.name,
        account_username: igData.username || null,
        account_avatar_url: igData.profile_picture_url || null,
        is_active: true,
        last_error: null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'vendor_id,platform,is_brand_account',
      });

    if (upsertError) {
      console.error('[IG OAuth] Upsert error:', upsertError);
      return NextResponse.redirect(new URL('/vendor/settings?social_error=db_error', appUrl));
    }

    const redirectPath = state.isBrand ? '/admin/social' : '/vendor/settings';
    return NextResponse.redirect(new URL(`${redirectPath}?social_connected=instagram`, appUrl));
  } catch (err) {
    console.error('[IG OAuth] Error:', err);
    return NextResponse.redirect(new URL('/vendor/settings?social_error=unknown', appUrl));
  }
}
