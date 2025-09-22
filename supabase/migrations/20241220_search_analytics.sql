-- Migration: Add Search Analytics Tables and Functions
-- Created: 2024-12-20
-- Description: Implements search analytics tracking and performance monitoring

-- Create search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  execution_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_analytics_normalized_query ON search_analytics(normalized_query);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_cache_hit ON search_analytics(cache_hit);

-- Create materialized view for popular searches
CREATE MATERIALIZED VIEW IF NOT EXISTS popular_searches AS
SELECT
  normalized_query,
  COUNT(*) as search_count,
  AVG(result_count)::INTEGER as avg_results,
  AVG(execution_time_ms)::INTEGER as avg_time_ms,
  MAX(created_at) as last_searched
FROM search_analytics
WHERE created_at > NOW() - INTERVAL '7 days'
  AND result_count >= 0  -- Exclude errors
GROUP BY normalized_query
ORDER BY search_count DESC;

-- Create index on materialized view
CREATE INDEX IF NOT EXISTS idx_popular_searches_count ON popular_searches(search_count DESC);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_popular_searches()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_searches;
END;
$$ LANGUAGE plpgsql;

-- Create function to get search performance metrics
CREATE OR REPLACE FUNCTION get_search_performance_metrics(start_date TIMESTAMPTZ)
RETURNS TABLE (
  avg_execution_time NUMERIC,
  median_execution_time NUMERIC,
  p95_execution_time NUMERIC,
  total_searches BIGINT,
  cache_hit_rate NUMERIC,
  zero_result_searches BIGINT,
  error_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    AVG(execution_time_ms)::NUMERIC as avg_execution_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms)::NUMERIC as median_execution_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::NUMERIC as p95_execution_time,
    COUNT(*)::BIGINT as total_searches,
    (COUNT(*) FILTER (WHERE cache_hit = true)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as cache_hit_rate,
    COUNT(*) FILTER (WHERE result_count = 0)::BIGINT as zero_result_searches,
    (COUNT(*) FILTER (WHERE result_count < 0)::NUMERIC / NULLIF(COUNT(*), 0) * 100) as error_rate
  FROM search_analytics
  WHERE created_at >= start_date;
END;
$$ LANGUAGE plpgsql;

-- Create function to get trending searches
CREATE OR REPLACE FUNCTION get_trending_searches(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  query TEXT,
  current_count BIGINT,
  previous_count BIGINT,
  growth_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH current_week AS (
    SELECT
      normalized_query,
      COUNT(*) as count
    FROM search_analytics
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY normalized_query
  ),
  previous_week AS (
    SELECT
      normalized_query,
      COUNT(*) as count
    FROM search_analytics
    WHERE created_at >= NOW() - INTERVAL '14 days'
      AND created_at < NOW() - INTERVAL '7 days'
    GROUP BY normalized_query
  )
  SELECT
    c.normalized_query::TEXT as query,
    c.count as current_count,
    COALESCE(p.count, 0) as previous_count,
    CASE
      WHEN COALESCE(p.count, 0) = 0 THEN 100
      ELSE ((c.count - p.count)::NUMERIC / p.count * 100)
    END as growth_rate
  FROM current_week c
  LEFT JOIN previous_week p ON c.normalized_query = p.normalized_query
  ORDER BY growth_rate DESC, current_count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Create RLS policies
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own searches
CREATE POLICY "Users can view own search history" ON search_analytics
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy for anonymous searches
CREATE POLICY "Anyone can insert anonymous searches" ON search_analytics
  FOR INSERT
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Policy for users to delete their own data (GDPR)
CREATE POLICY "Users can delete own search history" ON search_analytics
  FOR DELETE
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON search_analytics TO anon, authenticated;
GRANT SELECT ON popular_searches TO anon, authenticated;
GRANT EXECUTE ON FUNCTION refresh_popular_searches() TO authenticated;
GRANT EXECUTE ON FUNCTION get_search_performance_metrics(TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_trending_searches(INTEGER) TO anon, authenticated;

-- Note: To enable automatic refresh of popular searches, run this in Supabase SQL editor:
-- SELECT cron.schedule('refresh-popular-searches', '0 * * * *', 'SELECT refresh_popular_searches();');
-- SELECT cron.schedule('clean-old-analytics', '0 3 * * *', 'DELETE FROM search_analytics WHERE created_at < NOW() - INTERVAL ''30 days'';');