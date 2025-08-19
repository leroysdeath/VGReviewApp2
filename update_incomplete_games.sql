-- SQL Script to update incomplete game entries
-- This is a backup option if the Node.js script cannot be run

-- First, let's check the current state of these games
SELECT 
  igdb_id,
  name,
  CASE WHEN slug IS NULL THEN 'MISSING' ELSE 'EXISTS' END as slug_status,
  CASE WHEN summary IS NULL THEN 'MISSING' ELSE 'EXISTS' END as summary_status,
  CASE WHEN cover_url IS NULL THEN 'MISSING' ELSE 'EXISTS' END as cover_status,
  CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL THEN 'MISSING' ELSE 'EXISTS' END as screenshots_status,
  CASE WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL THEN 'MISSING' ELSE 'EXISTS' END as platforms_status,
  CASE WHEN developer IS NULL THEN 'MISSING' ELSE 'EXISTS' END as developer_status,
  CASE WHEN publisher IS NULL THEN 'MISSING' ELSE 'EXISTS' END as publisher_status,
  CASE WHEN igdb_link IS NULL THEN 'MISSING' ELSE 'EXISTS' END as igdb_link_status
FROM game
WHERE igdb_id IN (2001, 55056, 4152, 305152, 116, 338616, 45142)
ORDER BY igdb_id;

