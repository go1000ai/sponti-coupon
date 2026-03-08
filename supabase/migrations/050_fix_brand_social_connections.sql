-- Fix: Move SpontiCoupon brand social accounts from vendor to brand connections
-- These were accidentally connected under the test vendor account

UPDATE social_connections
SET is_brand_account = true,
    vendor_id = NULL
WHERE platform IN ('facebook', 'instagram')
  AND is_brand_account = false
  AND (account_name ILIKE '%sponticoupon%' OR account_username ILIKE '%sponticoupon%');
