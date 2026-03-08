import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/social/crypto';

const META_GRAPH_URL = 'https://graph.facebook.com/v21.0';

/**
 * GET /api/social/connect/facebook/callback
 * Handles the OAuth callback from Meta, exchanges code for tokens,
 * fetches the user's Pages. If multiple pages, redirects to a picker.
 * If one page, saves directly.
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

    const supabase = await createServiceRoleClient();

    // If multiple pages, store them temporarily and redirect to picker
    if (pagesData.data.length > 1) {
      const pages = pagesData.data.map((p: { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }) => ({
        id: p.id,
        name: p.name,
        token: p.access_token,
        avatar: p.picture?.data?.url || null,
      }));

      // Store encrypted page tokens temporarily in DB
      const { data: tempRecord, error: tempError } = await supabase
        .from('social_connections')
        .upsert({
          vendor_id: state.isBrand ? null : state.userId,
          is_brand_account: state.isBrand,
          platform: 'facebook',
          access_token: encrypt(JSON.stringify(pages)),
          refresh_token: 'PENDING_PAGE_SELECTION',
          token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min expiry
          platform_user_id: null,
          platform_page_id: null,
          account_name: null,
          account_username: null,
          account_avatar_url: null,
          is_active: false,
          last_error: null,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'vendor_id,platform,is_brand_account',
        })
        .select('id')
        .single();

      if (tempError) {
        console.error('[FB OAuth] Temp store error:', tempError);
        return NextResponse.redirect(new URL(`${basePath}${sep}social_error=db_error`, appUrl));
      }

      // Redirect with page names for the picker (no tokens in URL)
      const pageList = pages.map((p: { id: string; name: string }) => `${p.id}:${encodeURIComponent(p.name)}`).join(',');
      return NextResponse.redirect(new URL(`${basePath}${sep}fb_pick_page=${tempRecord?.id || 'true'}&fb_pages=${pageList}`, appUrl));
    }

    // Single page — save directly
    const page = pagesData.data[0];
    await savePage(supabase, state, page);

    return NextResponse.redirect(new URL(`${basePath}${sep}social_connected=facebook`, appUrl));
  } catch (err) {
    console.error('[FB OAuth] Error:', err);
    return NextResponse.redirect(new URL(`${basePath}${sep}social_error=unknown`, appUrl));
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function savePage(supabase: any, state: { userId: string; isBrand: boolean }, page: { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }) {
  const { error: upsertError } = await supabase
    .from('social_connections')
    .upsert({
      vendor_id: state.isBrand ? null : state.userId,
      is_brand_account: state.isBrand,
      platform: 'facebook',
      access_token: encrypt(page.access_token),
      refresh_token: null,
      token_expires_at: null,
      platform_user_id: null,
      platform_page_id: page.id,
      account_name: page.name,
      account_username: null,
      account_avatar_url: page.picture?.data?.url || null,
      is_active: true,
      last_error: null,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'vendor_id,platform,is_brand_account',
    });

  if (upsertError) {
    console.error('[FB OAuth] Upsert error:', upsertError);
    throw upsertError;
  }
}
