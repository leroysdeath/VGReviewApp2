-- Add slug column to game_progress table and populate with game slugs
-- This script adds a slug column that mirrors the slug from the corresponding game

-- Step 1: Add the slug column to the game_progress table
ALTER TABLE game_progress ADD COLUMN slug character varying;

-- Step 2: Populate the slug column with data from the game table
-- Using correct relationship: game_progress.game_id = game.id
UPDATE game_progress 
SET slug = game.slug 
FROM game 
WHERE game_progress.game_id = game.id;

-- Step 3: Add an index on the slug column for better query performance
CREATE INDEX idx_game_progress_slug ON game_progress(slug);

-- Step 4: Add a trigger to automatically populate slug when new progress is inserted/updated
CREATE OR REPLACE FUNCTION update_game_progress_slug()
RETURNS TRIGGER AS $$
BEGIN
    SELECT slug INTO NEW.slug 
    FROM game 
    WHERE id = NEW.game_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_game_progress_slug
    BEFORE INSERT OR UPDATE ON game_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_game_progress_slug();

-- Verification query (run after execution to verify)
-- SELECT gp.id, gp.game_id, gp.slug, g.slug as game_slug, g.name as game_name
-- FROM game_progress gp 
-- LEFT JOIN game g ON gp.game_id = g.id 
-- ORDER BY gp.id;