import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from '@/lib/social/crypto';

/**
 * POST /api/social/connect/facebook/select-page
 * Vendor selects which Facebook Page to connect from the multi-page picker.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { connectionId, pageId } = await request.json();

    if (!connectionId || !pageId) {
      return NextResponse.json({ error: 'Missing connectionId or pageId' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    // Fetch the temporary record with encrypted page tokens
    const { data: conn, error: fetchError } = await serviceClient
      .from('social_connections')
      .select('*')
      .eq('id', connectionId)
      .eq('refresh_token', 'PENDING_PAGE_SELECTION')
      .single();

    if (fetchError || !conn) {
      return NextResponse.json({ error: 'Selection expired or not found. Please reconnect.' }, { status: 404 });
    }

    // Verify ownership
    if (conn.vendor_id !== user.id && !conn.is_brand_account) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check expiry (10 min from creation)
    if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
      await serviceClient.from('social_connections').delete().eq('id', connectionId);
      return NextResponse.json({ error: 'Selection expired. Please reconnect Facebook.' }, { status: 410 });
    }

    // Decrypt stored pages
    const pagesJson = decrypt(conn.access_token);
    const pages: Array<{ id: string; name: string; token: string; avatar: string | null }> = JSON.parse(pagesJson);

    const selectedPage = pages.find(p => p.id === pageId);
    if (!selectedPage) {
      return NextResponse.json({ error: 'Page not found in available pages' }, { status: 400 });
    }

    // Update the record with the selected page's data
    const { error: updateError } = await serviceClient
      .from('social_connections')
      .update({
        access_token: encrypt(selectedPage.token),
        refresh_token: null,
        token_expires_at: null,
        platform_page_id: selectedPage.id,
        account_name: selectedPage.name,
        account_avatar_url: selectedPage.avatar,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    if (updateError) {
      console.error('[FB Select Page] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to save selection' }, { status: 500 });
    }

    return NextResponse.json({ success: true, pageName: selectedPage.name });
  } catch (err) {
    console.error('[FB Select Page] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
