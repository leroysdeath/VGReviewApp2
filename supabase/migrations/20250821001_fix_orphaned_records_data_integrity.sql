-- =====================================================
-- Phase 1: Fix Orphaned Records Data Integrity
-- =====================================================
-- This migration fixes the orphaned rating and game_progress records
-- by correcting game_id values from IGDB IDs to database IDs

-- Fix orphaned rating records
UPDATE rating 
SET game_id = (SELECT id FROM game WHERE igdb_id = rating.game_id)
WHERE game_id IN (116, 222095, 305152, 338616)
  AND EXISTS (SELECT 1 FROM game WHERE igdb_id = rating.game_id);

-- Fix orphaned game_progress records  
UPDATE game_progress 
SET game_id = (SELECT id FROM game WHERE igdb_id = game_progress.game_id)
WHERE game_id IN (116, 222095, 305152, 338616)
  AND EXISTS (SELECT 1 FROM game WHERE igdb_id = game_progress.game_id);

-- Log the results for verification
DO $$
DECLARE
    rating_count INTEGER;
    progress_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO rating_count 
    FROM rating r 
    WHERE NOT EXISTS (SELECT 1 FROM game WHERE id = r.game_id);
    
    SELECT COUNT(*) INTO progress_count 
    FROM game_progress gp 
    WHERE NOT EXISTS (SELECT 1 FROM game WHERE id = gp.game_id);
    
    RAISE NOTICE 'Remaining orphaned rating records: %', rating_count;
    RAISE NOTICE 'Remaining orphaned game_progress records: %', progress_count;
END $$;