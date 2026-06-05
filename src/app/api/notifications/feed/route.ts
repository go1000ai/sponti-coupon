import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications/feed?limit=20&unread=1
 * Returns the current user's in-app notifications (newest first) + unread count.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10) || 20, 50);
  const unreadOnly = searchParams.get('unread') === '1';

  let query = supabase
    .from('app_notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) query = query.is('read_at', null);

  const { data: notifications, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { count: unreadCount } = await supabase
    .from('app_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('read_at', null);

  return NextResponse.json({
    notifications: notifications || [],
    unread_count: unreadCount || 0,
  });
}

/**
 * PATCH /api/notifications/feed
 * Mark notifications read. Body: { ids?: string[], all?: boolean }
 * (omit both to mark all as read).
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { ids?: string[]; all?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body → mark all */
  }

  const now = new Date().toISOString();
  let query = supabase
    .from('app_notifications')
    .update({ read_at: now })
    .eq('user_id', user.id)
    .is('read_at', null);

  if (body.ids && body.ids.length > 0) {
    query = query.in('id', body.ids);
  }

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
