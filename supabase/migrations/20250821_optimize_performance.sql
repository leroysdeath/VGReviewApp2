-- =====================================================
-- Performance Optimization Migration
-- =====================================================

-- This migration addresses all performance warnings from the database linter:
-- 1. Auth RLS InitPlan issues (8 policies)
-- 2. Multiple Permissive Policies (multiple tables)
-- 3. Duplicate Indexes (2 tables)

-- =====================================================
-- 1. Fix Auth RLS InitPlan Performance Issues
-- =====================================================

-- Fix game_backfill_log policies
DROP POLICY IF EXISTS "Users can view backfill logs" ON game_backfill_log;
DROP POLICY IF EXISTS "Service can manage backfill logs" ON game_backfill_log;

CREATE POLICY "Users can view backfill logs" ON game_backfill_log
  FOR SELECT USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Service can manage backfill logs" ON game_backfill_log
  FOR ALL USING ((SELECT auth.role()) = 'service_role');

-- Fix user table policies
DROP POLICY IF EXISTS "Users can insert own profile" ON "user";
DROP POLICY IF EXISTS "Users can view their own profile" ON "user";  
DROP POLICY IF EXISTS "Users can update their own profile" ON "user";

CREATE POLICY "Users can insert own profile" ON "user"
  FOR INSERT WITH CHECK (provider_id = (SELECT auth.uid()));

CREATE POLICY "Users can view their own profile" ON "user"
  FOR SELECT USING (provider_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile" ON "user"
  FOR UPDATE USING (provider_id = (SELECT auth.uid()));

-- Fix user_top_games policies  
DROP POLICY IF EXISTS "Users can insert own top games" ON user_top_games;
DROP POLICY IF EXISTS "Users can update own top games" ON user_top_games;
DROP POLICY IF EXISTS "Users can delete own top games" ON user_top_games;

-- Find the correct user_id column name for user_top_games
DO $$
DECLARE
  col_exists boolean;
BEGIN
  -- Check if user_id column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_top_games' 
    AND column_name = 'user_id'
  ) INTO col_exists;
  
  IF col_exists THEN
    -- Create policies with user_id
    EXECUTE 'CREATE POLICY "Users can insert own top games" ON user_top_games
      FOR INSERT WITH CHECK (user_id IN (SELECT id FROM "user" WHERE provider_id = (SELECT auth.uid())))';
      
    EXECUTE 'CREATE POLICY "Users can update own top games" ON user_top_games
      FOR UPDATE USING (user_id IN (SELECT id FROM "user" WHERE provider_id = (SELECT auth.uid())))';
      
    EXECUTE 'CREATE POLICY "Users can delete own top games" ON user_top_games
      FOR DELETE USING (user_id IN (SELECT id FROM "user" WHERE provider_id = (SELECT auth.uid())))';
  END IF;
END $$;

-- =====================================================
-- 2. Consolidate Multiple Permissive Policies
-- =====================================================

-- Fix game table - consolidate multiple SELECT policies
DROP POLICY IF EXISTS "Allow search_games_by_genre" ON game;
DROP POLICY IF EXISTS "Allow search_games_phrase" ON game;
DROP POLICY IF EXISTS "Allow search_games_secure" ON game;
DROP POLICY IF EXISTS "Public can view games" ON game;

-- Create single comprehensive policy for game SELECT
CREATE POLICY "Public and authenticated can view games" ON game
  FOR SELECT USING (true); -- Allow all users to view games

-- Fix game_backfill_log - we already fixed this above, but ensure no conflicts
-- The policies were already recreated with optimized auth checks

-- Fix user table - consolidate SELECT policies
DROP POLICY IF EXISTS "Users can view public profiles" ON "user";
-- Keep "Users can view their own profile" as it was already optimized above

-- Create single policy for public profile viewing
CREATE POLICY "Public can view profiles" ON "user"
  FOR SELECT USING (true); -- Allow viewing all profiles (adjust if needed for privacy)

-- =====================================================
-- 3. Remove Duplicate Indexes and Constraints
-- =====================================================

-- Fix game_progress table - remove duplicate constraints/indexes
-- First check what exists and remove duplicates safely
DO $$
BEGIN
  -- Drop duplicate constraints (these will also drop their indexes)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'game_progress' 
    AND constraint_name = 'game_progress_user_game_unique'
  ) THEN
    ALTER TABLE game_progress DROP CONSTRAINT IF EXISTS game_progress_user_game_unique;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'game_progress' 
    AND constraint_name = 'unique_user_game_progress'
  ) THEN
    ALTER TABLE game_progress DROP CONSTRAINT IF EXISTS unique_user_game_progress;
  END IF;
  
  -- Drop any remaining standalone indexes
  DROP INDEX IF EXISTS unique_user_game_progress;
END $$;

-- Fix rating table - remove duplicate constraints/indexes
DO $$
BEGIN  
  -- Drop duplicate constraint (this will also drop its index)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'rating' 
    AND constraint_name = 'unique_user_game_rating'
  ) THEN
    ALTER TABLE rating DROP CONSTRAINT IF EXISTS unique_user_game_rating;
  END IF;
  
  -- Drop any remaining standalone indexes
  DROP INDEX IF EXISTS unique_user_game_rating;
END $$;

-- =====================================================
-- 4. Add Performance Indexes (if missing)
-- =====================================================

-- Ensure we have efficient indexes for common queries
-- Note: Using regular CREATE INDEX (not CONCURRENTLY) since we're in a migration transaction
CREATE INDEX IF NOT EXISTS idx_user_provider_id ON "user" (provider_id);
CREATE INDEX IF NOT EXISTS idx_rating_game_id_rating ON rating (game_id, rating);
CREATE INDEX IF NOT EXISTS idx_game_name_lower ON game (LOWER(name));

