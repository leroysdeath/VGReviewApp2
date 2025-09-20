-- Migration: Add Essential Super Mario Bros Games
-- Date: 2025-09-18
-- Purpose: Add core Super Mario Bros games to the database with greenlight flags

-- Function to safely add a game (won't fail if game already exists)
CREATE OR REPLACE FUNCTION add_mario_game(
  p_game_id VARCHAR(255),
  p_igdb_id INTEGER,
  p_name VARCHAR(500),
  p_slug VARCHAR(500),
  p_release_date DATE,
  p_description TEXT,
  p_summary TEXT,
  p_developer VARCHAR(255),
  p_publisher VARCHAR(255),
  p_genre VARCHAR(255),
  p_genres TEXT[],
  p_platforms TEXT[],
  p_igdb_rating INTEGER,
  p_cover_url TEXT,
  p_pic_url TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_existing_id INTEGER;
  v_new_id INTEGER;
  v_unique_slug VARCHAR(500);
  v_counter INTEGER := 1;
BEGIN
  -- Check if game already exists by IGDB ID or name
  SELECT id INTO v_existing_id 
  FROM game 
  WHERE igdb_id = p_igdb_id 
     OR LOWER(name) = LOWER(p_name)
     OR slug = p_slug;
  
  IF v_existing_id IS NOT NULL THEN
    -- Game exists, update greenlight flag if not set
    UPDATE game SET 
      greenlight_flag = true,
      flag_reason = 'Essential Super Mario Bros game',
      flagged_at = NOW()
    WHERE id = v_existing_id 
    AND (greenlight_flag IS NULL OR greenlight_flag = false);
    
    RETURN v_existing_id;
  ELSE
    -- Find a unique slug
    v_unique_slug := p_slug;
    WHILE EXISTS (SELECT 1 FROM game WHERE slug = v_unique_slug) LOOP
      v_unique_slug := p_slug || '-' || v_counter;
      v_counter := v_counter + 1;
    END LOOP;
    
    -- Insert new game with unique slug
    INSERT INTO game (
      game_id, igdb_id, name, slug, release_date, description, summary,
      developer, publisher, genre, genres, platforms, igdb_rating,
      category, greenlight_flag, flag_reason, flagged_at,
      cover_url, pic_url, is_verified, created_at, updated_at
    ) VALUES (
      p_game_id, p_igdb_id, p_name, v_unique_slug, p_release_date, p_description, p_summary,
      p_developer, p_publisher, p_genre, p_genres, p_platforms, p_igdb_rating,
      0, true, 'Essential Super Mario Bros game', NOW(),
      p_cover_url, p_pic_url, true, NOW(), NOW()
    ) RETURNING id INTO v_new_id;
    
    RETURN v_new_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add Super Mario Bros games
DO $$
DECLARE
  v_result INTEGER;
BEGIN
  RAISE NOTICE 'Adding essential Super Mario Bros games...';

  -- Super Mario Bros. (1985)
  SELECT add_mario_game(
    'mario-1090',
    1090,
    'Super Mario Bros.',
    'super-mario-bros',
    '1985-09-13'::DATE,
    'A side-scrolling platform game and the first game in the Super Mario series.',
    'The classic platform game that started the Mario franchise. Help Mario rescue Princess Peach from Bowser.',
    'Nintendo EAD',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure'],
    ARRAY['Nintendo Entertainment System', 'Game Boy Color', 'Game Boy Advance'],
    85,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eoa.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gx9.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario Bros. added/updated with ID: %', v_result;

  -- Super Mario Bros. 2 (1988)
  SELECT add_mario_game(
    'mario-1029',
    1029,
    'Super Mario Bros. 2',
    'super-mario-bros-2',
    '1988-10-09'::DATE,
    'The American sequel to Super Mario Bros., originally released as Doki Doki Panic in Japan.',
    'Play as Mario, Luigi, Princess Peach, or Toad in this unique Mario adventure with different gameplay mechanics.',
    'Nintendo EAD',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure'],
    ARRAY['Nintendo Entertainment System', 'Game Boy Advance'],
    82,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eob.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxa.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario Bros. 2 added/updated with ID: %', v_result;

  -- Super Mario Bros. 3 (1988)
  SELECT add_mario_game(
    'mario-1030',
    1030,
    'Super Mario Bros. 3',
    'super-mario-bros-3',
    '1988-10-23'::DATE,
    'Often considered one of the greatest video games of all time, featuring power-ups and world map.',
    'The definitive Mario experience with innovative power-ups, world map, and memorable levels. Mario must save the Mushroom Kingdom from Bowser and the Koopalings.',
    'Nintendo EAD',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure'],
    ARRAY['Nintendo Entertainment System', 'Game Boy Advance', 'Nintendo Switch'],
    95,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eoc.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxb.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario Bros. 3 added/updated with ID: %', v_result;

  -- Super Mario World (1990)
  SELECT add_mario_game(
    'mario-1031',
    1031,
    'Super Mario World',
    'super-mario-world',
    '1990-11-21'::DATE,
    'Mario''s first adventure on the Super Nintendo, introducing Yoshi and Cape Mario.',
    'Explore Dinosaur Land with Mario and Luigi, meet Yoshi, and use the Cape Feather to soar through levels.',
    'Nintendo EAD',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure'],
    ARRAY['Super Nintendo Entertainment System', 'Game Boy Advance', 'Nintendo Switch'],
    94,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eod.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxc.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario World added/updated with ID: %', v_result;

  -- Super Mario 64 (1996)
  SELECT add_mario_game(
    'mario-1032',
    1032,
    'Super Mario 64',
    'super-mario-64',
    '1996-06-23'::DATE,
    'Mario''s first 3D adventure and launch title for the Nintendo 64.',
    'Explore Princess Peach''s castle in full 3D, collect stars, and master Mario''s new 3D moveset.',
    'Nintendo EAD',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure', '3D'],
    ARRAY['Nintendo 64', 'Nintendo DS', 'Nintendo Switch'],
    96,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eoe.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxd.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario 64 added/updated with ID: %', v_result;

  -- Super Mario Sunshine (2002)
  SELECT add_mario_game(
    'mario-1033',
    1033,
    'Super Mario Sunshine',
    'super-mario-sunshine',
    '2002-07-19'::DATE,
    'Mario visits Isle Delfino with FLUDD, a water pack device, to clean up graffiti.',
    'Use FLUDD to clean Isle Delfino and prove Mario''s innocence in this tropical adventure.',
    'Nintendo EAD',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure', '3D'],
    ARRAY['GameCube', 'Nintendo Switch'],
    89,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eof.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxe.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario Sunshine added/updated with ID: %', v_result;

  -- Super Mario Galaxy (2007)
  SELECT add_mario_game(
    'mario-1034',
    1034,
    'Super Mario Galaxy',
    'super-mario-galaxy',
    '2007-11-01'::DATE,
    'Mario travels through space to rescue Princess Peach from Bowser using gravity-defying gameplay.',
    'Explore galaxies with innovative gravity mechanics in this critically acclaimed 3D Mario adventure.',
    'Nintendo EAD Tokyo',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure', '3D'],
    ARRAY['Wii', 'Nintendo Switch'],
    97,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eog.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxf.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario Galaxy added/updated with ID: %', v_result;

  -- Super Mario Galaxy 2 (2010)
  SELECT add_mario_game(
    'mario-1035',
    1035,
    'Super Mario Galaxy 2',
    'super-mario-galaxy-2',
    '2010-05-23'::DATE,
    'The sequel to Super Mario Galaxy with Yoshi and new gravity-based gameplay elements.',
    'Team up with Yoshi in this galaxy-spanning sequel with even more creative level design.',
    'Nintendo EAD Tokyo',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure', '3D'],
    ARRAY['Wii', 'Nintendo Switch'],
    97,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1eoh.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc1gxg.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario Galaxy 2 added/updated with ID: %', v_result;

  -- Super Mario Odyssey (2017)
  SELECT add_mario_game(
    'mario-1036',
    1036,
    'Super Mario Odyssey',
    'super-mario-odyssey',
    '2017-10-27'::DATE,
    'Mario''s latest adventure featuring Cappy and the ability to capture enemies and objects.',
    'Travel the world with Cappy to save Princess Peach and Tiara from Bowser''s wedding plans.',
    'Nintendo EPD',
    'Nintendo',
    'Platform',
    ARRAY['Platform', 'Adventure', '3D'],
    ARRAY['Nintendo Switch'],
    97,
    'https://images.igdb.com/igdb/image/upload/t_cover_big/co1r7f.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_med/sc39dp.jpg'
  ) INTO v_result;
  RAISE NOTICE 'Super Mario Odyssey added/updated with ID: %', v_result;

  RAISE NOTICE 'All Super Mario Bros games have been processed!';
END;
$$;

-- Clean up the temporary function
DROP FUNCTION add_mario_game(VARCHAR, INTEGER, VARCHAR, VARCHAR, DATE, TEXT, TEXT, VARCHAR, VARCHAR, VARCHAR, TEXT[], TEXT[], INTEGER, TEXT, TEXT);

-- Verify the results
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM game 
  WHERE greenlight_flag = true 
  AND (name ILIKE '%mario%' AND name ILIKE '%bros%');
  
  RAISE NOTICE 'Successfully added/updated % Super Mario Bros games with greenlight flag', v_count;
END;
$$;

-- Create an index to improve Mario game searches
CREATE INDEX IF NOT EXISTS idx_game_mario_search 
ON game USING gin (to_tsvector('english', name || ' ' || COALESCE(developer, '') || ' ' || COALESCE(publisher, '')));

-- Add comments
COMMENT ON INDEX idx_game_mario_search IS 'Full-text search index for Mario games and Nintendo titles';