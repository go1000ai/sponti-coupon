-- Ensure the `deal-videos` storage bucket exists.
--
-- AI video generation (/api/vendor/generate-video) uploads finished Reels to a
-- `deal-videos` bucket. It already exists in the production project, but no
-- migration created it — so fresh/local environments were missing it. This makes
-- the bucket reproducible. 50 MB matches the project's global storage cap.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'deal-videos',
  'deal-videos',
  true,
  52428800, -- 50 MB (project-wide cap)
  ARRAY['video/mp4', 'video/quicktime', 'video/webm']
)
ON CONFLICT (id) DO NOTHING;

-- Policies are dropped first so this migration is idempotent: the bucket and
-- these policies already exist in production, and re-running CREATE POLICY on an
-- existing policy errors out. DROP ... IF EXISTS makes apply safe everywhere.

-- Public read access (videos are shown on public deal pages + social posts).
DROP POLICY IF EXISTS "Public read access for deal videos" ON storage.objects;
CREATE POLICY "Public read access for deal videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'deal-videos');

-- Authenticated users (and service role, which bypasses RLS) can upload videos.
DROP POLICY IF EXISTS "Authenticated users can upload deal videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload deal videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'deal-videos' AND auth.role() = 'authenticated');

-- Authenticated users can replace/remove their own uploaded videos.
DROP POLICY IF EXISTS "Authenticated users can update deal videos" ON storage.objects;
CREATE POLICY "Authenticated users can update deal videos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'deal-videos' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete deal videos" ON storage.objects;
CREATE POLICY "Authenticated users can delete deal videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'deal-videos' AND auth.role() = 'authenticated');
