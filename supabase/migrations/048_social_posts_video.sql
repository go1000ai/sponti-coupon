-- Add video support to social_posts for Facebook video and Instagram Reels
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'image';
-- media_type: 'image', 'video', 'reel'

COMMENT ON COLUMN social_posts.video_url IS 'Video URL for Facebook video or Instagram Reel posts';
COMMENT ON COLUMN social_posts.media_type IS 'Type of media: image, video (Facebook), reel (Instagram)';
