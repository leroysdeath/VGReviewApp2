-- =====================================================
-- Index Optimization - Fix Unindexed Foreign Keys and Remove Unused Indexes
-- =====================================================

-- This migration addresses performance suggestions from the database linter:
-- 1. Add missing foreign key indexes (5 important ones)
-- 2. Remove genuinely unused indexes (selective cleanup)
-- 3. Keep potentially useful indexes for future growth

-- =====================================================
-- 1. Add Missing Foreign Key Indexes (Performance Critical)
-- =====================================================

-- These foreign keys need indexes for efficient JOINs

-- game_tag.created_by
CREATE INDEX IF NOT EXISTS idx_game_tag_created_by ON game_tag (created_by);

-- notification.actor_id  
CREATE INDEX IF NOT EXISTS idx_notification_actor_id ON notification (actor_id);

-- rating.platform_id
CREATE INDEX IF NOT EXISTS idx_rating_platform_id ON rating (platform_id);

-- tag.created_by
CREATE INDEX IF NOT EXISTS idx_tag_created_by ON tag (created_by);

-- user_top_games.game_id
CREATE INDEX IF NOT EXISTS idx_user_top_games_game_id ON user_top_games (game_id);

-- =====================================================
-- 2. Remove Clearly Unused Indexes (Conservative Approach)
-- =====================================================

-- Only remove indexes that are definitely not needed or redundant
-- Being conservative to avoid breaking future features

-- Remove some backfill-related indexes (these tables are likely admin-only)
DROP INDEX IF EXISTS idx_game_backfill_log_created_at;
DROP INDEX IF EXISTS idx_game_backfill_log_status; -- Keep game_id index as it might be useful

