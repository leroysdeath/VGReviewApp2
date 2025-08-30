-- Fix the rating slug trigger to use correct join condition
-- The trigger was incorrectly trying to match game.game_id with rating.game_id
-- It should match game.id with rating.game_id instead

-- Drop the existing incorrect trigger and function
DROP TRIGGER IF EXISTS trigger_update_rating_slug ON rating;
DROP FUNCTION IF EXISTS update_rating_slug();

-- Create the corrected function
CREATE OR REPLACE FUNCTION update_rating_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Correctly join on game.id = rating.game_id
    -- rating.game_id is a foreign key to game.id, not game.game_id
    SELECT slug INTO NEW.slug 
    FROM game 
    WHERE id = NEW.game_id;
    
    -- If no slug found in game table, generate one from the game name
    IF NEW.slug IS NULL THEN
        SELECT LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REGEXP_REPLACE(
                        REGEXP_REPLACE(name, '[^a-zA-Z0-9\s-]', '', 'g'),  -- Remove special chars
                        '\s+', '-', 'g'  -- Replace spaces with hyphens
                    ),
                    '-+', '-', 'g'  -- Replace multiple hyphens with single
                ),
                '^-|-$', '', 'g'  -- Remove leading/trailing hyphens
            )
        ) INTO NEW.slug
        FROM game 
        WHERE id = NEW.game_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the corrected function
CREATE TRIGGER trigger_update_rating_slug
    BEFORE INSERT OR UPDATE ON rating
    FOR EACH ROW
    EXECUTE FUNCTION update_rating_slug();

-- Update all existing ratings to have the correct slug
UPDATE rating r
SET slug = g.slug
FROM game g
WHERE r.game_id = g.id
AND (r.slug IS NULL OR r.slug = '' OR r.slug != g.slug);

-- Verify the fix
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
    'Ratings missing slugs' as metric,
    COUNT(*) as count
FROM rating
WHERE slug IS NULL OR slug = '';