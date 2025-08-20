-- Fix for missing games in game table
-- This migration adds missing games that exist in game_progress but not in the game table
-- Run this to fix the issue where users can't see their started/completed games in GamesModal

INSERT INTO game (igdb_id, name, created_at, updated_at) 
SELECT DISTINCT 
  gp.igdb_id, 
  'Game ' || gp.igdb_id, 
  NOW(), 
  NOW() 
FROM game_progress gp 
WHERE gp.igdb_id NOT IN (
  SELECT g.igdb_id 
  FROM game g 
  WHERE g.igdb_id IS NOT NULL
) 
AND gp.igdb_id IS NOT NULL;

-- After running this, the following games should be added:
-- - Game 116 (KOTORLORE's game)
-- - Game 222095 (TestBoyo's game)  
-- - Game 305152 (Spoodle's game)
-- - Game 338616 (DotHog69's game)