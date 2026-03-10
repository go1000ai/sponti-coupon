-- Allow support tickets from GHL phone calls (callers may not have accounts)
ALTER TABLE support_tickets ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE support_tickets ALTER COLUMN user_email DROP NOT NULL;
ALTER TABLE support_tickets DROP CONSTRAINT IF EXISTS support_tickets_user_role_check;
ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_user_role_check
  CHECK (user_role IN ('vendor', 'customer', 'caller'));

-- Add caller info columns for GHL-originated tickets
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS caller_name TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS caller_phone TEXT;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'web';
