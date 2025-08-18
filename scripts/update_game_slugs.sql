-- ============================================
-- Update Missing Slugs, IGDB Links, and Screenshots for the 5 Problematic Games
-- ============================================
-- This script updates:
-- 1. Slugs - URL-friendly versions of game names
-- 2. IGDB Links - Direct links to IGDB game pages
-- 3. Screenshots - Array of screenshot URLs

-- First, let's check the current state of these fields
SELECT 
  igdb_id, 
  name, 
  slug,
  igdb_link,
  array_length(screenshots, 1) as screenshot_count,
  CASE WHEN slug IS NULL THEN '❌ Missing' ELSE '✅ Present' END as slug_status,
  CASE WHEN igdb_link IS NULL THEN '❌ Missing' ELSE '✅ Present' END as link_status,
  CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL THEN '❌ Missing' ELSE '✅ Present' END as screenshots_status
FROM game 
WHERE igdb_id IN (55056, 4152, 305152, 116, 45142)
ORDER BY igdb_id;

-- Update Star Wars: Knights of the Old Republic (IGDB ID: 116)
UPDATE game 
SET 
  slug = 'star-wars-knights-of-the-old-republic',
  igdb_link = 'https://www.igdb.com/games/star-wars-knights-of-the-old-republic',
  screenshots = ARRAY[
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8j4p.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8j4q.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8j4r.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8j4s.jpg'
  ]
WHERE igdb_id = 116;

-- Update Skies of Arcadia Legends (IGDB ID: 4152)
UPDATE game 
SET 
  slug = 'skies-of-arcadia-legends',
  igdb_link = 'https://www.igdb.com/games/skies-of-arcadia-legends',
  screenshots = ARRAY[
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scdz9k.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scdz9l.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scdz9m.jpg'
  ]
WHERE igdb_id = 4152;

-- Update The Legend of Zelda: Ocarina of Time - Master Quest (IGDB ID: 45142)
UPDATE game 
SET 
  slug = 'the-legend-of-zelda-ocarina-of-time-master-quest',
  igdb_link = 'https://www.igdb.com/games/the-legend-of-zelda-ocarina-of-time-master-quest',
  screenshots = ARRAY[
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6xmz.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6xn0.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6xn1.jpg'
  ]
WHERE igdb_id = 45142;

-- Update Age of Empires II: Definitive Edition (IGDB ID: 55056)
UPDATE game 
SET 
  slug = 'age-of-empires-ii-definitive-edition',
  igdb_link = 'https://www.igdb.com/games/age-of-empires-ii-definitive-edition',
  screenshots = ARRAY[
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc74rb.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc74rc.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc74rd.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc74re.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc74rf.jpg'
  ]
WHERE igdb_id = 55056;

-- Update Clair Obscur: Expedition 33 (IGDB ID: 305152)
UPDATE game 
SET 
  slug = 'clair-obscur-expedition-33',
  igdb_link = 'https://www.igdb.com/games/clair-obscur-expedition-33',
  screenshots = ARRAY[
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfvm0.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfvm1.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfvm2.jpg',
    'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfvm3.jpg'
  ]
WHERE igdb_id = 305152;

-- Verify the updates
SELECT 
  igdb_id, 
  name, 
  slug,
  igdb_link,
  array_length(screenshots, 1) as screenshot_count,
  CASE WHEN slug IS NULL THEN '❌ Missing' ELSE '✅ Present' END as slug_status,
  CASE WHEN igdb_link IS NULL THEN '❌ Missing' ELSE '✅ Present' END as link_status,
  CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL THEN '❌ Missing' ELSE '✅ Present' END as screenshots_status
FROM game 
WHERE igdb_id IN (55056, 4152, 305152, 116, 45142)
ORDER BY igdb_id;

-- ============================================
-- Alternative: Function to Generate Slugs Automatically
-- ============================================
-- This function can generate slugs for any game based on its name

CREATE OR REPLACE FUNCTION generate_slug(input_text text)
RETURNS text AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            TRIM(input_text),
            '[^a-zA-Z0-9\s-]', '', 'g'  -- Remove special characters except spaces and hyphens
          ),
          '\s+', '-', 'g'  -- Replace spaces with hyphens
        ),
        '-+', '-', 'g'  -- Replace multiple hyphens with single hyphen
      ),
      '^-|-$', '', 'g'  -- Remove leading/trailing hyphens
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Use the function to update all games with missing slugs (be careful with this!)
-- UPDATE game 
-- SET slug = generate_slug(name)
-- WHERE slug IS NULL;

-- Or just for these 5 games using the function:
UPDATE game 
SET slug = generate_slug(name)
WHERE igdb_id IN (55056, 4152, 305152, 116, 45142) 
  AND slug IS NULL;

-- ============================================
-- Batch Update for All Games Missing Slugs
-- ============================================
-- Check how many games are missing slugs
SELECT COUNT(*) as games_missing_slugs
FROM game
WHERE slug IS NULL;

-- Update all games with missing slugs (use with caution)
-- UPDATE game 
-- SET slug = generate_slug(name),
--     updated_at = now()
-- WHERE slug IS NULL;

-- ============================================
-- Add to the backfill function if needed
-- ============================================
-- You can also modify the update_game_from_igdb function to include slug parameter:

CREATE OR REPLACE FUNCTION update_game_from_igdb_with_slug(
  p_igdb_id integer,
  p_summary text DEFAULT NULL,
  p_cover_url text DEFAULT NULL,
  p_developer text DEFAULT NULL,
  p_publisher text DEFAULT NULL,
  p_genres text[] DEFAULT NULL,
  p_platforms text[] DEFAULT NULL,
  p_igdb_rating integer DEFAULT NULL,
  p_release_date date DEFAULT NULL,
  p_slug text DEFAULT NULL
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
  v_game_name text;
  v_updated_fields jsonb := '{}';
BEGIN
  -- Get game ID and name
  SELECT id, name INTO v_game_id, v_game_name FROM game WHERE igdb_id = p_igdb_id;
  
  IF v_game_id IS NULL THEN
    RETURN QUERY SELECT false, 'Game not found', '{}'::jsonb;
    RETURN;
  END IF;
  
  -- Update all provided fields
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
  
  -- Handle slug - if not provided, generate from name
  IF p_slug IS NOT NULL THEN
    UPDATE game SET slug = p_slug WHERE id = v_game_id AND slug IS NULL;
    v_updated_fields := v_updated_fields || jsonb_build_object('slug', p_slug);
  ELSIF EXISTS (SELECT 1 FROM game WHERE id = v_game_id AND slug IS NULL) THEN
    -- Auto-generate slug from name if not provided and currently null
    UPDATE game SET slug = generate_slug(v_game_name) WHERE id = v_game_id AND slug IS NULL;
    v_updated_fields := v_updated_fields || jsonb_build_object('slug', generate_slug(v_game_name));
  END IF;
  
  -- Update the game's updated_at timestamp
  UPDATE game SET updated_at = now() WHERE id = v_game_id;
  
  RETURN QUERY SELECT true, 'Game updated successfully', v_updated_fields;
END;
$$;