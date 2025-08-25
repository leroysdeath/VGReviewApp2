-- Fix duplicate and incorrect foreign key constraints
-- Date: 2025-08-24
-- Issue: GamesModal and ReviewsModal failing due to conflicting foreign key constraints
-- Root cause: Incorrect constraints pointing to game.igdb_id instead of game.id

-- Fix game_progress table
-- Remove incorrect constraint that references game.igdb_id
ALTER TABLE game_progress DROP CONSTRAINT IF EXISTS game_progress_game_id_fkey;

-- Remove duplicate constraint
ALTER TABLE game_progress DROP CONSTRAINT IF EXISTS fk_game_progress_game_id;

-- Fix rating table  
-- Remove incorrect constraint that references game.igdb_id
ALTER TABLE rating DROP CONSTRAINT IF EXISTS rating_game_id_fkey;

-- Remove duplicate constraint
ALTER TABLE rating DROP CONSTRAINT IF EXISTS fk_rating_game_id;

-- After running this script, the following constraints will remain:
-- game_progress table: fk_game_progress_game (correctly references game.id)
-- rating table: fk_rating_game (correctly references game.id)
-- These enable the Supabase foreign key syntax: game:game_id (...) to work properly