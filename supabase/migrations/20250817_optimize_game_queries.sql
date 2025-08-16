-- =====================================================
-- Optimized Game Query Functions and Views
-- =====================================================

-- Enable trigram extension for fuzzy text search (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_game_name_trgm ON game USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_game_genres ON game USING gin (genres);
CREATE INDEX IF NOT EXISTS idx_game_platforms ON game USING gin (platforms);
CREATE INDEX IF NOT EXISTS idx_game_release_date ON game (release_date);
CREATE INDEX IF NOT EXISTS idx_rating_game_id ON rating (game_id);
CREATE INDEX IF NOT EXISTS idx_rating_user_game ON rating (user_id, game_id);

-- =====================================================
-- Function: Search games with trigram similarity
-- =====================================================
CREATE OR REPLACE FUNCTION search_game_similarity(
  search_query TEXT,
  similarity_threshold FLOAT DEFAULT 0.1
)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name VARCHAR(500),
  summary TEXT,
  release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  screenshots TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  similarity_score FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    g.screenshots,
    g.created_at,
    g.updated_at,
    similarity(g.name, search_query) AS similarity_score
  FROM game g
  WHERE similarity(g.name, search_query) > similarity_threshold
  ORDER BY similarity_score DESC, g.name;
END;
$$;

-- =====================================================
-- Function: Get popular games by rating count
-- =====================================================
CREATE OR REPLACE FUNCTION get_popular_game(
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name VARCHAR(500),
  summary TEXT,
  release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  screenshots TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  average_rating NUMERIC,
  rating_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    g.screenshots,
    g.created_at,
    g.updated_at,
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(r.id) AS rating_count
  FROM game g
  LEFT JOIN rating r ON g.id = r.game_id
  GROUP BY g.id
  HAVING COUNT(r.id) > 0
  ORDER BY rating_count DESC, average_rating DESC
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- Function: Get highly rated games
-- =====================================================
CREATE OR REPLACE FUNCTION get_highly_rated_game(
  min_rating NUMERIC DEFAULT 8.0,
  min_count INTEGER DEFAULT 5,
  limit_count INTEGER DEFAULT 20
)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name VARCHAR(500),
  summary TEXT,
  release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  screenshots TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  average_rating NUMERIC,
  rating_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    g.screenshots,
    g.created_at,
    g.updated_at,
    AVG(r.rating) AS average_rating,
    COUNT(r.id) AS rating_count
  FROM game g
  INNER JOIN rating r ON g.id = r.game_id
  GROUP BY g.id
  HAVING COUNT(r.id) >= min_count AND AVG(r.rating) >= min_rating
  ORDER BY average_rating DESC, rating_count DESC
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- View: Games with rating statistics
-- =====================================================
CREATE OR REPLACE VIEW game_with_ratings AS
SELECT 
  g.*,
  COALESCE(rs.average_rating, 0) AS average_rating,
  COALESCE(rs.rating_count, 0) AS rating_count,
  COALESCE(rs.total_playtime_hours, 0) AS total_playtime_hours,
  COALESCE(rs.recommended_count, 0) AS recommended_count,
  COALESCE(rs.recommended_percentage, 0) AS recommended_percentage
FROM game g
LEFT JOIN (
  SELECT 
    game_id,
    AVG(rating)::NUMERIC(3,1) AS average_rating,
    COUNT(*) AS rating_count,
    SUM(playtime_hours) AS total_playtime_hours,
    COUNT(CASE WHEN is_recommended = true THEN 1 END) AS recommended_count,
    (COUNT(CASE WHEN is_recommended = true THEN 1 END)::FLOAT / 
     NULLIF(COUNT(CASE WHEN is_recommended IS NOT NULL THEN 1 END), 0) * 100)::NUMERIC(5,2) AS recommended_percentage
  FROM rating
  GROUP BY game_id
) rs ON g.id = rs.game_id;

-- =====================================================
-- View: Popular games (cached for performance)
-- =====================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_game_cached AS
SELECT 
  g.*,
  COALESCE(AVG(r.rating), 0) AS average_rating,
  COUNT(r.id) AS rating_count
FROM game g
LEFT JOIN rating r ON g.id = r.game_id
GROUP BY g.id
HAVING COUNT(r.id) > 0
ORDER BY COUNT(r.id) DESC, AVG(r.rating) DESC
LIMIT 100;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_popular_game_cached_rating_count 
ON popular_game_cached (rating_count DESC);

-- =====================================================
-- Function: Refresh materialized views
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_game_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_game_cached;
END;
$$;

-- =====================================================
-- Function: Get game rating distribution
-- =====================================================
CREATE OR REPLACE FUNCTION get_game_rating_distribution(
  target_game_id INTEGER
)
RETURNS TABLE (
  rating_value INTEGER,
  count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_ratings BIGINT;
BEGIN
  -- Get total ratings for percentage calculation
  SELECT COUNT(*) INTO total_ratings
  FROM rating
  WHERE game_id = target_game_id;
  
  -- Return distribution
  RETURN QUERY
  SELECT 
    rating_bucket AS rating_value,
    COUNT(*)::BIGINT AS count,
    CASE 
      WHEN total_ratings > 0 
      THEN (COUNT(*)::NUMERIC / total_ratings * 100)::NUMERIC(5,2)
      ELSE 0
    END AS percentage
  FROM (
    SELECT ROUND(rating)::INTEGER AS rating_bucket
    FROM rating
    WHERE game_id = target_game_id
  ) r
  GROUP BY rating_bucket
  ORDER BY rating_bucket DESC;
END;
$$;

-- =====================================================
-- Function: Get games similar to target game
-- =====================================================
CREATE OR REPLACE FUNCTION get_similar_game(
  target_game_id INTEGER,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  id INTEGER,
  igdb_id INTEGER,
  name VARCHAR(500),
  summary TEXT,
  release_date DATE,
  cover_url TEXT,
  genres TEXT[],
  platforms TEXT[],
  average_rating NUMERIC,
  rating_count BIGINT,
  genre_similarity INTEGER,
  platform_similarity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_genres TEXT[];
  target_platforms TEXT[];
BEGIN
  -- Get target game's genres and platforms
  SELECT g.genres, g.platforms 
  INTO target_genres, target_platforms
  FROM game g
  WHERE g.id = target_game_id;
  
  -- Find similar games
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
    COALESCE(AVG(r.rating), 0) AS average_rating,
    COUNT(r.id) AS rating_count,
    COALESCE(array_length(array_intersect(g.genres, target_genres), 1), 0) AS genre_similarity,
    COALESCE(array_length(array_intersect(g.platforms, target_platforms), 1), 0) AS platform_similarity
  FROM game g
  LEFT JOIN rating r ON g.id = r.game_id
  WHERE g.id != target_game_id
    AND (
      (g.genres && target_genres) OR 
      (g.platforms && target_platforms)
    )
  GROUP BY g.id
  ORDER BY 
    genre_similarity DESC,
    platform_similarity DESC,
    COUNT(r.id) DESC
  LIMIT limit_count;
END;
$$;

-- =====================================================
-- Helper function: Array intersection
-- =====================================================
CREATE OR REPLACE FUNCTION array_intersect(anyarray, anyarray)
RETURNS anyarray
LANGUAGE sql
AS $$
  SELECT ARRAY(
    SELECT UNNEST($1)
    INTERSECT
    SELECT UNNEST($2)
  );
$$;

-- =====================================================
-- Trigger: Auto-refresh popular games cache
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_refresh_popular_game()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Refresh the materialized view asynchronously
  -- In production, you might want to use pg_cron for scheduled refreshes
  -- instead of refreshing on every rating change
  IF random() < 0.01 THEN -- Only refresh 1% of the time to reduce load
    PERFORM refresh_game_views();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on rating table
DROP TRIGGER IF EXISTS refresh_popular_game_trigger ON rating;
CREATE TRIGGER refresh_popular_game_trigger
AFTER INSERT OR UPDATE OR DELETE ON rating
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_popular_game();

-- =====================================================
-- Initial data refresh
-- =====================================================
REFRESH MATERIALIZED VIEW popular_game_cached;
