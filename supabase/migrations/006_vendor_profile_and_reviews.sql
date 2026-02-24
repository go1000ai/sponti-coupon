-- ============================================================
-- Migration 006: Vendor profile enhancements + Reviews system
-- ============================================================

-- =====================
-- 1. VENDOR PROFILE FIELDS
-- =====================

-- Description / about
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS description TEXT;

-- Website
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website TEXT;

-- Cover photo
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Social media links (JSONB for flexibility)
-- Expected shape: { instagram, facebook, tiktok, twitter, yelp, google_business }
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';

-- Business hours (JSONB)
-- Expected shape: { monday: { open: "09:00", close: "17:00", closed: false }, ... }
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_hours JSONB DEFAULT '{}';

-- Notification preferences (JSONB)
-- Expected shape: { email_new_claims: true, email_redemptions: true, email_reviews: true, email_digest: true }
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email_new_claims": true, "email_redemptions": true, "email_reviews": true, "email_digest": true}';

-- =====================
-- 2. REVIEWS TABLE
-- =====================

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  vendor_reply TEXT,
  vendor_replied_at TIMESTAMPTZ,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One review per customer per deal (prevent duplicates)
  CONSTRAINT unique_customer_deal_review UNIQUE (customer_id, deal_id)
);

-- Indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_vendor_id ON reviews(vendor_id);
CREATE INDEX IF NOT EXISTS idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_deal_id ON reviews(deal_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- =====================
-- 3. VENDOR AGGREGATE RATINGS (materialized on vendors table for fast reads)
-- =====================

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS avg_rating NUMERIC(3, 2) DEFAULT 0;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- =====================
-- 4. ROW LEVEL SECURITY FOR REVIEWS
-- =====================

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can read reviews (public)
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

-- Customers can create reviews (must be the customer)
CREATE POLICY "Customers can create reviews" ON reviews
  FOR INSERT WITH CHECK (customer_id = auth.uid());

-- Customers can update their own reviews (edit comment/rating)
CREATE POLICY "Customers can update own reviews" ON reviews
  FOR UPDATE USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Vendors can update reviews on their business (for replies only)
CREATE POLICY "Vendors can reply to reviews" ON reviews
  FOR UPDATE USING (vendor_id = auth.uid());

-- =====================
-- 5. FUNCTION: Update vendor aggregate rating
-- =====================

CREATE OR REPLACE FUNCTION update_vendor_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE vendors SET
      avg_rating = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM reviews WHERE vendor_id = OLD.vendor_id), 0),
      total_reviews = COALESCE((SELECT COUNT(*) FROM reviews WHERE vendor_id = OLD.vendor_id), 0)
    WHERE id = OLD.vendor_id;
    RETURN OLD;
  ELSE
    UPDATE vendors SET
      avg_rating = COALESCE((SELECT AVG(rating)::NUMERIC(3,2) FROM reviews WHERE vendor_id = NEW.vendor_id), 0),
      total_reviews = COALESCE((SELECT COUNT(*) FROM reviews WHERE vendor_id = NEW.vendor_id), 0)
    WHERE id = NEW.vendor_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-update vendor rating on review changes
DROP TRIGGER IF EXISTS trigger_update_vendor_rating ON reviews;
CREATE TRIGGER trigger_update_vendor_rating
  AFTER INSERT OR UPDATE OF rating OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_vendor_rating();

-- =====================
-- 6. FUNCTION: Check if customer can review (must have redeemed a deal from this vendor)
-- =====================

CREATE OR REPLACE FUNCTION can_customer_review(p_customer_id UUID, p_vendor_id UUID, p_deal_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_deal_id IS NOT NULL THEN
    -- Check if customer redeemed this specific deal
    RETURN EXISTS (
      SELECT 1 FROM claims c
      JOIN deals d ON c.deal_id = d.id
      WHERE c.customer_id = p_customer_id
        AND d.vendor_id = p_vendor_id
        AND d.id = p_deal_id
        AND c.redeemed = TRUE
    );
  ELSE
    -- Check if customer redeemed any deal from this vendor
    RETURN EXISTS (
      SELECT 1 FROM claims c
      JOIN deals d ON c.deal_id = d.id
      WHERE c.customer_id = p_customer_id
        AND d.vendor_id = p_vendor_id
        AND c.redeemed = TRUE
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
