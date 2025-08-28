-- Migration: Fix missing and duplicate slugs
-- Date: 2025-08-27
-- Purpose: Generate slugs for games without them and fix duplicate slugs

-- Step 1: Generate slugs for games with missing slugs
UPDATE game 
SET slug = COALESCE(
  slug,
  lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'))
)
WHERE slug IS NULL OR slug = '';

-- Step 2: Fix duplicate slugs by appending the database ID
WITH duplicates AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
  FROM game 
  WHERE slug IS NOT NULL AND slug != ''
)
UPDATE game 
SET slug = slug || '-' || id::text
FROM duplicates
WHERE game.id = duplicates.id 
  AND duplicates.rn > 1;

-- Step 3: Verify results
SELECT 
  (SELECT COUNT(*) FROM game WHERE slug IS NULL OR slug = '') as missing_slugs,
  (SELECT COUNT(*) FROM (
    SELECT slug FROM game 
    WHERE slug IS NOT NULL AND slug != '' 
    GROUP BY slug 
    HAVING COUNT(*) > 1
  ) duplicates) as duplicate_slugs;