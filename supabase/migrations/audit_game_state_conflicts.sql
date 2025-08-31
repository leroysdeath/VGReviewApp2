-- Audit Game State Conflicts
-- This file identifies all existing conflicts in game states
-- Run this BEFORE applying any migrations to understand the current state

-- 1. Find games that exist in BOTH collection AND wishlist
WITH collection_wishlist_conflicts AS (
  SELECT 
    c.user_id,
    c.igdb_id,
    u.username,
    u.email,
    g.name as game_name,
    c.added_at as collection_added,
    w.added_at as wishlist_added,
    CASE 
      WHEN c.added_at > w.added_at THEN 'collection'
      ELSE 'wishlist'
    END as most_recent
  FROM user_collection c
  INNER JOIN user_wishlist w ON c.user_id = w.user_id AND c.igdb_id = w.igdb_id
  LEFT JOIN "user" u ON c.user_id = u.id
  LEFT JOIN game g ON c.game_id = g.id
)
SELECT 
  'Collection-Wishlist Conflict' as conflict_type,
  COUNT(*) as conflict_count,
  STRING_AGG(DISTINCT username, ', ' ORDER BY username) as affected_users
FROM collection_wishlist_conflicts
UNION ALL

-- 2. Find games in collection that are also started/completed
SELECT 
  'Collection-Progress Conflict' as conflict_type,
  COUNT(*) as conflict_count,
  STRING_AGG(DISTINCT u.username, ', ' ORDER BY u.username) as affected_users
FROM user_collection c
INNER JOIN game_progress gp ON c.user_id = gp.user_id 
INNER JOIN game g ON c.game_id = g.id AND g.id = gp.game_id
LEFT JOIN "user" u ON c.user_id = u.id
WHERE gp.started = true OR gp.completed = true
UNION ALL

-- 3. Find games in wishlist that are also started/completed
SELECT 
  'Wishlist-Progress Conflict' as conflict_type,
  COUNT(*) as conflict_count,
  STRING_AGG(DISTINCT u.username, ', ' ORDER BY u.username) as affected_users
FROM user_wishlist w
INNER JOIN game_progress gp ON w.user_id = gp.user_id
INNER JOIN game g ON w.game_id = g.id AND g.id = gp.game_id
LEFT JOIN "user" u ON w.user_id = u.id
WHERE gp.started = true OR gp.completed = true;

-- Detailed conflict report
COMMENT ON SCHEMA public IS 'Conflict Analysis Results:';

-- Get detailed list of Collection-Wishlist conflicts
SELECT 
  '=== COLLECTION-WISHLIST CONFLICTS ===' as section;
SELECT 
  c.user_id,
  c.igdb_id,
  g.name as game_name,
  c.added_at as in_collection_since,
  w.added_at as in_wishlist_since
FROM user_collection c
INNER JOIN user_wishlist w ON c.user_id = w.user_id AND c.igdb_id = w.igdb_id
LEFT JOIN game g ON c.game_id = g.id
ORDER BY c.user_id, g.name;

-- Get detailed list of Collection-Progress conflicts
SELECT 
  '=== COLLECTION-PROGRESS CONFLICTS ===' as section;
SELECT 
  c.user_id,
  c.igdb_id,
  g.name as game_name,
  c.added_at as in_collection_since,
  gp.started,
  gp.started_date,
  gp.completed,
  gp.completed_date
FROM user_collection c
INNER JOIN game_progress gp ON c.user_id = gp.user_id
INNER JOIN game g ON c.game_id = g.id AND g.id = gp.game_id
WHERE gp.started = true OR gp.completed = true
ORDER BY c.user_id, g.name;

-- Get detailed list of Wishlist-Progress conflicts
SELECT 
  '=== WISHLIST-PROGRESS CONFLICTS ===' as section;
SELECT 
  w.user_id,
  w.igdb_id,
  g.name as game_name,
  w.added_at as in_wishlist_since,
  gp.started,
  gp.started_date,
  gp.completed,
  gp.completed_date
FROM user_wishlist w
INNER JOIN game_progress gp ON w.user_id = gp.user_id
INNER JOIN game g ON w.game_id = g.id AND g.id = gp.game_id
WHERE gp.started = true OR gp.completed = true
ORDER BY w.user_id, g.name;

-- Summary statistics
SELECT 
  '=== SUMMARY STATISTICS ===' as section;
SELECT 
  (SELECT COUNT(*) FROM user_collection) as total_collection_entries,
  (SELECT COUNT(*) FROM user_wishlist) as total_wishlist_entries,
  (SELECT COUNT(*) FROM game_progress WHERE started = true OR completed = true) as total_progress_entries,
  (SELECT COUNT(DISTINCT user_id) FROM user_collection) as users_with_collections,
  (SELECT COUNT(DISTINCT user_id) FROM user_wishlist) as users_with_wishlists,
  (SELECT COUNT(DISTINCT user_id) FROM game_progress WHERE started = true OR completed = true) as users_with_progress;