-- Migration to update game_id columns from IGDB IDs to internal database IDs
-- This updates rating.game_id and game_progress.game_id to use game.id instead of game.igdb_id

-- First, let's verify the data before making changes
-- This shows how many records will be affected

-- Check rating table
SELECT 
    'rating' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT r.game_id) as unique_game_ids,
    COUNT(g.id) as matched_games,
    COUNT(*) - COUNT(g.id) as unmatched_records
FROM rating r
LEFT JOIN game g ON r.game_id = g.igdb_id;

-- Check game_progress table  
SELECT 
    'game_progress' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT gp.game_id) as unique_game_ids,
    COUNT(g.id) as matched_games,
    COUNT(*) - COUNT(g.id) as unmatched_records
FROM game_progress gp
LEFT JOIN game g ON gp.game_id = g.igdb_id;

-- Create backup tables (optional but recommended)
CREATE TABLE IF NOT EXISTS rating_backup_20250125 AS 
SELECT * FROM rating;

CREATE TABLE IF NOT EXISTS game_progress_backup_20250125 AS 
SELECT * FROM game_progress;

-- Add temporary columns to store the old IGDB IDs for reference
ALTER TABLE rating 
ADD COLUMN IF NOT EXISTS old_igdb_game_id INTEGER;

ALTER TABLE game_progress 
ADD COLUMN IF NOT EXISTS old_igdb_game_id INTEGER;

-- Store the current IGDB IDs in the temporary columns
UPDATE rating 
SET old_igdb_game_id = game_id
WHERE old_igdb_game_id IS NULL;

UPDATE game_progress 
SET old_igdb_game_id = game_id
WHERE old_igdb_game_id IS NULL;

-- Update rating table: Convert IGDB IDs to internal game IDs
UPDATE rating r
SET game_id = g.id
FROM game g
WHERE r.game_id = g.igdb_id;

-- Update game_progress table: Convert IGDB IDs to internal game IDs
UPDATE game_progress gp
SET game_id = g.id
FROM game g
WHERE gp.game_id = g.igdb_id;

-- Verify the updates were successful
-- Check if any records were not updated (these would be orphaned records)
SELECT 
    'rating - orphaned records' as check_type,
    COUNT(*) as count
FROM rating r
LEFT JOIN game g ON r.game_id = g.id
WHERE g.id IS NULL;

SELECT 
    'game_progress - orphaned records' as check_type,
    COUNT(*) as count
FROM game_progress gp
LEFT JOIN game g ON gp.game_id = g.id
WHERE g.id IS NULL;

-- Show sample of updated records for verification
SELECT 
    'rating - sample updated records' as check_type,
    r.id,
    r.user_id,
    r.game_id as new_game_id,
    r.old_igdb_game_id,
    g.name as game_name,
    g.igdb_id
FROM rating r
JOIN game g ON r.game_id = g.id
LIMIT 10;

SELECT 
    'game_progress - sample updated records' as check_type,
    gp.user_id,
    gp.game_id as new_game_id,
    gp.old_igdb_game_id,
    g.name as game_name,
    g.igdb_id
FROM game_progress gp
JOIN game g ON gp.game_id = g.id
LIMIT 10;

-- Add foreign key constraints to ensure referential integrity going forward
-- Drop existing constraints if they exist
ALTER TABLE rating 
DROP CONSTRAINT IF EXISTS rating_game_id_fkey;

ALTER TABLE game_progress 
DROP CONSTRAINT IF EXISTS game_progress_game_id_fkey;

-- Add new foreign key constraints
ALTER TABLE rating
ADD CONSTRAINT rating_game_id_fkey 
FOREIGN KEY (game_id) 
REFERENCES game(id) 
ON DELETE CASCADE;

ALTER TABLE game_progress
ADD CONSTRAINT game_progress_game_id_fkey 
FOREIGN KEY (game_id) 
REFERENCES game(id) 
ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rating_game_id ON rating(game_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_game_id ON game_progress(game_id);

-- Optional: Create a rollback script (commented out)
-- To rollback, uncomment and run these commands:
/*
-- Rollback rating table
UPDATE rating r
SET game_id = r.old_igdb_game_id
WHERE r.old_igdb_game_id IS NOT NULL;

-- Rollback game_progress table  
UPDATE game_progress gp
SET game_id = gp.old_igdb_game_id
WHERE gp.old_igdb_game_id IS NOT NULL;

-- Remove foreign key constraints
ALTER TABLE rating DROP CONSTRAINT IF EXISTS rating_game_id_fkey;
ALTER TABLE game_progress DROP CONSTRAINT IF EXISTS game_progress_game_id_fkey;
*/

-- After verification, you can optionally drop the temporary columns and backup tables
-- Uncomment these when you're confident the migration was successful:
/*
ALTER TABLE rating DROP COLUMN IF EXISTS old_igdb_game_id;
ALTER TABLE game_progress DROP COLUMN IF EXISTS old_igdb_game_id;
DROP TABLE IF EXISTS rating_backup_20250125;
DROP TABLE IF EXISTS game_progress_backup_20250125;
*/

-- Final summary
SELECT 
    'Migration Complete' as status,
    'Check the verification queries above to ensure all records were updated correctly' as message;