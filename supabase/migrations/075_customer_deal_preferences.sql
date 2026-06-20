-- Customer deal preferences: category interests + zip-based location + radius
-- Powers the "Deals For You" preference picker and the daily new-deal email digest.

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS preferred_categories text[] DEFAULT '{}',     -- category slugs they want (empty = all)
  ADD COLUMN IF NOT EXISTS email_preferred_deals boolean DEFAULT true,   -- email me new matching deals
  ADD COLUMN IF NOT EXISTS location_zip text,                            -- their zip (no full address needed)
  ADD COLUMN IF NOT EXISTS lat double precision,                         -- geocoded from zip
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS deal_radius_miles int DEFAULT 50,             -- "deals within N miles" (50/200/300)
  ADD COLUMN IF NOT EXISTS last_deal_digest_at timestamptz;              -- cron watermark to avoid resending
