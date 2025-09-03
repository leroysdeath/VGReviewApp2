-- Fix RLS policies for user_follow table
-- This migration adds the missing RLS policies that are causing 406 and 403 errors

-- Enable RLS if not already enabled
ALTER TABLE user_follow ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to ensure clean state)
DROP POLICY IF EXISTS "Users can view all follow relationships" ON user_follow;
DROP POLICY IF EXISTS "Users can follow other users" ON user_follow;
DROP POLICY IF EXISTS "Users can unfollow other users" ON user_follow;

-- Policy to allow anyone (including anon users) to view follow relationships
-- This is needed for checking follow counts and displaying followers/following lists
CREATE POLICY "Users can view all follow relationships" ON user_follow
    FOR SELECT
    USING (true);

-- Policy to allow authenticated users to create follow relationships
-- Users can only create follows where they are the follower
CREATE POLICY "Users can follow other users" ON user_follow
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL AND
        follower_id = (SELECT id FROM "user" WHERE provider_id = auth.uid()) AND
        follower_id != following_id  -- Prevent self-following
    );

-- Policy to allow users to delete their own follow relationships
-- Users can only unfollow (delete records where they are the follower)
CREATE POLICY "Users can unfollow other users" ON user_follow
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL AND
        follower_id = (SELECT id FROM "user" WHERE provider_id = auth.uid())
    );

-- Indexes already exist, no need to create them
-- idx_user_follow_follower_id, idx_user_follow_following_id already present
-- unique constraint on (follower_id, following_id) also exists