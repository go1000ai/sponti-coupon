-- Migration 049: Add scheduling support to social_posts
-- Allows draft, scheduled, and cancelled statuses for vendor-controlled posting

-- Drop and recreate the status check constraint to include new statuses
ALTER TABLE social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;
ALTER TABLE social_posts ADD CONSTRAINT social_posts_status_check
  CHECK (status IN ('pending', 'posting', 'posted', 'failed', 'draft', 'scheduled', 'cancelled'));

-- Add scheduling columns
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS scheduled_by UUID REFERENCES auth.users(id);
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS caption_edited TEXT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Index for the cron job that picks up scheduled posts ready to publish
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled
  ON social_posts(scheduled_at)
  WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Index for draft lookup
CREATE INDEX IF NOT EXISTS idx_social_posts_draft
  ON social_posts(scheduled_by)
  WHERE status IN ('draft', 'scheduled');
