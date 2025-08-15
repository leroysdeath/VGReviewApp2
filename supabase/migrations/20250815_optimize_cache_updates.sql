-- Migration: Optimize cache hit updates with RPC function
-- This creates a PostgreSQL function to efficiently update cache hits in bulk

-- Create function to increment cache hits for multiple records
CREATE OR REPLACE FUNCTION increment_cache_hits(
  cache_ids INTEGER[],
  access_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS void AS $$
BEGIN
  UPDATE igdb_cache
  SET 
    hit_count = hit_count + 1,
    last_accessed = access_time
  WHERE id = ANY(cache_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_cache_hits TO authenticated;

-- Add index for better performance on cache lookups
CREATE INDEX IF NOT EXISTS idx_igdb_cache_last_accessed ON igdb_cache(last_accessed DESC);
CREATE INDEX IF NOT EXISTS idx_igdb_cache_hit_count ON igdb_cache(hit_count DESC);

-- Add composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_igdb_cache_endpoint_params ON igdb_cache(endpoint, query_params);

COMMENT ON FUNCTION increment_cache_hits IS 'Efficiently increment hit counts for multiple cache records in a single query';