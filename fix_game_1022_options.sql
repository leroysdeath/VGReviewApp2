-- SQL Scripts to fix game_id 1022 based on investigation results
-- Choose the appropriate script based on the investigation findings

-- OPTION 1: Update with placeholder data (if game has dependencies but no IGDB ID)
-- Use this if recommended_action = 'SET_PLACEHOLDER'
UPDATE game 
SET 
  name = COALESCE(name, 'Unknown Game'),
  summary = 'This game entry is being updated. Game information will be available soon.',
  publisher = 'Unknown Publisher',
  developer = 'Unknown Developer',
  updated_at = NOW()
WHERE id = 1022;

-- OPTION 2: Delete the game (if no dependencies and no IGDB ID)
-- Use this if recommended_action = 'SAFE_TO_DELETE'
-- WARNING: Only run this if there are NO ratings or progress entries!
-- DELETE FROM game WHERE id = 1022;

-- OPTION 3: Manual update with real data (if you have IGDB data)
-- Use this if you fetched data from IGDB API manually
-- Replace the values below with actual game data:
/*
UPDATE game 
SET 
  name = 'Actual Game Name',
  summary = 'Actual game summary/description...',
  publisher = 'Actual Publisher',
  developer = 'Actual Developer', 
  first_release_date = '2023-01-01',  -- Use actual release date
  cover_url = 'https://images.igdb.com/igdb/image/upload/t_cover_big/actual_cover_id.jpg',
  genres = ARRAY['Action', 'Adventure'],  -- Use actual genres
  platforms = ARRAY['PC', 'PlayStation 5'],  -- Use actual platforms
  igdb_rating = 75,  -- Use actual IGDB rating
  updated_at = NOW()
WHERE id = 1022;
*/

-- OPTION 4: Set minimal acceptable data
-- Use this as a fallback if other options don't work
UPDATE game 
SET 
  name = CASE WHEN name IS NULL OR name = '' THEN 'Game #1022' ELSE name END,
  summary = CASE WHEN summary IS NULL THEN 'Game information pending update.' ELSE summary END,
  publisher = CASE WHEN publisher IS NULL THEN 'TBD' ELSE publisher END,
  developer = CASE WHEN developer IS NULL THEN 'TBD' ELSE developer END,
  updated_at = NOW()
WHERE id = 1022;

-- FINAL STEP: Refresh materialized view (run after any update)
-- Note: This might fail if the function doesn't exist, in which case run:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY popular_game_cached;

-- Try the function first:
-- SELECT refresh_materialized_view_concurrently('popular_game_cached');

-- Fallback if function doesn't exist:
-- REFRESH MATERIALIZED VIEW popular_game_cached;

-- Verify the fix
SELECT 
  id,
  igdb_id,
  name,
  CASE WHEN summary IS NULL THEN 'NULL' ELSE LEFT(summary, 50) || '...' END as summary_preview,
  publisher,
  developer,
  updated_at
FROM game 
WHERE id = 1022;