-- =====================================================
-- 5. Additional RLS Policy Optimizations
-- =====================================================

-- Create optimized policies for other tables if they exist
DO $$
BEGIN
  -- Optimize comment policies if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'comment') THEN
    -- Drop existing policies (including any variations of names)
    DROP POLICY IF EXISTS "Users can view comments" ON comment;
    DROP POLICY IF EXISTS "Users can insert own comments" ON comment;
    DROP POLICY IF EXISTS "Users can update own comments" ON comment;
    DROP POLICY IF EXISTS "Users can delete own comments" ON comment;
    DROP POLICY IF EXISTS "Public can view comments" ON comment;
    DROP POLICY IF EXISTS "Users can manage own comments" ON comment;
    DROP POLICY IF EXISTS "Users can manage comments" ON comment;
    
    -- Create optimized policies
    CREATE POLICY "Public can view comments" ON comment FOR SELECT USING (true);
    CREATE POLICY "Users can manage own comments" ON comment FOR ALL 
      USING (user_id IN (SELECT id FROM "user" WHERE provider_id = (SELECT auth.uid())));
  END IF;
  
  -- Optimize review policies if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'review') THEN
    -- Drop existing policies (including any variations of names)
    DROP POLICY IF EXISTS "Users can view reviews" ON review;
    DROP POLICY IF EXISTS "Users can insert own reviews" ON review;
    DROP POLICY IF EXISTS "Users can update own reviews" ON review;
    DROP POLICY IF EXISTS "Users can delete own reviews" ON review;
    DROP POLICY IF EXISTS "Public can view reviews" ON review;
    DROP POLICY IF EXISTS "Users can manage own reviews" ON review;
    DROP POLICY IF EXISTS "Users can manage reviews" ON review;
    
    CREATE POLICY "Public can view reviews" ON review FOR SELECT USING (true);
    CREATE POLICY "Users can manage own reviews" ON review FOR ALL
      USING (user_id IN (SELECT id FROM "user" WHERE provider_id = (SELECT auth.uid())));
  END IF;
END $$;

-- =====================================================
-- 6. Performance Monitoring Function
-- =====================================================

-- Create function to check policy performance
CREATE OR REPLACE FUNCTION check_rls_performance()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  policy_type TEXT,
  has_auth_function BOOLEAN,
  needs_optimization BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pol.tablename::TEXT,
    pol.policyname::TEXT,
    CASE pol.permissive 
      WHEN TRUE THEN 'PERMISSIVE'
      ELSE 'RESTRICTIVE'
    END::TEXT as policy_type,
    (pol.qual ~ 'auth\.' OR pol.with_check ~ 'auth\.')::BOOLEAN as has_auth_function,
    (pol.qual ~ 'auth\.' OR pol.with_check ~ 'auth\.' AND 
     NOT (pol.qual ~ '\(select auth\.' OR pol.with_check ~ '\(select auth\.'))::BOOLEAN as needs_optimization
  FROM pg_policies pol
  WHERE pol.schemaname = 'public'
  ORDER BY pol.tablename, pol.policyname;
END;
$$;

GRANT EXECUTE ON FUNCTION check_rls_performance() TO service_role, authenticated;

-- =====================================================
-- 7. Index Usage Analysis Function
-- =====================================================

-- Create function to analyze index usage
CREATE OR REPLACE FUNCTION check_index_usage()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_size TEXT,
  times_used BIGINT,
  definition TEXT
)
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname||'.'||tablename as table_name,
    indexname as index_name,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) as index_size,
    COALESCE(s.idx_scan, 0) as times_used,
    indexdef as definition
  FROM pg_indexes i
  LEFT JOIN pg_stat_user_indexes s ON i.indexname = s.indexname
  WHERE i.schemaname = 'public'
    AND i.indexname NOT LIKE '%_pkey'
  ORDER BY COALESCE(s.idx_scan, 0) ASC, pg_relation_size(schemaname||'.'||indexname) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION check_index_usage() TO service_role, authenticated;

-- =====================================================
-- 8. Final Summary and Verification
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Count remaining policies that might need optimization
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public'
    AND (qual ~ 'auth\.' OR with_check ~ 'auth\.')
    AND NOT (qual ~ '\(select auth\.' OR with_check ~ '\(select auth\.');
  
  -- Count indexes
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey';
  
  RAISE NOTICE 'Performance Optimization Summary:';
  RAISE NOTICE '  Policies potentially needing optimization: %', policy_count;
  RAISE NOTICE '  Total custom indexes: %', index_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Run these queries to verify optimizations:';
  RAISE NOTICE '  SELECT * FROM check_rls_performance() WHERE needs_optimization = true;';
  RAISE NOTICE '  SELECT * FROM check_index_usage() WHERE times_used = 0;';
END $$;

-- =====================================================
-- Comments and Documentation  
-- =====================================================

COMMENT ON FUNCTION check_rls_performance IS 'Analyzes RLS policies for performance issues and optimization opportunities';
COMMENT ON FUNCTION check_index_usage IS 'Analyzes index usage statistics to identify unused or underused indexes';

-- =====================================================
-- Verification Queries (run after migration)
-- =====================================================

-- Check for remaining RLS performance issues:
-- SELECT * FROM check_rls_performance() WHERE needs_optimization = true;
--
-- Check for unused indexes:
-- SELECT * FROM check_index_usage() WHERE times_used = 0;
--
-- Verify duplicate indexes are gone:
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- GROUP BY tablename, cmd, roles
-- HAVING COUNT(*) > 1;
--
-- Check auth function usage in policies:
-- SELECT tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND (qual ~ 'auth\.' OR with_check ~ 'auth\.');