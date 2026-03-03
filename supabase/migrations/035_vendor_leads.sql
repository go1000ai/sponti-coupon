-- Create vendor_leads table for admin outreach tracking
-- Used by /admin/leads to search, save, and track local business leads for vendor acquisition

CREATE TABLE vendor_leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name text NOT NULL,
  address text,
  phone text,
  website text,
  category text,
  city text,
  state text,
  rating numeric,
  review_count int,
  place_id text UNIQUE,  -- Google Place ID, prevents duplicate saves
  on_groupon boolean DEFAULT false,
  status text DEFAULT 'not_contacted'
    CHECK (status IN (
      'not_contacted',
      'contacted',
      'interested',
      'signed_up',
      'not_interested'
    )),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_vendor_leads_status ON vendor_leads(status);
CREATE INDEX idx_vendor_leads_city   ON vendor_leads(city);
