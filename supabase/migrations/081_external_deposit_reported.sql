-- External-merchant deposit flow (e.g. vendor's own Square link).
--
-- When a customer pays a deposit through a vendor's external merchant link there
-- is no webhook we can trust, so we DON'T withhold the code: the customer reports
-- they paid, we issue the QR + 6-digit code immediately, and the vendor verifies
-- the deposit actually landed in their own merchant account either from the
-- notification we send them or at redemption time (in case they didn't get to it).
--
-- Two distinct timestamps because "code issued" and "money verified" are now separate:
--   deposit_reported_at  — when the CUSTOMER reported paying the deposit (code issued)
--   deposit_verified_at  — when the VENDOR confirmed the deposit landed in their account
-- A null deposit_verified_at with a non-null deposit_reported_at = "reported, not yet
-- verified", which the redemption screen surfaces so the vendor never credits a
-- deposit that never arrived (they'd just collect the full balance instead).
ALTER TABLE claims ADD COLUMN IF NOT EXISTS deposit_reported_at TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS deposit_verified_at TIMESTAMPTZ;

-- Lets the vendor "deposits to verify" queue cheaply find link-tier claims the
-- customer reported but the vendor hasn't verified yet.
CREATE INDEX IF NOT EXISTS idx_claims_unverified_deposit
  ON claims(deal_id)
  WHERE payment_tier = 'link' AND deposit_verified_at IS NULL;
