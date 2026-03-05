-- Migration 040: Add timezone column to customers and vendors
-- Used for timezone-aware email delivery (cron sends at local 9 AM / 7 PM).

ALTER TABLE customers ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York';
