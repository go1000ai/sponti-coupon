-- Prospect leads captured by Olivia chatbot from visitors not ready to sign up
CREATE TABLE IF NOT EXISTS prospect_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL,
  phone text,
  business_name text,
  source text NOT NULL DEFAULT 'olivia_chat', -- olivia_chat, abandoned_signup, landing_page
  notes text,
  status text NOT NULL DEFAULT 'new', -- new, contacted, qualified, converted, lost
  ghl_synced boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for admin lookups
CREATE INDEX idx_prospect_leads_status ON prospect_leads (status);
CREATE INDEX idx_prospect_leads_email ON prospect_leads (email);
CREATE INDEX idx_prospect_leads_created ON prospect_leads (created_at DESC);

-- Prevent duplicate emails within 24 hours
CREATE UNIQUE INDEX idx_prospect_leads_email_24h ON prospect_leads (email)
  WHERE created_at > now() - interval '24 hours';

-- RLS: only service role can read/write (admin API uses service role)
ALTER TABLE prospect_leads ENABLE ROW LEVEL SECURITY;
