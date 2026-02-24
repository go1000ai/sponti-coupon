-- ============================================
-- 013: Allow multiple loyalty programs per vendor
-- ============================================

-- Drop the one-program-per-vendor constraint
ALTER TABLE loyalty_programs DROP CONSTRAINT IF EXISTS one_program_per_vendor;

-- Update loyalty_cards unique constraint to be per customer+program (not customer+vendor)
-- since a vendor can now have multiple programs
ALTER TABLE loyalty_cards DROP CONSTRAINT IF EXISTS unique_customer_vendor;
ALTER TABLE loyalty_cards ADD CONSTRAINT unique_customer_program UNIQUE (customer_id, program_id);
