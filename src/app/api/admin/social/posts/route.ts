import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/social/posts
 * Admin endpoint — returns recent social posts across all vendors.
 * Query params: ?limit=50&offset=0&status=failed
 */
export async function GET(request: NextRequest) {
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

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');
  const statusFilter = request.nextUrl.searchParams.get('status');

  const serviceClient = await createServiceRoleClient();

  let query = serviceClient
    .from('social_posts')
    .select('id, deal_id, platform, account_type, caption, status, platform_post_url, error_message, created_at, posted_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  const { data: posts, count } = await query;

  return NextResponse.json({
    posts: posts || [],
    total: count || 0,
  });
}