-- Update Far Cry 3: Blood Dragon (igdb_id: 2001)
UPDATE game
SET
  slug = COALESCE(slug, 'far-cry-3-blood-dragon'),
  summary = COALESCE(summary, 'Far Cry 3: Blood Dragon is THE Kick-Ass Cyber Shooter. Welcome to an 80''s vision of the future. The year is 2007 and you are Sergeant Rex Colt, a Mark IV Cyber Commando. Your mission: get the girl, kill the bad guys, and save the world.'),
  cover_url = COALESCE(cover_url, 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wyy.jpg'),
  platforms = CASE WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL 
    THEN ARRAY['PC', 'PlayStation 3', 'Xbox 360', 'PlayStation 4', 'Xbox One']
    ELSE platforms END,
  developer = COALESCE(developer, 'Ubisoft Montreal'),
  publisher = COALESCE(publisher, 'Ubisoft'),
  igdb_link = COALESCE(igdb_link, 'https://www.igdb.com/games/far-cry-3-blood-dragon'),
  screenshots = CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL
    THEN ARRAY[
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sckuv7.jpg',
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sckuv8.jpg'
    ]
    ELSE screenshots END,
  updated_at = NOW()
WHERE igdb_id = 2001;

-- Update Age of Empires II: Definitive Edition (igdb_id: 55056)
UPDATE game
SET
  slug = COALESCE(slug, 'age-of-empires-ii-definitive-edition'),
  summary = COALESCE(summary, 'Age of Empires II: Definitive Edition celebrates the 20th anniversary of one of the most popular strategy games ever with stunning 4K Ultra HD graphics, a new and fully remastered soundtrack, and brand-new content, "The Last Khans" with 3 new campaigns and 4 new civilizations.'),
  cover_url = COALESCE(cover_url, 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1y4f.jpg'),
  platforms = CASE WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL 
    THEN ARRAY['PC', 'Xbox One', 'Xbox Series X|S', 'PlayStation 5', 'Nintendo Switch']
    ELSE platforms END,
  developer = COALESCE(developer, 'Forgotten Empires'),
  publisher = COALESCE(publisher, 'Xbox Game Studios'),
  igdb_link = COALESCE(igdb_link, 'https://www.igdb.com/games/age-of-empires-ii-definitive-edition'),
  screenshots = CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL
    THEN ARRAY[
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6l1h.jpg',
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc6l1i.jpg'
    ]
    ELSE screenshots END,
  updated_at = NOW()
WHERE igdb_id = 55056;

-- Update Skies of Arcadia Legends (igdb_id: 4152)
UPDATE game
SET
  slug = COALESCE(slug, 'skies-of-arcadia-legends'),
  summary = COALESCE(summary, 'Skies of Arcadia Legends is an enhanced port of the Dreamcast RPG Skies of Arcadia. The game features improved graphics, new discoveries, and additional content including new characters and side quests.'),
  cover_url = COALESCE(cover_url, 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3oag.jpg'),
  platforms = CASE WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL 
    THEN ARRAY['Nintendo GameCube']
    ELSE platforms END,
  developer = COALESCE(developer, 'Overworks'),
  publisher = COALESCE(publisher, 'Sega'),
  igdb_link = COALESCE(igdb_link, 'https://www.igdb.com/games/skies-of-arcadia-legends'),
  screenshots = CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL
    THEN ARRAY[
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/ktajhxjlxqbftapsijyx.jpg'
    ]
    ELSE screenshots END,
  updated_at = NOW()
WHERE igdb_id = 4152;

-- Update Clair Obscur: Expedition 33 (igdb_id: 305152)
UPDATE game
SET
  slug = COALESCE(slug, 'clair-obscur-expedition-33'),
  summary = COALESCE(summary, 'Clair Obscur: Expedition 33 is a turn-based RPG with real-time mechanics, following a cursed expedition where each year, everyone of a certain age vanishes. You must stop the Paintress before she erases your age.'),
  cover_url = COALESCE(cover_url, 'https://images.igdb.com/igdb/image/upload/t_cover_big/co8zp0.jpg'),
  platforms = CASE WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL 
    THEN ARRAY['PC', 'PlayStation 5', 'Xbox Series X|S']
    ELSE platforms END,
  developer = COALESCE(developer, 'Sandfall Interactive'),
  publisher = COALESCE(publisher, 'Kepler Interactive'),
  igdb_link = COALESCE(igdb_link, 'https://www.igdb.com/games/clair-obscur-expedition-33'),
  screenshots = CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL
    THEN ARRAY[
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scfvmj.jpg'
    ]
    ELSE screenshots END,
  updated_at = NOW()
WHERE igdb_id = 305152;

-- Update Star Wars: Knights of the Old Republic (igdb_id: 116)
UPDATE game
SET
  slug = COALESCE(slug, 'star-wars-knights-of-the-old-republic'),
  summary = COALESCE(summary, 'Choose Your Path. It is four thousand years before the Galactic Empire and hundreds of Jedi Knights have fallen in battle against the ruthless Sith. You are the last hope of the Jedi Order. Can you master the awesome power of the Force on your quest to save the Republic? Or will you fall to the lure of the dark side?'),
  cover_url = COALESCE(cover_url, 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1nkk.jpg'),
  platforms = CASE WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL 
    THEN ARRAY['PC', 'Xbox', 'Mac', 'iOS', 'Android', 'Nintendo Switch', 'PlayStation 5']
    ELSE platforms END,
  developer = COALESCE(developer, 'BioWare'),
  publisher = COALESCE(publisher, 'LucasArts'),
  igdb_link = COALESCE(igdb_link, 'https://www.igdb.com/games/star-wars-knights-of-the-old-republic'),
  screenshots = CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL
    THEN ARRAY[
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/xgo1fckwbzw7dtgzgd2u.jpg',
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/bffrjuknqgsyhtvxqizl.jpg'
    ]
    ELSE screenshots END,
  updated_at = NOW()
WHERE igdb_id = 116;

-- Update Mario Kart Tour: Mario Bros. Tour (igdb_id: 338616)
-- Note: This appears to be a special tour/event within Mario Kart Tour mobile game
UPDATE game
SET
  slug = COALESCE(slug, 'mario-kart-tour-mario-bros-tour'),
  summary = COALESCE(summary, 'A special tour event in Mario Kart Tour featuring Mario Bros. themed content, tracks, and challenges. Race through classic courses with your favorite Mario characters on mobile devices.'),
  cover_url = COALESCE(cover_url, 'https://images.igdb.com/igdb/image/upload/t_cover_big/co7dto.jpg'),
  platforms = CASE WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL 
    THEN ARRAY['iOS', 'Android']
    ELSE platforms END,
  developer = COALESCE(developer, 'Nintendo EPD'),
  publisher = COALESCE(publisher, 'Nintendo'),
  igdb_link = COALESCE(igdb_link, 'https://www.igdb.com/games/mario-kart-tour'),
  screenshots = CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL
    THEN ARRAY[]  -- Mobile game tours typically don't have separate screenshots
    ELSE screenshots END,
  updated_at = NOW()
WHERE igdb_id = 338616;

-- Update The Legend of Zelda: Ocarina of Time - Master Quest (igdb_id: 45142)
UPDATE game
SET
  slug = COALESCE(slug, 'the-legend-of-zelda-ocarina-of-time-master-quest'),
  summary = COALESCE(summary, 'The Legend of Zelda: Ocarina of Time Master Quest is a reworked version of Ocarina of Time featuring more challenging dungeons with new puzzles, room layouts, and enemy placements. Originally released as a GameCube bonus disc and later included in Ocarina of Time 3D.'),
  cover_url = COALESCE(cover_url, 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3v4i.jpg'),
  platforms = CASE WHEN platforms IS NULL OR array_length(platforms, 1) IS NULL 
    THEN ARRAY['Nintendo GameCube', 'Nintendo 3DS']
    ELSE platforms END,
  developer = COALESCE(developer, 'Nintendo EAD'),
  publisher = COALESCE(publisher, 'Nintendo'),
  igdb_link = COALESCE(igdb_link, 'https://www.igdb.com/games/the-legend-of-zelda-ocarina-of-time-master-quest'),
  screenshots = CASE WHEN screenshots IS NULL OR array_length(screenshots, 1) IS NULL
    THEN ARRAY[
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/sc8k1w.jpg'
    ]
    ELSE screenshots END,
  updated_at = NOW()
WHERE igdb_id = 45142;

-- Verify the updates
SELECT 
  igdb_id,
  name,
  slug,
  LEFT(summary, 100) || '...' as summary_preview,
  cover_url IS NOT NULL as has_cover,
  array_length(screenshots, 1) as screenshot_count,
  array_length(platforms, 1) as platform_count,
  developer,
  publisher,
  igdb_link,
  updated_at
FROM game
WHERE igdb_id IN (2001, 55056, 4152, 305152, 116, 338616, 45142)
ORDER BY igdb_id;

-- Refresh the materialized view
-- Note: This might need to be run separately depending on your permissions
-- Option 1: Using function (if it exists)
-- SELECT refresh_materialized_view_concurrently('popular_game_cached');

-- Option 2: Direct refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY popular_game_cached;

-- Final summary
SELECT 
  COUNT(*) as games_updated,
  COUNT(CASE WHEN slug IS NOT NULL THEN 1 END) as with_slug,
  COUNT(CASE WHEN summary IS NOT NULL THEN 1 END) as with_summary,
  COUNT(CASE WHEN cover_url IS NOT NULL THEN 1 END) as with_cover,
  COUNT(CASE WHEN developer IS NOT NULL THEN 1 END) as with_developer,
  COUNT(CASE WHEN publisher IS NOT NULL THEN 1 END) as with_publisher
FROM game
WHERE igdb_id IN (2001, 55056, 4152, 305152, 116, 338616, 45142);