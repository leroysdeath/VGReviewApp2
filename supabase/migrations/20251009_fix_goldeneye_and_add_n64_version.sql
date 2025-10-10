-- =====================================================
-- Fix GoldenEye 007: Delete SNES rumored version and add N64 actual version
-- =====================================================
-- Date: 2025-10-09
-- Purpose: Replace rumored SNES GoldenEye with actual N64 version
--
-- Issue: Database contains rumored SNES version (IGDB 350140) instead of
-- the actual N64 release (IGDB 1638). They share the same slug causing conflicts.
-- =====================================================

BEGIN;

-- Step 1: Delete the rumored SNES version
DELETE FROM game
WHERE id = 338824
AND igdb_id = 350140
AND name = 'GoldenEye 007'
AND platforms @> ARRAY['Super Nintendo Entertainment System'];

-- Verify deletion
DO $$
DECLARE
  snes_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM game WHERE id = 338824
  ) INTO snes_exists;

  IF NOT snes_exists THEN
    RAISE NOTICE '✅ SNES GoldenEye 007 deleted (ID 338824)';
  ELSE
    RAISE WARNING '⚠️  Failed to delete SNES GoldenEye 007';
  END IF;
END $$;

-- Step 2: Add the actual N64 version
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
  igdb_rating
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
  86
)
ON CONFLICT (igdb_id) DO NOTHING;

-- Verify insertion
DO $$
DECLARE
  n64_exists BOOLEAN;
  n64_id INTEGER;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM game WHERE igdb_id = 1638
  ) INTO n64_exists;

  IF n64_exists THEN
    SELECT id INTO n64_id FROM game WHERE igdb_id = 1638;
    RAISE NOTICE '✅ N64 GoldenEye 007 added (Database ID: %)', n64_id;
  ELSE
    RAISE WARNING '⚠️  Failed to add N64 GoldenEye 007';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- Migration Complete
-- =====================================================
-- ✅ Replaced SNES rumored version with N64 actual release
-- 🎮 GoldenEye 007 (N64) now searchable in database
-- =====================================================
