-- Add active_role to user_profiles for dual-role switching (vendor ↔ customer)
-- This tracks which mode the user is currently in. NULL means use the primary role.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS active_role user_role;
