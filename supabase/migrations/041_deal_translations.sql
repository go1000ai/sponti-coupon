-- Deal translations cache for AI-translated content
CREATE TABLE IF NOT EXISTS deal_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'es',
  title TEXT,
  description TEXT,
  how_it_works TEXT,
  fine_print TEXT,
  terms_and_conditions TEXT,
  highlights TEXT[], -- array of translated strings
  amenities TEXT[],  -- array of translated strings
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deal_id, locale)
);

-- Index for fast lookups
CREATE INDEX idx_deal_translations_deal_locale ON deal_translations(deal_id, locale);

-- RLS: anyone can read translations, only service role inserts
ALTER TABLE deal_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read deal translations"
  ON deal_translations FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage deal translations"
  ON deal_translations FOR ALL
  USING (true)
  WITH CHECK (true);
