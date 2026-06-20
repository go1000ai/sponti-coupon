-- Persistent "visited" flag on vendor_leads — independent of status, so a lead
-- stays marked as visited even after you email them or change their stage.

ALTER TABLE vendor_leads
  ADD COLUMN IF NOT EXISTS visited boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS visited_at timestamptz;
