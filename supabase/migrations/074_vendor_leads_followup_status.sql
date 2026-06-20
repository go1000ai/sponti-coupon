-- Add "follow_up" and "no_answer" to the vendor_leads status options
-- so leads can be marked after a call attempt.

ALTER TABLE vendor_leads DROP CONSTRAINT IF EXISTS vendor_leads_status_check;

ALTER TABLE vendor_leads ADD CONSTRAINT vendor_leads_status_check
  CHECK (status IN (
    'not_contacted',
    'contacted',
    'interested',
    'signed_up',
    'not_interested',
    'follow_up',
    'no_answer'
  ));
