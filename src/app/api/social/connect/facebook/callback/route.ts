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

  // Decode state early to determine correct redirect path
  let state: { userId: string; isBrand: boolean } = { userId: '', isBrand: false };
  if (stateParam) {
    try {
      state = JSON.parse(Buffer.from(stateParam, 'base64url').toString());
    } catch { /* handled below */ }
  }

  const basePath = state.isBrand ? '/admin?tab=social' : '/vendor/settings';
  const sep = state.isBrand ? '&' : '?';

  if (error || !code || !stateParam) {
    const errorReason = request.nextUrl.searchParams.get('error_reason') || 'access_denied';
    return NextResponse.redirect(new URL(`${basePath}${sep}social_error=${errorReason}`, appUrl));
  }

  if (!state.userId) {
    return NextResponse.redirect(new URL(`${basePath}${sep}social_error=invalid_state`, appUrl));
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    return NextResponse.redirect(new URL(`${basePath}${sep}social_error=not_configured`, appUrl));
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
      return NextResponse.redirect(new URL(`${basePath}${sep}social_error=token_exchange_failed`, appUrl));
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

    console.log('[FB OAuth] Pages response:', JSON.stringify({
      hasData: !!pagesData.data,
      count: pagesData.data?.length || 0,
      pages: pagesData.data?.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })) || [],
      error: pagesData.error || null,
    }));

    if (!pagesData.data || pagesData.data.length === 0) {
      console.error('[FB OAuth] No pages. Full response:', JSON.stringify(pagesData));
      return NextResponse.redirect(new URL(`${basePath}${sep}social_error=no_pages`, appUrl));
    }

    // Use the first page (most vendors have one page)
    const page = pagesData.data[0];
    const pageToken = page.access_token;
    const pageId = page.id;
    const pageName = page.name;
    const pageAvatar = page.picture?.data?.url || null;

    console.log('[FB OAuth] Connected page:', pageName, 'ID:', pageId, 'isBrand:', state.isBrand);

    // Step 4: Store in social_connections
    const supabase = await createServiceRoleClient();

    const { error: upsertError } = await supabase
      .from('social_connections')
      .upsert({
        vendor_id: state.isBrand ? null : state.userId,
        is_brand_account: state.isBrand,
        platform: 'facebook',
        access_token: encrypt(pageToken),
        refresh_token: null,
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
      return NextResponse.redirect(new URL(`${basePath}${sep}social_error=db_error`, appUrl));
    }

    return NextResponse.redirect(new URL(`${basePath}${sep}social_connected=facebook`, appUrl));
  } catch (err) {
    console.error('[FB OAuth] Error:', err);
    return NextResponse.redirect(new URL(`${basePath}${sep}social_error=unknown`, appUrl));
  }
}
