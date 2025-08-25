-- =====================================================
-- Fix Function Search Path Security Warnings
-- =====================================================

-- This migration fixes all "Function Search Path Mutable" warnings
-- by setting explicit search_path on all functions to prevent
-- potential SQL injection attacks.

-- =====================================================
-- Fix search_path for all problematic functions
-- =====================================================

-- 1. search_game_similarity
ALTER FUNCTION public.search_game_similarity(TEXT, FLOAT) SET search_path = '';

-- 2. get_popular_game  
ALTER FUNCTION public.get_popular_game(INTEGER) SET search_path = '';

-- 3. get_highly_rated_game
ALTER FUNCTION public.get_highly_rated_game(NUMERIC, INTEGER, INTEGER) SET search_path = '';

-- 4. refresh_game_views
ALTER FUNCTION public.refresh_game_views() SET search_path = '';

-- 5. get_game_rating_distribution
ALTER FUNCTION public.get_game_rating_distribution(INTEGER) SET search_path = '';

-- 6. get_similar_game
ALTER FUNCTION public.get_similar_game(INTEGER, INTEGER) SET search_path = '';

-- 7. array_intersect
ALTER FUNCTION public.array_intersect(anyarray, anyarray) SET search_path = '';

-- 8. trigger_refresh_popular_game
ALTER FUNCTION public.trigger_refresh_popular_game() SET search_path = '';

-- 9. update_user_top_games_updated_at (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_user_top_games_updated_at') THEN
    ALTER FUNCTION public.update_user_top_games_updated_at() SET search_path = '';
  END IF;
END $$;

-- 10. increment_cache_hits (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'increment_cache_hits'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.increment_cache_hits() SET search_path = ''''';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Function might have different signature, skip
    NULL;
END $$;

-- 11. generate_slug (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'generate_slug') THEN
    ALTER FUNCTION public.generate_slug(TEXT) SET search_path = '';
  END IF;
END $$;

-- 12. update_game_from_igdb_with_slug (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_game_from_igdb_with_slug') THEN
    ALTER FUNCTION public.update_game_from_igdb_with_slug(INTEGER, JSONB) SET search_path = '';
  END IF;
END $$;

-- 13. get_game_suggestions (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_game_suggestions') THEN
    ALTER FUNCTION public.get_game_suggestions(TEXT, INTEGER) SET search_path = '';
  END IF;
END $$;

-- 14. get_or_create_user (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_or_create_user') THEN
    ALTER FUNCTION public.get_or_create_user(UUID, TEXT, TEXT) SET search_path = '';
  END IF;
END $$;

-- 15. search_games_exact (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_games_exact') THEN
    ALTER FUNCTION public.search_games_exact(TEXT) SET search_path = '';
  END IF;
END $$;

-- 16. search_games_exact_with_ratings (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_games_exact_with_ratings') THEN
    ALTER FUNCTION public.search_games_exact_with_ratings(TEXT) SET search_path = '';
  END IF;
END $$;

-- 17. increment_cache_hit_counts (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_cache_hit_counts') THEN
    ALTER FUNCTION public.increment_cache_hit_counts(TEXT) SET search_path = '';
  END IF;
END $$;

-- 18. search_games_with_mode (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_games_with_mode') THEN
    ALTER FUNCTION public.search_games_with_mode(TEXT, TEXT, INTEGER) SET search_path = '';
  END IF;
END $$;

-- 19. sync_rating_completion_status (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'sync_rating_completion_status') THEN
    ALTER FUNCTION public.sync_rating_completion_status() SET search_path = '';
  END IF;
END $$;

-- 20. update_game_search_vector (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_game_search_vector') THEN
    ALTER FUNCTION public.update_game_search_vector() SET search_path = '';
  END IF;
END $$;

-- 21. handle_new_user (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = '';
  END IF;
END $$;

-- 22. identify_incomplete_games (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'identify_incomplete_games') THEN
    ALTER FUNCTION public.identify_incomplete_games() SET search_path = '';
  END IF;
END $$;

-- 23. init_game_backfill (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'init_game_backfill') THEN
    ALTER FUNCTION public.init_game_backfill() SET search_path = '';
  END IF;
END $$;

-- 24. get_games_for_backfill (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_games_for_backfill') THEN
    ALTER FUNCTION public.get_games_for_backfill(INTEGER) SET search_path = '';
  END IF;
END $$;

-- 25. update_game_from_igdb (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_game_from_igdb') THEN
    ALTER FUNCTION public.update_game_from_igdb(INTEGER, JSONB) SET search_path = '';
  END IF;
END $$;

-- 26. mark_game_backfill_failed (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'mark_game_backfill_failed') THEN
    ALTER FUNCTION public.mark_game_backfill_failed(INTEGER, TEXT) SET search_path = '';
  END IF;
END $$;

-- 27. search_games_secure (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_games_secure') THEN
    ALTER FUNCTION public.search_games_secure(TEXT) SET search_path = '';
  END IF;
END $$;

-- 28. search_games_phrase (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_games_phrase') THEN
    ALTER FUNCTION public.search_games_phrase(TEXT) SET search_path = '';
  END IF;
END $$;

-- 29. search_games_by_genre (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'search_games_by_genre') THEN
    ALTER FUNCTION public.search_games_by_genre(TEXT) SET search_path = '';
  END IF;
END $$;

-- =====================================================
-- Fix Materialized View API Exposure
-- =====================================================

-- Remove public access to materialized view popular_game_cached
-- This prevents it from being accessible through the Data APIs
REVOKE ALL ON TABLE popular_game_cached FROM anon, authenticated;

-- Only allow service_role to access the materialized view directly
GRANT SELECT ON TABLE popular_game_cached TO service_role;

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
END;
$$;

-- Grant access to the function instead of the materialized view
GRANT EXECUTE ON FUNCTION get_popular_games_cached(INTEGER) TO anon, authenticated;

-- =====================================================
-- Additional Security Improvements
-- =====================================================

-- Ensure all future functions have proper search_path by default
-- This is a defensive measure for any new functions created
-- (Note: This can only be set database-wide by superusers, so we skip it)

-- Create a helper function to check function security settings
CREATE OR REPLACE FUNCTION check_function_security()
RETURNS TABLE (
  function_name TEXT,
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
    (p.proconfig IS NOT NULL AND 'search_path' = ANY(
      SELECT split_part(unnest(p.proconfig), '=', 1)
    )) as has_search_path,
    COALESCE(
      (SELECT split_part(unnest(p.proconfig), '=', 2) 
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
GRANT EXECUTE ON FUNCTION check_function_security() TO service_role;

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON FUNCTION get_popular_games_cached IS 'Secure function to access popular games data without exposing materialized view directly';
COMMENT ON FUNCTION check_function_security IS 'Helper function to audit function security settings';

-- =====================================================
-- Verification Queries (for manual checking)
-- =====================================================

-- Run these queries after migration to verify fixes:
--
-- 1. Check that all functions have search_path set:
-- SELECT * FROM check_function_security() WHERE has_search_path = false;
--
-- 2. Verify materialized view permissions:
-- SELECT 
--   grantee, 
--   privilege_type 
-- FROM information_schema.role_table_grants 
-- WHERE table_name = 'popular_game_cached';
--
-- 3. List all functions with their search_path settings:
-- SELECT 
--   proname,
--   proconfig
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- WHERE n.nspname = 'public' 
--   AND proname NOT LIKE 'pg_%'
-- ORDER BY proname;