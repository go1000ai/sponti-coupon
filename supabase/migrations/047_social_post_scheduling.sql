-- Add scheduling support to social_posts
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS scheduled_by UUID REFERENCES auth.users(id);
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS caption_edited TEXT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
-- status now supports: 'draft', 'scheduled', 'pending', 'posting', 'posted', 'failed', 'cancelled'

-- Index for cron to quickly find posts ready to publish
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled
  ON social_posts (status, scheduled_at)
  WHERE status = 'scheduled';

-- Index for calendar queries by date range
CREATE INDEX IF NOT EXISTS idx_social_posts_calendar
  ON social_posts (deal_id, status, created_at);
