-- Vendor media library — persistent asset management for images and videos
CREATE TABLE IF NOT EXISTS vendor_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  url TEXT NOT NULL,
  storage_path TEXT,
  bucket TEXT NOT NULL DEFAULT 'deal-images',
  filename TEXT,
  title TEXT,
  ai_prompt TEXT,
  source TEXT NOT NULL DEFAULT 'upload' CHECK (source IN ('upload', 'ai_generated', 'url', 'ai_video')),
  file_size INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_media_vendor ON vendor_media(vendor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_media_type ON vendor_media(vendor_id, type);
