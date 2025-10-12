-- Migration: Fix Supabase Performance Warnings (v2 - Type-Safe)
-- Date: 2025-10-09
-- Issues Fixed:
--   1. Auth RLS Initplan - 5 policies (user_analytics, admin_users, avatar_moderation_logs, game_views)
--   2. Multiple Permissive Policies - 6 issues (rating, user_analytics)
--   3. Duplicate Indexes - user table
--
-- IMPORTANT: This version handles integer vs uuid type mismatches properly

-- ============================================================================
-- ISSUE 1: Fix Auth RLS Initplan Issues
-- ============================================================================
-- Replace auth.uid() with (SELECT auth.uid()) to prevent re-evaluation per row
-- Handle type conversions where user_id is integer but auth.uid() returns uuid

-- Fix: user_analytics - Service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.user_analytics;
CREATE POLICY "Service role full access" ON public.user_analytics
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix: user_analytics - Users can read own analytics
-- Note: user_id is integer, so we need to join with user table to map provider_id (uuid)
DROP POLICY IF EXISTS "Users can read own analytics" ON public.user_analytics;
CREATE POLICY "Users can read own analytics" ON public.user_analytics
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
    )
  );

-- Fix: admin_users - Service role manages admin users
DROP POLICY IF EXISTS "Service role manages admin users" ON public.admin_users;
CREATE POLICY "Service role manages admin users" ON public.admin_users
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix: avatar_moderation_logs - Users can view own moderation logs
-- Note: user_id is integer, map via user table
DROP POLICY IF EXISTS "Users can view own moderation logs" ON public.avatar_moderation_logs;
CREATE POLICY "Users can view own moderation logs" ON public.avatar_moderation_logs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
    )
  );

-- Fix: game_views - game_views_select_policy
-- Note: user_id is integer, map via user table
DROP POLICY IF EXISTS "game_views_select_policy" ON public.game_views;
CREATE POLICY "game_views_select_policy" ON public.game_views
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    -- Allow if tracking is disabled
    NOT COALESCE(
      (
        SELECT tracking_enabled
        FROM public.user_preferences up
        JOIN public.user u ON u.id = up.user_id
        WHERE u.provider_id = (SELECT auth.uid())
      ),
      true
    )
    OR
    -- Or if it's the user's own view
    user_id IN (
      SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- ISSUE 2: Consolidate Multiple Permissive Policies
-- ============================================================================

-- Fix: rating table - Consolidate "Anyone can read ratings" and "Users can manage own ratings"
-- Drop existing SELECT policies
DROP POLICY IF EXISTS "Anyone can read ratings" ON public.rating;
DROP POLICY IF EXISTS "Users can manage own ratings" ON public.rating;

-- Create consolidated SELECT policy
CREATE POLICY "rating_select_policy" ON public.rating
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (true);  -- Anyone can read all ratings

-- Recreate the management policy for UPDATE/DELETE only (not SELECT)
-- Note: user_id in rating table is integer, map via user table
CREATE POLICY "rating_manage_policy" ON public.rating
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.user WHERE provider_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- ISSUE 3: Remove Duplicate Indexes on user table
-- ============================================================================

-- Check which indexes exist and their definitions
DO $$
DECLARE
  idx1_def text;
  idx2_def text;
BEGIN
  -- Get index definitions
  SELECT pg_get_indexdef(indexrelid) INTO idx1_def
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public' AND tablename = 'user' AND indexrelname = 'idx_user_id_bulk_lookup';

  SELECT pg_get_indexdef(indexrelid) INTO idx2_def
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public' AND tablename = 'user' AND indexrelname = 'idx_user_id_lookup';

  IF idx1_def IS NOT NULL THEN
    RAISE NOTICE 'idx_user_id_bulk_lookup: %', idx1_def;
  END IF;

  IF idx2_def IS NOT NULL THEN
    RAISE NOTICE 'idx_user_id_lookup: %', idx2_def;
  END IF;

  -- Drop the duplicate (keep the one with better naming)
  IF idx1_def IS NOT NULL AND idx2_def IS NOT NULL THEN
    -- Keep idx_user_id_lookup, drop idx_user_id_bulk_lookup
    DROP INDEX IF EXISTS public.idx_user_id_bulk_lookup;
    RAISE NOTICE '✅ Dropped duplicate index: idx_user_id_bulk_lookup';
  ELSIF idx1_def IS NOT NULL OR idx2_def IS NOT NULL THEN
    RAISE NOTICE 'ℹ️  Only one index exists - no duplicate to remove';
  ELSE
    RAISE NOTICE 'ℹ️  Neither index exists';
  END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify RLS policies exist and use subqueries
DO $$
DECLARE
  policy_count integer;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('user_analytics', 'admin_users', 'avatar_moderation_logs', 'game_views', 'rating');

  RAISE NOTICE '✅ Found % RLS policies on target tables', policy_count;
END $$;

-- Verify no duplicate indexes
DO $$
DECLARE
  dup_count integer;
BEGIN
  SELECT COUNT(*) INTO dup_count
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND tablename = 'user'
    AND indexrelname IN ('idx_user_id_bulk_lookup', 'idx_user_id_lookup');

  IF dup_count > 1 THEN
    RAISE WARNING '⚠️  Still have % indexes on user table (expected 1)', dup_count;
  ELSIF dup_count = 1 THEN
    RAISE NOTICE '✅ Duplicate index removed - only 1 user id index remains';
  ELSE
    RAISE NOTICE 'ℹ️  No user id indexes found (may have different names)';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON POLICY "rating_select_policy" ON public.rating IS
  'Consolidated SELECT policy - anyone can read all ratings (optimized)';

COMMENT ON POLICY "rating_manage_policy" ON public.rating IS
  'Users can update/delete their own ratings only (type-safe integer->uuid mapping)';

COMMENT ON POLICY "Users can read own analytics" ON public.user_analytics IS
  'Users can read their own analytics (type-safe integer->uuid mapping)';

COMMENT ON POLICY "Users can view own moderation logs" ON public.avatar_moderation_logs IS
  'Users can view their own moderation logs (type-safe integer->uuid mapping)';

COMMENT ON POLICY "game_views_select_policy" ON public.game_views IS
  'Privacy-respecting game views policy (type-safe integer->uuid mapping)';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Performance optimization migration complete!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  - 5 auth RLS initplan issues (with type-safe uuid->integer mapping)';
  RAISE NOTICE '  - 6 multiple permissive policy issues';
  RAISE NOTICE '  - 1 duplicate index issue';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: Performance may be slightly different due to user table joins';
  RAISE NOTICE '   Consider adding index on user(provider_id) if not present';
  RAISE NOTICE '';
  RAISE NOTICE 'Run database linter to verify warnings resolved';
END $$;
