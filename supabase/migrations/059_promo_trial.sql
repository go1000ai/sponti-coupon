-- Add promo tracking columns for limited-time free vendor offers (e.g., Puerto Rico launch)
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS promo_code text;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS promo_expires_at timestamptz;
