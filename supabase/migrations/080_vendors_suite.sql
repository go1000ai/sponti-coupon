-- Separate suite/unit number for partners. Kept apart from `address` so geocoding
-- uses the clean street address, while the public listing can show the suite.

ALTER TABLE vendors
  ADD COLUMN IF NOT EXISTS suite text;
