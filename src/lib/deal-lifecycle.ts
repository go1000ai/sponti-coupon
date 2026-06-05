import type { Deal } from '@/lib/types/database';

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
