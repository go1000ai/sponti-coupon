-- Migration 056: Add recurring schedule to marketing_content_queue
-- Allows posts to be automatically reposted on a schedule
ALTER TABLE marketing_content_queue ADD COLUMN IF NOT EXISTS recurring_schedule JSONB;
-- recurring_schedule format: { "frequency": "weekly" | "biweekly" | "monthly", "day_of_week": 0-6 (Sun-Sat), "active": true/false }
