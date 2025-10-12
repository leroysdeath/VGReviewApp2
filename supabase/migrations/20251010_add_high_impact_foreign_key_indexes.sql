-- Migration: Add High-Impact Foreign Key Indexes (Phase 1)
-- Date: 2025-10-10
-- Purpose: Add covering indexes for frequently-queried foreign keys
--          to improve JOIN and DELETE performance on high-traffic tables
--
-- Performance Impact:
--   - comment.parent_comment_id: Threaded comment queries (nested replies)
--   - user_sessions.user_id: Session lookups on every authenticated request
--   - game_state_history.game_id: Game state audit queries and history lookups

-- ============================================================================
-- 1. Comment Parent ID Index
-- ============================================================================
-- Used for: Fetching comment threads, nested replies, comment tree traversal
-- Frequency: High (every time comments are displayed with replies)

CREATE INDEX IF NOT EXISTS idx_comment_parent_id
ON public.comment(parent_comment_id)
WHERE parent_comment_id IS NOT NULL;  -- Partial index: only index actual replies

COMMENT ON INDEX idx_comment_parent_id IS
  'Speeds up threaded comment queries and reply lookups. Partial index excludes top-level comments (NULL parent_id).';

-- ============================================================================
-- 2. User Sessions User ID Index
-- ============================================================================
-- Used for: Session validation, user session lookups, session cleanup
-- Frequency: Critical (every authenticated request)

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id
ON public.user_sessions(user_id);

COMMENT ON INDEX idx_user_sessions_user_id IS
  'Critical for session validation performance. Used on every authenticated request to validate user sessions.';

-- Add composite index for session queries that filter by user + expiration time
-- Note: Can't use WHERE expires_at > NOW() because NOW() is not immutable
-- Instead, just index user_id + expires_at together for efficient range queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_active
ON public.user_sessions(user_id, expires_at DESC);

COMMENT ON INDEX idx_user_sessions_user_active IS
  'Optimizes active session lookups. Query planner can use this for WHERE user_id = X AND expires_at > NOW() queries.';

-- ============================================================================
-- 3. Game State History Game ID Index
-- ============================================================================
-- Used for: Game state audit trails, viewing history of state changes
-- Frequency: Medium-High (user profile views, admin audits, conflict resolution)

CREATE INDEX IF NOT EXISTS idx_game_state_history_game_id
ON public.game_state_history(game_id);

COMMENT ON INDEX idx_game_state_history_game_id IS
  'Enables efficient game state history queries for audit trails and user profile views.';

-- Add composite index for common history query pattern: game + user + time
CREATE INDEX IF NOT EXISTS idx_game_state_history_game_user_time
ON public.game_state_history(game_id, user_id, created_at DESC);

COMMENT ON INDEX idx_game_state_history_game_user_time IS
  'Optimizes user-specific game history queries ordered by time (e.g., "show my history for this game").';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
  comment_idx_exists boolean;
  session_idx_exists boolean;
  history_idx_exists boolean;
BEGIN
  -- Check comment parent index
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'comment'
    AND indexname = 'idx_comment_parent_id'
  ) INTO comment_idx_exists;

  -- Check user_sessions index
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'user_sessions'
    AND indexname = 'idx_user_sessions_user_id'
  ) INTO session_idx_exists;

  -- Check game_state_history index
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'game_state_history'
    AND indexname = 'idx_game_state_history_game_id'
  ) INTO history_idx_exists;

  -- Report results
  IF comment_idx_exists THEN
    RAISE NOTICE '✅ comment.parent_comment_id index created';
  ELSE
    RAISE WARNING '❌ comment.parent_comment_id index missing';
  END IF;

  IF session_idx_exists THEN
    RAISE NOTICE '✅ user_sessions.user_id index created';
  ELSE
    RAISE WARNING '❌ user_sessions.user_id index missing';
  END IF;

  IF history_idx_exists THEN
    RAISE NOTICE '✅ game_state_history.game_id index created';
  ELSE
    RAISE WARNING '❌ game_state_history.game_id index missing';
  END IF;

  -- Check for composite indexes
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
    AND indexname IN ('idx_user_sessions_user_active', 'idx_game_state_history_game_user_time')
  ) THEN
    RAISE NOTICE '✅ Bonus composite indexes created for advanced query patterns';
  END IF;

END $$;

-- ============================================================================
-- Performance Analysis Query (for monitoring)
-- ============================================================================
-- Run this query after migration to verify index usage:
/*
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE indexname IN (
  'idx_comment_parent_id',
  'idx_user_sessions_user_id',
  'idx_user_sessions_user_active',
  'idx_game_state_history_game_id',
  'idx_game_state_history_game_user_time'
)
ORDER BY tablename, indexname;
*/

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '✅ Phase 1: High-Impact FK Indexes Added!';
  RAISE NOTICE '================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Indexes Created:';
  RAISE NOTICE '  1. idx_comment_parent_id (threaded comments)';
  RAISE NOTICE '  2. idx_user_sessions_user_id (session validation - critical path)';
  RAISE NOTICE '  3. idx_user_sessions_user_active (active session lookups)';
  RAISE NOTICE '  4. idx_game_state_history_game_id (audit trails)';
  RAISE NOTICE '  5. idx_game_state_history_game_user_time (user history queries)';
  RAISE NOTICE '';
  RAISE NOTICE 'Expected Performance Improvements:';
  RAISE NOTICE '  • Faster comment thread loading (nested replies)';
  RAISE NOTICE '  • Faster session validation on every request';
  RAISE NOTICE '  • Faster game state history queries';
  RAISE NOTICE '  • Improved DELETE CASCADE performance';
  RAISE NOTICE '';
  RAISE NOTICE 'Disk Space Usage:';
  RAISE NOTICE '  • Estimated total: ~5-20 MB (depends on data volume)';
  RAISE NOTICE '  • Worth it for query performance gains';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Monitor index usage with pg_stat_user_indexes';
  RAISE NOTICE '  2. Run Performance Advisor again to verify warnings cleared';
  RAISE NOTICE '  3. Consider Phase 2 cleanup in 30 days';
  RAISE NOTICE '';
END $$;
