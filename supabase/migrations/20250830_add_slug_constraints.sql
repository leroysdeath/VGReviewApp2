-- Migration: Add slug constraints and fix missing slugs
-- Action 10 from SLUG_URL_ACTION_PLAN_FINALv2.md
-- Date: 2025-08-30

-- Step 1: Generate slugs for games with NULL or empty slug values
UPDATE game 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        name,
        '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters
      ),
      '\s+', '-', 'g'  -- Replace spaces with hyphens
    ),
    '-+', '-', 'g'  -- Replace multiple hyphens with single hyphen
  )
)
WHERE slug IS NULL OR slug = '';

-- Step 2: Handle any potential duplicate slugs by appending the game ID
-- This ensures uniqueness before we add the constraint
WITH duplicates AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
  FROM game
  WHERE slug IS NOT NULL
)
UPDATE game 
SET slug = slug || '-' || id
WHERE id IN (
  SELECT id 
  FROM duplicates 
  WHERE rn > 1
);

-- Step 3: Add NOT NULL constraint to slug column
ALTER TABLE game 
ALTER COLUMN slug SET NOT NULL;

-- Step 4: Add unique constraint on slug
ALTER TABLE game 
ADD CONSTRAINT unique_game_slug UNIQUE (slug);

-- Step 5: Ensure index exists for performance (already exists but safe to recreate)
CREATE INDEX IF NOT EXISTS idx_game_slug ON game(slug);

-- Add comment explaining the constraint
COMMENT ON CONSTRAINT unique_game_slug ON game IS 'Ensures each game has a unique URL slug for SEO-friendly URLs';