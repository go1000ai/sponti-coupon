import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { computeNextRun } from '@/lib/deal-lifecycle';
import { generateUniqueDealSlug } from '@/lib/deal-slug';
import type { RepeatInterval } from '@/lib/types/database';

/**
 * Recurring deals — auto-repost on a cadence after a deal expires.
 *
 * A deal carrying a non-'none' repeat_interval is the "series master". Once it
 * expires, this job clones a FRESH deal scheduled `interval` months out (so the
 * repost gets its own claims, analytics, and social post) and moves the repeat
 * baton onto the clone. The clone goes live via the activate-scheduled cron at
 * its start time, which also fires the social auto-post — so each cycle is a
 * clean re-post with zero vendor effort.
 *
 * Spacing the reposts out (vs. re-running every 30 days) keeps the deal feeling
 * special so customers come back, which is the whole point.
 *
 * Runs hourly via Vercel Cron (see vercel.json).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = await createServiceRoleClient();
  const nowIso = new Date().toISOString();

  // Series masters whose run has ended and need their next cycle queued.
  const { data: masters, error } = await db
    .from('deals')
    .select('*, vendor:vendors(business_name)')
    .neq('repeat_interval', 'none')
    .eq('status', 'active')
    .lt('expires_at', nowIso);

  if (error) {
    console.error('[cron/repeat-deals] select failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!masters || masters.length === 0) {
    return NextResponse.json({ reposted: 0 });
  }

  const created: string[] = [];

  for (const master of masters) {
    const next = computeNextRun(master.starts_at, master.expires_at, master.repeat_interval as RepeatInterval);
    if (!next) continue;

    // Clone the deal for the next cycle: fresh row (new claims), scheduled to go
    // live at the next window, carrying the repeat baton so it repeats again.
    const clone = {
      vendor_id: master.vendor_id,
      deal_type: master.deal_type,
      title: master.title,
      description: master.description,
      original_price: master.original_price,
      deal_price: master.deal_price,
      discount_percentage: master.discount_percentage,
      deposit_amount: master.deposit_amount,
      max_claims: master.max_claims,
      starts_at: next.starts_at,
      expires_at: next.expires_at,
      timezone: master.timezone,
      status: 'draft',
      is_scheduled: true,
      repeat_interval: master.repeat_interval,
      image_url: master.image_url,
      image_urls: master.image_urls || [],
      benchmark_deal_id: master.benchmark_deal_id,
      location_ids: master.location_ids,
      website_url: master.website_url,
      terms_and_conditions: master.terms_and_conditions,
      video_urls: master.video_urls || [],
      amenities: master.amenities || [],
      how_it_works: master.how_it_works,
      highlights: master.highlights || [],
      fine_print: master.fine_print,
      requires_appointment: master.requires_appointment || false,
      appointment_availability_override: master.appointment_availability_override ?? null,
      search_tags: master.search_tags || [],
      category_id: master.category_id ?? null,
      variants: master.variants || [],
      redemption_hours: master.redemption_hours ?? null,
    };

    const { data: inserted, error: insertErr } = await db
      .from('deals')
      .insert(clone)
      .select('id')
      .single();

    if (insertErr || !inserted) {
      console.error('[cron/repeat-deals] clone insert failed for master', master.id, insertErr);
      continue;
    }

    // SEO slug for the new occurrence.
    const businessName = master.vendor?.business_name || '';
    const slug = await generateUniqueDealSlug(db, `${businessName} ${master.title}`, inserted.id);
    await db.from('deals').update({ slug }).eq('id', inserted.id);

    // Pass the baton: the old run no longer repeats (the clone does), so it
    // won't be picked up again on the next sweep.
    await db.from('deals').update({ repeat_interval: 'none' }).eq('id', master.id);

    created.push(inserted.id);
  }

  console.log(`[cron/repeat-deals] queued ${created.length} repost(s):`, created);
  return NextResponse.json({ reposted: created.length, deal_ids: created });
}
