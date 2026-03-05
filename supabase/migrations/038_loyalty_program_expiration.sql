-- Add expiration date to loyalty programs
-- NULL = no expiration (program runs indefinitely)
-- Vendor-set loyalty expiration only; SpontiPoints (platform) never expire
ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;
