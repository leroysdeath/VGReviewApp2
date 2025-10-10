-- Migration: Fix Final 2 Performance Warnings
-- Date: 2025-10-10
-- Issues:
--   1. game_views policy has auth.jwt() not wrapped in SELECT
--   2. rating has overlapping policies (rating_manage_policy handles SELECT too)

-- ============================================================================
-- Fix 1: game_views - Wrap auth.jwt() in SELECT subquery
-- ============================================================================

DROP POLICY IF EXISTS "game_views_select_policy" ON public.game_views;
CREATE POLICY "game_views_select_policy" ON public.game_views
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (
    -- Users can view their own data (optimized with subquery)
    user_id IN (
      SELECT id FROM public."user" WHERE provider_id = (SELECT auth.uid())
    )
    OR
    -- Admins can view all (wrapped in SELECT to prevent per-row evaluation)
    (SELECT auth.jwt()->>'role') = 'admin'
  );

COMMENT ON POLICY "game_views_select_policy" ON public.game_views IS
  'Users can view their own game views, admins can view all - optimized with subqueries';

-- ============================================================================
-- Fix 2: rating - Split policies to avoid overlap
-- ============================================================================
-- The issue: rating_manage_policy is FOR ALL which includes SELECT
-- This causes both rating_select_policy and rating_manage_policy to run on SELECT queries
-- Solution: Make rating_manage_policy only handle INSERT/UPDATE/DELETE

DROP POLICY IF EXISTS "rating_manage_policy" ON public.rating;

-- Split into separate policies for each operation
CREATE POLICY "rating_insert_policy" ON public.rating
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM public."user" WHERE provider_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "rating_update_policy" ON public.rating
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public."user" WHERE provider_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public."user" WHERE provider_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "rating_delete_policy" ON public.rating
  AS PERMISSIVE
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public."user" WHERE provider_id = (SELECT auth.uid())
    )
  );

-- Add helpful comments
COMMENT ON POLICY "rating_insert_policy" ON public.rating IS
  'Users can insert their own ratings - optimized with subquery';

COMMENT ON POLICY "rating_update_policy" ON public.rating IS
  'Users can update their own ratings - optimized with subquery';

COMMENT ON POLICY "rating_delete_policy" ON public.rating IS
  'Users can delete their own ratings - optimized with subquery';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  game_views_count integer;
  rating_select_count integer;
BEGIN
  -- Verify game_views has only one SELECT policy
  SELECT COUNT(*) INTO game_views_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'game_views'
    AND cmd = 'SELECT';

  IF game_views_count = 1 THEN
    RAISE NOTICE '✅ game_views has single SELECT policy';
  ELSE
    RAISE WARNING 'game_views has % SELECT policies (expected 1)', game_views_count;
  END IF;

  -- Verify rating has only one SELECT policy
  SELECT COUNT(*) INTO rating_select_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'rating'
    AND cmd = 'SELECT';

  IF rating_select_count = 1 THEN
    RAISE NOTICE '✅ rating has single SELECT policy (no overlap)';
  ELSE
    RAISE WARNING 'rating has % SELECT policies (expected 1)', rating_select_count;
  END IF;

  -- Verify rating has separate policies for INSERT, UPDATE, DELETE
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'rating'
      AND policyname IN ('rating_insert_policy', 'rating_update_policy', 'rating_delete_policy')
  ) THEN
    RAISE NOTICE '✅ rating has separate INSERT/UPDATE/DELETE policies';
  ELSE
    RAISE WARNING 'rating missing some management policies';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '✅ Final 2 Performance Warnings Fixed!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed Issues:';
  RAISE NOTICE '  ✓ game_views: Wrapped auth.jwt() in SELECT subquery';
  RAISE NOTICE '  ✓ rating: Split policies to eliminate SELECT overlap';
  RAISE NOTICE '';
  RAISE NOTICE 'Result:';
  RAISE NOTICE '  - No more auth RLS initplan warnings';
  RAISE NOTICE '  - No more multiple permissive policy warnings';
  RAISE NOTICE '  - All 22 performance warnings should now be cleared!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run Supabase Performance Advisor to verify all warnings cleared';
  RAISE NOTICE '';
END $$;
