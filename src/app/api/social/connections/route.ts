import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/social/connections
 * Returns the current vendor's (or admin's brand) social connections.
 * Tokens are NOT returned to the client — only connection metadata.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'vendor' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch vendor's own connections
  const { data: vendorConnections } = await serviceClient
    .from('social_connections')
    .select('id, vendor_id, is_brand_account, platform, platform_user_id, platform_page_id, account_name, account_username, account_avatar_url, is_active, last_posted_at, last_error, connected_at, updated_at')
    .eq('vendor_id', user.id)
    .order('platform');

  // If admin, also fetch brand connections
  let brandConnections: typeof vendorConnections = [];
  if (profile.role === 'admin') {
    const { data: brands } = await serviceClient
      .from('social_connections')
      .select('id, vendor_id, is_brand_account, platform, platform_user_id, platform_page_id, account_name, account_username, account_avatar_url, is_active, last_posted_at, last_error, connected_at, updated_at')
      .eq('is_brand_account', true)
      .order('platform');
    brandConnections = brands || [];
  }

  return NextResponse.json({
    vendor: vendorConnections || [],
    brand: brandConnections,
  });
}
