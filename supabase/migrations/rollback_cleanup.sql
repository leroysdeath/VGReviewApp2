-- Rollback Cleanup
-- Restores data from backups created before the cleanup migration
-- Run this ONLY if you need to restore the original conflicting data

BEGIN;

-- Check if backup tables exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'backup_game_states' 
    AND table_name = 'user_collection_backup'
  ) THEN
    RAISE EXCEPTION 'Backup tables do not exist. Cannot rollback.';
  END IF;
END $$;

-- Clear current tables
TRUNCATE TABLE user_collection CASCADE;
TRUNCATE TABLE user_wishlist CASCADE;
-- Note: We don't truncate game_progress as it may have new legitimate data

-- Restore user_collection from backup
INSERT INTO user_collection (id, user_id, game_id, igdb_id, added_at)
SELECT id, user_id, game_id, igdb_id, added_at
FROM backup_game_states.user_collection_backup;

-- Restore user_wishlist from backup
INSERT INTO user_wishlist (id, user_id, game_id, igdb_id, added_at, priority, notes)
SELECT id, user_id, game_id, igdb_id, added_at, priority, notes
FROM backup_game_states.user_wishlist_backup;

-- Reset sequences to max ID
SELECT setval('user_collection_id_seq', COALESCE((SELECT MAX(id) FROM user_collection), 1));
SELECT setval('user_wishlist_id_seq', COALESCE((SELECT MAX(id) FROM user_wishlist), 1));

-- Verify restoration
SELECT 
  'user_collection' as table_name,
  (SELECT COUNT(*) FROM backup_game_states.user_collection_backup) as backup_count,
  (SELECT COUNT(*) FROM user_collection) as restored_count
UNION ALL
SELECT 
  'user_wishlist' as table_name,
  (SELECT COUNT(*) FROM backup_game_states.user_wishlist_backup) as backup_count,
  (SELECT COUNT(*) FROM user_wishlist) as restored_count;

-- Check if restoration was successful
DO $$
DECLARE
  collection_backup_count INTEGER;
  collection_restored_count INTEGER;
  wishlist_backup_count INTEGER;
  wishlist_restored_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO collection_backup_count FROM backup_game_states.user_collection_backup;
  SELECT COUNT(*) INTO collection_restored_count FROM user_collection;
  SELECT COUNT(*) INTO wishlist_backup_count FROM backup_game_states.user_wishlist_backup;
  SELECT COUNT(*) INTO wishlist_restored_count FROM user_wishlist;
  
  IF collection_backup_count != collection_restored_count THEN
    RAISE EXCEPTION 'Collection restoration failed. Backup: %, Restored: %', 
      collection_backup_count, collection_restored_count;
  END IF;
  
  IF wishlist_backup_count != wishlist_restored_count THEN
    RAISE EXCEPTION 'Wishlist restoration failed. Backup: %, Restored: %', 
      wishlist_backup_count, wishlist_restored_count;
  END IF;
  
  RAISE NOTICE 'Data successfully restored from backups';
  RAISE NOTICE 'Collection entries restored: %', collection_restored_count;
  RAISE NOTICE 'Wishlist entries restored: %', wishlist_restored_count;
  RAISE NOTICE 'WARNING: Conflicting states have been restored!';
END $$;

COMMIT;