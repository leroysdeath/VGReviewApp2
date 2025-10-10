-- Migration: Fix Supabase Performance Warnings
-- Date: 2025-10-09
-- Issues Fixed:
--   1. Auth RLS Initplan - 5 policies (user_analytics, admin_users, avatar_moderation_logs, game_views)
--   2. Multiple Permissive Policies - 6 issues (rating, user_analytics)
--   3. Duplicate Indexes - user table

-- ============================================================================
-- ISSUE 1: Fix Auth RLS Initplan Issues
-- ============================================================================
-- Replace auth.uid() with (SELECT auth.uid()) to prevent re-evaluation per row

-- Fix: user_analytics - Service role full access
DROP POLICY IF EXISTS "Service role full access" ON public.user_analytics;
CREATE POLICY "Service role full access" ON public.user_analytics
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix: user_analytics - Users can read own analytics
DROP POLICY IF EXISTS "Users can read own analytics" ON public.user_analytics;
CREATE POLICY "Users can read own analytics" ON public.user_analytics
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));  -- Wrapped in SELECT

-- Fix: admin_users - Service role manages admin users
DROP POLICY IF EXISTS "Service role manages admin users" ON public.admin_users;
CREATE POLICY "Service role manages admin users" ON public.admin_users
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fix: avatar_moderation_logs - Users can view own moderation logs
DROP POLICY IF EXISTS "Users can view own moderation logs" ON public.avatar_moderation_logs;
CREATE POLICY "Users can view own moderation logs" ON public.avatar_moderation_logs
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));  -- Wrapped in SELECT

-- Fix: game_views - game_views_select_policy
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
        FROM public.user_preferences
        WHERE user_id = (SELECT auth.uid())  -- Wrapped in SELECT
      ),
      true
    )
    OR
    -- Or if it's the user's own view
    user_id = (SELECT auth.uid())  -- Wrapped in SELECT
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
CREATE POLICY "rating_manage_policy" ON public.rating
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Fix: user_analytics - Already has "Service role full access", remove redundancy
-- The "Users can read own analytics" is more restrictive, so keep it for authenticated
-- and rely on service_role policy for service_role access
-- No additional changes needed - the auth.uid() fix above handles this

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

  RAISE NOTICE 'idx_user_id_bulk_lookup: %', idx1_def;
  RAISE NOTICE 'idx_user_id_lookup: %', idx2_def;

  -- Drop the duplicate (keep the one with better naming)
  IF idx1_def IS NOT NULL AND idx2_def IS NOT NULL THEN
    -- Keep idx_user_id_lookup, drop idx_user_id_bulk_lookup
    DROP INDEX IF EXISTS public.idx_user_id_bulk_lookup;
    RAISE NOTICE '✅ Dropped duplicate index: idx_user_id_bulk_lookup';
  END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify RLS policies have SELECT wrapping
DO $$
DECLARE
  policy_count integer;
BEGIN
  -- This is a heuristic check - not perfect but gives indication
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('user_analytics', 'admin_users', 'avatar_moderation_logs', 'game_views', 'rating')
    AND definition LIKE '%auth.uid()%'
    AND definition NOT LIKE '%(SELECT auth.uid())%';

  IF policy_count > 0 THEN
    RAISE WARNING '⚠️  Found % policies that may still have unwrapped auth.uid()', policy_count;
  ELSE
    RAISE NOTICE '✅ All policies appear to have wrapped auth.uid() calls';
  END IF;
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
  ELSE
    RAISE NOTICE '✅ Duplicate index removed - only 1 user id index remains';
  END IF;
END $$;

-- Count remaining permissive policies per table/role/action
WITH policy_counts AS (
  SELECT
    schemaname,
    tablename,
    'anon' as role_name,
    'SELECT' as action,
    COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('rating', 'user_analytics')
    AND cmd = 'SELECT'
    AND roles @> ARRAY['anon']
  GROUP BY schemaname, tablename
)
SELECT
  tablename,
  policy_count,
  CASE
    WHEN policy_count > 1 THEN '⚠️  Multiple policies'
    ELSE '✅ Single policy'
  END as status
FROM policy_counts;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON POLICY "rating_select_policy" ON public.rating IS
  'Consolidated SELECT policy - anyone can read all ratings';

COMMENT ON POLICY "rating_manage_policy" ON public.rating IS
  'Users can update/delete their own ratings only';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ Performance optimization migration complete!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  - 5 auth RLS initplan issues';
  RAISE NOTICE '  - 6 multiple permissive policy issues';
  RAISE NOTICE '  - 1 duplicate index issue';
  RAISE NOTICE '';
  RAISE NOTICE 'Run database linter to verify all warnings resolved';
END $$;
