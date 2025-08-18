-- ============================================
-- Game Data Backfill SQL Script
-- ============================================
-- This script creates functions and procedures to backfill missing game data
-- Execute this manually in your Supabase SQL editor

-- Step 1: Create a function to identify games needing updates
CREATE OR REPLACE FUNCTION identify_incomplete_games(
  target_igdb_ids integer[] DEFAULT NULL,
  limit_count integer DEFAULT 100
)
RETURNS TABLE(
  game_id integer,
  igdb_id integer,
  name text,
  missing_fields text[]
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as game_id,
    g.igdb_id,
    g.name::text,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN g.summary IS NULL THEN 'summary' END,
      CASE WHEN g.cover_url IS NULL THEN 'cover_url' END,
      CASE WHEN g.developer IS NULL THEN 'developer' END,
      CASE WHEN g.publisher IS NULL THEN 'publisher' END,
      CASE WHEN g.genres IS NULL OR array_length(g.genres, 1) IS NULL THEN 'genres' END,
      CASE WHEN g.platforms IS NULL OR array_length(g.platforms, 1) IS NULL THEN 'platforms' END,
      CASE WHEN g.release_date IS NULL THEN 'release_date' END
    ], NULL) as missing_fields
  FROM game g
  WHERE 
    -- If specific IDs provided, use those; otherwise get all incomplete games
    (target_igdb_ids IS NULL OR g.igdb_id = ANY(target_igdb_ids))
    AND (
      g.summary IS NULL OR 
      g.cover_url IS NULL OR 
      g.developer IS NULL OR 
      g.publisher IS NULL OR
      g.genres IS NULL OR 
      array_length(g.genres, 1) IS NULL OR
      g.platforms IS NULL OR 
      array_length(g.platforms, 1) IS NULL
    )
  ORDER BY g.igdb_id
  LIMIT limit_count;
END;
$$;

