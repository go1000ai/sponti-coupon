ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trial_warning_sent_at timestamptz;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS trial_expired_email_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_vendors_promo_expires_at
  ON vendors (promo_expires_at)
  WHERE promo_code IS NOT NULL;
