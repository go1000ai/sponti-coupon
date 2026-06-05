-- 068: Clean, human-readable deal slugs.
--
-- Migration 033 generated slugs as "<vendor>-<title>-<8charhex>" (the hex is the
-- first 8 chars of the deal UUID, added only to guarantee uniqueness). The hex
-- adds nothing for SEO/GEO/AEO and clutters the URL. This migration:
--   1. Adds deals.previous_slugs so old URLs can 301-redirect to the new ones.
--   2. Rewrites every existing slug to the clean "<vendor>-<title>" form,
--      appending "-2", "-3", … ONLY when two deals would otherwise collide
--      (matching the app-level logic in src/lib/deal-slug.ts).
--
-- The slugify expression below mirrors slugify() in src/lib/utils.ts:
--   lower → strip non-[a-z0-9_ ] → spaces to hyphens → trim leading/trailing hyphens.

ALTER TABLE deals ADD COLUMN IF NOT EXISTS previous_slugs text[] NOT NULL DEFAULT '{}';

WITH cleaned AS (
  SELECT
    d.id,
    d.created_at,
    d.slug AS old_slug,
    COALESCE(
      NULLIF(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              lower(COALESCE(v.business_name, '') || ' ' || COALESCE(d.title, 'deal')),
              '[^a-z0-9_ ]+', '', 'g'
            ),
            ' +', '-', 'g'
          ),
          '^-+|-+$', '', 'g'
        ),
        ''
      ),
      'deal'
    ) AS base
  FROM deals d
  LEFT JOIN vendors v ON v.id = d.vendor_id
),
numbered AS (
  SELECT
    id,
    old_slug,
    base,
    row_number() OVER (PARTITION BY base ORDER BY created_at, id) AS rn
  FROM cleaned
),
final AS (
  SELECT
    id,
    old_slug,
    CASE WHEN rn = 1 THEN base ELSE base || '-' || rn END AS new_slug
  FROM numbered
)
UPDATE deals d
SET
  slug = f.new_slug,
  previous_slugs = CASE
    WHEN f.old_slug IS NOT NULL AND f.old_slug <> f.new_slug
      THEN array_append(d.previous_slugs, f.old_slug)
    ELSE d.previous_slugs
  END
FROM final f
WHERE d.id = f.id;

-- GIN index so 301 lookups against retired slugs (previous_slugs @> ARRAY[...]) stay fast.
CREATE INDEX IF NOT EXISTS idx_deals_previous_slugs ON deals USING GIN (previous_slugs);
