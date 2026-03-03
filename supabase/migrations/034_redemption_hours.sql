-- Add redemption_hours column to deals table
-- For Sponti deals: vendor sets how many hours (4-24) the customer has to redeem after purchase
-- For regular deals: NULL (claim expires with the deal)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS redemption_hours INTEGER;
