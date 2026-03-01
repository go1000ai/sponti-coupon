-- Add QR code image URL to vendor payment methods (for Venmo/Zelle/Cash App QR codes)
ALTER TABLE vendor_payment_methods
ADD COLUMN IF NOT EXISTS qr_code_image_url TEXT;

-- Add comment
COMMENT ON COLUMN vendor_payment_methods.qr_code_image_url IS 'URL to vendor-uploaded QR code image for manual payment processors (Venmo, Zelle, Cash App)';
