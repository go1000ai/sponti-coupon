-- Add requires_appointment flag to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS requires_appointment boolean DEFAULT false;
