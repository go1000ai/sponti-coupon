-- Page views tracker for admin website traffic analytics
CREATE TABLE IF NOT EXISTS page_views (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  path text NOT NULL,
  referrer text,
  source text,
  user_agent text,
  session_id text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_page_views_created_at ON page_views (created_at);
CREATE INDEX idx_page_views_path_created ON page_views (path, created_at);
CREATE INDEX idx_page_views_source ON page_views (source) WHERE source IS NOT NULL;

-- RLS: allow anonymous inserts, only service role can read
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts" ON page_views
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Service role full access" ON page_views
  FOR ALL TO service_role USING (true) WITH CHECK (true);
