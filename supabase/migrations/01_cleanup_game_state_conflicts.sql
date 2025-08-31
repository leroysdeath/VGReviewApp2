-- Cleanup Game State Conflicts Migration
-- This migration resolves all existing conflicts based on priority:
-- Priority: started/completed > collection > wishlist
-- Most recent action wins for collection vs wishlist conflicts

BEGIN;

-- Log all conflicts before resolution
INSERT INTO backup_game_states.conflict_resolution_log (user_id, igdb_id, conflict_type, original_state, resolved_state, resolution_reason)
SELECT 
  c.user_id,
  c.igdb_id,
  'collection_wishlist',
  'both',
  CASE 
    WHEN c.added_at > w.added_at THEN 'collection'
    ELSE 'wishlist'
  END,
  CASE 
    WHEN c.added_at > w.added_at THEN 'User added to collection more recently'
    ELSE 'User added to wishlist more recently'
  END
FROM user_collection c
INNER JOIN user_wishlist w ON c.user_id = w.user_id AND c.igdb_id = w.igdb_id;

-- Log collection-progress conflicts
INSERT INTO backup_game_states.conflict_resolution_log (user_id, igdb_id, conflict_type, original_state, resolved_state, resolution_reason)
SELECT DISTINCT
  c.user_id,
  c.igdb_id,
  'collection_progress',
  'collection_and_progress',
  'progress',
  'Game already started/completed takes priority'
FROM user_collection c
INNER JOIN game_progress gp ON c.user_id = gp.user_id
INNER JOIN game g ON c.game_id = g.id AND g.id = gp.game_id
WHERE gp.started = true OR gp.completed = true;

-- Log wishlist-progress conflicts
INSERT INTO backup_game_states.conflict_resolution_log (user_id, igdb_id, conflict_type, original_state, resolved_state, resolution_reason)
SELECT DISTINCT
  w.user_id,
  w.igdb_id,
  'wishlist_progress',
  'wishlist_and_progress',
  'progress',
  'Game already started/completed takes priority'
FROM user_wishlist w
INNER JOIN game_progress gp ON w.user_id = gp.user_id
INNER JOIN game g ON w.game_id = g.id AND g.id = gp.game_id
WHERE gp.started = true OR gp.completed = true;

-- RESOLUTION STEP 1: Handle collection vs wishlist conflicts
-- Keep the most recently added state
WITH conflicts AS (
  SELECT 
    c.user_id,
    c.igdb_id,
    c.added_at as collection_added,
    w.added_at as wishlist_added
  FROM user_collection c
  INNER JOIN user_wishlist w ON c.user_id = w.user_id AND c.igdb_id = w.igdb_id
)
DELETE FROM user_wishlist w
USING conflicts c
WHERE w.user_id = c.user_id 
  AND w.igdb_id = c.igdb_id
  AND c.collection_added > c.wishlist_added;

WITH conflicts AS (
  SELECT 
    c.user_id,
    c.igdb_id,
    c.added_at as collection_added,
    w.added_at as wishlist_added
  FROM user_collection c
  INNER JOIN user_wishlist w ON c.user_id = w.user_id AND c.igdb_id = w.igdb_id
)
DELETE FROM user_collection c
USING conflicts conf
WHERE c.user_id = conf.user_id 
  AND c.igdb_id = conf.igdb_id
  AND conf.wishlist_added >= conf.collection_added;

-- RESOLUTION STEP 2: Remove from collection if game is started/completed
DELETE FROM user_collection c
USING game_progress gp, game g
WHERE c.user_id = gp.user_id
  AND c.game_id = g.id
  AND g.id = gp.game_id
  AND (gp.started = true OR gp.completed = true);

-- RESOLUTION STEP 3: Remove from wishlist if game is started/completed  
DELETE FROM user_wishlist w
USING game_progress gp, game g
WHERE w.user_id = gp.user_id
  AND w.game_id = g.id
  AND g.id = gp.game_id
  AND (gp.started = true OR gp.completed = true);

-- Verify no conflicts remain
DO $$
DECLARE
  collection_wishlist_conflicts INTEGER;
  collection_progress_conflicts INTEGER;
  wishlist_progress_conflicts INTEGER;
BEGIN
  -- Check collection-wishlist conflicts
  SELECT COUNT(*) INTO collection_wishlist_conflicts
  FROM user_collection c
  INNER JOIN user_wishlist w ON c.user_id = w.user_id AND c.igdb_id = w.igdb_id;
  
  -- Check collection-progress conflicts
  SELECT COUNT(*) INTO collection_progress_conflicts
  FROM user_collection c
  INNER JOIN game_progress gp ON c.user_id = gp.user_id
  INNER JOIN game g ON c.game_id = g.id AND g.id = gp.game_id
  WHERE gp.started = true OR gp.completed = true;
  
  -- Check wishlist-progress conflicts
  SELECT COUNT(*) INTO wishlist_progress_conflicts
  FROM user_wishlist w
  INNER JOIN game_progress gp ON w.user_id = gp.user_id
  INNER JOIN game g ON w.game_id = g.id AND g.id = gp.game_id
  WHERE gp.started = true OR gp.completed = true;
  
  IF collection_wishlist_conflicts > 0 THEN
    RAISE EXCEPTION 'Collection-Wishlist conflicts still exist: %', collection_wishlist_conflicts;
  END IF;
  
  IF collection_progress_conflicts > 0 THEN
    RAISE EXCEPTION 'Collection-Progress conflicts still exist: %', collection_progress_conflicts;
  END IF;
  
  IF wishlist_progress_conflicts > 0 THEN
    RAISE EXCEPTION 'Wishlist-Progress conflicts still exist: %', wishlist_progress_conflicts;
  END IF;
  
  RAISE NOTICE 'All conflicts successfully resolved';
END $$;

-- Report resolution summary
SELECT 
  conflict_type,
  resolved_state,
  COUNT(*) as conflicts_resolved,
  COUNT(DISTINCT user_id) as users_affected
FROM backup_game_states.conflict_resolution_log
GROUP BY conflict_type, resolved_state
ORDER BY conflict_type, resolved_state;

COMMIT;