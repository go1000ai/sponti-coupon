-- Add email outreach fields to vendor_leads
-- email: the business contact email address (entered manually by admin)
-- email_sent_at: timestamp of last outreach email sent

ALTER TABLE vendor_leads
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz;
