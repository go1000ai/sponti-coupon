-- Migration 011: Support claim cancellation and transfer

-- Decrement claims count when a claim is cancelled
CREATE OR REPLACE FUNCTION decrement_claims_count(deal_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE deals
  SET claims_count = GREATEST(claims_count - 1, 0)
  WHERE id = deal_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Track transfer history
CREATE TABLE IF NOT EXISTS claim_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  from_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  to_customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claim_transfers_claim_id ON claim_transfers(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_transfers_from ON claim_transfers(from_customer_id);
CREATE INDEX IF NOT EXISTS idx_claim_transfers_to ON claim_transfers(to_customer_id);

-- RLS for claim_transfers
ALTER TABLE claim_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view their own transfers"
  ON claim_transfers FOR SELECT
  USING (from_customer_id = auth.uid() OR to_customer_id = auth.uid());
