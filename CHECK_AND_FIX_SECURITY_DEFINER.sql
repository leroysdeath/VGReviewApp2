-- =====================================================
-- Check and Fix SECURITY DEFINER Views
-- =====================================================
-- Run this directly in Supabase SQL Editor
-- This will show you the actual security settings and fix them

-- =====================================================
-- STEP 1: Check current view security settings
-- =====================================================
SELECT
  n.nspname as schema,
  c.relname as view_name,
  CASE
    WHEN pg_relation_is_updatable(c.oid, false) & 8 = 8 THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security_type,
  pg_get_viewdef(c.oid, true) as view_definition
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND c.relname IN (
    'performance_monitoring',
    'performance_monitoring_enhanced',
    'materialized_view_status',
    'game_backfill_recent',
    'performance_optimization_index_usage',
    'slow_query_index_usage'
  )
ORDER BY c.relname;

-- =====================================================
-- STEP 2: Check if views have security_barrier option
-- =====================================================
-- This might be what's triggering the warning
SELECT
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'performance_monitoring',
    'performance_monitoring_enhanced',
    'materialized_view_status',
    'game_backfill_recent',
    'performance_optimization_index_usage',
    'slow_query_index_usage'
  );

-- =====================================================
-- STEP 3: Check view options
-- =====================================================
SELECT
  c.relname as view_name,
  c.reloptions as options
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND c.relname IN (
    'performance_monitoring',
    'performance_monitoring_enhanced',
    'materialized_view_status',
    'game_backfill_recent',
    'performance_optimization_index_usage',
    'slow_query_index_usage'
  );

-- =====================================================
-- STEP 4: THE FIX - Reset view options
-- =====================================================
-- If the above shows 'security_barrier' or other options,
-- we need to reset them

-- Drop and recreate each view with explicit SECURITY INVOKER
BEGIN;

-- Drop all views
DROP VIEW IF EXISTS performance_optimization_index_usage CASCADE;
DROP VIEW IF EXISTS performance_monitoring CASCADE;
DROP VIEW IF EXISTS materialized_view_status CASCADE;
DROP VIEW IF EXISTS game_backfill_recent CASCADE;
DROP VIEW IF EXISTS slow_query_index_usage CASCADE;
DROP VIEW IF EXISTS performance_monitoring_enhanced CASCADE;

-- Recreate View 1: performance_monitoring
CREATE VIEW performance_monitoring
WITH (security_invoker = true)
AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('game', 'rating', 'user', 'comment', 'game_views')
ORDER BY idx_scan DESC;

GRANT SELECT ON performance_monitoring TO authenticated;

-- Recreate View 2: performance_monitoring_enhanced
CREATE VIEW performance_monitoring_enhanced
WITH (security_invoker = true)
AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW USAGE'
    WHEN idx_tup_fetch::FLOAT / NULLIF(idx_tup_read, 0) > 0.99 THEN 'HIGHLY EFFICIENT'
    WHEN idx_tup_fetch::FLOAT / NULLIF(idx_tup_read, 0) > 0.90 THEN 'EFFICIENT'
    ELSE 'NEEDS REVIEW'
  END as efficiency_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('game', 'rating', 'user', 'comment', 'game_views')
ORDER BY idx_scan DESC;

GRANT SELECT ON performance_monitoring_enhanced TO authenticated;

-- Recreate View 3: materialized_view_status
CREATE VIEW materialized_view_status
WITH (security_invoker = true)
AS
SELECT
  schemaname,
  matviewname,
  pg_size_pretty(pg_relation_size(schemaname || '.' || matviewname)) as size,
  (SELECT GREATEST(last_vacuum, last_autovacuum, last_analyze, last_autoanalyze)
   FROM pg_stat_all_tables
   WHERE schemaname = mv.schemaname AND relname = mv.matviewname
  ) as last_refresh,
  CASE
    WHEN (SELECT GREATEST(last_vacuum, last_autovacuum, last_analyze, last_autoanalyze)
          FROM pg_stat_all_tables
          WHERE schemaname = mv.schemaname AND relname = mv.matviewname) < NOW() - INTERVAL '1 day'
    THEN 'STALE'
    WHEN (SELECT GREATEST(last_vacuum, last_autovacuum, last_analyze, last_autoanalyze)
          FROM pg_stat_all_tables
          WHERE schemaname = mv.schemaname AND relname = mv.matviewname) IS NULL
    THEN 'UNKNOWN'
    ELSE 'FRESH'
  END as freshness_status
FROM pg_matviews mv
WHERE schemaname = 'public'
ORDER BY matviewname;

GRANT SELECT ON materialized_view_status TO authenticated;

-- Recreate View 4: game_backfill_recent
CREATE VIEW game_backfill_recent
WITH (security_invoker = true)
AS
SELECT
  id,
  name,
  igdb_id,
  cover_url,
  summary,
  updated_at
FROM game
WHERE data_source = 'igdb'
  AND updated_at >= NOW() - INTERVAL '30 days'
ORDER BY updated_at DESC;

GRANT SELECT ON game_backfill_recent TO authenticated;

-- Recreate View 5: performance_optimization_index_usage
CREATE VIEW performance_optimization_index_usage
WITH (security_invoker = true)
AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

GRANT SELECT ON performance_optimization_index_usage TO authenticated;

-- Recreate View 6: slow_query_index_usage
CREATE VIEW slow_query_index_usage
WITH (security_invoker = true)
AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  CASE
    WHEN idx_scan = 0 THEN 'Never used - consider dropping'
    WHEN idx_scan < 10 THEN 'Rarely used'
    ELSE 'Actively used'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('game', 'rating', 'user')
ORDER BY idx_scan ASC;

GRANT SELECT ON slow_query_index_usage TO authenticated;

COMMIT;

-- =====================================================
-- STEP 5: Verify the fix
-- =====================================================
SELECT
  c.relname as view_name,
  c.reloptions as options,
  CASE
    WHEN 'security_invoker=true' = ANY(c.reloptions) THEN '✅ SECURITY INVOKER'
    WHEN 'security_barrier=true' = ANY(c.reloptions) THEN '❌ SECURITY BARRIER (DEFINER)'
    WHEN c.reloptions IS NULL THEN '✅ DEFAULT (INVOKER)'
    ELSE '⚠️ OTHER: ' || array_to_string(c.reloptions, ', ')
  END as security_status
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind = 'v'
  AND n.nspname = 'public'
  AND c.relname IN (
    'performance_monitoring',
    'performance_monitoring_enhanced',
    'materialized_view_status',
    'game_backfill_recent',
    'performance_optimization_index_usage',
    'slow_query_index_usage'
  )
ORDER BY c.relname;

-- =====================================================
-- Expected Result:
-- All views should show "✅ SECURITY INVOKER" or "✅ DEFAULT (INVOKER)"
-- If you still see security warnings after this, run:
-- SELECT * FROM supabase_functions.get_advisors();
-- =====================================================
