-- Migration 024: Add payment reference code to claims
-- Short code (e.g., SC-4829) that customers include in Venmo/Zelle payment notes
-- so vendors can match incoming payments to claims.

ALTER TABLE claims ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Index for quick lookups when vendor searches by reference code
CREATE INDEX IF NOT EXISTS idx_claims_payment_reference ON claims(payment_reference) WHERE payment_reference IS NOT NULL;
