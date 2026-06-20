-- Allow vendors to add a deposit link from ANY merchant (Clover, Toast, etc.), not just the
-- named processors. 'other' is a link-tier processor: the vendor pastes their own fixed-amount
-- checkout URL and verifies deposits in their own account, exactly like Square/PayPal/Stripe links.
ALTER TABLE vendor_payment_methods DROP CONSTRAINT IF EXISTS vendor_payment_methods_processor_type_check;
ALTER TABLE vendor_payment_methods ADD CONSTRAINT vendor_payment_methods_processor_type_check
  CHECK (processor_type IN ('stripe', 'square', 'paypal', 'venmo', 'zelle', 'cashapp', 'other'));
