-- Separate "scheduled" deals from work-in-progress drafts.
--
-- The deals table only has statuses: draft / active / expired / paused. Future-
-- dated deals were stored as 'draft', which collided with true work-in-progress
-- drafts (e.g. "Save as draft" from website import). That made it impossible to
-- tell them apart, and — worse — scheduled deals never went live, because nothing
-- flips them to 'active' when their start date arrives.
--
-- This adds a reversible boolean marker instead of a new enum value (enum values
-- can't be dropped). A deal is:
--   * a WIP draft   when status = 'draft' AND is_scheduled = false
--   * scheduled     when status = 'draft' AND is_scheduled = true  (auto-goes-live)
--   * live          when status = 'active'
--
-- The /api/cron/activate-scheduled job flips scheduled -> active at start time.

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS is_scheduled boolean NOT NULL DEFAULT false;

-- Backfill: existing future-dated drafts were created by the publish flow with a
-- future start date, i.e. they are really scheduled deals. (True WIP drafts are
-- always saved with starts_at = now, so they are not future-dated.)
UPDATE deals
  SET is_scheduled = true
  WHERE status = 'draft' AND starts_at > now();

-- Fast lookup for the activation cron.
CREATE INDEX IF NOT EXISTS idx_deals_scheduled_activation
  ON deals (starts_at)
  WHERE status = 'draft' AND is_scheduled = true;
