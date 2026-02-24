-- Migration 009: Create vendor_api_keys table for API Access feature
-- This table stores hashed API keys for vendor integrations (Enterprise tier only)

CREATE TABLE IF NOT EXISTS vendor_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vendor_api_keys_vendor_id ON vendor_api_keys(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_api_keys_key_hash ON vendor_api_keys(key_hash) WHERE is_active = true;

-- Enable RLS
ALTER TABLE vendor_api_keys ENABLE ROW LEVEL SECURITY;

-- Vendors can view their own API keys
CREATE POLICY "Vendors can view own API keys"
  ON vendor_api_keys FOR SELECT
  USING (vendor_id = auth.uid());

-- Vendors can create their own API keys
CREATE POLICY "Vendors can insert own API keys"
  ON vendor_api_keys FOR INSERT
  WITH CHECK (vendor_id = auth.uid());

-- Vendors can update (revoke) their own API keys
CREATE POLICY "Vendors can update own API keys"
  ON vendor_api_keys FOR UPDATE
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

-- Service role needs full access for API key validation in /api/v1/* routes
-- (service role bypasses RLS by default, so no extra policy needed)
