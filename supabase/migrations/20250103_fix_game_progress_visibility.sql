-- Fix game_progress visibility to allow all users to view game progress data
-- This is needed for the GamesModal to work when viewing other users' profiles

-- Drop the restrictive SELECT policy
DROP POLICY IF EXISTS "Users can view their own game progress" ON game_progress;

-- Create a new policy that allows everyone to view all game progress data
-- This is safe because game progress is public information (like reviews)
CREATE POLICY "All users can view game progress" ON game_progress
    FOR SELECT
    USING (true);

-- Keep the existing policies for INSERT, UPDATE, and DELETE
-- These ensure users can only modify their own data
-- The existing policies are:
-- - "Users can insert their own game progress" (INSERT)
-- - "Users can update their own game progress" (UPDATE)  
-- - "Users can delete their own game progress" (DELETE)