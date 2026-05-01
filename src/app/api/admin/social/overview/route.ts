import { NextResponse } from 'next/server';
import { verifyAdmin, forbiddenResponse } from '@/lib/admin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/social/overview
 * Returns brand connections, recent deals (with their latest post status per platform),
 * and recent post history for the admin social dashboard.
 *
 * Node runtime — service role client is used to read social_connections with
 * encrypted tokens; we never return raw tokens to the client.
 */
export async function GET() {
  const admin = await verifyAdmin();
  if (!admin) return forbiddenResponse();

  const supabase = await createServiceRoleClient();

  // Brand connections — strip out token columns, never expose them
  const { data: brandConnections } = await supabase
    .from('social_connections')
    .select('id, platform, account_name, account_username, account_avatar_url, is_active, last_posted_at, last_error, connected_at')
    .eq('is_brand_account', true)
    .order('platform', { ascending: true });

  // Recent deals (latest 30, active or recently expired)
  const { data: recentDeals } = await supabase
    .from('deals')
    .select('id, title, status, image_url, vendor_id, created_at, expires_at, vendor:vendors(business_name)')
    .order('created_at', { ascending: false })
    .limit(30);

  // Recent posts (latest 50)
  const { data: recentPosts } = await supabase
    .from('social_posts')
    .select('id, deal_id, connection_id, platform, account_type, status, error_message, posted_at, platform_post_url, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    brandConnections: brandConnections || [],
    recentDeals: recentDeals || [],
    recentPosts: recentPosts || [],
  });
}
