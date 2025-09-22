-- Fix Street Fighter 6 and Apex Legends IGDB ID conflict

-- Step 1: Update Apex Legends with its correct IGDB ID
-- Apex Legends real IGDB ID is 126459
UPDATE game
SET igdb_id = 126459
WHERE id = 104000 AND name = 'Apex Legends';

-- Step 2: Insert Street Fighter 6 with correct data
-- Street Fighter 6 IGDB ID is 134988
INSERT INTO game (
  igdb_id,
  name,
  slug,
  summary,
  release_date,
  cover_url,
  genres,
  platforms,
  developer,
  publisher,
  igdb_rating,
  total_rating,
  rating_count,
  follows,
  hypes,
  category,
  greenlight_flag,
  created_at,
  updated_at
) VALUES (
  134988,
  'Street Fighter 6',
  'street-fighter-6',
  'Street Fighter 6 spans three distinct game modes featuring World Tour, Fighting Ground and Battle Hub. Diverse roster of 18 fighters including legendary World Warriors and exciting brand new characters add their own flair to the game at launch, with more to be added post-launch.',
  '2023-06-02',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vst.jpg',
  ARRAY['Fighting'],
  ARRAY['PC (Microsoft Windows)', 'PlayStation 4', 'PlayStation 5', 'Xbox Series X|S'],
  'Capcom',
  'Capcom',
  88,
  88,
  157,
  441,
  0,
  0, -- Main game category
  false, -- Don't set greenlight flag for now
  NOW(),
  NOW()
) ON CONFLICT (igdb_id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  summary = EXCLUDED.summary,
  release_date = EXCLUDED.release_date,
  cover_url = EXCLUDED.cover_url,
  genres = EXCLUDED.genres,
  platforms = EXCLUDED.platforms,
  developer = EXCLUDED.developer,
  publisher = EXCLUDED.publisher,
  igdb_rating = EXCLUDED.igdb_rating,
  total_rating = EXCLUDED.total_rating,
  rating_count = EXCLUDED.rating_count,
  follows = EXCLUDED.follows,
  category = EXCLUDED.category,
  updated_at = NOW();

-- Step 3: Check for other popular fighting games that might be missing
-- This query will help identify what we have
SELECT 'Current Fighting Game Coverage:' as info;
SELECT name, igdb_id, developer, release_date
FROM game
WHERE genres @> ARRAY['Fighting']
  AND release_date >= '2020-01-01'
ORDER BY release_date DESC
LIMIT 20;