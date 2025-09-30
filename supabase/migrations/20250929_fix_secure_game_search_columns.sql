-- Fix secure_game_search to use correct column names matching the game table
-- The issue: previous migration used cover_url but game table has pic_url

DROP FUNCTION IF EXISTS secure_game_search(text, integer, boolean, text[], text[], integer, numeric);

CREATE OR REPLACE FUNCTION secure_game_search(
    search_query text,
    search_limit integer DEFAULT 20,
    use_phrase_search boolean DEFAULT false,
    genre_filters text[] DEFAULT NULL,
    platform_filters text[] DEFAULT NULL,
    release_year_filter integer DEFAULT NULL,
    min_rating_filter numeric DEFAULT NULL
)
RETURNS TABLE(
    id integer,
    name varchar,
    summary text,
    description text,
    release_date date,
    cover_url text,  -- This will be aliased from pic_url
    genres text[],
    platforms text[],
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

    IF length(trim(search_query)) < 1 OR length(trim(search_query)) > 100 THEN
        RETURN;
    END IF;

    -- Sanitize limit
    safe_limit := LEAST(GREATEST(search_limit, 1), 100);

    -- Convert search query to tsquery (completely safe from injection)
    BEGIN
        IF use_phrase_search THEN
            query_ts := phraseto_tsquery('english', trim(search_query));
        ELSE
            query_ts := plainto_tsquery('english', trim(search_query));
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            -- If query parsing fails, return no results
            RETURN;
    END;

    -- Return ranked results using full-text search with filters
    RETURN QUERY
    SELECT
        g.id,
        g.name,
        g.summary,
        g.description,
        g.release_date,
        g.pic_url as cover_url,  -- Alias pic_url to cover_url for consistency
        g.genres,
        g.platforms,
        g.igdb_id,
        ts_rank(g.search_vector, query_ts)::real as search_rank
    FROM game g
    WHERE g.search_vector @@ query_ts
        -- Apply genre filter if provided
        AND (genre_filters IS NULL OR g.genres && genre_filters)
        -- Apply platform filter if provided
        AND (platform_filters IS NULL OR g.platforms && platform_filters)
        -- Apply release year filter if provided
        AND (release_year_filter IS NULL OR EXTRACT(YEAR FROM g.release_date) = release_year_filter)
        -- Apply min rating filter if provided (check if column exists first)
        AND (min_rating_filter IS NULL OR
             CASE
                 WHEN EXISTS (
                     SELECT 1 FROM information_schema.columns
                     WHERE table_name = 'game' AND column_name = 'aggregated_rating'
                 )
                 THEN g.aggregated_rating >= min_rating_filter
                 ELSE true
             END)
    ORDER BY ts_rank(g.search_vector, query_ts) DESC, g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION secure_game_search(text, integer, boolean, text[], text[], integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION secure_game_search(text, integer, boolean, text[], text[], integer, numeric) TO anon;

-- Add comment
COMMENT ON FUNCTION secure_game_search IS 'Secure full-text search function with advanced filtering. Fixed column names to match game table schema.';

-- Verify function was created
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'secure_game_search';

    IF func_count > 0 THEN
        RAISE NOTICE '✓ secure_game_search function created successfully';
    ELSE
        RAISE WARNING '⚠ Failed to create secure_game_search function';
    END IF;
END $$;