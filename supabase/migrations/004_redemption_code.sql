-- Add 6-digit redemption code to claims table
-- Customer gives this code to the vendor as an alternative to QR scanning
ALTER TABLE claims ADD COLUMN IF NOT EXISTS redemption_code TEXT UNIQUE;

-- Index for fast lookup by redemption code
CREATE INDEX IF NOT EXISTS idx_claims_redemption_code ON claims(redemption_code);
