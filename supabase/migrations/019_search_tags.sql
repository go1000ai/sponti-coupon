-- Add search_tags column to deals table for keyword-based search (like SEO keywords)
ALTER TABLE deals ADD COLUMN IF NOT EXISTS search_tags text[] DEFAULT '{}';

-- Index for faster array searches
CREATE INDEX IF NOT EXISTS idx_deals_search_tags ON deals USING GIN (search_tags);
