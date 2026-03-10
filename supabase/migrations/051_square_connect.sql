-- Migration 051: Square Connect OAuth Integration
-- Mirrors Stripe Connect columns on vendors table for Square payment processing

-- 1. Add Square Connect fields to vendors table
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS square_connect_merchant_id TEXT,
  ADD COLUMN IF NOT EXISTS square_connect_access_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS square_connect_refresh_token_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS square_connect_token_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS square_connect_location_id TEXT,
  ADD COLUMN IF NOT EXISTS square_connect_onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS square_connect_charges_enabled BOOLEAN NOT NULL DEFAULT false;

-- Index for webhook routing by merchant ID
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_square_merchant
  ON vendors(square_connect_merchant_id) WHERE square_connect_merchant_id IS NOT NULL;

-- 2. Track Square orders on claims (parallel to stripe_checkout_session_id)
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS square_checkout_order_id TEXT;
