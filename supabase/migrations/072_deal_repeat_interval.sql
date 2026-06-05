-- Recurring deals: let a vendor set a deal to automatically repost on a cadence
-- after it expires (monthly / every 2 months / quarterly).
--
-- How it works (see /api/cron/repeat-deals): the deal carrying a non-'none'
-- repeat_interval is the "series master". When it expires, the cron clones a
-- fresh deal scheduled `interval` months out (fresh claims + a new social post)
-- and moves the repeat baton onto the clone, so each cycle is a clean re-post.
--
-- Additive + backward-compatible: existing deals default to 'none' (one-time).

ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS repeat_interval text NOT NULL DEFAULT 'none';

-- Guard the allowed values without failing if the migration is re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deals_repeat_interval_check'
  ) THEN
    ALTER TABLE deals
      ADD CONSTRAINT deals_repeat_interval_check
      CHECK (repeat_interval IN ('none', 'monthly', 'bimonthly', 'quarterly'));
  END IF;
END $$;

COMMENT ON COLUMN deals.repeat_interval IS
  'Auto-repost cadence after expiry: none | monthly | bimonthly | quarterly. The repeat-deals cron clones the next cycle interval months after this deal expires.';

-- Speeds up the cron sweep for expired deals that still need to repeat.
CREATE INDEX IF NOT EXISTS idx_deals_repeat_active
  ON deals (repeat_interval, status, expires_at)
  WHERE repeat_interval <> 'none';
