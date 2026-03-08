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

  const basePath = state.isBrand ? '/admin?tab=social' : '/vendor/social';
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

    // Step 2.5: Check granted permissions and user identity
    const [permRes, meRes] = await Promise.all([
      fetch(`${META_GRAPH_URL}/me/permissions?access_token=${userToken}`),
      fetch(`${META_GRAPH_URL}/me?fields=id,name&access_token=${userToken}`),
    ]);
    const permData = await permRes.json();
    const meData = await meRes.json();
    console.log('[FB OAuth] User:', JSON.stringify(meData));
    console.log('[FB OAuth] Permissions:', JSON.stringify(permData));

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

    let allPages = pagesData.data || [];

    // Step 3b: If /me/accounts is empty, try Business API (pages managed via Business Portfolio)
    if (allPages.length === 0) {
      console.log('[FB OAuth] No pages from /me/accounts, trying Business API...');
      try {
        const bizRes = await fetch(
          `${META_GRAPH_URL}/me/businesses?access_token=${userToken}&fields=id,name`
        );
        const bizData = await bizRes.json();
        console.log('[FB OAuth] Businesses:', JSON.stringify(bizData));

        if (bizData.data && bizData.data.length > 0) {
          for (const biz of bizData.data) {
            const bizPagesRes = await fetch(
              `${META_GRAPH_URL}/${biz.id}/owned_pages?access_token=${userToken}&fields=id,name,access_token,picture`
            );
            const bizPagesData = await bizPagesRes.json();
            console.log(`[FB OAuth] Business ${biz.name} (${biz.id}) pages:`, JSON.stringify({
              hasData: !!bizPagesData.data,
              count: bizPagesData.data?.length || 0,
              error: bizPagesData.error || null,
            }));
            if (bizPagesData.data) {
              allPages = [...allPages, ...bizPagesData.data];
            }
          }
        }
      } catch (bizErr) {
        console.error('[FB OAuth] Business API fallback error:', bizErr);
      }
    }

    if (allPages.length === 0) {
      const grantedPerms = permData.data?.filter((p: { status: string }) => p.status === 'granted').map((p: { permission: string }) => p.permission) || [];
      const declinedPerms = permData.data?.filter((p: { status: string }) => p.status === 'declined').map((p: { permission: string }) => p.permission) || [];
      console.error('[FB OAuth] No pages. Granted:', grantedPerms, 'Declined:', declinedPerms, 'User:', meData.name, meData.id);
      const debugInfo = encodeURIComponent(`Granted: ${grantedPerms.join(', ')}. Declined: ${declinedPerms.join(', ') || 'none'}. User: ${meData.name || 'unknown'}`);
      return NextResponse.redirect(new URL(`${basePath}${sep}social_error=no_pages&debug=${debugInfo}`, appUrl));
    }

    const supabase = await createServiceRoleClient();

    const pages = allPages.map((p: { id: string; name: string; access_token: string; picture?: { data?: { url?: string } } }) => ({
      id: p.id,
      name: p.name,
      token: p.access_token,
      avatar: p.picture?.data?.url || null,
    }));

    console.log('[FB OAuth] Saving pages for picker. userId:', state.userId, 'isBrand:', state.isBrand, 'pageCount:', pages.length);

    // Delete any existing facebook connection for this vendor to avoid upsert conflicts
    const vendorId = state.isBrand ? null : state.userId;
    await supabase
      .from('social_connections')
      .delete()
      .eq('vendor_id', vendorId)
      .eq('platform', 'facebook')
      .eq('is_brand_account', state.isBrand);

    // If only 1 page, skip the picker and save directly
    if (pages.length === 1) {
      const page = pages[0];
      const { error: insertError } = await supabase
        .from('social_connections')
        .insert({
          vendor_id: vendorId,
          is_brand_account: state.isBrand,
          platform: 'facebook',
          access_token: encrypt(page.token),
          refresh_token: null,
          token_expires_at: null, // Page tokens don't expire
          platform_user_id: null,
          platform_page_id: page.id,
          account_name: page.name,
          account_username: null,
          account_avatar_url: page.avatar,
          is_active: true,
          last_error: null,
          connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('[FB OAuth] Insert error:', JSON.stringify(insertError));
        return NextResponse.redirect(new URL(`${basePath}${sep}social_error=db_error`, appUrl));
      }

      console.log('[FB OAuth] Single page auto-selected:', page.name, page.id);
      return NextResponse.redirect(new URL(`${basePath}${sep}social_connected=facebook`, appUrl));
    }

    // Multiple pages — insert temp record for page picker
    const { data: tempRecord, error: tempError } = await supabase
      .from('social_connections')
      .insert({
        vendor_id: vendorId,
        is_brand_account: state.isBrand,
        platform: 'facebook',
        access_token: encrypt(JSON.stringify(pages)),
        refresh_token: 'PENDING_PAGE_SELECTION',
        token_expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        platform_user_id: null,
        platform_page_id: null,
        account_name: null,
        account_username: null,
        account_avatar_url: null,
        is_active: false,
        last_error: null,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (tempError) {
      console.error('[FB OAuth] Insert error:', JSON.stringify(tempError));
      return NextResponse.redirect(new URL(`${basePath}${sep}social_error=db_error`, appUrl));
    }

    console.log('[FB OAuth] Temp record created:', tempRecord?.id);

    // Redirect with page names for the picker (no tokens in URL)
    const pageList = pages.map((p: { id: string; name: string }) => `${p.id}:${encodeURIComponent(p.name)}`).join(',');
    const redirectUrl = `${basePath}${sep}fb_pick_page=${tempRecord?.id || 'true'}&fb_pages=${pageList}`;
    console.log('[FB OAuth] Redirecting to:', redirectUrl);
    return NextResponse.redirect(new URL(redirectUrl, appUrl));
  } catch (err) {
    console.error('[FB OAuth] Error:', err);
    return NextResponse.redirect(new URL(`${basePath}${sep}social_error=unknown`, appUrl));
  }
}

