-- Create RPC function for batch updating hit counts
CREATE OR REPLACE FUNCTION increment_cache_hit_counts(cache_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE igdb_cache 
  SET 
    hit_count = COALESCE(hit_count, 0) + 1,
    last_accessed = NOW()
  WHERE id = ANY(cache_ids);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION increment_cache_hit_counts(UUID[]) TO anon, authenticated;

-- Add comment explaining the function
COMMENT ON FUNCTION increment_cache_hit_counts IS 'Batch increment hit counts for multiple cache records for better performance';