-- Remove some user session indexes (if sessions aren't heavily used)
DROP INDEX IF EXISTS idx_user_sessions_user_id;
DROP INDEX IF EXISTS idx_user_sessions_token;

-- Remove platform-related indexes if platforms aren't actively used
DROP INDEX IF EXISTS idx_platform_slug;
DROP INDEX IF EXISTS idx_platform_active;
DROP INDEX IF EXISTS idx_platform_games_platform_id;

-- Remove some less critical rating indexes (keep the main ones)
DROP INDEX IF EXISTS idx_rating_likes;
DROP INDEX IF EXISTS idx_rating_date;

-- Remove some comment indexes if comments aren't heavily used
DROP INDEX IF EXISTS idx_comment_parent;
DROP INDEX IF EXISTS idx_comment_created;

-- Remove content_like index if likes aren't implemented
DROP INDEX IF EXISTS idx_content_like_comment;

-- Remove some tag-related indexes if tagging isn't active
DROP INDEX IF EXISTS idx_tag_slug;
DROP INDEX IF EXISTS idx_tag_official;  
DROP INDEX IF EXISTS idx_tag_usage;
DROP INDEX IF EXISTS idx_game_tag_tag;

-- =====================================================
-- 3. Keep Important Indexes (DO NOT REMOVE)
-- =====================================================

-- Keep these indexes even if currently unused - they're likely to be needed:

-- Cache-related indexes - Keep for future performance
-- - idx_igdb_cache_endpoint_params
-- - idx_igdb_cache_last_accessed  
-- - idx_games_cache_*
-- - idx_search_cache_*

-- Game-related indexes - Keep for search functionality
-- - idx_game_search_vector (for full-text search)
-- - idx_game_name_lower (for case-insensitive search)
-- - idx_game_genres (for genre filtering)
-- - idx_game_platforms (for platform filtering)

-- User and rating indexes - Keep for user features
-- - idx_user_provider_id (for auth lookups)
-- - idx_rating_game_id_rating (for rating analysis)
-- - idx_rating_rating (for rating queries)

-- Game progress indexes - Keep for user progress tracking
-- - idx_game_progress_* (for progress features)

-- Popular games index - Keep for homepage
-- - idx_popular_game_cached_rating_count

-- User top games index - Keep for user profiles  
-- - idx_user_top_games_position

-- Notification indexes - Keep for notification features
-- - idx_notification_user_read
-- - idx_notification_created
-- - idx_notification_type

-- =====================================================
-- 4. Index Monitoring Function
-- =====================================================

-- Enhanced function to monitor index usage and size
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE (
  table_name TEXT,
  index_name TEXT,
  index_size_mb NUMERIC,
  times_used BIGINT,
  last_used TIMESTAMP,
  is_foreign_key BOOLEAN,
  recommendation TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.schemaname||'.'||i.tablename as table_name,
    i.indexname as index_name,
    ROUND(pg_relation_size(i.schemaname||'.'||i.indexname) / 1024.0 / 1024.0, 2) as index_size_mb,
    COALESCE(s.idx_scan, 0) as times_used,
    s.stats_reset as last_used,
    EXISTS(
      SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND kcu.table_name = i.tablename
      AND i.indexname LIKE '%' || kcu.column_name || '%'
    ) as is_foreign_key,
    CASE 
      WHEN COALESCE(s.idx_scan, 0) = 0 AND NOT EXISTS(
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
        AND kcu.table_name = i.tablename
        AND i.indexname LIKE '%' || kcu.column_name || '%'
      ) THEN 'CONSIDER DROPPING'
      WHEN COALESCE(s.idx_scan, 0) = 0 AND pg_relation_size(i.schemaname||'.'||i.indexname) > 1024*1024 
      THEN 'UNUSED BUT LARGE'
      WHEN COALESCE(s.idx_scan, 0) > 1000 THEN 'HIGHLY USED'
      WHEN COALESCE(s.idx_scan, 0) > 100 THEN 'REGULARLY USED'
      WHEN COALESCE(s.idx_scan, 0) > 0 THEN 'LIGHTLY USED'
      ELSE 'UNUSED'
    END as recommendation
  FROM pg_indexes i
  LEFT JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname AND i.schemaname = s.schemaname
  WHERE i.schemaname = 'public'
    AND i.indexname NOT LIKE '%_pkey'
    AND i.indexname NOT LIKE 'pg_%'
  ORDER BY 
    COALESCE(s.idx_scan, 0) ASC, 
    pg_relation_size(i.schemaname||'.'||i.indexname) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION analyze_index_usage() TO service_role, authenticated;

-- =====================================================
-- 5. Foreign Key Coverage Check
-- =====================================================

-- Function to check foreign key index coverage
CREATE OR REPLACE FUNCTION check_foreign_key_indexes()
RETURNS TABLE (
  table_name TEXT,
  constraint_name TEXT,
  column_names TEXT,
  has_covering_index BOOLEAN,
  suggested_index TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kcu.table_name::TEXT,
    kcu.constraint_name::TEXT,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position)::TEXT as column_names,
    EXISTS(
      SELECT 1 FROM pg_indexes i 
      WHERE i.tablename = kcu.table_name 
      AND i.schemaname = 'public'
      AND i.indexdef LIKE '%' || string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || '%'
    ) as has_covering_index,
    ('CREATE INDEX idx_' || kcu.table_name || '_' || 
     string_agg(kcu.column_name, '_' ORDER BY kcu.ordinal_position) ||
     ' ON ' || kcu.table_name || ' (' || 
     string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) || ');')::TEXT as suggested_index
  FROM information_schema.key_column_usage kcu
  JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.table_schema = 'public'
  GROUP BY kcu.table_name, kcu.constraint_name
  ORDER BY kcu.table_name, kcu.constraint_name;
END;
$$;

GRANT EXECUTE ON FUNCTION check_foreign_key_indexes() TO service_role, authenticated;

-- =====================================================
-- 6. Summary and Verification
-- =====================================================

DO $$
DECLARE
  total_indexes INTEGER;
  unused_indexes INTEGER;
  index_size_mb NUMERIC;
BEGIN
  -- Count total custom indexes
  SELECT COUNT(*) INTO total_indexes
  FROM pg_indexes 
  WHERE schemaname = 'public' 
    AND indexname NOT LIKE '%_pkey'
    AND indexname NOT LIKE 'pg_%';
  
  -- Count unused indexes
  SELECT COUNT(*) INTO unused_indexes
  FROM pg_indexes i
  LEFT JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname AND i.schemaname = s.schemaname
  WHERE i.schemaname = 'public'
    AND i.indexname NOT LIKE '%_pkey'
    AND COALESCE(s.idx_scan, 0) = 0;
    
  -- Calculate total index size
  SELECT ROUND(SUM(pg_relation_size(schemaname||'.'||indexname)) / 1024.0 / 1024.0, 2) INTO index_size_mb
  FROM pg_indexes 
  WHERE schemaname = 'public' AND indexname NOT LIKE '%_pkey';
  
  RAISE NOTICE 'Index Optimization Summary:';
  RAISE NOTICE '  Total custom indexes: %', total_indexes;
  RAISE NOTICE '  Unused indexes: %', unused_indexes;
  RAISE NOTICE '  Total index size: % MB', index_size_mb;
  RAISE NOTICE '';
  RAISE NOTICE 'Run these queries for detailed analysis:';
  RAISE NOTICE '  SELECT * FROM check_foreign_key_indexes() WHERE has_covering_index = false;';
  RAISE NOTICE '  SELECT * FROM analyze_index_usage() WHERE recommendation = ''CONSIDER DROPPING'';';
END $$;

-- =====================================================
-- Comments and Documentation
-- =====================================================

COMMENT ON FUNCTION analyze_index_usage IS 'Comprehensive index usage analysis with recommendations for optimization';
COMMENT ON FUNCTION check_foreign_key_indexes IS 'Identifies foreign keys without covering indexes that may need indexing for performance';

-- =====================================================
-- Verification Queries (run after migration)
-- =====================================================

-- Check foreign key coverage:
-- SELECT * FROM check_foreign_key_indexes() WHERE has_covering_index = false;
--
-- Analyze index usage:  
-- SELECT * FROM analyze_index_usage() WHERE times_used = 0 ORDER BY index_size_mb DESC;
--
-- Find large unused indexes:
-- SELECT * FROM analyze_index_usage() WHERE recommendation = 'CONSIDER DROPPING';
--
-- Check index sizes:
-- SELECT table_name, SUM(index_size_mb) as total_mb
-- FROM analyze_index_usage() 
-- GROUP BY table_name 
-- ORDER BY total_mb DESC;