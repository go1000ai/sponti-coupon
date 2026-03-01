-- Migration 031: Social media auto-posting connections
-- Stores OAuth tokens for vendor + brand social accounts

CREATE TABLE IF NOT EXISTS social_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
  is_brand_account BOOLEAN NOT NULL DEFAULT false,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'tiktok')),

  -- OAuth tokens (encrypted at application level before storage)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,

  -- Platform-specific identifiers
  platform_user_id TEXT,
  platform_page_id TEXT,
  account_name TEXT,
  account_username TEXT,
  account_avatar_url TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_posted_at TIMESTAMPTZ,
  last_error TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- A vendor (or brand) can only have one connection per platform
  UNIQUE(vendor_id, platform, is_brand_account)
);

CREATE INDEX idx_social_connections_vendor ON social_connections(vendor_id) WHERE vendor_id IS NOT NULL;
CREATE INDEX idx_social_connections_brand ON social_connections(is_brand_account) WHERE is_brand_account = true;
CREATE INDEX idx_social_connections_active ON social_connections(is_active) WHERE is_active = true;

ALTER TABLE social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_connections_vendor_select ON social_connections
  FOR SELECT USING (auth.uid() = vendor_id);

CREATE POLICY social_connections_vendor_delete ON social_connections
  FOR DELETE USING (auth.uid() = vendor_id);
