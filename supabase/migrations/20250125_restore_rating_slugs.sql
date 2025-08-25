-- Restore slug values in rating table by pulling from game table
-- This updates rating.slug based on the game.slug using the game_id relationship

-- First, verify how many rating records have NULL slugs
SELECT 
    COUNT(*) as total_ratings,
    COUNT(slug) as ratings_with_slug,
    COUNT(*) - COUNT(slug) as ratings_missing_slug
FROM rating;

-- Update rating table slugs from game table
UPDATE rating r
SET slug = g.slug
FROM game g
WHERE r.game_id = g.id
AND r.slug IS NULL;

-- Verify the update was successful
SELECT 
    COUNT(*) as total_ratings,
    COUNT(slug) as ratings_with_slug,
    COUNT(*) - COUNT(slug) as ratings_still_missing_slug
FROM rating;

-- Show sample of updated records
SELECT 
    r.id,
    r.user_id,
    r.game_id,
    r.slug as rating_slug,
    g.slug as game_slug,
    g.name as game_name
FROM rating r
JOIN game g ON r.game_id = g.id
WHERE r.slug IS NOT NULL
LIMIT 10;

-- Check if any ratings still have NULL slugs (would indicate games without slugs)
SELECT 
    r.id,
    r.user_id,
    r.game_id,
    g.name as game_name,
    g.slug as game_slug_also_null
FROM rating r
JOIN game g ON r.game_id = g.id
WHERE r.slug IS NULL
LIMIT 10;