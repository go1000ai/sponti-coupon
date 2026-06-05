-- ============================================================
-- 070: Redeem Members (PIN-based staff for redemption)
-- Business-plan vendors can create named "Redeem Members" who use
-- a 4-digit PIN on the vendor's own (already-logged-in) device to
-- redeem coupons in a locked redeem-only kiosk mode. No separate
-- auth accounts — the device runs in the vendor's session.
-- ============================================================

CREATE TABLE IF NOT EXISTS redeem_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pin_hash TEXT NOT NULL,          -- salted scrypt hash "salt:hash" — never the raw PIN
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redeem_members_vendor ON redeem_members(vendor_id) WHERE active;

-- Attribute redemptions to the staff member who performed them (optional, best-effort).
ALTER TABLE redemptions
  ADD COLUMN IF NOT EXISTS redeem_member_id UUID REFERENCES redeem_members(id) ON DELETE SET NULL;

-- ============================================================
-- Row Level Security: a vendor manages only their own members.
-- PIN verification is done server-side with the service role.
-- ============================================================
ALTER TABLE redeem_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own redeem members"
  ON redeem_members FOR ALL
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());
