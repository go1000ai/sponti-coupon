-- Cache AI-generated social captions on deals to avoid regenerating on every post
ALTER TABLE deals ADD COLUMN IF NOT EXISTS cached_captions JSONB;
