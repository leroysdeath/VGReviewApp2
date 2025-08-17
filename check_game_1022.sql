-- SQL script to investigate game_id 1022
-- Run this in your Supabase SQL editor or database client

-- 1. Check the game record
SELECT 
  id,
  igdb_id,
  name,
  CASE WHEN summary IS NULL THEN 'NULL' ELSE 'HAS_SUMMARY' END as summary_status,
  COALESCE(publisher, 'NULL') as publisher,
  COALESCE(developer, 'NULL') as developer,
  COALESCE(first_release_date::text, 'NULL') as release_date,
  CASE WHEN cover_url IS NULL THEN 'NULL' ELSE 'HAS_COVER' END as cover_status,
  created_at,
  updated_at
FROM game 
WHERE id = 1022;

-- 2. Check for ratings/reviews dependencies
SELECT COUNT(*) as rating_count
FROM rating 
WHERE game_id = 1022;

-- 3. Check for game progress dependencies  
SELECT COUNT(*) as progress_count
FROM game_progress 
WHERE game_id = 1022;

-- 4. Get sample ratings if any exist
SELECT 
  id,
  user_id,
  rating,
  CASE WHEN review IS NULL THEN 'NULL' ELSE 'HAS_REVIEW' END as review_status,
  post_date_time
FROM rating 
WHERE game_id = 1022 
LIMIT 5;

-- 5. Get sample progress entries if any exist
SELECT 
  id,
  user_id,
  started,
  completed,
  started_date,
  completed_date
FROM game_progress 
WHERE game_id = 1022 
LIMIT 5;

-- 6. Summary query to help decide action
SELECT 
  g.id,
  g.igdb_id,
  g.name,
  CASE 
    WHEN g.summary IS NOT NULL OR g.publisher IS NOT NULL OR g.developer IS NOT NULL 
    THEN 'HAS_DATA' 
    ELSE 'MISSING_DATA' 
  END as data_status,
  COALESCE(r.rating_count, 0) as ratings,
  COALESCE(p.progress_count, 0) as progress_entries,
  CASE 
    WHEN g.igdb_id IS NOT NULL AND (g.summary IS NULL AND g.publisher IS NULL AND g.developer IS NULL)
    THEN 'FETCH_FROM_IGDB'
    WHEN g.igdb_id IS NULL AND COALESCE(r.rating_count, 0) = 0 AND COALESCE(p.progress_count, 0) = 0
    THEN 'SAFE_TO_DELETE'
    WHEN g.igdb_id IS NULL AND (COALESCE(r.rating_count, 0) > 0 OR COALESCE(p.progress_count, 0) > 0)
    THEN 'SET_PLACEHOLDER'
    ELSE 'NO_ACTION_NEEDED'
  END as recommended_action
FROM game g
LEFT JOIN (
  SELECT game_id, COUNT(*) as rating_count 
  FROM rating 
  WHERE game_id = 1022 
  GROUP BY game_id
) r ON g.id = r.game_id
LEFT JOIN (
  SELECT game_id, COUNT(*) as progress_count 
  FROM game_progress 
  WHERE game_id = 1022 
  GROUP BY game_id
) p ON g.id = p.game_id
WHERE g.id = 1022;