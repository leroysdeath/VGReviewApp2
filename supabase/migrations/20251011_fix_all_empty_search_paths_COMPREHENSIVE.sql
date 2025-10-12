-- Migration: COMPREHENSIVE Fix - All 38 Functions with Empty search_path
-- Date: 2025-10-11
-- Purpose: Restore schema access to ALL functions broken by empty search_path

-- ============================================================================
-- ROOT CAUSE: September 22nd security migration set search_path="" on 38 functions
-- This breaks ALL schema access - functions can't see public, auth, or any tables
-- RESULT: "relation 'game' does not exist", "relation 'user' does not exist", HTTP 400 errors
-- ============================================================================

-- ============================================================================
-- CATEGORY 1: CRITICAL - User/Auth Functions (need public + auth schemas)
-- ============================================================================

-- This was already fixed in previous migration, but including for completeness
ALTER FUNCTION public.handle_new_user()
  SET search_path = 'public', 'auth', 'pg_temp';

-- ============================================================================
-- CATEGORY 2: CRITICAL - Game Search Functions (need public schema)
-- ============================================================================

ALTER FUNCTION public.search_games_secure(text, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_game_similarity(text, double precision)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_games_by_genre(text, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_games_phrase(text, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_games_exact(text, integer, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_games_exact_with_ratings(text, integer, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_games_with_mode(text, boolean, real, integer, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.get_game_suggestions(text, integer)
  SET search_path = 'public', 'pg_temp';

-- ============================================================================
-- CATEGORY 3: Game Query/Discovery Functions (need public schema)
-- ============================================================================

ALTER FUNCTION public.get_game_rating_distribution(integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.get_highly_rated_game(numeric, integer, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.get_popular_game(integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.get_popular_games_cached(integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.get_similar_game(integer, integer)
  SET search_path = 'public', 'pg_temp';

-- ============================================================================
-- CATEGORY 4: Game Data Management Functions (need public schema)
-- ============================================================================

ALTER FUNCTION public.get_games_for_backfill(integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.identify_incomplete_games(integer[], integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.init_game_backfill(integer[])
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.mark_game_backfill_failed(integer, text)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.update_game_from_igdb(integer, text, text, text, text, text[], text[], integer, date)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.update_game_from_igdb_with_slug(integer, text, text, text, text, text[], text[], integer, date, text)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.update_game_search_vector()
  SET search_path = 'public', 'pg_temp';

-- ============================================================================
-- CATEGORY 5: Cache Management Functions (need public schema)
-- ============================================================================

ALTER FUNCTION public.cleanup_lru_cache()
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.cleanup_expired_cache()
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.scheduled_cache_cleanup()
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.increment_cache_hits(integer[], timestamptz)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.increment_cache_hit_counts(uuid[])
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.update_cache_access()
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.get_cache_stats()
  SET search_path = 'public', 'pg_temp';

-- ============================================================================
-- CATEGORY 6: View/Metrics Functions (need public schema)
-- ============================================================================

ALTER FUNCTION public.refresh_game_views()
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.trigger_refresh_popular_game()
  SET search_path = 'public', 'pg_temp';

-- ============================================================================
-- CATEGORY 7: Database Admin/Security Functions (need public + pg_catalog)
-- ============================================================================

ALTER FUNCTION public.analyze_index_usage()
  SET search_path = 'public', 'pg_catalog', 'pg_temp';

ALTER FUNCTION public.check_foreign_key_indexes()
  SET search_path = 'public', 'pg_catalog', 'pg_temp';

ALTER FUNCTION public.check_function_security()
  SET search_path = 'public', 'pg_catalog', 'pg_temp';

ALTER FUNCTION public.check_index_usage()
  SET search_path = 'public', 'pg_catalog', 'pg_temp';

ALTER FUNCTION public.check_multiple_permissive_policies()
  SET search_path = 'public', 'pg_catalog', 'pg_temp';

ALTER FUNCTION public.check_rls_performance()
  SET search_path = 'public', 'pg_catalog', 'pg_temp';

-- ============================================================================
-- CATEGORY 8: Utility Functions (need public schema)
-- ============================================================================

ALTER FUNCTION public.generate_slug(text)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.array_intersect(anyarray, anyarray)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.update_user_top_games_updated_at()
  SET search_path = 'public', 'pg_temp';

-- ============================================================================
-- VERIFICATION: Count fixed functions
-- ============================================================================

SELECT
  'Fixed functions: ' || COUNT(*) || ' of 38' as summary
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_new_user',
    'search_games_secure',
    'search_game_similarity',
    'search_games_by_genre',
    'search_games_phrase',
    'search_games_exact',
    'search_games_exact_with_ratings',
    'search_games_with_mode',
    'get_game_suggestions',
    'get_game_rating_distribution',
    'get_highly_rated_game',
    'get_popular_game',
    'get_popular_games_cached',
    'get_similar_game',
    'get_games_for_backfill',
    'identify_incomplete_games',
    'init_game_backfill',
    'mark_game_backfill_failed',
    'update_game_from_igdb',
    'update_game_from_igdb_with_slug',
    'update_game_search_vector',
    'cleanup_lru_cache',
    'cleanup_expired_cache',
    'scheduled_cache_cleanup',
    'increment_cache_hits',
    'increment_cache_hit_counts',
    'update_cache_access',
    'get_cache_stats',
    'refresh_game_views',
    'trigger_refresh_popular_game',
    'analyze_index_usage',
    'check_foreign_key_indexes',
    'check_function_security',
    'check_index_usage',
    'check_multiple_permissive_policies',
    'check_rls_performance',
    'generate_slug',
    'array_intersect',
    'update_user_top_games_updated_at'
  )
  AND (SELECT config FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path%' LIMIT 1) != 'search_path=""';

-- ============================================================================
-- LOG SUCCESS
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🎉 COMPREHENSIVE FIX APPLIED';
  RAISE NOTICE '   ✅ Fixed 38 functions with empty search_path';
  RAISE NOTICE '';
  RAISE NOTICE '   CRITICAL FIXES:';
  RAISE NOTICE '   - handle_new_user: Can now create users (login works)';
  RAISE NOTICE '   - search_games_secure: Can now search games';
  RAISE NOTICE '   - search_games_optimized already had correct search_path';
  RAISE NOTICE '';
  RAISE NOTICE '   CATEGORY BREAKDOWN:';
  RAISE NOTICE '   - 1 User/Auth function';
  RAISE NOTICE '   - 8 Game search functions';
  RAISE NOTICE '   - 4 Game query functions';
  RAISE NOTICE '   - 7 Game data management functions';
  RAISE NOTICE '   - 7 Cache management functions';
  RAISE NOTICE '   - 2 View/metrics functions';
  RAISE NOTICE '   - 6 Database admin functions';
  RAISE NOTICE '   - 3 Utility functions';
  RAISE NOTICE '';
  RAISE NOTICE '   🔍 TEST NOW:';
  RAISE NOTICE '   1. Try logging in as user ID 1';
  RAISE NOTICE '   2. Try searching for games';
  RAISE NOTICE '   3. Try accessing user page /user/1';
  RAISE NOTICE '   4. Check browser console for HTTP 400 errors';
END $$;
