-- =====================================================
-- MANUAL FIX: GoldenEye 007 N64
-- =====================================================
-- Run this in Supabase SQL Editor with service_role or postgres permissions
--
-- Steps:
-- 1. Go to Supabase Dashboard
-- 2. Click "SQL Editor"
-- 3. Paste this entire script
-- 4. Click "Run"
-- =====================================================

-- Delete the SNES rumored version
DELETE FROM public.game
WHERE id = 338824
  AND igdb_id = 350140
  AND name = 'GoldenEye 007'
  AND platforms @> ARRAY['Super Nintendo Entertainment System'];

-- Add the actual N64 version
INSERT INTO public.game (
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
  igdb_rating,
  created_at,
  updated_at
) VALUES (
  'igdb-1638',
  1638,
  'GoldenEye 007',
  'goldeneye-007',
  'GoldenEye 007 is a first-person shooter based on the 1995 James Bond film. The game features a single-player campaign with 20 missions across multiple difficulty levels, emphasizing stealth, varied objectives and mission-based progression. Players can use a range of weapons and gadgets while navigating diverse environments inspired by the movie.

The local split-screen multiplayer mode supports up to four players and offers competitive scenarios such as deathmatch, team modes and character selection from the James Bond universe. The multiplayer component became widely recognized for its influence on console FPS design and is considered a landmark feature of the game.',
  '1997-08-23',
  'https://images.igdb.com/igdb/image/upload/t_1080p/coa0y2.jpg',
  ARRAY['Shooter'],
  ARRAY['Nintendo 64'],
  'Rare',
  86,
  NOW(),
  NOW()
)
ON CONFLICT (igdb_id) DO UPDATE SET
  name = EXCLUDED.name,
  platforms = EXCLUDED.platforms,
  developer = EXCLUDED.developer,
  updated_at = NOW();

-- Verify the fix
SELECT
  id,
  igdb_id,
  name,
  platforms,
  release_date,
  developer
FROM public.game
WHERE slug = 'goldeneye-007';

-- Expected result: One row with:
-- - IGDB ID: 1638
-- - Platforms: {Nintendo 64}
-- - Developer: Rare
-- - Release Date: 1997-08-23
