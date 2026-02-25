-- Add first_name and last_name to user_profiles so all roles have names
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Backfill customer names from the customers table
UPDATE user_profiles up
SET first_name = c.first_name,
    last_name = c.last_name
FROM customers c
WHERE up.id = c.id
  AND up.role = 'customer'
  AND (c.first_name IS NOT NULL OR c.last_name IS NOT NULL);
