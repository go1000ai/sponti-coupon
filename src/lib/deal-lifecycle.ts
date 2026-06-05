import type { Deal, RepeatInterval } from '@/lib/types/database';

/** Months between reposts for each recurring cadence. */
export const REPEAT_MONTHS: Record<Exclude<RepeatInterval, 'none'>, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
};

/**
 * Compute the next run window for a recurring deal: the next posting starts
 * `interval` months after this run ends, and keeps the same duration. Returns
 * null for non-recurring deals.
 */
export function computeNextRun(
  startsAt: string,
  expiresAt: string,
  interval: RepeatInterval
): { starts_at: string; expires_at: string } | null {
  if (interval === 'none') return null;
  const start = new Date(startsAt);
  const end = new Date(expiresAt);
  const durationMs = end.getTime() - start.getTime();
  const nextStart = new Date(end);
  nextStart.setMonth(nextStart.getMonth() + REPEAT_MONTHS[interval]);
  const nextEnd = new Date(nextStart.getTime() + durationMs);
  return { starts_at: nextStart.toISOString(), expires_at: nextEnd.toISOString() };
}

/**
 * A 'draft'-status deal means one of two very different things, told apart by the
 * `is_scheduled` flag (set by the create API when publishing with a future start):
 *
 *   1. WIP draft   — status 'draft', is_scheduled false. Saved but not published
 *                    (e.g. "Save as draft" from website import). No real run date.
 *   2. Scheduled   — status 'draft', is_scheduled true. A finished deal set to go
 *                    live on a future date; the activate-scheduled cron flips it to
 *                    'active' at starts_at.
 *
 * UI rule: WIP drafts live only in My Deals → Drafts (never on the calendar);
 * scheduled deals show on the calendar (and in My Deals) labeled "Scheduled".
 */

type LifecycleDeal = Pick<Deal, 'status' | 'is_scheduled'>;

/** A saved-but-not-published draft. */
export function isWipDraft(deal: LifecycleDeal): boolean {
  return deal.status === 'draft' && !deal.is_scheduled;
}

/** A published deal waiting for its future start date to go live. */
export function isScheduled(deal: LifecycleDeal): boolean {
  return deal.status === 'draft' && deal.is_scheduled === true;
}
