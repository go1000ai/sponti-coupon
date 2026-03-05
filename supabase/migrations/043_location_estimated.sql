-- Add location_estimated flag for vendors whose address couldn't be precisely geocoded
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS location_estimated boolean DEFAULT false;
