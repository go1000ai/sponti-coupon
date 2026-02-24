-- Migration 015: SpontiPoints platform loyalty, deal view tracking, vendor ROI support
-- ADDITIVE ONLY — no drops, no renames

-- ============================================================
-- 1. Deal View Tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS deal_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- nullable for anon views
  ip_hash TEXT, -- SHA-256 hash of IP for anon dedup (no raw IPs stored)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_views_deal_id ON deal_views(deal_id);
CREATE INDEX idx_deal_views_created_at ON deal_views(created_at);
CREATE INDEX idx_deal_views_viewer_id ON deal_views(viewer_id) WHERE viewer_id IS NOT NULL;

ALTER TABLE deal_views ENABLE ROW LEVEL SECURITY;

-- Public can INSERT views (anyone can view a deal)
CREATE POLICY "Anyone can record a deal view" ON deal_views
  FOR INSERT WITH CHECK (true);

-- Vendors can see views on their own deals
CREATE POLICY "Vendors can view analytics for own deals" ON deal_views
  FOR SELECT USING (
    deal_id IN (SELECT id FROM deals WHERE vendor_id = auth.uid())
  );

-- Admins can see all views (via service role client, bypasses RLS)

-- ============================================================
-- 2. SpontiPoints Ledger (append-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS spontipoints_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES vendors(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  redemption_id UUID REFERENCES redemptions(id) ON DELETE SET NULL,
  points INTEGER NOT NULL, -- positive = earn, negative = spend
  reason TEXT NOT NULL CHECK (reason IN ('earn_redemption', 'spend_credit', 'bonus', 'adjustment', 'reversal', 'expired')),
  expires_at TIMESTAMPTZ, -- set for earned points (12 months from issuance)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: prevent duplicate issuance for the same redemption
CREATE UNIQUE INDEX idx_spontipoints_unique_redemption
  ON spontipoints_ledger(redemption_id)
  WHERE redemption_id IS NOT NULL AND reason = 'earn_redemption';

CREATE INDEX idx_spontipoints_user_id ON spontipoints_ledger(user_id);
CREATE INDEX idx_spontipoints_expires_at ON spontipoints_ledger(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_spontipoints_created_at ON spontipoints_ledger(created_at);

ALTER TABLE spontipoints_ledger ENABLE ROW LEVEL SECURITY;

-- Users can only see their own ledger entries
CREATE POLICY "Users can view own SpontiPoints" ON spontipoints_ledger
  FOR SELECT USING (user_id = auth.uid());

-- Only server-side (service role) can insert — no direct user inserts
-- This ensures points are only issued through trusted code paths
CREATE POLICY "Service role inserts SpontiPoints" ON spontipoints_ledger
  FOR INSERT WITH CHECK (false); -- blocked for all authenticated users; service role bypasses RLS

-- No updates or deletes — append-only ledger
-- (no UPDATE/DELETE policies means they're blocked by default with RLS enabled)

-- ============================================================
-- 3. SpontiPoints Redemptions (credit applied to deals)
-- ============================================================
CREATE TABLE IF NOT EXISTS spontipoints_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_used INTEGER NOT NULL CHECK (points_used >= 500), -- minimum 500 points
  credit_amount NUMERIC(10, 2) NOT NULL, -- points_used / 100
  applied_to UUID REFERENCES deals(id) ON DELETE SET NULL, -- deal the credit was applied to
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spontipoints_redemptions_user ON spontipoints_redemptions(user_id);

ALTER TABLE spontipoints_redemptions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own redemptions
CREATE POLICY "Users can view own SpontiPoints redemptions" ON spontipoints_redemptions
  FOR SELECT USING (user_id = auth.uid());

-- Only server-side can insert
CREATE POLICY "Service role inserts SpontiPoints redemptions" ON spontipoints_redemptions
  FOR INSERT WITH CHECK (false);

-- ============================================================
-- 4. Vendor ROI support — add average_ticket_value to vendors
-- ============================================================
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS average_ticket_value NUMERIC(10, 2) DEFAULT 50.00;

-- ============================================================
-- 5. Helper function: get SpontiPoints balance for a user
-- ============================================================
CREATE OR REPLACE FUNCTION get_spontipoints_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM spontipoints_ledger
  WHERE user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());
$$;

-- ============================================================
-- 6. Helper function: get deal view count for a vendor in date range
-- ============================================================
CREATE OR REPLACE FUNCTION get_vendor_deal_views(
  p_vendor_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COUNT(*)
  FROM deal_views dv
  JOIN deals d ON d.id = dv.deal_id
  WHERE d.vendor_id = p_vendor_id
    AND dv.created_at >= p_start_date
    AND dv.created_at <= p_end_date;
$$;
