-- Migration 014: Add detailed fields to deals for richer deal pages
-- Adds: terms_and_conditions, video_urls, amenities, how_it_works

-- Add terms and conditions (free-text, vendor-written)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT DEFAULT NULL;

-- Add video URLs (array of video links — YouTube, Vimeo, or direct mp4)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS video_urls TEXT[] DEFAULT '{}';

-- Add amenities (array of short strings like "Free Parking", "WiFi", "Pet Friendly")
ALTER TABLE deals ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';

-- Add how_it_works (free-text explaining how to use the deal step by step)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS how_it_works TEXT DEFAULT NULL;

-- Add highlights (array of short selling points like "Best seller", "Family friendly")
ALTER TABLE deals ADD COLUMN IF NOT EXISTS highlights TEXT[] DEFAULT '{}';

-- Add fine_print (short legal/restriction text separate from full T&C)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS fine_print TEXT DEFAULT NULL;
