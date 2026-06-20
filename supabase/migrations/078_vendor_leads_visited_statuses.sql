-- Add in-person "visited" statuses so you can track which businesses you
-- physically went to and visited (distinct from called/"contacted").

ALTER TABLE vendor_leads DROP CONSTRAINT IF EXISTS vendor_leads_status_check;

ALTER TABLE vendor_leads ADD CONSTRAINT vendor_leads_status_check
  CHECK (status IN (
    'not_contacted',
    'contacted',
    'visited',
    'visited_follow_up',
    'visited_interested',
    'cold_email_sent',
    'email_sent',
    'follow_up',
    'no_answer',
    'interested',
    'signed_up',
    'not_interested'
  ));
