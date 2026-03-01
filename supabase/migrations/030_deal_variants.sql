-- Add variants JSONB column to deals table
-- Variants allow a single deal to have multiple options (e.g., Basic, Premium, Deluxe)
-- Each variant has: id, name, description, price, original_price, deposit_amount, max_claims, claims_count
-- Only regular (Steady) deals support variants. Sponti deals must have empty variants.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;
