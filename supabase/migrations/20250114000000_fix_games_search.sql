-- Create indexes for improved search performance on igdb_cache table
CREATE INDEX IF NOT EXISTS idx_igdb_cache_expires_at ON igdb_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_igdb_cache_hit_count ON igdb_cache(hit_count DESC);
CREATE INDEX IF NOT EXISTS idx_igdb_cache_cache_key_text ON igdb_cache USING gin(cache_key gin_trgm_ops);

-- Create a function to extract game names from JSONB response_data for search
CREATE OR REPLACE FUNCTION extract_game_names(response_data jsonb)
RETURNS text[] AS $$
BEGIN
  -- Handle both array and single object formats
  IF jsonb_typeof(response_data) = 'array' THEN
    RETURN ARRAY(
      SELECT (game->>'name')::text
      FROM jsonb_array_elements(response_data) AS game
      WHERE game->>'name' IS NOT NULL
    );
  ELSIF jsonb_typeof(response_data) = 'object' AND response_data->>'name' IS NOT NULL THEN
    RETURN ARRAY[response_data->>'name'];
  ELSE
    RETURN ARRAY[]::text[];
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create a function to search games by name in JSONB data
CREATE OR REPLACE FUNCTION search_games_by_name(search_term text, result_limit integer DEFAULT 50)
RETURNS TABLE(
  id uuid,
  response_data jsonb,
  hit_count integer,
  cache_key text,
  relevance_score float
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.response_data,
    c.hit_count,
    c.cache_key,
    CASE 
      -- Exact name match gets highest score
      WHEN EXISTS (
        SELECT 1 FROM unnest(extract_game_names(c.response_data)) AS game_name
        WHERE lower(game_name) = lower(search_term)
      ) THEN 1.0
      -- Name starts with search term gets high score  
      WHEN EXISTS (
        SELECT 1 FROM unnest(extract_game_names(c.response_data)) AS game_name
        WHERE lower(game_name) LIKE lower(search_term) || '%'
      ) THEN 0.8
      -- Name contains search term gets medium score
      WHEN EXISTS (
        SELECT 1 FROM unnest(extract_game_names(c.response_data)) AS game_name
        WHERE lower(game_name) LIKE '%' || lower(search_term) || '%'
      ) THEN 0.6
      -- Cache key contains search term gets low score
      WHEN lower(c.cache_key) LIKE '%' || lower(search_term) || '%' THEN 0.3
      ELSE 0.1
    END AS relevance_score
  FROM igdb_cache c
  WHERE 
    c.expires_at > NOW()
    AND (
      -- Search in extracted game names
      EXISTS (
        SELECT 1 FROM unnest(extract_game_names(c.response_data)) AS game_name
        WHERE lower(game_name) LIKE '%' || lower(search_term) || '%'
      )
      -- Fallback to cache_key search
      OR lower(c.cache_key) LIKE '%' || lower(search_term) || '%'
    )
  ORDER BY 
    relevance_score DESC,
    c.hit_count DESC,
    c.last_accessed DESC NULLS LAST
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Create an optimized function for autocomplete suggestions
CREATE OR REPLACE FUNCTION get_game_suggestions(search_term text, suggestion_limit integer DEFAULT 10)
RETURNS TABLE(
  game_id integer,
  game_name text,
  cache_record_id uuid,
  hit_count integer
) AS $$
BEGIN
  RETURN QUERY
  WITH game_matches AS (
    SELECT 
      c.id as cache_record_id,
      c.hit_count,
      game_data,
      CASE 
        WHEN lower(game_data->>'name') = lower(search_term) THEN 1.0
        WHEN lower(game_data->>'name') LIKE lower(search_term) || '%' THEN 0.8
        WHEN lower(game_data->>'name') LIKE '%' || lower(search_term) || '%' THEN 0.6
        ELSE 0.1
      END AS relevance_score
    FROM igdb_cache c,
    LATERAL (
      CASE 
        WHEN jsonb_typeof(c.response_data) = 'array' 
        THEN jsonb_array_elements(c.response_data)
        ELSE c.response_data
      END
    ) AS game_data
    WHERE 
      c.expires_at > NOW()
      AND game_data->>'name' IS NOT NULL
      AND lower(game_data->>'name') LIKE '%' || lower(search_term) || '%'
  )
  SELECT DISTINCT
    (game_data->>'id')::integer as game_id,
    game_data->>'name' as game_name,
    cache_record_id,
    hit_count
  FROM game_matches
  WHERE game_id IS NOT NULL
  ORDER BY 
    relevance_score DESC,
    hit_count DESC,
    game_name
  LIMIT suggestion_limit;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION extract_game_names(jsonb) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_games_by_name(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_game_suggestions(text, integer) TO anon, authenticated;

-- Create a comment explaining the migration
COMMENT ON FUNCTION extract_game_names IS 'Extracts game names from JSONB response_data for search indexing';
COMMENT ON FUNCTION search_games_by_name IS 'Searches games by name in cached IGDB data with relevance scoring';
COMMENT ON FUNCTION get_game_suggestions IS 'Provides autocomplete suggestions for game search';