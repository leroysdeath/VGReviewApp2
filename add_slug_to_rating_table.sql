-- Add slug column to rating table and populate with game slugs
-- This script adds a slug column to the rating table that mirrors the slug from the corresponding game

-- Step 1: Add the slug column to the rating table
ALTER TABLE rating ADD COLUMN slug character varying;

-- Step 2: Populate the slug column with data from the game table
UPDATE rating 
SET slug = game.slug 
FROM game 
WHERE rating.game_id = game.id;

-- Step 3: Add an index on the slug column for better query performance
CREATE INDEX idx_rating_slug ON rating(slug);

-- Step 4: Add a trigger to automatically populate slug when new ratings are inserted/updated
CREATE OR REPLACE FUNCTION update_rating_slug()
RETURNS TRIGGER AS $$
BEGIN
    SELECT slug INTO NEW.slug 
    FROM game 
    WHERE id = NEW.game_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating_slug
    BEFORE INSERT OR UPDATE ON rating
    FOR EACH ROW
    EXECUTE FUNCTION update_rating_slug();

-- Verification query (run after execution to verify)
-- SELECT r.id, r.game_id, r.slug, g.slug as game_slug 
-- FROM rating r 
-- LEFT JOIN game g ON r.game_id = g.id 
-- ORDER BY r.id;