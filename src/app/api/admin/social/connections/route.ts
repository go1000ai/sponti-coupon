import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/social/connections
 * Admin endpoint — returns all social connections (brand + all vendors).
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

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const serviceClient = await createServiceRoleClient();

  // Fetch brand connections
  const { data: brandConnections } = await serviceClient
    .from('social_connections')
    .select('id, vendor_id, is_brand_account, platform, account_name, account_username, account_avatar_url, is_active, last_posted_at, last_error, connected_at')
    .eq('is_brand_account', true)
    .order('platform');

  // Fetch all vendor connections with vendor business name
  const { data: vendorConnections } = await serviceClient
    .from('social_connections')
    .select('id, vendor_id, is_brand_account, platform, account_name, account_username, account_avatar_url, is_active, last_posted_at, last_error, connected_at')
    .eq('is_brand_account', false)
    .order('connected_at', { ascending: false });

  // Get vendor names for display
  let vendorNames: Record<string, string> = {};
  if (vendorConnections && vendorConnections.length > 0) {
    const vendorIds = Array.from(new Set(vendorConnections.map(c => c.vendor_id).filter(Boolean)));
    const { data: vendors } = await serviceClient
      .from('vendors')
      .select('id, business_name')
      .in('id', vendorIds);
    if (vendors) {
      vendorNames = Object.fromEntries(vendors.map(v => [v.id, v.business_name]));
    }
  }

  return NextResponse.json({
    brand: brandConnections || [],
    vendors: (vendorConnections || []).map(c => ({
      ...c,
      vendor_name: vendorNames[c.vendor_id] || 'Unknown',
    })),
  });
}
