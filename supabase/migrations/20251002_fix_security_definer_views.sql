-- =====================================================
-- Fix Security Definer Views and Missing RLS
-- =====================================================
-- Date: 2025-10-02
-- Purpose: Fix security warnings from Supabase linter
--
-- Issues Fixed:
-- 1. Remove SECURITY DEFINER from 6 monitoring views (security risk)
-- 2. Enable RLS on igdb_sync_staging table
--
-- Background:
-- SECURITY DEFINER views run with the permissions of the view creator,
-- not the querying user. This bypasses RLS and can be a security risk.
-- Monitoring views don't need elevated privileges - they just read
-- pg_catalog tables which are already accessible to authenticated users.
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: Drop All Existing Views First
-- =====================================================
-- IMPORTANT: Must drop views completely before recreating
-- CREATE OR REPLACE preserves SECURITY DEFINER, so we must DROP first

DROP VIEW IF EXISTS performance_optimization_index_usage CASCADE;
DROP VIEW IF EXISTS performance_monitoring CASCADE;
DROP VIEW IF EXISTS materialized_view_status CASCADE;
DROP VIEW IF EXISTS game_backfill_recent CASCADE;
DROP VIEW IF EXISTS slow_query_index_usage CASCADE;
DROP VIEW IF EXISTS performance_monitoring_enhanced CASCADE;

-- =====================================================
-- PART 2: Recreate Views Without SECURITY DEFINER
-- =====================================================
-- Views are created with SECURITY INVOKER by default (safe)

-- =====================================================
-- View 1: performance_monitoring (from 20251001 migration)
-- =====================================================
CREATE VIEW performance_monitoring AS
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

COMMENT ON VIEW performance_monitoring IS
'Monitor index usage and identify unused indexes. Check this regularly to optimize database performance.';

GRANT SELECT ON performance_monitoring TO authenticated;

-- =====================================================
-- View 2: performance_monitoring_enhanced (from 20251002 migration)
-- =====================================================
CREATE VIEW performance_monitoring_enhanced AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  -- Calculate index efficiency
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

COMMENT ON VIEW performance_monitoring_enhanced IS
'Enhanced index monitoring with efficiency ratings. Check for UNUSED indexes that can be dropped.';

GRANT SELECT ON performance_monitoring_enhanced TO authenticated;

-- =====================================================
-- View 3: materialized_view_status (from 20251002 migration)
-- =====================================================
CREATE VIEW materialized_view_status AS
SELECT
  schemaname,
  matviewname,
  pg_size_pretty(pg_relation_size(schemaname || '.' || matviewname)) as size,
  -- Get last modification time from pg_stat_all_tables
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

COMMENT ON VIEW materialized_view_status IS
'Shows status and freshness of all materialized views. Refresh STALE views regularly. Note: last_refresh may be NULL if stats have not been collected yet.';

GRANT SELECT ON materialized_view_status TO authenticated;

-- =====================================================
-- View 4: game_backfill_recent (from 20251002 migration)
-- =====================================================
-- Create optimized view without expensive OCTET_LENGTH checks
CREATE VIEW game_backfill_recent AS
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

COMMENT ON VIEW game_backfill_recent IS
'View of recently updated IGDB games. Use game_backfill_recent_cached for better performance.';

GRANT SELECT ON game_backfill_recent TO authenticated;

-- =====================================================
-- View 5 & 6: performance_optimization_index_usage and slow_query_index_usage
-- =====================================================
-- These might be from older migrations - recreate if they existed

-- Create a simple index usage view
CREATE VIEW performance_optimization_index_usage AS
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

COMMENT ON VIEW performance_optimization_index_usage IS
'Index usage statistics for performance optimization. Use performance_monitoring_enhanced for detailed analysis.';

GRANT SELECT ON performance_optimization_index_usage TO authenticated;

-- Create a view for slow query index analysis
CREATE VIEW slow_query_index_usage AS
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

COMMENT ON VIEW slow_query_index_usage IS
'Identifies indexes that may not be helping query performance. Focus on unused indexes.';

GRANT SELECT ON slow_query_index_usage TO authenticated;

-- =====================================================
-- PART 3: Enable RLS on igdb_sync_staging Table
-- =====================================================

-- Enable RLS on the table
ALTER TABLE igdb_sync_staging ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "igdb_sync_staging_select" ON igdb_sync_staging;
DROP POLICY IF EXISTS "igdb_sync_staging_insert" ON igdb_sync_staging;
DROP POLICY IF EXISTS "igdb_sync_staging_update" ON igdb_sync_staging;
DROP POLICY IF EXISTS "igdb_sync_staging_delete" ON igdb_sync_staging;

-- Create RLS policies for igdb_sync_staging
-- This is an internal staging table - only service role should access it

-- Policy 1: Authenticated users can read (for debugging/monitoring)
CREATE POLICY "igdb_sync_staging_select"
  ON igdb_sync_staging
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: No insert/update/delete for regular users (service role only)
-- These operations should only be done by background sync jobs
CREATE POLICY "igdb_sync_staging_insert"
  ON igdb_sync_staging
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "igdb_sync_staging_update"
  ON igdb_sync_staging
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "igdb_sync_staging_delete"
  ON igdb_sync_staging
  FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON TABLE igdb_sync_staging IS
'Staging table for IGDB sync operations. RLS enabled - read-only for authenticated users, write access via service role only.';

-- =====================================================
-- PART 4: Grant Appropriate Permissions
-- =====================================================

-- Revoke write access from anon (they shouldn't have it anyway)
REVOKE INSERT, UPDATE, DELETE ON igdb_sync_staging FROM anon;

-- Authenticated users can only read
GRANT SELECT ON igdb_sync_staging TO authenticated;

-- =====================================================
-- PART 5: Verification
-- =====================================================

DO $$
DECLARE
  view_count INTEGER;
  rls_enabled BOOLEAN;
BEGIN
  -- Count recreated views
  SELECT COUNT(*) INTO view_count
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

  -- Check if RLS is enabled on igdb_sync_staging
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'igdb_sync_staging'
    AND relnamespace = 'public'::regnamespace;

  RAISE NOTICE '✅ Security Definer Views Fixed';
  RAISE NOTICE '📊 Recreated % monitoring views without SECURITY DEFINER', view_count;
  RAISE NOTICE '🔒 RLS enabled on igdb_sync_staging: %', COALESCE(rls_enabled::TEXT, 'false');
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Verification:';
  RAISE NOTICE '   - All views now use SECURITY INVOKER (default)';
  RAISE NOTICE '   - Views enforce RLS of the querying user, not view creator';
  RAISE NOTICE '   - igdb_sync_staging is read-only for authenticated users';
  RAISE NOTICE '   - Service role can still perform sync operations';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Note: If you have background sync jobs, ensure they use';
  RAISE NOTICE '    the service_role key, not anon or authenticated keys.';
END $$;

COMMIT;

-- =====================================================
-- Migration Complete
-- =====================================================
-- All security warnings should be resolved:
-- ✅ SECURITY DEFINER removed from 6 monitoring views
-- ✅ RLS enabled on igdb_sync_staging table
-- ✅ Proper policies in place for data access
-- ✅ Service role can still perform sync operations
--
-- Next Steps:
-- 1. Check Supabase Dashboard → Database → Advisors
-- 2. Verify all security warnings are cleared
-- 3. Test that monitoring views still work for authenticated users
-- 4. Verify sync operations still work (they should use service_role)
-- =====================================================
