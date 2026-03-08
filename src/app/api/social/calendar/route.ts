import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/social/calendar?start=ISO&end=ISO
 * Returns all social posts (drafted, scheduled, posted, failed) in a date range.
 * Used for calendar and bento grid views.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const start = request.nextUrl.searchParams.get('start');
  const end = request.nextUrl.searchParams.get('end');

  if (!start || !end) {
    return NextResponse.json({ error: 'start and end date params are required' }, { status: 400 });
  }

  const serviceClient = await createServiceRoleClient();

  // Check if admin
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.role === 'admin';

  // Get vendor's deals (or all deals for admin)
  let dealIds: string[] = [];
  if (isAdmin) {
    // Admin sees all posts
    const { data: posts } = await serviceClient
      .from('social_posts')
      .select(`
        id, deal_id, platform, account_type, caption, image_url,
        status, scheduled_at, created_at, posted_at, error_message,
        platform_post_url, retry_count,
        deals:deal_id (title, image_url, deal_type)
      `)
      .gte('created_at', start)
      .lte('created_at', end)
      .not('status', 'eq', 'cancelled')
      .order('created_at', { ascending: true });

    // Also get scheduled posts that fall in the date range by scheduled_at
    const { data: scheduledPosts } = await serviceClient
      .from('social_posts')
      .select(`
        id, deal_id, platform, account_type, caption, image_url,
        status, scheduled_at, created_at, posted_at, error_message,
        platform_post_url, retry_count,
        deals:deal_id (title, image_url, deal_type)
      `)
      .eq('status', 'scheduled')
      .gte('scheduled_at', start)
      .lte('scheduled_at', end);

    // Merge and dedupe
    const allPosts = [...(posts || []), ...(scheduledPosts || [])];
    const uniqueMap = new Map(allPosts.map(p => [p.id, p]));

    return NextResponse.json({ posts: Array.from(uniqueMap.values()) });
  }

  // Vendor: only their deals
  const { data: deals } = await serviceClient
    .from('deals')
    .select('id')
    .eq('vendor_id', user.id);

  dealIds = (deals || []).map(d => d.id);

  if (dealIds.length === 0) {
    return NextResponse.json({ posts: [] });
  }

  // Get posts in date range
  const { data: posts } = await serviceClient
    .from('social_posts')
    .select(`
      id, deal_id, platform, account_type, caption, image_url,
      status, scheduled_at, created_at, posted_at, error_message,
      platform_post_url, retry_count,
      deals:deal_id (title, image_url, deal_type)
    `)
    .in('deal_id', dealIds)
    .gte('created_at', start)
    .lte('created_at', end)
    .not('status', 'eq', 'cancelled')
    .order('created_at', { ascending: true });

  // Also get scheduled posts by scheduled_at
  const { data: scheduledPosts } = await serviceClient
    .from('social_posts')
    .select(`
      id, deal_id, platform, account_type, caption, image_url,
      status, scheduled_at, created_at, posted_at, error_message,
      platform_post_url, retry_count,
      deals:deal_id (title, image_url, deal_type)
    `)
    .in('deal_id', dealIds)
    .eq('status', 'scheduled')
    .gte('scheduled_at', start)
    .lte('scheduled_at', end);

  const allPosts = [...(posts || []), ...(scheduledPosts || [])];
  const uniqueMap = new Map(allPosts.map(p => [p.id, p]));

  return NextResponse.json({ posts: Array.from(uniqueMap.values()) });
}
