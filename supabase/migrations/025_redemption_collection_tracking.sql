-- Migration 025: Add collection tracking to redemptions
-- Tracks deposit info, remaining balance, and whether vendor collected full payment

ALTER TABLE redemptions
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT,
  ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS amount_collected NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS collection_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS collection_completed_at TIMESTAMPTZ;

-- Index for revenue analytics queries
CREATE INDEX IF NOT EXISTS idx_redemptions_vendor_collected
  ON redemptions(vendor_id, collection_completed, scanned_at);
