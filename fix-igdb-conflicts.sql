-- Fix multiple IGDB ID conflicts
-- Research shows the correct IGDB IDs should be:
-- Apex Legends: 114795 (currently correct)
-- Valorant: 126459 (currently correct)
-- Street Fighter 6: 134988 (currently assigned to wrong game)

-- Step 1: Remove the incorrect game that's using Street Fighter 6's ID
-- "Interactive Portraits: Trans People in Japan" should NOT have ID 134988
UPDATE game
SET igdb_id = NULL
WHERE id = 122686 AND name = 'Interactive Portraits: Trans People in Japan';

-- Step 2: Now insert Street Fighter 6 with its correct IGDB ID (134988)
INSERT INTO game (
  game_id,
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
  '134988', -- game_id as string
  134988,   -- igdb_id as integer
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
  false,
  NOW(),
  NOW()
) ON CONFLICT (igdb_id) DO UPDATE SET
  game_id = EXCLUDED.game_id,
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

-- Step 3: Verify the fixes
SELECT 'After fixes - checking key games:' as status;
SELECT id, igdb_id, name, developer, category
FROM game
WHERE name IN ('Street Fighter 6', 'Apex Legends', 'Valorant', 'Interactive Portraits: Trans People in Japan')
ORDER BY name;