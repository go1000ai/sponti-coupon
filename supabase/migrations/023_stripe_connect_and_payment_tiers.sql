-- Migration 023: Stripe Connect + Payment Tiers
-- Adds two-tier payment support: integrated (Stripe Connect) and manual (Venmo/Zelle/Cash App)

-- 1. Add Stripe Connect fields to vendors table
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT false;

-- Index for webhook routing by connected account ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_stripe_connect_account_id
  ON vendors(stripe_connect_account_id) WHERE stripe_connect_account_id IS NOT NULL;

-- 2. Add payment_tier to vendor_payment_methods
-- 'integrated' = Stripe Connect (automated checkout, webhook confirms)
-- 'manual' = Venmo, Zelle, Cash App (vendor manually confirms)
-- 'link' = Legacy static payment link (Stripe/Square/PayPal URLs)
ALTER TABLE vendor_payment_methods
  ADD COLUMN IF NOT EXISTS payment_tier TEXT NOT NULL DEFAULT 'link'
    CHECK (payment_tier IN ('integrated', 'manual', 'link'));

-- 3. Add payment tracking columns to claims
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS payment_method_type TEXT,
  ADD COLUMN IF NOT EXISTS payment_tier TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS deposit_amount_paid NUMERIC(10,2);

-- 4. Backfill: mark existing manual-only processors as 'manual' tier
UPDATE vendor_payment_methods
  SET payment_tier = 'manual'
  WHERE processor_type IN ('venmo', 'zelle', 'cashapp');

-- 5. Existing Stripe/Square/PayPal keep default 'link' tier (no action needed)
