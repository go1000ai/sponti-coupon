-- ============================================================
-- 071: Worker Accounts (team members with their own login)
-- Business-plan vendors can create worker accounts (own email +
-- password) that log in on any device. Access defaults to redeem-only
-- and the vendor grants extra features via per-worker permission flags.
-- (Distinct from redeem_members, which is the shared-device PIN kiosk.)
-- ============================================================

-- New role for staff logins.
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'worker';

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  -- Feature permissions. "redeem" is always true; the rest are owner-granted.
  permissions JSONB NOT NULL DEFAULT
    '{"redeem":true,"loyalty":false,"deals":false,"analytics":false,"appointments":false}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'disabled'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (vendor_id, email)
);

CREATE INDEX IF NOT EXISTS idx_team_members_vendor ON team_members(vendor_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ============================================================
-- Row Level Security
--  • the owning vendor manages their workers
--  • a worker can read their own membership row (to resolve employer + perms)
-- Inserts/auth-account creation happen server-side via the service role.
-- ============================================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor manages own team members"
  ON team_members FOR ALL
  USING (vendor_id = auth.uid())
  WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Worker reads own membership"
  ON team_members FOR SELECT
  USING (user_id = auth.uid());
