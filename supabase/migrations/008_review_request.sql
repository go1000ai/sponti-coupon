-- ============================================================
-- Migration 008: Review request emails after redemption
-- ============================================================

-- Track when a review request email was sent for each claim
ALTER TABLE claims ADD COLUMN IF NOT EXISTS review_request_sent_at TIMESTAMPTZ NULL;

-- Index for efficient cron processing of pending review request emails
CREATE INDEX IF NOT EXISTS idx_claims_review_request_pending
  ON claims (customer_id, deal_id, redeemed_at)
  WHERE redeemed = TRUE
    AND redeemed_at IS NOT NULL
    AND review_request_sent_at IS NULL;

-- =====================
-- Update can_customer_review to enforce 24-hour wait after redemption
-- =====================

CREATE OR REPLACE FUNCTION can_customer_review(p_customer_id UUID, p_vendor_id UUID, p_deal_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_deal_id IS NOT NULL THEN
    -- Check if customer redeemed this specific deal AND at least 24h have passed
    RETURN EXISTS (
      SELECT 1 FROM claims c
      JOIN deals d ON c.deal_id = d.id
      WHERE c.customer_id = p_customer_id
        AND d.vendor_id = p_vendor_id
        AND d.id = p_deal_id
        AND c.redeemed = TRUE
        AND c.redeemed_at <= NOW() - INTERVAL '24 hours'
    );
  ELSE
    -- Check if customer redeemed any deal from this vendor AND at least 24h have passed
    RETURN EXISTS (
      SELECT 1 FROM claims c
      JOIN deals d ON c.deal_id = d.id
      WHERE c.customer_id = p_customer_id
        AND d.vendor_id = p_vendor_id
        AND c.redeemed = TRUE
        AND c.redeemed_at <= NOW() - INTERVAL '24 hours'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
