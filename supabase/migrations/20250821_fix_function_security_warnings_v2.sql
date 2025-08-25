-- =====================================================
-- Fix Function Search Path Security Warnings (Robust Version)
-- =====================================================

-- This migration fixes all "Function Search Path Mutable" warnings
-- by setting explicit search_path on all functions to prevent
-- potential SQL injection attacks.



-- =====================================================
-- Robust function to fix search_path for any function
-- =====================================================

CREATE OR REPLACE FUNCTION fix_function_search_paths()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  func_record RECORD;
  sql_command TEXT;
  result_text TEXT := 'Functions processed:' || CHR(10);
BEGIN
  -- Loop through all public functions that don't have search_path set
  FOR func_record IN
    SELECT 
      p.proname as function_name,
      n.nspname as schema_name,
      pg_get_function_identity_arguments(p.oid) as function_args,
      p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname NOT LIKE 'pg_%'
      AND (p.proconfig IS NULL OR NOT EXISTS (
        SELECT 1 FROM unnest(p.proconfig) as config 
        WHERE config LIKE 'search_path=%'
      ))
  LOOP
    BEGIN
      -- Build the ALTER FUNCTION command
      sql_command := format('ALTER FUNCTION %I.%I(%s) SET search_path = ''''', 
        func_record.schema_name, 
        func_record.function_name, 
        func_record.function_args
      );
      
      -- Execute the command
      EXECUTE sql_command;
      
      result_text := result_text || '✓ Fixed: ' || func_record.function_name || CHR(10);
      
    EXCEPTION
      WHEN OTHERS THEN
        result_text := result_text || '✗ Failed: ' || func_record.function_name || ' (' || SQLERRM || ')' || CHR(10);
    END;
  END LOOP;
  
  RETURN result_text;
END;
$$;

-- Execute the function to fix all search paths
SELECT fix_function_search_paths();

-- Clean up the temporary function
DROP FUNCTION fix_function_search_paths();

-- =====================================================
-- Fix Materialized View API Exposure
-- =====================================================

-- Remove public access to materialized view popular_game_cached
-- This prevents it from being accessible through the Data APIs
DO $$
BEGIN
  -- Check if materialized view exists before revoking permissions
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'popular_game_cached'
  ) THEN
    REVOKE ALL ON TABLE popular_game_cached FROM anon, authenticated;
    GRANT SELECT ON TABLE popular_game_cached TO service_role;
  END IF;
END $$;

-- Create a secure function to access popular games data instead
CREATE OR REPLACE FUNCTION get_popular_games_cached(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name VARCHAR(500),
  summary TEXT,
  release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  screenshots TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  average_rating NUMERIC,
  rating_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if materialized view exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'popular_game_cached'
  ) THEN
    -- Fall back to regular query if materialized view doesn't exist
    RETURN QUERY
    SELECT 
      g.id,
      g.igdb_id,
      g.name,
      g.summary,
      g.release_date,
      g.cover_url,
      g.genres,
      g.platforms,
      g.screenshots,
      g.created_at,
      g.updated_at,
      COALESCE(AVG(r.rating), 0) AS average_rating,
      COUNT(r.id) AS rating_count
    FROM game g
    LEFT JOIN rating r ON g.id = r.game_id
    GROUP BY g.id
    HAVING COUNT(r.id) > 0
    ORDER BY COUNT(r.id) DESC, AVG(r.rating) DESC
    LIMIT limit_count;
  ELSE
    -- Use materialized view if it exists
    RETURN QUERY
    SELECT 
      p.id,
      p.igdb_id,
      p.name,
      p.summary,
      p.release_date,
      p.cover_url,
      p.genres,
      p.platforms,
      p.screenshots,
      p.created_at,
      p.updated_at,
      p.average_rating,
      p.rating_count
    FROM popular_game_cached p
    ORDER BY p.rating_count DESC, p.average_rating DESC
    LIMIT limit_count;
  END IF;
END;
$$;

-- Grant access to the function instead of the materialized view
GRANT EXECUTE ON FUNCTION get_popular_games_cached(INTEGER) TO anon, authenticated;

-- =====================================================
-- Security Audit Function
-- =====================================================

-- Create a helper function to check function security settings
CREATE OR REPLACE FUNCTION check_function_security()
RETURNS TABLE (
  function_name TEXT,
  function_signature TEXT,
  has_search_path BOOLEAN,
  search_path_value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.proname::TEXT as function_name,
    (p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')')::TEXT as function_signature,
    (p.proconfig IS NOT NULL AND EXISTS (
      SELECT 1 FROM unnest(p.proconfig) as config 
      WHERE config LIKE 'search_path=%'
    )) as has_search_path,
    COALESCE(
      (SELECT split_part(config, '=', 2) 
       FROM unnest(p.proconfig) as config 
       WHERE config LIKE 'search_path=%' 
       LIMIT 1),
      'not_set'
    ) as search_path_value
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
  ORDER BY p.proname;
END;
$$;

-- Grant access to the security check function
GRANT EXECUTE ON FUNCTION check_function_security() TO service_role, authenticated;

-- =====================================================
-- Final Verification and Cleanup
-- =====================================================

-- Show summary of what was fixed
DO $$
DECLARE
  unfixed_count INTEGER;
  total_count INTEGER;
BEGIN
  -- Count total functions
  SELECT COUNT(*) INTO total_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname NOT LIKE 'pg_%';
  
  -- Count functions still without search_path
  SELECT COUNT(*) INTO unfixed_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'pg_%'
    AND (p.proconfig IS NULL OR NOT EXISTS (
      SELECT 1 FROM unnest(p.proconfig) as config 
      WHERE config LIKE 'search_path=%'
    ));
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Total functions: %', total_count;
  RAISE NOTICE '  Functions still without search_path: %', unfixed_count;
  RAISE NOTICE '  Functions fixed: %', total_count - unfixed_count;
  
  IF unfixed_count > 0 THEN
    RAISE NOTICE 'Run: SELECT * FROM check_function_security() WHERE has_search_path = false;';
  ELSE
    RAISE NOTICE 'All functions now have search_path set!';
  END IF;
END $$;

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON FUNCTION get_popular_games_cached IS 'Secure function to access popular games data without exposing materialized view directly. Falls back to live query if materialized view does not exist.';
COMMENT ON FUNCTION check_function_security IS 'Helper function to audit function security settings and identify functions without proper search_path configuration.';

-- =====================================================
-- Verification Queries (for manual checking)
-- =====================================================

-- Run these queries after migration to verify fixes:
--
-- 1. Check that all functions have search_path set:
-- SELECT * FROM check_function_security() WHERE has_search_path = false;
--
-- 2. Verify materialized view permissions:
-- SELECT grantee, privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_name = 'popular_game_cached';
--
-- 3. List all functions with their search_path settings:
-- SELECT function_name, search_path_value 
-- FROM check_function_security() 
-- ORDER BY function_name;