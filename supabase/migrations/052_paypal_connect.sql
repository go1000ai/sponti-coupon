-- Migration 052: PayPal Commerce Platform (Connected Path) Integration
-- Mirrors Stripe/Square Connect columns on vendors table for PayPal
-- Key difference: No encrypted token columns needed — PayPal Connected Path
-- uses the partner's own credentials with a JWT Auth-Assertion header.

-- 1. Add PayPal Connect fields to vendors table
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS paypal_connect_merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS paypal_connect_email TEXT,
  ADD COLUMN IF NOT EXISTS paypal_connect_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paypal_connect_charges_enabled BOOLEAN NOT NULL DEFAULT false;

-- Index for webhook routing by merchant ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_paypal_merchant
  ON vendors(paypal_connect_merchant_id) WHERE paypal_connect_merchant_id IS NOT NULL;

-- 2. Track PayPal orders on claims (parallel to stripe_checkout_session_id and square_checkout_order_id)
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS paypal_checkout_order_id TEXT;
