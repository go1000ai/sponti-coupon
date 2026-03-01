-- ============================================
-- 028: Add point_value to loyalty programs
-- Allows vendors to set the dollar value each point represents.
-- e.g., point_value = 0.50 means 1 point = $0.50
-- Combined with points_per_dollar, this gives full flexibility.
-- ============================================

ALTER TABLE loyalty_programs
  ADD COLUMN IF NOT EXISTS point_value NUMERIC(8, 4) DEFAULT 1.00;

-- Update constraint: points programs need both fields > 0
ALTER TABLE loyalty_programs
  DROP CONSTRAINT IF EXISTS points_fields;

ALTER TABLE loyalty_programs
  ADD CONSTRAINT points_fields CHECK (
    program_type != 'points' OR
    (points_per_dollar IS NOT NULL AND points_per_dollar > 0
     AND point_value IS NOT NULL AND point_value > 0)
  );

COMMENT ON COLUMN loyalty_programs.point_value IS 'Dollar value each point represents. e.g., 0.50 means 1 point = $0.50';
