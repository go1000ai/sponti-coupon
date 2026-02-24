-- ============================================
-- 012: Vendor Loyalty Rewards System
-- ============================================

-- Enum types
CREATE TYPE loyalty_program_type AS ENUM ('punch_card', 'points');

-- ─── Loyalty Programs ───────────────────────────
-- One per vendor. Stores program configuration.
CREATE TABLE loyalty_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  program_type loyalty_program_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Punch card config (NULL if points type)
  punches_required INTEGER,
  punch_reward TEXT,

  -- Points config (NULL if punch_card type)
  points_per_dollar NUMERIC(6, 2),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT one_program_per_vendor UNIQUE (vendor_id),
  CONSTRAINT punch_card_fields CHECK (
    program_type != 'punch_card' OR
    (punches_required IS NOT NULL AND punches_required > 0 AND punch_reward IS NOT NULL)
  ),
  CONSTRAINT points_fields CHECK (
    program_type != 'points' OR
    (points_per_dollar IS NOT NULL AND points_per_dollar > 0)
  )
);

-- ─── Loyalty Rewards (points program tiers) ────
CREATE TABLE loyalty_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Loyalty Cards (customer × vendor) ──────────
CREATE TABLE loyalty_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES loyalty_programs(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,

  current_punches INTEGER NOT NULL DEFAULT 0,
  total_punches_earned INTEGER NOT NULL DEFAULT 0,

  current_points INTEGER NOT NULL DEFAULT 0,
  total_points_earned INTEGER NOT NULL DEFAULT 0,
  total_points_redeemed INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_customer_vendor UNIQUE (customer_id, vendor_id)
);

-- ─── Loyalty Transactions (audit log) ───────────
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES loyalty_cards(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  redemption_id UUID REFERENCES redemptions(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE SET NULL,

  transaction_type TEXT NOT NULL,
  points_amount INTEGER NOT NULL DEFAULT 0,
  punches_amount INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  deal_title TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ────────────────────────────────────
CREATE INDEX idx_loyalty_programs_vendor ON loyalty_programs(vendor_id);
CREATE INDEX idx_loyalty_rewards_program ON loyalty_rewards(program_id);
CREATE INDEX idx_loyalty_cards_customer ON loyalty_cards(customer_id);
CREATE INDEX idx_loyalty_cards_vendor ON loyalty_cards(vendor_id);
CREATE INDEX idx_loyalty_cards_program ON loyalty_cards(program_id);
CREATE INDEX idx_loyalty_cards_customer_vendor ON loyalty_cards(customer_id, vendor_id);
CREATE INDEX idx_loyalty_transactions_card ON loyalty_transactions(card_id);
CREATE INDEX idx_loyalty_transactions_customer ON loyalty_transactions(customer_id);
CREATE INDEX idx_loyalty_transactions_vendor ON loyalty_transactions(vendor_id);

-- ─── Row Level Security ─────────────────────────
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- loyalty_programs
CREATE POLICY "Vendors can manage own loyalty programs" ON loyalty_programs
  FOR ALL USING (vendor_id = auth.uid());
CREATE POLICY "Customers can view active loyalty programs" ON loyalty_programs
  FOR SELECT USING (is_active = TRUE);

-- loyalty_rewards
CREATE POLICY "Vendors can manage own loyalty rewards" ON loyalty_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM loyalty_programs lp WHERE lp.id = loyalty_rewards.program_id AND lp.vendor_id = auth.uid())
  );
CREATE POLICY "Customers can view active loyalty rewards" ON loyalty_rewards
  FOR SELECT USING (
    is_active = TRUE AND EXISTS (
      SELECT 1 FROM loyalty_programs lp WHERE lp.id = loyalty_rewards.program_id AND lp.is_active = TRUE
    )
  );

-- loyalty_cards
CREATE POLICY "Customers can view own loyalty cards" ON loyalty_cards
  FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Vendors can view loyalty cards for their programs" ON loyalty_cards
  FOR SELECT USING (vendor_id = auth.uid());

-- loyalty_transactions
CREATE POLICY "Customers can view own loyalty transactions" ON loyalty_transactions
  FOR SELECT USING (customer_id = auth.uid());
CREATE POLICY "Vendors can view own loyalty transactions" ON loyalty_transactions
  FOR SELECT USING (vendor_id = auth.uid());

-- ─── Triggers ───────────────────────────────────
CREATE OR REPLACE FUNCTION update_loyalty_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loyalty_programs_updated_at
  BEFORE UPDATE ON loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION update_loyalty_updated_at();

CREATE TRIGGER loyalty_cards_updated_at
  BEFORE UPDATE ON loyalty_cards
  FOR EACH ROW EXECUTE FUNCTION update_loyalty_updated_at();
