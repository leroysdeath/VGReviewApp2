-- =====================================================
-- Fix Remaining Performance Issues
-- =====================================================

-- This migration addresses the remaining performance warnings:
-- 1. Multiple permissive policies on comment, game_backfill_log, and user tables
-- 2. Duplicate indexes on user table

-- =====================================================
-- 1. Fix Comment Table - Consolidate Multiple SELECT Policies
-- =====================================================

-- The issue: "Public can view comments" + "Users can manage own comments" both allow SELECT
-- Solution: Create one comprehensive SELECT policy, separate policy for INSERT/UPDATE/DELETE

DROP POLICY IF EXISTS "Public can view comments" ON comment;
DROP POLICY IF EXISTS "Users can manage own comments" ON comment;

-- Create separate policies for different operations
CREATE POLICY "Anyone can view comments" ON comment
  FOR SELECT USING (true);

CREATE POLICY "Users can insert own comments" ON comment
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM "user" WHERE provider_id = (SELECT auth.uid())));

CREATE POLICY "Users can update own comments" ON comment
  FOR UPDATE USING (user_id IN (SELECT id FROM "user" WHERE provider_id = (SELECT auth.uid())));

CREATE POLICY "Users can delete own comments" ON comment
  FOR DELETE USING (user_id IN (SELECT id FROM "user" WHERE provider_id = (SELECT auth.uid())));

-- =====================================================
-- 2. Fix Game Backfill Log - Consolidate Multiple SELECT Policies
-- =====================================================

-- The issue: "Service can manage backfill logs" + "Users can view backfill logs" both allow SELECT
-- Solution: Create one comprehensive SELECT policy, separate policies for other operations

DROP POLICY IF EXISTS "Users can view backfill logs" ON game_backfill_log;
DROP POLICY IF EXISTS "Service can manage backfill logs" ON game_backfill_log;

-- Create comprehensive SELECT policy (authenticated users OR service role)
CREATE POLICY "Authenticated can view backfill logs" ON game_backfill_log
  FOR SELECT USING (
    (SELECT auth.role()) = 'authenticated' OR 
    (SELECT auth.role()) = 'service_role'
  );

-- Service role can do everything else
CREATE POLICY "Service can manage backfill logs" ON game_backfill_log
  FOR INSERT WITH CHECK ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service can update backfill logs" ON game_backfill_log  
  FOR UPDATE USING ((SELECT auth.role()) = 'service_role');

CREATE POLICY "Service can delete backfill logs" ON game_backfill_log
  FOR DELETE USING ((SELECT auth.role()) = 'service_role');

-- =====================================================
-- 3. Fix User Table - Consolidate Multiple SELECT Policies
-- =====================================================

-- The issue: "Public can view profiles" + "Users can view their own profile" both allow SELECT
-- Solution: Create one comprehensive SELECT policy

DROP POLICY IF EXISTS "Public can view profiles" ON "user";
DROP POLICY IF EXISTS "Users can view their own profile" ON "user";

-- Create single comprehensive SELECT policy
-- Allow viewing all profiles (public access) but could be restricted if needed
CREATE POLICY "Anyone can view user profiles" ON "user"
  FOR SELECT USING (true);

-- Keep the existing optimized policies for INSERT/UPDATE
-- (These were already optimized in the previous migration)

-- =====================================================
-- 4. Remove Duplicate Indexes on User Table
-- =====================================================

-- Fix user table - remove duplicate username indexes
DO $$
BEGIN
  -- Drop duplicate constraint/index (these will also drop their indexes)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'user' 
    AND constraint_name = 'user_username_unique'
  ) THEN
    ALTER TABLE "user" DROP CONSTRAINT IF EXISTS user_username_unique;
  END IF;
  
  -- Drop any remaining standalone indexes
  DROP INDEX IF EXISTS user_username_unique;
  
  -- Keep user_username_key (likely the primary unique constraint)
END $$;

-- =====================================================
-- 5. Verify and Clean Up Any Other Multiple Policies
-- =====================================================

-- Function to identify remaining multiple permissive policies
CREATE OR REPLACE FUNCTION check_multiple_permissive_policies()
RETURNS TABLE (
  table_name TEXT,
  role_name TEXT,
  command_type TEXT,
  policy_count BIGINT,
  policy_names TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pol.tablename::TEXT,
    unnest(pol.roles)::TEXT as role_name,
    pol.cmd::TEXT as command_type,
    COUNT(*)::BIGINT as policy_count,
    array_agg(pol.policyname::TEXT) as policy_names
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
    AND pol.permissive = 'PERMISSIVE'
  GROUP BY pol.tablename, unnest(pol.roles), pol.cmd
  HAVING COUNT(*) > 1
  ORDER BY pol.tablename, unnest(pol.roles), pol.cmd;
END;
$$;

GRANT EXECUTE ON FUNCTION check_multiple_permissive_policies() TO service_role, authenticated;

-- =====================================================
-- 6. Performance Summary
-- =====================================================

DO $$
DECLARE
  multiple_policies_count INTEGER;
  duplicate_indexes_count INTEGER;
BEGIN
  -- Count remaining multiple permissive policies
  SELECT COUNT(*) INTO multiple_policies_count
  FROM (
    SELECT tablename, unnest(roles), cmd
    FROM pg_policies 
    WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
    GROUP BY tablename, unnest(roles), cmd
    HAVING COUNT(*) > 1
  ) as multiples;
  
  -- Count potential duplicate indexes (simplified check)
  SELECT COUNT(*) INTO duplicate_indexes_count
  FROM (
    SELECT tablename, COUNT(*)
    FROM pg_indexes
    WHERE schemaname = 'public'
    GROUP BY tablename, indexdef
    HAVING COUNT(*) > 1
  ) as dups;
  
  RAISE NOTICE 'Performance Fix Summary:';
  RAISE NOTICE '  Tables with multiple permissive policies remaining: %', multiple_policies_count;
  RAISE NOTICE '  Potential duplicate indexes remaining: %', duplicate_indexes_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Verification commands:';
  RAISE NOTICE '  SELECT * FROM check_multiple_permissive_policies();';
  RAISE NOTICE '  SELECT * FROM check_index_usage() WHERE times_used = 0;';
END $$;

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON FUNCTION check_multiple_permissive_policies IS 'Identifies tables with multiple permissive RLS policies for the same role and action, which can cause performance issues';

-- =====================================================
-- Verification Queries (run after migration)
-- =====================================================

-- Check for remaining multiple permissive policies:
-- SELECT * FROM check_multiple_permissive_policies();
--
-- Check current policies on affected tables:
-- SELECT tablename, policyname, cmd, roles, permissive 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
--   AND tablename IN ('comment', 'game_backfill_log', 'user')
-- ORDER BY tablename, cmd, policyname;
--
-- Check remaining duplicate indexes:
-- SELECT schemaname, tablename, COUNT(*) as index_count, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- GROUP BY schemaname, tablename, indexdef
-- HAVING COUNT(*) > 1;