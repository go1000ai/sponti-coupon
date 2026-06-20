-- Add "email_sent" to vendor_leads status options so you can track which leads
-- you've emailed (separate from called/"contacted").

ALTER TABLE vendor_leads DROP CONSTRAINT IF EXISTS vendor_leads_status_check;

ALTER TABLE vendor_leads ADD CONSTRAINT vendor_leads_status_check
  CHECK (status IN (
    'not_contacted',
    'contacted',
    'email_sent',
    'follow_up',
    'no_answer',
    'interested',
    'signed_up',
    'not_interested'
  ));
