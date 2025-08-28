-- Migration: Fix missing slugs in game_progress and rating tables
-- Date: 2025-08-27
-- Purpose: Copy slugs from game table to game_progress and rating tables where missing

-- Step 1: Update game_progress table with missing slugs
UPDATE game_progress 
SET slug = g.slug
FROM game g
WHERE game_progress.game_id = g.id 
AND (game_progress.slug IS NULL OR game_progress.slug = '' OR trim(game_progress.slug) = '')
AND g.slug IS NOT NULL AND g.slug != '';

-- Step 2: Update rating table with missing slugs
UPDATE rating 
SET slug = g.slug
FROM game g
WHERE rating.game_id = g.id 
AND (rating.slug IS NULL OR rating.slug = '' OR trim(rating.slug) = '')
AND g.slug IS NOT NULL AND g.slug != '';

-- Step 3: Verify results
SELECT 
  'game_progress' as table_name,
  COUNT(*) as missing_slugs
FROM game_progress 
WHERE slug IS NULL OR slug = '' OR trim(slug) = ''

UNION ALL

SELECT 
  'rating' as table_name,
  COUNT(*) as missing_slugs
FROM rating 
WHERE slug IS NULL OR slug = '' OR trim(slug) = ''

UNION ALL

SELECT 
  'game' as table_name,
  COUNT(*) as missing_slugs
FROM game 
WHERE slug IS NULL OR slug = '' OR trim(slug) = '';

-- Step 4: Show sample of fixed records
SELECT 
  'Fixed game_progress records' as info,
  COUNT(*) as count
FROM game_progress gp
JOIN game g ON gp.game_id = g.id
WHERE gp.slug = g.slug

UNION ALL

SELECT 
  'Fixed rating records' as info,
  COUNT(*) as count
FROM rating r
JOIN game g ON r.game_id = g.id
WHERE r.slug = g.slug;