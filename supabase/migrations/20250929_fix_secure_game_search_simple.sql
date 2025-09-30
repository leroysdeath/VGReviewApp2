-- Simplified secure_game_search that matches search_games_secure signature
-- This version removes optional filters to ensure compatibility

DROP FUNCTION IF EXISTS secure_game_search(text, integer, boolean, text[], text[], integer, numeric);

-- Create a simple version that works first
CREATE OR REPLACE FUNCTION secure_game_search(
    search_query text,
    search_limit integer DEFAULT 20
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
    -- Input validation
    IF search_query IS NULL OR trim(search_query) = '' THEN
        RETURN;
    END IF;

    IF length(trim(search_query)) < 1 OR length(trim(search_query)) > 100 THEN
        RETURN;
    END IF;

    -- Sanitize limit
    safe_limit := LEAST(GREATEST(search_limit, 1), 100);

    -- Convert search query to tsquery
    BEGIN
        query_ts := plainto_tsquery('english', trim(search_query));
    EXCEPTION
        WHEN OTHERS THEN
            RETURN;
    END;

    -- Return results
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
    ORDER BY ts_rank(g.search_vector, query_ts) DESC, g.name ASC
    LIMIT safe_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION secure_game_search(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION secure_game_search(text, integer) TO anon;

COMMENT ON FUNCTION secure_game_search IS 'Simplified secure search function for debugging';

-- Test the function
DO $$
DECLARE
    test_result RECORD;
    result_count INTEGER := 0;
BEGIN
    -- Test with a simple query
    FOR test_result IN
        SELECT * FROM secure_game_search('mario', 5)
    LOOP
        result_count := result_count + 1;
    END LOOP;

    RAISE NOTICE 'Test search for "mario" returned % results', result_count;

    IF result_count > 0 THEN
        RAISE NOTICE '✓ secure_game_search is working!';
    ELSE
        RAISE WARNING '⚠ secure_game_search returned no results - check if search_vector column is populated';
    END IF;
END $$;