-- Add "cold_email_sent" so you can tell cold outreach (never spoke) apart from
-- a warm "email_sent" (emailed after a call/contact).

ALTER TABLE vendor_leads DROP CONSTRAINT IF EXISTS vendor_leads_status_check;

ALTER TABLE vendor_leads ADD CONSTRAINT vendor_leads_status_check
  CHECK (status IN (
    'not_contacted',
    'contacted',
    'cold_email_sent',
    'email_sent',
    'follow_up',
    'no_answer',
    'interested',
    'signed_up',
    'not_interested'
  ));
