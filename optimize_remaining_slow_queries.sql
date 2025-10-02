-- Optimize Remaining Slow Queries
-- Based on pg_stat_statements analysis

-- ============================================================================
-- Issue 1: LATERAL JOIN on rating with user/game (577s total across queries)
-- The indexes we created should help, but let's verify they exist and add composite ones
-- ============================================================================

-- Composite index for rating lookups with both FKs (helps LATERAL joins)
CREATE INDEX IF NOT EXISTS idx_rating_user_game_id
ON rating (user_id, game_id, id);

-- Index to speed up single rating ID lookups
CREATE INDEX IF NOT EXISTS idx_rating_id_lookup
ON rating (id)
WHERE id IS NOT NULL;

-- ============================================================================
-- Issue 2: ILIKE searches on game.summary (258s total, terrible cache hit rates)
-- We created idx_game_summary_trgm, but need to ensure pg_trgm extension exists
-- ============================================================================

-- Ensure pg_trgm extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify the trigram index exists (we created this already)
-- This enables fast ILIKE '%pattern%' searches
CREATE INDEX IF NOT EXISTS idx_game_summary_trgm
ON game USING gin (summary gin_trgm_ops)
WHERE summary IS NOT NULL;

-- Add index for the common redlight_flag + summary pattern
CREATE INDEX IF NOT EXISTS idx_game_redlight_summary
ON game (redlight_flag)
WHERE (redlight_flag IS NULL OR redlight_flag = false);

-- ============================================================================
-- Issue 3: User bulk lookups with ANY operator (208s with poor cache)
-- The query: WHERE user.id = ANY($1)
-- ============================================================================

-- Index for bulk user lookups by ID array
CREATE INDEX IF NOT EXISTS idx_user_id_lookup
ON "user" (id);

-- ============================================================================
-- Issue 4: search_games_optimized function performance (96s, 46% cache hit)
-- Need to optimize the underlying function queries
-- ============================================================================

-- Index for franchise searches (used in search_games_optimized)
CREATE INDEX IF NOT EXISTS idx_game_franchise_lower
ON game (LOWER(franchise))
WHERE franchise IS NOT NULL;

-- Index for name searches
CREATE INDEX IF NOT EXISTS idx_game_name_lower_trgm
ON game USING gin (LOWER(name) gin_trgm_ops);

-- Composite index for common search filters
CREATE INDEX IF NOT EXISTS idx_game_search_common
ON game (is_official, redlight_flag)
WHERE (redlight_flag IS NULL OR redlight_flag = false)
  AND is_official = true;

-- ============================================================================
-- Issue 5: Realtime list_changes (231s total, very frequent calls)
-- This is Supabase realtime, we can't optimize directly but can help underlying tables
-- ============================================================================

-- Ensure replication identity is set correctly for realtime
-- (This might already be set, but ensuring it's optimal)
ALTER TABLE game REPLICA IDENTITY DEFAULT;
ALTER TABLE rating REPLICA IDENTITY DEFAULT;
ALTER TABLE "user" REPLICA IDENTITY DEFAULT;

-- ============================================================================
-- Issue 6: game_backfill_recent view queries (45s per query)
-- ============================================================================

-- Index to speed up the view's ORDER BY
CREATE INDEX IF NOT EXISTS idx_game_id_asc
ON game (id ASC)
WHERE data_source = 'igdb';

-- ============================================================================
-- Optimize query planner statistics for heavily used tables
-- ============================================================================

-- Increase statistics sampling for better query plans
ALTER TABLE game ALTER COLUMN summary SET STATISTICS 1000;
ALTER TABLE game ALTER COLUMN name SET STATISTICS 1000;
ALTER TABLE game ALTER COLUMN search_vector SET STATISTICS 500;
ALTER TABLE rating ALTER COLUMN user_id SET STATISTICS 500;
ALTER TABLE rating ALTER COLUMN game_id SET STATISTICS 500;
ALTER TABLE "user" ALTER COLUMN id SET STATISTICS 500;

-- Create extended statistics for correlated columns
CREATE STATISTICS IF NOT EXISTS stats_game_search
ON name, summary, franchise, search_vector FROM game;

CREATE STATISTICS IF NOT EXISTS stats_rating_joins
ON user_id, game_id FROM rating;

-- ============================================================================
-- Refresh statistics
-- ============================================================================

ANALYZE game;
ANALYZE rating;
ANALYZE "user";

-- ============================================================================
-- Create monitoring view for index usage
-- ============================================================================

CREATE OR REPLACE VIEW slow_query_index_usage AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as size,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW'
    WHEN idx_scan < 1000 THEN 'MEDIUM'
    ELSE 'HIGH'
  END as usage_level
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND relname IN ('game', 'rating', 'user')
ORDER BY idx_scan DESC;

-- Check current index usage
SELECT * FROM slow_query_index_usage;
