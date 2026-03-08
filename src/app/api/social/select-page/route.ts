import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { decrypt, encrypt } from '@/lib/social/crypto';

/**
 * POST /api/social/select-page
 * After Facebook OAuth, the user picks which Page to connect.
 * Body: { connection_id: string, page_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { connection_id, page_id } = body;

  if (!connection_id || !page_id) {
    return NextResponse.json({ error: 'connection_id and page_id are required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch the pending connection
  const { data: connection } = await serviceClient
    .from('social_connections')
    .select('*')
    .eq('id', connection_id)
    .eq('refresh_token', 'PENDING_PAGE_SELECTION')
    .single();

  if (!connection) {
    return NextResponse.json({ error: 'Connection not found or already completed' }, { status: 404 });
  }

  // Verify ownership
  if (connection.is_brand_account) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (connection.vendor_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Decrypt the stored pages array
  let pages: { id: string; name: string; token: string; avatar: string | null }[];
  try {
    pages = JSON.parse(decrypt(connection.access_token));
  } catch {
    return NextResponse.json({ error: 'Failed to decrypt page data' }, { status: 500 });
  }

  const selectedPage = pages.find(p => p.id === page_id);
  if (!selectedPage) {
    return NextResponse.json({ error: 'Selected page not found' }, { status: 404 });
  }

  // Update the connection with the selected page's token and info
  const { error: updateError } = await serviceClient
    .from('social_connections')
    .update({
      access_token: encrypt(selectedPage.token),
      refresh_token: null,
      platform_page_id: selectedPage.id,
      account_name: selectedPage.name,
      account_avatar_url: selectedPage.avatar,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection_id);

  if (updateError) {
    console.error('[Select Page] Update error:', updateError);
    return NextResponse.json({ error: 'Failed to save page selection' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