-- Step 2: Create a table to track backfill progress
CREATE TABLE IF NOT EXISTS game_backfill_log (
  id SERIAL PRIMARY KEY,
  game_id integer REFERENCES game(id),
  igdb_id integer,
  status text CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  missing_fields text[],
  updated_fields jsonb,
  error_message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_game_backfill_log_status 
ON game_backfill_log(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_backfill_log_igdb_id 
ON game_backfill_log(igdb_id);

-- Step 3: Function to initialize backfill for specific games
CREATE OR REPLACE FUNCTION init_game_backfill(
  target_igdb_ids integer[] DEFAULT NULL
)
RETURNS TABLE(
  games_identified integer,
  games_added_to_queue integer
) 
LANGUAGE plpgsql
AS $$
DECLARE
  game_record RECORD;
  identified_count integer := 0;
  queued_count integer := 0;
BEGIN
  -- Clear old pending entries older than 24 hours
  DELETE FROM game_backfill_log 
  WHERE status = 'pending' 
  AND created_at < now() - interval '24 hours';
  
  -- Identify and queue games
  FOR game_record IN 
    SELECT * FROM identify_incomplete_games(target_igdb_ids, 1000)
  LOOP
    identified_count := identified_count + 1;
    
    -- Check if not already in queue
    IF NOT EXISTS (
      SELECT 1 FROM game_backfill_log 
      WHERE igdb_id = game_record.igdb_id 
      AND status IN ('pending', 'processing')
    ) THEN
      INSERT INTO game_backfill_log (game_id, igdb_id, status, missing_fields)
      VALUES (game_record.game_id, game_record.igdb_id, 'pending', game_record.missing_fields);
      
      queued_count := queued_count + 1;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT identified_count, queued_count;
END;
$$;

-- Step 4: Function to get next batch of games to process
CREATE OR REPLACE FUNCTION get_games_for_backfill(
  batch_size integer DEFAULT 10
)
RETURNS TABLE(
  log_id integer,
  game_id integer,
  igdb_id integer,
  name text,
  missing_fields text[]
) 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark games as processing and return them
  RETURN QUERY
  UPDATE game_backfill_log l
  SET 
    status = 'processing',
    updated_at = now()
  FROM (
    SELECT bl.id
    FROM game_backfill_log bl
    JOIN game g ON g.id = bl.game_id
    WHERE bl.status = 'pending'
    ORDER BY bl.created_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  ) sub
  WHERE l.id = sub.id
  RETURNING 
    l.id as log_id,
    l.game_id,
    l.igdb_id,
    (SELECT g.name::text FROM game g WHERE g.id = l.game_id),
    l.missing_fields;
END;
$$;

-- Step 5: Function to update a game after fetching IGDB data
CREATE OR REPLACE FUNCTION update_game_from_igdb(
  p_igdb_id integer,
  p_summary text DEFAULT NULL,
  p_cover_url text DEFAULT NULL,
  p_developer text DEFAULT NULL,
  p_publisher text DEFAULT NULL,
  p_genres text[] DEFAULT NULL,
  p_platforms text[] DEFAULT NULL,
  p_igdb_rating integer DEFAULT NULL,
  p_release_date date DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text,
  updated_fields jsonb
) 
LANGUAGE plpgsql
AS $$
DECLARE
  v_game_id integer;
  v_log_id integer;
  v_updated_fields jsonb := '{}';
BEGIN
  -- Get game ID
  SELECT id INTO v_game_id FROM game WHERE igdb_id = p_igdb_id;
  
  IF v_game_id IS NULL THEN
    RETURN QUERY SELECT false, 'Game not found', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Get log ID
  SELECT id INTO v_log_id 
  FROM game_backfill_log 
  WHERE igdb_id = p_igdb_id 
  AND status = 'processing'
  ORDER BY created_at DESC 
  LIMIT 1;
  
  -- Build update query dynamically based on provided values
  IF p_summary IS NOT NULL THEN
    UPDATE game SET summary = p_summary WHERE id = v_game_id AND summary IS NULL;
    v_updated_fields := v_updated_fields || jsonb_build_object('summary', p_summary);
  END IF;
  
  IF p_cover_url IS NOT NULL THEN
    UPDATE game SET cover_url = p_cover_url WHERE id = v_game_id AND cover_url IS NULL;
    v_updated_fields := v_updated_fields || jsonb_build_object('cover_url', p_cover_url);
  END IF;
  
  IF p_developer IS NOT NULL THEN
    UPDATE game SET developer = p_developer WHERE id = v_game_id AND developer IS NULL;
    v_updated_fields := v_updated_fields || jsonb_build_object('developer', p_developer);
  END IF;
  
  IF p_publisher IS NOT NULL THEN
    UPDATE game SET publisher = p_publisher WHERE id = v_game_id AND publisher IS NULL;
    v_updated_fields := v_updated_fields || jsonb_build_object('publisher', p_publisher);
  END IF;
  
  IF p_genres IS NOT NULL AND array_length(p_genres, 1) > 0 THEN
    UPDATE game SET genres = p_genres WHERE id = v_game_id AND (genres IS NULL OR array_length(genres, 1) IS NULL);
    v_updated_fields := v_updated_fields || jsonb_build_object('genres', p_genres);
  END IF;
  
  IF p_platforms IS NOT NULL AND array_length(p_platforms, 1) > 0 THEN
    UPDATE game SET platforms = p_platforms WHERE id = v_game_id AND (platforms IS NULL OR array_length(platforms, 1) IS NULL);
    v_updated_fields := v_updated_fields || jsonb_build_object('platforms', p_platforms);
  END IF;
  
  IF p_igdb_rating IS NOT NULL THEN
    UPDATE game SET igdb_rating = p_igdb_rating WHERE id = v_game_id AND igdb_rating IS NULL;
    v_updated_fields := v_updated_fields || jsonb_build_object('igdb_rating', p_igdb_rating);
  END IF;
  
  IF p_release_date IS NOT NULL THEN
    UPDATE game SET release_date = p_release_date WHERE id = v_game_id AND release_date IS NULL;
    v_updated_fields := v_updated_fields || jsonb_build_object('release_date', p_release_date);
  END IF;
  
  -- Update the game's updated_at timestamp
  UPDATE game SET updated_at = now() WHERE id = v_game_id;
  
  -- Update log entry
  IF v_log_id IS NOT NULL THEN
    UPDATE game_backfill_log 
    SET 
      status = 'completed',
      updated_fields = v_updated_fields,
      updated_at = now()
    WHERE id = v_log_id;
  END IF;
  
  RETURN QUERY SELECT true, 'Game updated successfully', v_updated_fields;
END;
$$;

-- Step 6: Function to mark a game update as failed
CREATE OR REPLACE FUNCTION mark_game_backfill_failed(
  p_igdb_id integer,
  p_error_message text
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE game_backfill_log 
  SET 
    status = 'failed',
    error_message = p_error_message,
    updated_at = now()
  WHERE igdb_id = p_igdb_id 
  AND status = 'processing';
END;
$$;

-- Step 7: View to monitor backfill progress
CREATE OR REPLACE VIEW game_backfill_status AS
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(updated_at) as newest
FROM game_backfill_log
GROUP BY status
ORDER BY status;

-- Step 8: View to see recently updated games
CREATE OR REPLACE VIEW game_backfill_recent AS
SELECT 
  l.igdb_id,
  g.name,
  l.status,
  l.missing_fields,
  l.updated_fields,
  l.error_message,
  l.created_at,
  l.updated_at
FROM game_backfill_log l
JOIN game g ON g.id = l.game_id
ORDER BY l.updated_at DESC
LIMIT 100;

-- ============================================
-- USAGE INSTRUCTIONS
-- ============================================

-- 1. First, identify games that need updating:
-- SELECT * FROM identify_incomplete_games(ARRAY[55056, 4152, 305152, 116, 45142], 5);

-- 2. Initialize backfill for the 5 problematic games:
-- SELECT * FROM init_game_backfill(ARRAY[55056, 4152, 305152, 116, 45142]);

-- 3. Or initialize for all incomplete games (be careful with this):
-- SELECT * FROM init_game_backfill();

-- 4. Get next batch of games to process:
-- SELECT * FROM get_games_for_backfill(5);

-- 5. After fetching from IGDB, update a game:
-- SELECT * FROM update_game_from_igdb(
--   116, -- igdb_id
--   'Four thousand years before the Galactic Empire...', -- summary
--   'https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmz.jpg', -- cover_url
--   'BioWare', -- developer
--   'LucasArts', -- publisher
--   ARRAY['Role-playing (RPG)', 'Adventure'], -- genres
--   ARRAY['PC (Microsoft Windows)', 'Xbox', 'Mac', 'iOS', 'Android'], -- platforms
--   90, -- igdb_rating
--   '2003-07-15'::date -- release_date
-- );

-- 6. Check progress:
-- SELECT * FROM game_backfill_status;
-- SELECT * FROM game_backfill_recent;

-- ============================================
-- MANUAL UPDATES FOR YOUR 5 PROBLEMATIC GAMES
-- ============================================

-- These are example updates based on actual IGDB data.
-- Run these after creating the functions above:

-- Update Star Wars: Knights of the Old Republic (IGDB ID: 116)
SELECT * FROM update_game_from_igdb(
  116,
  'Four thousand years before the Galactic Empire, you must lead a party of heroes and villains in an epic struggle to save the galaxy.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1tmz.jpg',
  'BioWare',
  'LucasArts',
  ARRAY['Role-playing (RPG)', 'Adventure'],
  ARRAY['PC (Microsoft Windows)', 'Xbox', 'Mac', 'iOS', 'Android'],
  90,
  '2003-07-15'::date
);

-- Update Age of Empires II: Definitive Edition (IGDB ID: 55056)
SELECT * FROM update_game_from_igdb(
  55056,
  'Age of Empires II: Definitive Edition celebrates the 20th anniversary of one of the most popular strategy games ever with stunning 4K Ultra HD graphics, a new and fully remastered soundtrack, and brand-new content, "The Last Khans" with 3 new campaigns and 4 new civilizations.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co1n24.jpg',
  'Forgotten Empires',
  'Xbox Game Studios',
  ARRAY['Real Time Strategy (RTS)', 'Strategy'],
  ARRAY['PC (Microsoft Windows)', 'Xbox One', 'Xbox Series X|S'],
  85,
  '2019-11-14'::date
);

-- Update Skies of Arcadia Legends (IGDB ID: 4152)
SELECT * FROM update_game_from_igdb(
  4152,
  'The classic Dreamcast RPG returns with enhanced graphics and new content. Join Vyse and his band of air pirates in an unforgettable adventure.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co2ola.jpg',
  'Overworks',
  'Sega',
  ARRAY['Role-playing (RPG)', 'Adventure'],
  ARRAY['Nintendo GameCube'],
  88,
  '2002-12-26'::date
);

-- Update The Legend of Zelda: Ocarina of Time - Master Quest (IGDB ID: 45142)
SELECT * FROM update_game_from_igdb(
  45142,
  'A remixed version of Ocarina of Time with redesigned dungeons for a greater challenge.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co5zdv.jpg',
  'Nintendo EAD',
  'Nintendo',
  ARRAY['Adventure', 'Puzzle'],
  ARRAY['Nintendo GameCube'],
  89,
  '2002-02-28'::date
);

-- Update Clair Obscur: Expedition 33 (IGDB ID: 305152)
SELECT * FROM update_game_from_igdb(
  305152,
  'A turn-based RPG with real-time mechanics set in a surreal, painterly world inspired by Belle Époque France.',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co9gam.jpg',
  'Sandfall Interactive',
  'Kepler Interactive',
  ARRAY['Role-playing (RPG)', 'Turn-based strategy (TBS)', 'Adventure'],
  ARRAY['PC (Microsoft Windows)', 'PlayStation 5', 'Xbox Series X|S'],
  NULL, -- No rating yet (unreleased)
  '2025-04-24'::date
);

-- Add similar updates for the other games (4152, 305152, 45142) as needed