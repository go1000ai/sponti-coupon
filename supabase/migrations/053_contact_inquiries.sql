-- Contact form submissions
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  business_name TEXT NOT NULL,
  locations TEXT,
  message TEXT,
  plan TEXT DEFAULT 'enterprise',
  status TEXT DEFAULT 'new',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only service role can insert/read
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (no public access)
CREATE POLICY "Service role full access on contact_inquiries"
  ON contact_inquiries
  FOR ALL
  USING (true)
  WITH CHECK (true);
