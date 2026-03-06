-- Add business_type to vendors: 'physical' (default), 'online', or 'both'
-- Online vendors don't need a physical address and their deals show nationwide.
ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'physical'
  CHECK (business_type IN ('physical', 'online', 'both'));

-- Online vendors don't need lat/lng — relax the implicit requirement
COMMENT ON COLUMN vendors.business_type IS 'physical = brick-and-mortar, online = website-only (nationwide), both = has locations + ships/serves online';
