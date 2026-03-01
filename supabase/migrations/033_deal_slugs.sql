-- Add SEO-friendly slug column to deals
ALTER TABLE deals ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Backfill slugs for existing deals: vendor-name-deal-title-shortid
UPDATE deals d
SET slug = (
  SELECT
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          COALESCE(v.business_name, '') || ' ' || d.title || ' ' || LEFT(d.id::text, 8),
          '[^\w ]+', '', 'g'
        ),
        ' +', '-', 'g'
      )
    )
  FROM vendors v
  WHERE v.id = d.vendor_id
)
WHERE d.slug IS NULL;

-- Index for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_deals_slug ON deals(slug);
