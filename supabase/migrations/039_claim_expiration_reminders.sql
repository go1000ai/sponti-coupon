-- Migration 039: Add expiration reminder tracking columns to claims
-- Prevents duplicate reminder emails by recording when each was sent.

ALTER TABLE claims ADD COLUMN IF NOT EXISTS expiration_reminder_3d_sent_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS expiration_reminder_1d_sent_at TIMESTAMPTZ DEFAULT NULL;
