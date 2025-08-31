-- Cleanup Report
-- Run this after 01_cleanup_game_state_conflicts.sql to verify success

-- Check for any remaining conflicts
SELECT 'CONFLICT CHECK RESULTS' as report_section;

-- 1. Collection-Wishlist conflicts (should be 0)
SELECT 
  'Collection-Wishlist Conflicts' as check_type,
  COUNT(*) as remaining_conflicts,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Conflicts still exist'
  END as status
FROM user_collection c
INNER JOIN user_wishlist w ON c.user_id = w.user_id AND c.igdb_id = w.igdb_id;

-- 2. Collection-Progress conflicts (should be 0)
SELECT 
  'Collection-Progress Conflicts' as check_type,
  COUNT(*) as remaining_conflicts,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Conflicts still exist'
  END as status
FROM user_collection c
INNER JOIN game_progress gp ON c.user_id = gp.user_id
INNER JOIN game g ON c.game_id = g.id AND g.id = gp.game_id
WHERE gp.started = true OR gp.completed = true;

-- 3. Wishlist-Progress conflicts (should be 0)
SELECT 
  'Wishlist-Progress Conflicts' as check_type,
  COUNT(*) as remaining_conflicts,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS'
    ELSE '❌ FAIL - Conflicts still exist'
  END as status
FROM user_wishlist w
INNER JOIN game_progress gp ON w.user_id = gp.user_id
INNER JOIN game g ON w.game_id = g.id AND g.id = gp.game_id
WHERE gp.started = true OR gp.completed = true;

-- Resolution summary from log
SELECT 'RESOLUTION SUMMARY' as report_section;

SELECT 
  conflict_type,
  resolved_state,
  COUNT(*) as conflicts_resolved,
  COUNT(DISTINCT user_id) as users_affected
FROM backup_game_states.conflict_resolution_log
GROUP BY conflict_type, resolved_state
ORDER BY conflict_type, resolved_state;

-- Current state statistics
SELECT 'CURRENT STATE STATISTICS' as report_section;

SELECT 
  'user_collection' as table_name,
  COUNT(*) as total_entries,
  COUNT(DISTINCT user_id) as unique_users
FROM user_collection
UNION ALL
SELECT 
  'user_wishlist' as table_name,
  COUNT(*) as total_entries,
  COUNT(DISTINCT user_id) as unique_users
FROM user_wishlist
UNION ALL
SELECT 
  'game_progress (active)' as table_name,
  COUNT(*) as total_entries,
  COUNT(DISTINCT user_id) as unique_users
FROM game_progress
WHERE started = true OR completed = true;

-- Before/After comparison
SELECT 'BEFORE/AFTER COMPARISON' as report_section;

SELECT 
  'user_collection' as table_name,
  (SELECT COUNT(*) FROM backup_game_states.user_collection_backup) as before_count,
  (SELECT COUNT(*) FROM user_collection) as after_count,
  (SELECT COUNT(*) FROM backup_game_states.user_collection_backup) - (SELECT COUNT(*) FROM user_collection) as removed_count
UNION ALL
SELECT 
  'user_wishlist' as table_name,
  (SELECT COUNT(*) FROM backup_game_states.user_wishlist_backup) as before_count,
  (SELECT COUNT(*) FROM user_wishlist) as after_count,
  (SELECT COUNT(*) FROM backup_game_states.user_wishlist_backup) - (SELECT COUNT(*) FROM user_wishlist) as removed_count;

-- Sample of resolved conflicts for review
SELECT 'SAMPLE RESOLVED CONFLICTS (First 10)' as report_section;

SELECT 
  u.username,
  g.name as game_name,
  l.conflict_type,
  l.original_state,
  l.resolved_state,
  l.resolution_reason
FROM backup_game_states.conflict_resolution_log l
LEFT JOIN "user" u ON l.user_id = u.id
LEFT JOIN game g ON l.igdb_id = g.igdb_id
ORDER BY l.resolved_at DESC
LIMIT 10;