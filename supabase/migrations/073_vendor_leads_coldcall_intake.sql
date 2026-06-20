-- Cold-call intake fields for vendor_leads
-- Lets an admin type in a lead by hand during a call and capture everything
-- needed to (a) create the vendor account and (b) build their first deal later.

ALTER TABLE vendor_leads
  ADD COLUMN IF NOT EXISTS contact_name   text,   -- who you spoke to on the call
  ADD COLUMN IF NOT EXISTS zip            text,   -- needed for account geocoding
  ADD COLUMN IF NOT EXISTS deal_offer     text,   -- the offer, e.g. "BOGO wings"
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS deal_price     numeric,
  ADD COLUMN IF NOT EXISTS deal_type      text,   -- 'sponti_coupon' (flash) | 'regular' (steady)
  ADD COLUMN IF NOT EXISTS payment_method text;   -- how the customer pays them, e.g. "Venmo @handle"
