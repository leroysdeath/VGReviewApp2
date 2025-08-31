-- Rollback Triggers
-- Removes all state exclusivity triggers and functions
-- Run this if you need to revert the exclusivity enforcement

BEGIN;

-- Drop all exclusivity triggers
DROP TRIGGER IF EXISTS enforce_state_exclusivity_on_progress ON game_progress;
DROP TRIGGER IF EXISTS enforce_state_exclusivity_on_collection ON user_collection;
DROP TRIGGER IF EXISTS enforce_state_exclusivity_on_wishlist ON user_wishlist;

-- Drop state history logging triggers if they exist
DROP TRIGGER IF EXISTS log_collection_transitions ON user_collection;
DROP TRIGGER IF EXISTS log_wishlist_transitions ON user_wishlist;
DROP TRIGGER IF EXISTS log_progress_transitions ON game_progress;

-- Drop the trigger functions
DROP FUNCTION IF EXISTS manage_game_state_exclusivity() CASCADE;
DROP FUNCTION IF EXISTS log_game_state_transition() CASCADE;

-- Drop the state history view if it exists
DROP VIEW IF EXISTS user_game_state_timeline CASCADE;

-- Drop the state history table if it exists
DROP TABLE IF EXISTS game_state_history CASCADE;

-- Remove constraints added for exclusivity (if they were added)
ALTER TABLE user_collection DROP CONSTRAINT IF EXISTS unique_user_collection_entry;
ALTER TABLE user_wishlist DROP CONSTRAINT IF EXISTS unique_user_wishlist_entry;
ALTER TABLE game_progress DROP CONSTRAINT IF EXISTS unique_user_game_progress;

-- Drop indexes created for exclusivity checks (optional - these don't hurt to keep)
-- Uncomment if you want to remove all related indexes
/*
DROP INDEX IF EXISTS idx_user_collection_user_id;
DROP INDEX IF EXISTS idx_user_collection_igdb_id;
DROP INDEX IF EXISTS idx_user_collection_user_igdb;
DROP INDEX IF EXISTS idx_user_collection_added_at;

DROP INDEX IF EXISTS idx_user_wishlist_user_id;
DROP INDEX IF EXISTS idx_user_wishlist_igdb_id;
DROP INDEX IF EXISTS idx_user_wishlist_user_igdb;
DROP INDEX IF EXISTS idx_user_wishlist_priority;
DROP INDEX IF EXISTS idx_user_wishlist_added_at;

DROP INDEX IF EXISTS idx_game_progress_igdb_id;
DROP INDEX IF EXISTS idx_game_progress_user_igdb;
DROP INDEX IF EXISTS idx_game_progress_user_id;
DROP INDEX IF EXISTS idx_game_progress_started;
DROP INDEX IF EXISTS idx_game_progress_completed;
DROP INDEX IF EXISTS idx_game_progress_dates;
DROP INDEX IF EXISTS idx_game_progress_user_status;
*/

-- Verify triggers have been removed
SELECT 
  'Triggers remaining:' as status,
  COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE 'enforce_state_exclusivity%'
    OR trigger_name LIKE 'log_%_transitions'
  );

-- Verify functions have been removed  
SELECT 
  'Functions remaining:' as status,
  COUNT(*) as count
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('manage_game_state_exclusivity', 'log_game_state_transition');

RAISE NOTICE 'All exclusivity triggers and functions have been removed';
RAISE NOTICE 'The system has been reverted to allow overlapping states';

COMMIT;