-- Migration: Fix search_games_optimized Return Type Mismatch
-- Date: 2025-10-12
-- Purpose: Fix "Returned type text does not match expected type character varying in column 12"

-- ============================================================================
-- ROOT CAUSE IDENTIFIED
-- ============================================================================
-- search_games_optimized declares: franchise character varying
-- Actual game table column:        franchise text
-- This causes the "structure of query does not match function result type" error
-- ============================================================================

-- Drop existing function (required to change return type)
DROP FUNCTION IF EXISTS public.search_games_optimized(text, boolean, integer, boolean);

-- Recreate with correct return type (franchise text instead of varchar)
CREATE OR REPLACE FUNCTION public.search_games_optimized(
  search_term text,
  include_franchise_games boolean DEFAULT false,
  limit_count integer DEFAULT 20,
  include_fan_content boolean DEFAULT true
)
RETURNS TABLE(
  id integer,
  name character varying,
  slug character varying,
  cover_url text,
  release_date date,
  summary text,
  developer character varying,
  publisher character varying,
  platforms text[],
  rating_count integer,
  average_rating numeric,
  franchise text,  -- CHANGED: was character varying, now text to match game.franchise
  category integer,
  relevance_score double precision
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  clean_search TEXT;
  tsquery_search tsquery;
BEGIN
  -- Sanitize and prepare search term
  clean_search := TRIM(LOWER(search_term));

  -- Early return for empty search
  IF clean_search = '' OR clean_search IS NULL THEN
    RETURN;
  END IF;

  -- Build tsquery for full-text search
  tsquery_search := plainto_tsquery('english', clean_search);

  RETURN QUERY
  WITH game_ratings AS (
    -- Calculate rating stats for all games
    SELECT
      game_id,
      COUNT(*)::INTEGER AS rating_count,
      AVG(rating)::NUMERIC AS average_rating
    FROM rating
    WHERE is_published = true
    GROUP BY game_id
  ),
  search_results AS (
    SELECT
      g.*,
      COALESCE(gr.rating_count, 0) AS calc_rating_count,
      COALESCE(gr.average_rating, 0.0) AS calc_average_rating,
      -- Calculate relevance score
      CASE
        -- Exact name match (highest priority)
        WHEN LOWER(g.name) = clean_search THEN 100.0
        -- Name starts with search term
        WHEN LOWER(g.name) LIKE clean_search || '%' THEN 90.0
        -- Name contains search term
        WHEN LOWER(g.name) LIKE '%' || clean_search || '%' THEN 80.0
        -- Search aliases match
        WHEN g.search_aliases::text ILIKE '%' || clean_search || '%' THEN 75.0
        -- Franchise match
        WHEN include_franchise_games AND LOWER(g.franchise) LIKE '%' || clean_search || '%' THEN 70.0
        -- Full-text search match
        WHEN g.search_vector @@ tsquery_search THEN
          50.0 + (ts_rank(g.search_vector, tsquery_search) * 20.0)
        -- Developer/Publisher match
        WHEN LOWER(g.developer) LIKE '%' || clean_search || '%'
          OR LOWER(g.publisher) LIKE '%' || clean_search || '%' THEN 40.0
        ELSE 0.0
      END +
      -- Boost by popularity (rating_count)
      LEAST(COALESCE(gr.rating_count, 0)::FLOAT / 10.0, 20.0) +
      -- Boost by rating quality
      COALESCE(gr.average_rating, 0.0) * 2.0 +
      -- Penalty for old/unreleased games
      CASE
        WHEN g.release_date IS NULL THEN -5.0
        WHEN g.release_date > CURRENT_DATE THEN -3.0
        WHEN g.release_date < '1990-01-01' THEN -2.0
        ELSE 0.0
      END AS relevance
    FROM game g
    LEFT JOIN game_ratings gr ON g.id = gr.game_id
    WHERE
      -- Filter by redlight flag
      (g.redlight_flag IS NULL OR g.redlight_flag = false)
      AND (
        -- Fast index-based searches first
        LOWER(g.name) LIKE '%' || clean_search || '%'
        OR g.search_aliases::text ILIKE '%' || clean_search || '%'
        OR (include_franchise_games AND LOWER(g.franchise) LIKE '%' || clean_search || '%')
        OR g.search_vector @@ tsquery_search
        OR LOWER(g.developer) LIKE '%' || clean_search || '%'
        OR LOWER(g.publisher) LIKE '%' || clean_search || '%'
      )
      -- Filter fan content if requested
      AND (include_fan_content OR g.category != 5)
  )
  SELECT
    sr.id,
    sr.name,
    sr.slug,
    sr.cover_url,
    sr.release_date,
    sr.summary,
    sr.developer,
    sr.publisher,
    sr.platforms,
    sr.calc_rating_count AS rating_count,
    sr.calc_average_rating AS average_rating,
    sr.franchise,
    sr.category,
    sr.relevance AS relevance_score
  FROM search_results sr
  WHERE sr.relevance > 0
  ORDER BY sr.relevance DESC, sr.calc_rating_count DESC NULLS LAST
  LIMIT limit_count;
END;
$function$;

-- Grant permissions (required after dropping function)
GRANT EXECUTE ON FUNCTION search_games_optimized(text, boolean, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_optimized(text, boolean, integer, boolean) TO anon;

-- Verification query
SELECT
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'search_games_optimized';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ FIXED search_games_optimized RETURN TYPE';
  RAISE NOTICE '   - franchise: character varying → text';
  RAISE NOTICE '';
  RAISE NOTICE '   This fixes "Returned type text does not match expected type character varying" error';
  RAISE NOTICE '   Function has been dropped and recreated with correct type';
  RAISE NOTICE '   Permissions granted to authenticated and anon roles';
  RAISE NOTICE '';
  RAISE NOTICE '   🔍 ALL SEARCH FUNCTIONS FIXED:';
  RAISE NOTICE '   ✅ search_games_secure';
  RAISE NOTICE '   ✅ search_games_phrase';
  RAISE NOTICE '   ✅ search_games_by_genre';
  RAISE NOTICE '   ✅ search_games_optimized';
  RAISE NOTICE '';
  RAISE NOTICE '   TEST NOW: Try searching for games - all errors should be resolved!';
END $$;
