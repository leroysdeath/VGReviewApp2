-- Migration: Fix ALL rating slugs (both missing and incorrect)
-- Date: 2025-08-27
-- Purpose: Update all rating slugs to match their corresponding game slugs

-- Update ALL rating records to have correct slugs from game table
UPDATE rating 
SET slug = g.slug
FROM game g
WHERE rating.game_id = g.id 
AND g.slug IS NOT NULL AND g.slug != '';

-- Verify results
SELECT 
  'rating_records_fixed' as info,
  COUNT(*) as total_ratings,
  COUNT(CASE WHEN slug IS NOT NULL AND slug != '' THEN 1 END) as ratings_with_slugs,
  COUNT(CASE WHEN slug IS NULL OR slug = '' THEN 1 END) as ratings_without_slugs
FROM rating;

-- Show current state after fix
SELECT 
  r.id, 
  r.game_id, 
  r.rating,
  r.slug as rating_slug,
  g.name as game_name,
  g.slug as game_slug,
  CASE 
    WHEN r.slug = g.slug THEN 'CORRECT' 
    WHEN r.slug IS NULL OR r.slug = '' THEN 'MISSING'
    ELSE 'MISMATCH' 
  END as status
FROM rating r
LEFT JOIN game g ON r.game_id = g.id
ORDER BY r.id;