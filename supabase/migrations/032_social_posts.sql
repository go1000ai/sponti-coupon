-- Migration 032: Social post tracking
-- Logs every auto-post attempt for analytics and debugging

CREATE TABLE IF NOT EXISTS social_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  connection_id UUID NOT NULL REFERENCES social_connections(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'tiktok')),
  account_type TEXT NOT NULL CHECK (account_type IN ('brand', 'vendor')),

  -- Post content
  caption TEXT,
  image_url TEXT,
  claim_url TEXT,

  -- Result
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posting', 'posted', 'failed')),
  platform_post_id TEXT,
  platform_post_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  posted_at TIMESTAMPTZ
);

CREATE INDEX idx_social_posts_deal ON social_posts(deal_id);
CREATE INDEX idx_social_posts_connection ON social_posts(connection_id);
CREATE INDEX idx_social_posts_status ON social_posts(status) WHERE status IN ('pending', 'failed');

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_posts_vendor_select ON social_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM deals WHERE deals.id = social_posts.deal_id AND deals.vendor_id = auth.uid()
    )
  );
