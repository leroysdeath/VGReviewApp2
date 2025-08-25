-- Fix game_progress trigger that's causing review submission failures
-- The trigger was trying to insert into game_progress but failing due to RLS policies

-- First, check if the trigger exists and remove it
DROP TRIGGER IF EXISTS rating_completion_status_sync ON rating;

-- Also drop the function that was causing issues
DROP FUNCTION IF EXISTS sync_rating_completion_status();

-- For now, we'll disable the automatic game_progress sync until we can properly implement it
-- Reviews can still be created without this trigger

-- Use DO block to show notice
DO $$
BEGIN
    RAISE NOTICE 'Removed problematic game_progress sync trigger - reviews should work now';
END $$;