CREATE TABLE IF NOT EXISTS founding_vendor_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ghl_contact_id text NOT NULL,
  email text NOT NULL,
  first_name text,
  company_name text,
  contact_name text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'skipped_unsubscribed', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  sent_at timestamptz,
  ghl_message_id text,
  batch_day int,
  created_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_founding_vendor_queue_email
  ON founding_vendor_queue (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_founding_vendor_queue_status
  ON founding_vendor_queue (status);
