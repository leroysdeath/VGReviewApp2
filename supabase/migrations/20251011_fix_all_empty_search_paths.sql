-- Migration: Fix All Functions with Empty search_path
-- Date: 2025-10-11
-- Purpose: Restore schema access to 21+ functions broken by empty search_path

-- ============================================================================
-- PROBLEM: September 22nd security migration set search_path="" on many
-- functions, breaking ALL schema access (can't see public, auth, or any tables)
-- ============================================================================

-- Critical user management function - needs auth + public
ALTER FUNCTION public.handle_new_user()
  SET search_path = 'public', 'auth', 'pg_temp';

-- Game query functions - need public for game table
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

-- Search functions - need public for game table
ALTER FUNCTION public.search_game_similarity(text, double precision)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_games_by_genre(text, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_games_phrase(text, integer)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.search_games_secure(text, integer)
  SET search_path = 'public', 'pg_temp';

-- Cache management functions
ALTER FUNCTION public.cleanup_lru_cache()
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.increment_cache_hits(integer[], timestamptz)
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.update_cache_access()
  SET search_path = 'public', 'pg_temp';

-- View/metrics functions
ALTER FUNCTION public.refresh_game_views()
  SET search_path = 'public', 'pg_temp';

ALTER FUNCTION public.trigger_refresh_popular_game()
  SET search_path = 'public', 'pg_temp';

-- Database admin/security functions - need access to pg_catalog
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

-- Verification query
SELECT
  'Fixed functions count: ' || COUNT(*) as summary
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_new_user',
    'get_game_rating_distribution',
    'get_highly_rated_game',
    'get_popular_game',
    'get_popular_games_cached',
    'get_similar_game',
    'search_game_similarity',
    'search_games_by_genre',
    'search_games_phrase',
    'search_games_secure',
    'cleanup_lru_cache',
    'increment_cache_hits',
    'update_cache_access',
    'refresh_game_views',
    'trigger_refresh_popular_game',
    'analyze_index_usage',
    'check_foreign_key_indexes',
    'check_function_security',
    'check_index_usage',
    'check_multiple_permissive_policies',
    'check_rls_performance'
  )
  AND (SELECT config FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path%' LIMIT 1) != 'search_path=""';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed 21 functions with empty search_path';
  RAISE NOTICE '   - handle_new_user: Can now create users';
  RAISE NOTICE '   - Game functions: Can now access game table';
  RAISE NOTICE '   - Search functions: Can now query database';
  RAISE NOTICE '   - All HTTP 400 errors should be resolved';
END $$;
