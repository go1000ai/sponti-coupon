-- Platform settings key-value store
CREATE TABLE IF NOT EXISTS platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default values
INSERT INTO platform_settings (key, value) VALUES
  ('sponti_points', '{"earning_rate": "25 points per claim", "redemption_rate": "500 points = $5 off next deal", "first_claim_bonus": "25 points (25 cents)", "expiry_policy": "12 months of inactivity"}'::jsonb),
  ('deal_config', '{"deal_types": "Regular, SpontiCoupon (deposit-based)", "max_claim_period": "7 days", "qr_code_format": "UUID-based"}'::jsonb),
  ('system_limits', '{"max_image_size": "5 MB", "supported_formats": "JPEG, PNG, WebP", "api_rate_limit": "100 requests/min"}'::jsonb),
  ('platform_info', '{"name": "SpontiCoupon", "version": "1.0.0", "environment": "Production"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Anyone can read platform settings"
  ON platform_settings FOR SELECT
  USING (true);

-- Only service role can write (admin API uses service role client)
CREATE POLICY "Service role can update platform settings"
  ON platform_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can insert platform settings"
  ON platform_settings FOR INSERT
  WITH CHECK (true);
