-- Migration 055: Add video_url column to marketing_content_queue
-- Stores the AI-generated video URL for preview and Reel posting
ALTER TABLE marketing_content_queue ADD COLUMN IF NOT EXISTS video_url TEXT;
