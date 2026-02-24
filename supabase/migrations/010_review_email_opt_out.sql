-- Migration 010: Add review_email_opt_out column for CAN-SPAM unsubscribe compliance
-- Customers can opt out of review request emails specifically

ALTER TABLE customers ADD COLUMN IF NOT EXISTS review_email_opt_out BOOLEAN NOT NULL DEFAULT FALSE;
