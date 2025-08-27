-- Migration: Fix rating slugs by temporarily disabling RLS
-- Date: 2025-08-27  
-- Purpose: Update rating slugs by bypassing RLS restrictions

-- Step 1: Temporarily disable RLS on rating table
ALTER TABLE rating DISABLE ROW LEVEL SECURITY;

-- Step 2: Update all rating records with correct slugs
UPDATE rating 
SET slug = g.slug
FROM game g
WHERE rating.game_id = g.id 
AND g.slug IS NOT NULL AND g.slug != '';

-- Step 3: Re-enable RLS on rating table
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify all ratings now have correct slugs
SELECT 
  'Total ratings' as metric,
  COUNT(*) as count
FROM rating

UNION ALL

SELECT 
  'Ratings with slugs' as metric,
  COUNT(*) as count
FROM rating 
WHERE slug IS NOT NULL AND slug != ''

UNION ALL

SELECT 
  'Ratings with correct slugs' as metric,
  COUNT(*) as count
FROM rating r
JOIN game g ON r.game_id = g.id
WHERE r.slug = g.slug;

-- Step 5: Show any remaining issues
SELECT 
  r.id, 
  r.game_id, 
  r.slug as rating_slug,
  g.slug as game_slug,
  CASE 
    WHEN r.slug = g.slug THEN 'CORRECT' 
    WHEN r.slug IS NULL OR r.slug = '' THEN 'MISSING'
    ELSE 'MISMATCH' 
  END as status
FROM rating r
LEFT JOIN game g ON r.game_id = g.id
WHERE r.slug != g.slug OR r.slug IS NULL OR r.slug = ''
ORDER BY r.id;