-- Add igdb_id to game_progress table if it doesn't exist
-- This ensures we can enforce exclusivity based on igdb_id

BEGIN;

-- Check if igdb_id column already exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'game_progress' 
      AND column_name = 'igdb_id'
  ) THEN
    ALTER TABLE game_progress 
    ADD COLUMN igdb_id INTEGER;
    
    COMMENT ON COLUMN game_progress.igdb_id IS 'IGDB ID for the game, used for state exclusivity checks';
  END IF;
END $$;

-- Populate igdb_id from the game table for existing records
UPDATE game_progress gp
SET igdb_id = g.igdb_id
FROM game g
WHERE gp.game_id = g.id
  AND gp.igdb_id IS NULL
  AND g.igdb_id IS NOT NULL;

-- Check if slug column already exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'game_progress' 
      AND column_name = 'slug'
  ) THEN
    ALTER TABLE game_progress 
    ADD COLUMN slug VARCHAR(255);
    
    COMMENT ON COLUMN game_progress.slug IS 'Game slug for URL routing';
  END IF;
END $$;

-- Populate slug from the game table for existing records
UPDATE game_progress gp
SET slug = g.slug
FROM game g
WHERE gp.game_id = g.id
  AND gp.slug IS NULL
  AND g.slug IS NOT NULL;

-- Create index on igdb_id for better performance
CREATE INDEX IF NOT EXISTS idx_game_progress_igdb_id 
ON game_progress(igdb_id);

-- Create composite index for user_id and igdb_id lookups
CREATE INDEX IF NOT EXISTS idx_game_progress_user_igdb 
ON game_progress(user_id, igdb_id);

-- Add unique constraint to prevent duplicate entries
-- Only add if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_user_game_progress'
  ) THEN
    ALTER TABLE game_progress
    ADD CONSTRAINT unique_user_game_progress 
    UNIQUE (user_id, igdb_id);
  END IF;
END $$;

-- Verify the changes
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'game_progress'
  AND column_name IN ('igdb_id', 'slug')
ORDER BY ordinal_position;

-- Check how many records have igdb_id populated
SELECT 
  COUNT(*) as total_records,
  COUNT(igdb_id) as records_with_igdb_id,
  COUNT(*) - COUNT(igdb_id) as records_missing_igdb_id
FROM game_progress;

COMMIT;