-- Fix search_games_with_mode function to work with correct table name and parameters
-- This adds user rating data to search results

CREATE OR REPLACE FUNCTION search_games_with_mode(
  search_term TEXT,
  search_mode TEXT DEFAULT 'fuzzy',
  max_results INTEGER DEFAULT 200
)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name TEXT,
  summary TEXT,
  release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  category INTEGER,
  developer TEXT,
  publisher TEXT,
  average_rating NUMERIC,
  rating_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use fuzzy search mode (for now just using ILIKE)
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
    g.category,
    g.developer,
    g.publisher,
    COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS average_rating,
    COALESCE(COUNT(r.rating)::INTEGER, 0) AS rating_count
  FROM game g
  LEFT JOIN rating r ON g.id = r.game_id
  WHERE g.name ILIKE '%' || search_term || '%'
  GROUP BY
    g.id, g.igdb_id, g.name, g.summary, g.release_date,
    g.cover_url, g.genres, g.platforms, g.category,
    g.developer, g.publisher
  ORDER BY
    -- Prioritize exact matches
    CASE WHEN LOWER(g.name) = LOWER(search_term) THEN 1 ELSE 2 END,
    -- Then prioritize matches at the start
    CASE WHEN LOWER(g.name) LIKE LOWER(search_term) || '%' THEN 1 ELSE 2 END,
    -- Then by rating count (popularity)
    COUNT(r.rating) DESC NULLS LAST,
    -- Finally by name
    g.name
  LIMIT max_results;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION search_games_with_mode TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_with_mode TO service_role;