-- Vendor Payment Methods: support multiple payment processors per vendor
-- Vendors provide their own payment links for customer deposits

CREATE TABLE IF NOT EXISTS vendor_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  processor_type TEXT NOT NULL CHECK (processor_type IN ('stripe', 'square', 'paypal', 'venmo', 'zelle', 'cashapp')),
  payment_link TEXT NOT NULL,
  display_name TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by vendor
CREATE INDEX idx_vendor_payment_methods_vendor_id ON vendor_payment_methods(vendor_id);

-- Ensure only one primary method per vendor
CREATE UNIQUE INDEX idx_vendor_payment_methods_primary ON vendor_payment_methods(vendor_id) WHERE is_primary = true;

-- RLS: vendors can only manage their own payment methods
ALTER TABLE vendor_payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can view own payment methods"
  ON vendor_payment_methods FOR SELECT
  USING (auth.uid() = vendor_id);

CREATE POLICY "Vendors can insert own payment methods"
  ON vendor_payment_methods FOR INSERT
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can update own payment methods"
  ON vendor_payment_methods FOR UPDATE
  USING (auth.uid() = vendor_id)
  WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "Vendors can delete own payment methods"
  ON vendor_payment_methods FOR DELETE
  USING (auth.uid() = vendor_id);

-- Migrate existing stripe_payment_link data into new table
INSERT INTO vendor_payment_methods (vendor_id, processor_type, payment_link, display_name, is_primary, is_active)
SELECT id, 'stripe', stripe_payment_link, 'Stripe Payment Link', true, true
FROM vendors
WHERE stripe_payment_link IS NOT NULL AND stripe_payment_link != '';

-- Auto-update updated_at on changes
CREATE OR REPLACE FUNCTION update_vendor_payment_methods_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_payment_methods_updated_at
  BEFORE UPDATE ON vendor_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_payment_methods_updated_at();
