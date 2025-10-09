-- Migration: Fix Identified Performance Issues
-- Date: 2025-10-01
-- Purpose: Address specific slow queries identified in pg_stat_statements analysis

-- ============================================================================
-- ISSUE 1: LATERAL joins on rating table (347s, 129s, 99s, 62s total time)
-- Root cause: Missing composite indexes for foreign key lookups in LATERAL joins
-- ============================================================================

-- Index for rating lookups - basic indexes without INCLUDE to avoid row size issues
CREATE INDEX IF NOT EXISTS idx_rating_id_lookup
ON rating (id);

-- Index for rating.user_id lookups in LATERAL joins
CREATE INDEX IF NOT EXISTS idx_rating_user_id_optimized
ON rating (user_id, id);

-- Index for rating.game_id lookups in LATERAL joins
CREATE INDEX IF NOT EXISTS idx_rating_game_id_optimized
ON rating (game_id, id);

-- Optimize user table lookups in LATERAL joins
CREATE INDEX IF NOT EXISTS idx_user_id_for_rating_joins
ON "user" (id);

-- Optimize game table lookups in LATERAL joins
CREATE INDEX IF NOT EXISTS idx_game_id_for_rating_joins
ON game (id);

-- ============================================================================
-- ISSUE 2: ILIKE searches on game.summary (129s, 79s, 50s with poor cache)
-- Root cause: No text search index, scanning millions of rows with pattern matching
-- ============================================================================

-- Create GIN index for summary text search using pg_trgm for ILIKE optimization
CREATE INDEX IF NOT EXISTS idx_game_summary_trgm
ON game USING gin (summary gin_trgm_ops)
WHERE summary IS NOT NULL;

-- Create index for common WHERE clause pattern
-- Note: summary excluded from index key due to TEXT size - using trgm index instead
CREATE INDEX IF NOT EXISTS idx_game_redlight_flag_filter
ON game (redlight_flag)
WHERE (redlight_flag IS NULL OR redlight_flag = false);

-- ============================================================================
-- ISSUE 3: User lookups with ANY operator (208s with poor cache)
-- Root cause: ANY(array) queries causing inefficient index usage
-- ============================================================================

-- Optimize bulk user lookups by id - simple index without INCLUDE
CREATE INDEX IF NOT EXISTS idx_user_id_bulk_lookup
ON "user" (id);

-- ============================================================================
-- ISSUE 4: Search vector updates (126s for bulk updates)
-- Root cause: Full table scans on data_source and created_at filters
-- ============================================================================

-- Index for efficient filtering of recent IGDB games
CREATE INDEX IF NOT EXISTS idx_game_data_source_created_at
ON game (data_source, created_at DESC)
WHERE data_source = 'igdb';

-- Index for franchise-based searches and updates
CREATE INDEX IF NOT EXISTS idx_game_franchise_trgm
ON game USING gin (franchise gin_trgm_ops)
WHERE franchise IS NOT NULL;

-- ============================================================================
-- ISSUE 5: search_games_optimized function performance
-- Root cause: Complex multi-table joins with poor index support
-- ============================================================================

-- Index for search_vector with text search optimization
CREATE INDEX IF NOT EXISTS idx_game_search_vector_weighted
ON game USING gin (search_vector)
WHERE (redlight_flag IS NULL OR redlight_flag = false)
  AND is_official = true;

-- Composite index for common filtering patterns in search
CREATE INDEX IF NOT EXISTS idx_game_search_filters
ON game (is_official, redlight_flag, release_date DESC);

-- ============================================================================
-- ISSUE 6: Realtime list_changes queries (231s total, frequent calls)
-- Root cause: Inefficient replication tracking
-- ============================================================================

-- Analyze tables to update statistics for better query planning
ANALYZE rating;
ANALYZE "user";
ANALYZE game;

-- ============================================================================
-- ISSUE 7: game_backfill_recent view performance (45s per query)
-- Root cause: No index on view's ordering column
-- ============================================================================

-- Index for game backfill queries ordered by ID
CREATE INDEX IF NOT EXISTS idx_game_id_updated_at_backfill
ON game (id ASC, updated_at DESC)
WHERE data_source = 'igdb'
  AND updated_at IS NOT NULL;

-- ============================================================================
-- ISSUE 8: Optimize game_flags_admin queries (38s each)
-- Root cause: game_flags_admin is a VIEW, not a table - optimize underlying tables instead
-- ============================================================================

-- Note: game_flags_admin is a view, so we cannot create indexes on it directly
-- The view query performance depends on indexes on the underlying base tables

-- ============================================================================
-- Additional Optimizations: Maintenance and Statistics
-- ============================================================================

-- Update extended statistics for correlated columns
-- These help the query planner understand column relationships
CREATE STATISTICS IF NOT EXISTS game_search_stats (dependencies)
ON name, franchise, developer, publisher FROM game;

CREATE STATISTICS IF NOT EXISTS rating_join_stats (dependencies)
ON user_id, game_id FROM rating;

-- Increase statistics target for heavily queried columns
ALTER TABLE game ALTER COLUMN name SET STATISTICS 1000;
ALTER TABLE game ALTER COLUMN summary SET STATISTICS 500;
ALTER TABLE game ALTER COLUMN franchise SET STATISTICS 500;
ALTER TABLE rating ALTER COLUMN user_id SET STATISTICS 500;
ALTER TABLE rating ALTER COLUMN game_id SET STATISTICS 500;

-- ============================================================================
-- Performance Monitoring: Add index usage tracking
-- ============================================================================

-- Create view to monitor new index effectiveness
CREATE OR REPLACE VIEW performance_optimization_index_usage AS
SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexrelname LIKE 'idx_%_optimized'
   OR indexrelname LIKE 'idx_%_trgm'
   OR indexrelname LIKE 'idx_%_for_%_joins'
   OR indexrelname LIKE 'idx_%_bulk_lookup'
ORDER BY idx_scan DESC;

-- ============================================================================
-- Query Optimization Tips (for application layer)
-- ============================================================================

COMMENT ON INDEX idx_game_summary_trgm IS 'Use with ILIKE queries: WHERE summary ILIKE ''%pattern%''. Falls back to full scan for very short patterns (<3 chars).';
COMMENT ON INDEX idx_rating_id_lookup IS 'Index for single rating lookups. Used in LATERAL joins with user/game tables.';
COMMENT ON INDEX idx_user_id_bulk_lookup IS 'Optimized for ANY(array) queries: WHERE id = ANY($1). Use with prepared statements.';

-- ============================================================================
-- Analyze tables to update statistics
-- ============================================================================

-- Note: VACUUM cannot run inside a transaction block (migrations are transactional)
-- Run ANALYZE to update statistics (VACUUM must be run manually if needed)
ANALYZE rating;
ANALYZE "user";
ANALYZE game;

-- End of migration
--
-- MANUAL MAINTENANCE (run separately if needed):
-- VACUUM ANALYZE rating;
-- VACUUM ANALYZE "user";
-- ANALYZE game;
