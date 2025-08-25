-- Fix game_progress trigger that's causing review submission failures
-- The trigger was trying to insert into game_progress but failing due to RLS policies

-- Drop all triggers that depend on the function first
DROP TRIGGER IF EXISTS rating_completion_status_sync ON rating;
DROP TRIGGER IF EXISTS sync_rating_completion ON rating;

-- Now drop the function using CASCADE to remove any remaining dependencies
DROP FUNCTION IF EXISTS sync_rating_completion_status() CASCADE;

-- For now, we'll disable the automatic game_progress sync until we can properly implement it
-- Reviews can still be created without this trigger