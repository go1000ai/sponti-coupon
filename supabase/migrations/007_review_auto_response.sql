-- Add auto-response columns to reviews table
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS auto_response_scheduled_at TIMESTAMPTZ NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS auto_response_sent_at TIMESTAMPTZ NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS auto_response_tone TEXT NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS is_auto_response BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for efficient cron processing of pending auto-responses
CREATE INDEX IF NOT EXISTS idx_reviews_auto_response_pending
  ON reviews (vendor_id, auto_response_scheduled_at)
  WHERE vendor_reply IS NULL
    AND auto_response_scheduled_at IS NOT NULL
    AND auto_response_sent_at IS NULL;
