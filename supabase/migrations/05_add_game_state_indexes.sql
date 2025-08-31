-- Add Game State Indexes for Performance
-- Optimizes queries for state exclusivity checks and lookups

BEGIN;

-- Indexes for user_collection table
CREATE INDEX IF NOT EXISTS idx_user_collection_user_id 
ON user_collection(user_id);

CREATE INDEX IF NOT EXISTS idx_user_collection_igdb_id 
ON user_collection(igdb_id);

CREATE INDEX IF NOT EXISTS idx_user_collection_user_igdb 
ON user_collection(user_id, igdb_id);

CREATE INDEX IF NOT EXISTS idx_user_collection_added_at 
ON user_collection(added_at DESC);

-- Add unique constraint to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_user_collection_entry'
  ) THEN
    ALTER TABLE user_collection
    ADD CONSTRAINT unique_user_collection_entry 
    UNIQUE (user_id, igdb_id);
  END IF;
END $$;

-- Indexes for user_wishlist table
CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_id 
ON user_wishlist(user_id);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_igdb_id 
ON user_wishlist(igdb_id);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_igdb 
ON user_wishlist(user_id, igdb_id);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_priority 
ON user_wishlist(priority DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_user_wishlist_added_at 
ON user_wishlist(added_at DESC);

-- Add unique constraint to prevent duplicates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_user_wishlist_entry'
  ) THEN
    ALTER TABLE user_wishlist
    ADD CONSTRAINT unique_user_wishlist_entry 
    UNIQUE (user_id, igdb_id);
  END IF;
END $$;

-- Additional indexes for game_progress table (if not already created)
CREATE INDEX IF NOT EXISTS idx_game_progress_user_id 
ON game_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_game_progress_started 
ON game_progress(started) 
WHERE started = true;

CREATE INDEX IF NOT EXISTS idx_game_progress_completed 
ON game_progress(completed) 
WHERE completed = true;

CREATE INDEX IF NOT EXISTS idx_game_progress_dates 
ON game_progress(started_date DESC NULLS LAST, completed_date DESC NULLS LAST);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_game_progress_user_status 
ON game_progress(user_id, started, completed);

-- Analyze tables to update statistics for query planner
ANALYZE user_collection;
ANALYZE user_wishlist;
ANALYZE game_progress;

-- Verify all indexes were created
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('user_collection', 'user_wishlist', 'game_progress')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check table sizes and index usage readiness
SELECT 
  relname as table_name,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes,
  n_live_tup as live_tuples,
  n_dead_tup as dead_tuples,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('user_collection', 'user_wishlist', 'game_progress');

COMMIT;