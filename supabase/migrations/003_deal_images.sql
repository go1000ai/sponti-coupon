-- Add image gallery support to deals
-- image_urls stores additional images as a JSON array of strings
ALTER TABLE deals ADD COLUMN image_urls JSONB DEFAULT '[]'::jsonb;

-- Create index for querying deals with images
CREATE INDEX idx_deals_image_urls ON deals USING gin (image_urls);
