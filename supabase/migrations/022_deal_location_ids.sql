-- Add location_ids column to deals table for multi-location support
-- null = all locations (default), [] = online/no location, ['id1','id2'] = specific locations

ALTER TABLE deals ADD COLUMN IF NOT EXISTS location_ids text[] DEFAULT NULL;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS website_url text DEFAULT NULL;

-- Index for querying deals by location
CREATE INDEX IF NOT EXISTS idx_deals_location_ids ON deals USING GIN (location_ids);
