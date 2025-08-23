-- Update existing slug column in rating table with correct game slugs
-- The slug column already exists but has incorrect data from wrong relationship

-- Step 1: Clear existing incorrect slug data
UPDATE rating SET slug = NULL;

-- Step 2: Populate the slug column with correct data from the game table
-- Using correct relationship: rating.game_id should match game.game_id (IGDB ID)
UPDATE rating 
SET slug = game.slug 
FROM game 
WHERE rating.game_id::text = game.game_id;

-- Step 3: Add an index on the slug column for better query performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_rating_slug ON rating(slug);

-- Step 4: Drop existing trigger and function if they exist (to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_update_rating_slug ON rating;
DROP FUNCTION IF EXISTS update_rating_slug();

-- Step 5: Create new trigger function with correct relationship
CREATE OR REPLACE FUNCTION update_rating_slug()
RETURNS TRIGGER AS $$
BEGIN
    SELECT slug INTO NEW.slug 
    FROM game 
    WHERE game_id = NEW.game_id::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to automatically populate slug for new ratings
CREATE TRIGGER trigger_update_rating_slug
    BEFORE INSERT OR UPDATE ON rating
    FOR EACH ROW
    EXECUTE FUNCTION update_rating_slug();

-- Verification query (run after execution to verify correct data)
-- SELECT r.id, r.game_id, r.slug, g.slug as game_slug, g.name as game_name
-- FROM rating r 
-- LEFT JOIN game g ON r.game_id::text = g.game_id 
-- ORDER BY r.id;