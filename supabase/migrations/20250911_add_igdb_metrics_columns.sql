-- Migration: Add IGDB Metrics Columns for Enhanced Search
-- Date: 2025-09-11
-- Purpose: Add total_rating, rating_count, follows, hypes, and popularity_score columns to game table

-- Add new IGDB metrics columns to game table
ALTER TABLE game 
ADD COLUMN IF NOT EXISTS total_rating INTEGER CHECK (total_rating >= 0 AND total_rating <= 100),
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0 CHECK (rating_count >= 0),
ADD COLUMN IF NOT EXISTS follows INTEGER DEFAULT 0 CHECK (follows >= 0),
ADD COLUMN IF NOT EXISTS hypes INTEGER DEFAULT 0 CHECK (hypes >= 0),
ADD COLUMN IF NOT EXISTS popularity_score INTEGER DEFAULT 0 CHECK (popularity_score >= 0);

-- Add comments for documentation
COMMENT ON COLUMN game.total_rating IS 'IGDB combined critic + user rating (0-100)';
COMMENT ON COLUMN game.rating_count IS 'Number of critic reviews on IGDB';
COMMENT ON COLUMN game.follows IS 'Number of users following this game on IGDB';
COMMENT ON COLUMN game.hypes IS 'Pre-release buzz/hype count on IGDB';
COMMENT ON COLUMN game.popularity_score IS 'Calculated popularity metric based on follows, hypes, and rating_count';

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_game_total_rating ON game(total_rating DESC) WHERE total_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_rating_count ON game(rating_count DESC) WHERE rating_count > 0;
CREATE INDEX IF NOT EXISTS idx_game_follows ON game(follows DESC) WHERE follows > 0;
CREATE INDEX IF NOT EXISTS idx_game_popularity_score ON game(popularity_score DESC) WHERE popularity_score > 0;

-- Composite index for search sorting (most important combinations)
CREATE INDEX IF NOT EXISTS idx_game_search_metrics ON game(total_rating DESC, follows DESC, rating_count DESC) 
WHERE total_rating IS NOT NULL OR follows > 0 OR rating_count > 0;

-- Function to calculate popularity score
CREATE OR REPLACE FUNCTION calculate_popularity_score(
  p_follows INTEGER DEFAULT 0,
  p_hypes INTEGER DEFAULT 0,
  p_rating_count INTEGER DEFAULT 0
) RETURNS INTEGER AS $$
BEGIN
  -- Weighted popularity formula: follows (60%) + hypes (30%) + rating_count*10 (10%)
  RETURN COALESCE(
    ROUND(
      (COALESCE(p_follows, 0) * 0.6) +
      (COALESCE(p_hypes, 0) * 0.3) +
      (COALESCE(p_rating_count, 0) * 10 * 0.1)
    )::INTEGER,
    0
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update popularity_score when metrics change
CREATE OR REPLACE FUNCTION update_popularity_score() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.popularity_score = calculate_popularity_score(NEW.follows, NEW.hypes, NEW.rating_count);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic popularity score calculation
DROP TRIGGER IF EXISTS trigger_update_popularity_score ON game;
CREATE TRIGGER trigger_update_popularity_score
  BEFORE INSERT OR UPDATE OF follows, hypes, rating_count
  ON game
  FOR EACH ROW
  EXECUTE FUNCTION update_popularity_score();

-- Create view for games with enhanced metrics (useful for debugging/monitoring)
CREATE OR REPLACE VIEW game_metrics_summary AS
SELECT 
  id,
  name,
  igdb_rating,
  total_rating,
  rating_count,
  follows,
  hypes,
  popularity_score,
  -- Metric completeness flags
  CASE 
    WHEN total_rating IS NOT NULL AND rating_count > 0 AND follows > 0 THEN 'complete'
    WHEN total_rating IS NOT NULL OR rating_count > 0 OR follows > 0 THEN 'partial'
    ELSE 'missing'
  END as metrics_status,
  -- Quality tier based on metrics
  CASE 
    WHEN follows > 100000 OR popularity_score > 80000 THEN 'viral'
    WHEN follows > 50000 OR popularity_score > 50000 THEN 'mainstream'
    WHEN follows > 10000 OR popularity_score > 10000 THEN 'popular'
    WHEN follows > 1000 OR popularity_score > 1000 THEN 'known'
    ELSE 'niche'
  END as popularity_tier,
  created_at,
  updated_at
FROM game
ORDER BY popularity_score DESC NULLS LAST;

-- Add comment for the view
COMMENT ON VIEW game_metrics_summary IS 'Summary view of games with IGDB metrics and calculated tiers for monitoring';

-- Grant appropriate permissions (adjust as needed for your RLS setup)
-- Note: You may need to adjust these based on your specific RLS policies
GRANT SELECT ON game_metrics_summary TO authenticated;
GRANT SELECT ON game_metrics_summary TO anon;

-- Create function to get metrics completion stats (useful for monitoring backfill progress)
CREATE OR REPLACE FUNCTION get_metrics_completion_stats()
RETURNS TABLE (
  total_games BIGINT,
  games_with_metrics BIGINT,
  games_missing_metrics BIGINT,
  completion_percentage NUMERIC(5,2),
  avg_follows NUMERIC,
  avg_rating_count NUMERIC,
  max_popularity_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_games,
    COUNT(CASE WHEN total_rating IS NOT NULL OR rating_count > 0 OR follows > 0 THEN 1 END)::BIGINT as games_with_metrics,
    COUNT(CASE WHEN total_rating IS NULL AND rating_count = 0 AND follows = 0 THEN 1 END)::BIGINT as games_missing_metrics,
    ROUND(
      (COUNT(CASE WHEN total_rating IS NOT NULL OR rating_count > 0 OR follows > 0 THEN 1 END)::NUMERIC / 
       NULLIF(COUNT(*)::NUMERIC, 0)) * 100, 
      2
    ) as completion_percentage,
    ROUND(AVG(NULLIF(follows, 0)), 2) as avg_follows,
    ROUND(AVG(NULLIF(rating_count, 0)), 2) as avg_rating_count,
    MAX(popularity_score) as max_popularity_score
  FROM game;
END;
$$ LANGUAGE plpgsql;

-- Add comment for monitoring function
COMMENT ON FUNCTION get_metrics_completion_stats() IS 'Returns statistics on IGDB metrics completion for monitoring backfill progress';