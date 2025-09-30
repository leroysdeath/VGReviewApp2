-- Create secure_game_search as an alias to search_games_secure
-- This matches the function name expected by the frontend searchService.ts

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
    cover_url text,
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
        g.pic_url as cover_url,
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
        -- Apply min rating filter if provided (using aggregated_rating if available)
        AND (min_rating_filter IS NULL OR g.aggregated_rating >= min_rating_filter)
    ORDER BY ts_rank(g.search_vector, query_ts) DESC, g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION secure_game_search(text, integer, boolean, text[], text[], integer, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION secure_game_search(text, integer, boolean, text[], text[], integer, numeric) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION secure_game_search IS 'Secure full-text search function with advanced filtering options. Safe from SQL injection.';

-- Log completion
DO $$
BEGIN
    RAISE NOTICE 'Created secure_game_search function with advanced filtering';
END $$;