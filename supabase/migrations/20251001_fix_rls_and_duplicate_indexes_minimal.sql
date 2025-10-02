-- Migration: Fix RLS Performance Issues and Duplicate Indexes (Minimal)
-- Date: 2025-10-01
-- Purpose: Only fix duplicate indexes and consolidate multiple permissive policies
-- Note: RLS policies are already correctly using provider_id subqueries

-- ============================================================================
-- PART 1: Consolidate Multiple Permissive Policies (game table)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admin view flagged games" ON game;
DROP POLICY IF EXISTS "Enable read access for all users" ON game;

-- Create consolidated SELECT policy
CREATE POLICY "game_select_policy" ON game
  FOR SELECT USING (
    (redlight_flag IS NULL OR redlight_flag = false)
    OR
    (SELECT auth.jwt()->>'role') = 'admin'
  );

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS "Admin update game flags" ON game;
DROP POLICY IF EXISTS "Enable update for all users" ON game;

-- Create consolidated UPDATE policy
CREATE POLICY "game_update_policy" ON game
  FOR UPDATE USING (
    (SELECT auth.jwt()->>'role') = 'admin'
    OR
    (redlight_flag IS NULL OR redlight_flag = false)
  );

-- ============================================================================
-- PART 2: Consolidate Multiple Permissive Policies (game_views table)
-- ============================================================================

-- Drop existing INSERT policies
DROP POLICY IF EXISTS "Anonymous users can insert views" ON game_views;
DROP POLICY IF EXISTS "Users can insert game views" ON game_views;

-- Create consolidated INSERT policy
CREATE POLICY "game_views_insert_policy" ON game_views
  FOR INSERT WITH CHECK (
    -- Authenticated users inserting their own views
    user_id = (SELECT id FROM "user" WHERE provider_id = auth.uid())
    OR
    -- Anonymous users inserting NULL user_id
    (user_id IS NULL AND auth.uid() IS NULL)
  );

-- ============================================================================
-- PART 3: Remove Duplicate Indexes
-- ============================================================================

-- Regular index duplicates
DROP INDEX IF EXISTS idx_content_like_unique;
DROP INDEX IF EXISTS idx_user_id_for_rating_joins;
DROP INDEX IF EXISTS idx_user_collection_igdb_id;
DROP INDEX IF EXISTS idx_user_collection_user_id;
DROP INDEX IF EXISTS idx_user_collection_user_igdb;
DROP INDEX IF EXISTS idx_user_follow_follower_id;
DROP INDEX IF EXISTS idx_user_follow_following_id;
DROP INDEX IF EXISTS idx_wishlist_igdb;
DROP INDEX IF EXISTS idx_wishlist_user;
DROP INDEX IF EXISTS idx_wishlist_user_igdb;

-- Constraint duplicates (drop constraint instead of index)
ALTER TABLE user_collection DROP CONSTRAINT IF EXISTS unique_user_collection_entry;
ALTER TABLE user_wishlist DROP CONSTRAINT IF EXISTS unique_user_wishlist_entry;

-- ============================================================================
-- PART 4: Analyze affected tables
-- ============================================================================

ANALYZE game;
ANALYZE game_views;
ANALYZE content_like;
ANALYZE user_collection;
ANALYZE user_wishlist;
ANALYZE user_follow;

-- End of migration
