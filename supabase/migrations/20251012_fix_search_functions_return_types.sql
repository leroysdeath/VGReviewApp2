-- Migration: Fix Search Functions Return Type Mismatches
-- Date: 2025-10-12
-- Purpose: Fix "structure of query does not match function result type" errors

-- ============================================================================
-- ROOT CAUSE IDENTIFIED
-- ============================================================================
-- search_games_secure and other search functions have return types that don't
-- match the actual game table column types:
--   - Function says: name TEXT, pic_url TEXT
--   - Actual table:  name VARCHAR(500), cover_url TEXT (not pic_url!)
-- This causes PostgreSQL error: "Returned type character varying(500) does not
-- match expected type text in column 2"
-- ============================================================================

-- Drop existing functions first (required to change return types)
DROP FUNCTION IF EXISTS public.search_games_secure(text, integer);
DROP FUNCTION IF EXISTS public.search_games_phrase(text, integer);
DROP FUNCTION IF EXISTS public.search_games_by_genre(text, integer);

-- Recreate search_games_secure with correct types
CREATE OR REPLACE FUNCTION search_games_secure(
    search_query text,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id integer,
    name varchar,  -- Changed from text to varchar to match game.name
    summary text,
    description text,
    release_date date,
    cover_url text,  -- Changed from pic_url to cover_url to match game table
    genres text[],
    igdb_id integer,
    search_rank real
) AS $$
DECLARE
    query_ts tsquery;
    safe_limit integer;
BEGIN
    -- Input validation and sanitization
    IF search_query IS NULL OR trim(search_query) = '' THEN
        RETURN;
    END IF;

    IF length(trim(search_query)) < 2 OR length(trim(search_query)) > 100 THEN
        RETURN;
    END IF;

    -- Sanitize limit
    safe_limit := LEAST(GREATEST(limit_count, 1), 100);

    -- Convert search query to tsquery (completely safe from injection)
    BEGIN
        query_ts := plainto_tsquery('english', trim(search_query));
    EXCEPTION
        WHEN OTHERS THEN
            -- If query parsing fails, return no results
            RETURN;
    END;

    -- Return ranked results using full-text search
    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.summary,
        g.description,
        g.release_date,
        g.cover_url,  -- Changed from pic_url
        g.genres,
        g.igdb_id,
        ts_rank(g.search_vector, query_ts)::real as search_rank
    FROM game g
    WHERE g.search_vector @@ query_ts
    ORDER BY ts_rank(g.search_vector, query_ts) DESC, g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_games_phrase
CREATE OR REPLACE FUNCTION search_games_phrase(
    search_phrase text,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id integer,
    name varchar,  -- Changed from text to varchar
    summary text,
    description text,
    release_date date,
    cover_url text,  -- Changed from pic_url
    genres text[],
    igdb_id integer
) AS $$
DECLARE
    query_ts tsquery;
    safe_limit integer;
BEGIN
    -- Input validation
    IF search_phrase IS NULL OR trim(search_phrase) = '' THEN
        RETURN;
    END IF;

    IF length(trim(search_phrase)) < 2 OR length(trim(search_phrase)) > 100 THEN
        RETURN;
    END IF;

    safe_limit := LEAST(GREATEST(limit_count, 1), 100);

    -- Create phrase query (safe from injection)
    BEGIN
        query_ts := phraseto_tsquery('english', trim(search_phrase));
    EXCEPTION
        WHEN OTHERS THEN
            RETURN;
    END;

    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.summary,
        g.description,
        g.release_date,
        g.cover_url,  -- Changed from pic_url
        g.genres,
        g.igdb_id
    FROM game g
    WHERE g.search_vector @@ query_ts
    ORDER BY g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix search_games_by_genre
CREATE OR REPLACE FUNCTION search_games_by_genre(
    genre_name text,
    limit_count integer DEFAULT 20
)
RETURNS TABLE(
    id integer,
    name varchar,  -- Changed from text to varchar
    summary text,
    description text,
    release_date date,
    cover_url text,  -- Changed from pic_url
    genres text[],
    igdb_id integer
) AS $$
DECLARE
    safe_limit integer;
    clean_genre text;
BEGIN
    -- Input validation
    IF genre_name IS NULL OR trim(genre_name) = '' THEN
        RETURN;
    END IF;

    clean_genre := trim(lower(genre_name));
    safe_limit := LEAST(GREATEST(limit_count, 1), 100);

    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.summary,
        g.description,
        g.release_date,
        g.cover_url,  -- Changed from pic_url
        g.genres,
        g.igdb_id
    FROM game g
    WHERE
        lower(g.genre) = clean_genre
        OR EXISTS (
            SELECT 1 FROM unnest(g.genres) AS genre_item
            WHERE lower(genre_item) = clean_genre
        )
    ORDER BY g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (required after dropping functions)
GRANT EXECUTE ON FUNCTION search_games_secure(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_secure(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION search_games_phrase(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_phrase(text, integer) TO anon;
GRANT EXECUTE ON FUNCTION search_games_by_genre(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_by_genre(text, integer) TO anon;

-- Verification query
SELECT
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('search_games_secure', 'search_games_phrase', 'search_games_by_genre')
ORDER BY p.proname;

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ FIXED SEARCH FUNCTION RETURN TYPES';
  RAISE NOTICE '   - search_games_secure: pic_url → cover_url, name text → varchar';
  RAISE NOTICE '   - search_games_phrase: pic_url → cover_url, name text → varchar';
  RAISE NOTICE '   - search_games_by_genre: pic_url → cover_url, name text → varchar';
  RAISE NOTICE '';
  RAISE NOTICE '   This fixes "structure of query does not match function result type" errors';
  RAISE NOTICE '   Functions have been dropped and recreated with correct types';
  RAISE NOTICE '   Permissions granted to authenticated and anon roles';
  RAISE NOTICE '';
  RAISE NOTICE '   🔍 TEST NOW:';
  RAISE NOTICE '   1. Try searching for games';
  RAISE NOTICE '   2. Check browser console for HTTP 400 errors';
  RAISE NOTICE '   3. User ID 1 should now work normally';
END $$;
