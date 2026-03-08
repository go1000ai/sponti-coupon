import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const ARCHIVE_DAYS = 7;

/**
 * GET /api/social/posts
 * Returns social post history for the current vendor.
 * Query params: ?limit=20&offset=0&view=active|archived
 *   - active (default): posts newer than 7 days
 *   - archived: posts 7+ days old
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
  const view = request.nextUrl.searchParams.get('view') || 'active';

  const serviceClient = await createServiceRoleClient();

  // Get vendor's deals to filter posts
  const { data: vendorDeals } = await serviceClient
    .from('deals')
    .select('id')
    .eq('vendor_id', user.id);

  if (!vendorDeals || vendorDeals.length === 0) {
    return NextResponse.json({ posts: [], total: 0 });
  }

  const dealIds = vendorDeals.map(d => d.id);

  // Calculate the archive cutoff date
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ARCHIVE_DAYS);
  const cutoffISO = cutoff.toISOString();

  let query = serviceClient
    .from('social_posts')
    .select('id, deal_id, platform, account_type, caption, image_url, claim_url, status, platform_post_id, platform_post_url, error_message, retry_count, created_at, posted_at, deals(title, image_url, deal_type)', { count: 'exact' })
    .in('deal_id', dealIds);

  if (view === 'archived') {
    query = query.lt('created_at', cutoffISO);
  } else {
    query = query.gte('created_at', cutoffISO);
  }

  const { data: posts, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    posts: posts || [],
    total: count || 0,
  });
}
