import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * GET /api/vendor/blocked-dates
 * Returns vendor's blocked dates.
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: blockedDates } = await supabase
    .from('vendor_blocked_dates')
    .select('*')
    .eq('vendor_id', user.id)
    .order('blocked_date');

  return NextResponse.json({ blocked_dates: blockedDates || [] });
}

/**
 * POST /api/vendor/blocked-dates
 * Add a blocked date.
 * Body: { date: "YYYY-MM-DD", reason?: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { date, reason } = body;

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  // Validate date format
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('vendor_blocked_dates')
    .insert({
      vendor_id: user.id,
      blocked_date: date,
      reason: reason || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Date already blocked' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to block date' }, { status: 500 });
  }

  return NextResponse.json({ blocked_date: data }, { status: 201 });
}

/**
 * DELETE /api/vendor/blocked-dates
 * Remove a blocked date.
 * Body: { id: string }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const { error } = await supabase
    .from('vendor_blocked_dates')
    .delete()
    .eq('id', id)
    .eq('vendor_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to remove blocked date' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
