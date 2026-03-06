-- Promo codes for online deals
-- Vendors can either let SpontiCoupon generate codes or upload their own.
-- Each code is assigned to a single claim when a customer claims the deal.

CREATE TABLE deal_promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  code text NOT NULL,
  claim_id uuid REFERENCES claims(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Each code must be unique within a deal
CREATE UNIQUE INDEX idx_deal_promo_codes_deal_code ON deal_promo_codes(deal_id, code);

-- Fast lookup for the next available (unclaimed) code
CREATE INDEX idx_deal_promo_codes_available ON deal_promo_codes(deal_id) WHERE claim_id IS NULL;

-- Denormalized promo code on claims for fast customer reads
ALTER TABLE claims ADD COLUMN IF NOT EXISTS promo_code text;

-- Atomic code assignment: grabs the next available code for a deal and assigns it to a claim.
-- Uses FOR UPDATE SKIP LOCKED to handle concurrent claims safely.
CREATE OR REPLACE FUNCTION assign_promo_code(p_deal_id uuid, p_claim_id uuid)
RETURNS text AS $$
DECLARE
  v_code text;
BEGIN
  UPDATE deal_promo_codes
  SET claim_id = p_claim_id
  WHERE id = (
    SELECT id FROM deal_promo_codes
    WHERE deal_id = p_deal_id AND claim_id IS NULL
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING code INTO v_code;

  -- Also store on the claim for fast access
  IF v_code IS NOT NULL THEN
    UPDATE claims SET promo_code = v_code WHERE id = p_claim_id;
  END IF;

  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- RLS policies
ALTER TABLE deal_promo_codes ENABLE ROW LEVEL SECURITY;

-- Vendors can see codes for their own deals
CREATE POLICY "Vendors can view their deal promo codes"
  ON deal_promo_codes FOR SELECT
  USING (deal_id IN (SELECT id FROM deals WHERE vendor_id = auth.uid()));

-- Service role can do everything (used by API routes)
CREATE POLICY "Service role full access to promo codes"
  ON deal_promo_codes FOR ALL
  USING (auth.role() = 'service_role');
