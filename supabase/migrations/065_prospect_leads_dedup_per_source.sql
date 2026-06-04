-- Allow same email across different funnel stages within 24h.
-- Previous unique constraint on (email) WHERE status='new' silently
-- dropped wizard-qualified leads that followed an earlier demo-gate
-- entry from the same user, hiding funnel progression.
--
-- New constraint: same email may have separate rows per source while
-- status='new' (e.g. demo gate → wizard qualified → wizard disqualified
-- can all coexist for the same person). Refresh-spam from the SAME source
-- is still blocked.

DROP INDEX IF EXISTS idx_prospect_leads_email_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prospect_leads_email_source_unique
  ON prospect_leads (email, source)
  WHERE status = 'new';
