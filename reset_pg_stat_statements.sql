-- =====================================================
-- Reset pg_stat_statements to See Fresh Query Performance
-- =====================================================
-- Run this AFTER applying the optimization migration
-- This clears historical slow query data so you can see
-- the performance improvements from your optimizations

-- Option 1: Reset ALL query statistics (recommended after migration)
SELECT pg_stat_statements_reset();

-- Option 2: Check current stats first, then reset
-- Run this to see current slow queries one last time:
SELECT
  calls,
  mean_exec_time,
  total_exec_time,
  LEFT(query, 100) as query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 20;

-- Then reset:
-- SELECT pg_stat_statements_reset();

-- =====================================================
-- After Reset: Monitor New Performance
-- =====================================================
-- Wait a few hours for queries to run, then check again:

-- Check slowest queries (should show much better times now)
SELECT
  calls,
  mean_exec_time,
  total_exec_time,
  query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check cache hit rates (should be 99%+)
SELECT
  schemaname,
  relname,
  heap_blks_read,
  heap_blks_hit,
  round(heap_blks_hit::numeric / NULLIF((heap_blks_hit + heap_blks_read), 0) * 100, 2) as cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY cache_hit_ratio ASC;

-- =====================================================
-- Note: The old slow queries won't "disappear" from
-- the dashboard until you reset pg_stat_statements.
-- This is normal - the stats are cumulative.
-- =====================================================
