-- Create RPC function for exact game search using ILIKE
-- This function searches for games using exact substring matching in the title
CREATE OR REPLACE FUNCTION search_games_exact(
  search_query TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name TEXT,
  summary TEXT,
  first_release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  screenshots TEXT[],
  videos TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.igdb_id,
    g.name,
    g.summary,
    g.first_release_date,
    g.cover_url,
    g.genres,
    g.platforms,
    g.screenshots,
    g.videos,
    g.created_at,
    g.updated_at
  FROM games g
  WHERE g.name ILIKE '%' || search_query || '%'
  ORDER BY 
    -- Prioritize exact matches at the beginning
    CASE WHEN LOWER(g.name) = LOWER(search_query) THEN 1 ELSE 2 END,
    -- Then prioritize matches at the start of the title
    CASE WHEN LOWER(g.name) LIKE LOWER(search_query) || '%' THEN 1 ELSE 2 END,
    -- Finally sort by name alphabetically
    g.name
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Create enhanced RPC function that includes rating data
CREATE OR REPLACE FUNCTION search_games_exact_with_ratings(
  search_query TEXT,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name TEXT,
  summary TEXT,
  first_release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  screenshots TEXT[],
  videos TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  average_rating NUMERIC,
  rating_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.igdb_id,
    g.name,
    g.summary,
    g.first_release_date,
    g.cover_url,
    g.genres,
    g.platforms,
    g.screenshots,
    g.videos,
    g.created_at,
    g.updated_at,
    COALESCE(AVG(r.rating), 0)::NUMERIC AS average_rating,
    COUNT(r.rating)::INTEGER AS rating_count
  FROM games g
  LEFT JOIN rating r ON g.id = r.game_id
  WHERE g.name ILIKE '%' || search_query || '%'
  GROUP BY g.id, g.igdb_id, g.name, g.summary, g.first_release_date, 
           g.cover_url, g.genres, g.platforms, g.screenshots, g.videos,
           g.created_at, g.updated_at
  ORDER BY 
    -- Prioritize exact matches at the beginning
    CASE WHEN LOWER(g.name) = LOWER(search_query) THEN 1 ELSE 2 END,
    -- Then prioritize matches at the start of the title
    CASE WHEN LOWER(g.name) LIKE LOWER(search_query) || '%' THEN 1 ELSE 2 END,
    -- Finally sort by name alphabetically
    g.name
  LIMIT limit_count
  OFFSET offset_count;
END;
$$;

-- Update or create similarity search function with exact/fuzzy mode
CREATE OR REPLACE FUNCTION search_games_with_mode(
  search_query TEXT,
  use_exact_match BOOLEAN DEFAULT TRUE,
  similarity_threshold REAL DEFAULT 0.1,
  limit_count INTEGER DEFAULT 20,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name TEXT,
  summary TEXT,
  first_release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  screenshots TEXT[],
  videos TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  average_rating NUMERIC,
  rating_count INTEGER,
  match_score REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  IF use_exact_match THEN
    -- Use exact matching with ILIKE
    RETURN QUERY
    SELECT 
      g.id,
      g.igdb_id,
      g.name,
      g.summary,
      g.first_release_date,
      g.cover_url,
      g.genres,
      g.platforms,
      g.screenshots,
      g.videos,
      g.created_at,
      g.updated_at,
      COALESCE(AVG(r.rating), 0)::NUMERIC AS average_rating,
      COUNT(r.rating)::INTEGER AS rating_count,
      1.0::REAL AS match_score -- All exact matches get score 1.0
    FROM games g
    LEFT JOIN rating r ON g.id = r.game_id
    WHERE g.name ILIKE '%' || search_query || '%'
    GROUP BY g.id, g.igdb_id, g.name, g.summary, g.first_release_date, 
             g.cover_url, g.genres, g.platforms, g.screenshots, g.videos,
             g.created_at, g.updated_at
    ORDER BY 
      -- Prioritize exact matches at the beginning
      CASE WHEN LOWER(g.name) = LOWER(search_query) THEN 1 ELSE 2 END,
      -- Then prioritize matches at the start of the title
      CASE WHEN LOWER(g.name) LIKE LOWER(search_query) || '%' THEN 1 ELSE 2 END,
      -- Finally sort by name alphabetically
      g.name
    LIMIT limit_count
    OFFSET offset_count;
  ELSE
    -- Use fuzzy matching with trigram similarity (requires pg_trgm extension)
    RETURN QUERY
    SELECT 
      g.id,
      g.igdb_id,
      g.name,
      g.summary,
      g.first_release_date,
      g.cover_url,
      g.genres,
      g.platforms,
      g.screenshots,
      g.videos,
      g.created_at,
      g.updated_at,
      COALESCE(AVG(r.rating), 0)::NUMERIC AS average_rating,
      COUNT(r.rating)::INTEGER AS rating_count,
      SIMILARITY(g.name, search_query) AS match_score
    FROM games g
    LEFT JOIN rating r ON g.id = r.game_id
    WHERE SIMILARITY(g.name, search_query) > similarity_threshold
    GROUP BY g.id, g.igdb_id, g.name, g.summary, g.first_release_date, 
             g.cover_url, g.genres, g.platforms, g.screenshots, g.videos,
             g.created_at, g.updated_at
    ORDER BY SIMILARITY(g.name, search_query) DESC
    LIMIT limit_count
    OFFSET offset_count;
  END IF;
END;
$$;

-- Grant execute permissions to the authenticated role
GRANT EXECUTE ON FUNCTION search_games_exact(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_exact_with_ratings(TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION search_games_with_mode(TEXT, BOOLEAN, REAL, INTEGER, INTEGER) TO authenticated;