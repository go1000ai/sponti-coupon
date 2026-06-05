import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Activate scheduled deals whose start time has arrived.
 *
 * A scheduled deal is stored as status 'draft' with is_scheduled = true so it
 * stays out of public view until it's time. This job flips it to 'active' the
 * moment starts_at passes — and fires the SAME social auto-post that a normal
 * "publish now" does. So a vendor who schedules a deal for next week has its
 * social posts go out automatically when it goes live, with no extra work.
 *
 * Runs every few minutes via Vercel Cron (see vercel.json).
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const nowIso = new Date().toISOString();

  // Find scheduled deals that are now due to go live.
  const { data: due, error: selectError } = await supabase
    .from('deals')
    .select('id, vendor_id, title')
    .eq('status', 'draft')
    .eq('is_scheduled', true)
    .lte('starts_at', nowIso);

  if (selectError) {
    console.error('[cron/activate-scheduled] select failed:', selectError);
    return NextResponse.json({ error: selectError.message }, { status: 500 });
  }

  if (!due || due.length === 0) {
    return NextResponse.json({ activated: 0 });
  }

  const ids = due.map(d => d.id);

  // Flip them live. Clear is_scheduled so they're treated as normal active deals.
  const { error: updateError } = await supabase
    .from('deals')
    .update({ status: 'active', is_scheduled: false })
    .in('id', ids);

  if (updateError) {
    console.error('[cron/activate-scheduled] update failed:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Fire social auto-posting for each newly-live deal (same path as publish-now).
  const internalSecret = process.env.SOCIAL_POST_INTERNAL_SECRET;
  if (!internalSecret) {
    console.error('[cron/activate-scheduled] SOCIAL_POST_INTERNAL_SECRET not set — activated deals, skipped auto-post:', ids);
  } else {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    await Promise.allSettled(
      due.map(d =>
        fetch(`${appUrl}/api/social/auto-post`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-social-post-secret': internalSecret,
          },
          body: JSON.stringify({ deal_id: d.id, vendor_id: d.vendor_id }),
        }).catch(err => {
          console.error('[cron/activate-scheduled] auto-post failed for deal', d.id, err);
        })
      )
    );
  }

  console.log(`[cron/activate-scheduled] activated ${ids.length} scheduled deal(s):`, ids);
  return NextResponse.json({ activated: ids.length, deal_ids: ids });
}
