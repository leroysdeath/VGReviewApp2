-- Pokemon Games Metadata Update Migration
-- Updates missing developer, publisher, and rating data for major Pokemon titles
-- Generated: 2025-01-20

-- ============================================
-- MAIN SERIES GAMES - Generation I-IX
-- ============================================

-- Generation I
UPDATE game SET
  developer = 'Game Freak',
  publisher = 'Nintendo',
  total_rating = 88
WHERE igdb_id = 1561 AND name = 'Pokémon Red Version';

UPDATE game SET
  developer = 'Game Freak',
  publisher = 'Nintendo',
  total_rating = 89
WHERE igdb_id = 1511 AND name = 'Pokémon Blue Version';

UPDATE game SET
  developer = 'Game Freak',
  publisher = 'Nintendo',
  total_rating = 85
WHERE igdb_id = 8377 AND name = 'Pokémon Green Version';

-- Generation II
UPDATE game SET
  developer = 'Game Freak',
  publisher = 'Nintendo',
  total_rating = 87
WHERE igdb_id = 1514 AND name = 'Pokémon Crystal Version';

-- Generation III Remakes
UPDATE game SET
  developer = 'Game Freak',
  publisher = 'Nintendo',
  total_rating = 82
WHERE igdb_id = 1559 AND name = 'Pokémon FireRed Version';

-- Generation IV
UPDATE game SET
  developer = 'Game Freak',
  publisher = 'Nintendo',
  total_rating = 85
WHERE igdb_id = 1521 AND name = 'Pokémon Black Version';

-- Generation V (Already have Black 2/White 2 with data)
-- Black and White originals need adding

-- Generation VI (X and Y already have data)
-- Omega Ruby and Alpha Sapphire already have developer/publisher

-- Generation VII
-- Sun/Moon already have developer/publisher
-- Ultra Sun/Ultra Moon already have developer/publisher

-- Generation VIII
-- Sword/Shield already have developer/publisher
UPDATE game SET
  total_rating = 80
WHERE igdb_id = 37382 AND name = 'Pokémon Sword';

UPDATE game SET
  total_rating = 80
WHERE igdb_id = 115653 AND name = 'Pokémon Shield';

-- Generation VIII - Remakes
UPDATE game SET
  total_rating = 73
WHERE igdb_id = 102873 AND name = 'Pokémon: Let''s Go, Eevee!';

UPDATE game SET
  total_rating = 73
WHERE igdb_id = 25877 AND name = 'Pokémon: Let''s Go, Pikachu!';

-- Generation IX - Need to add if missing

-- ============================================
-- POPULAR SPIN-OFFS
-- ============================================

-- Pokemon GO
UPDATE game SET
  total_rating = 69
WHERE igdb_id = 12515 AND name = 'Pokémon Go';

-- Pokemon Snap games
UPDATE game SET
  total_rating = 77
WHERE igdb_id = 135142 AND name = 'New Pokémon Snap';

-- Mystery Dungeon Series
UPDATE game SET
  total_rating = 79
WHERE igdb_id = 128069 AND name = 'Pokémon Mystery Dungeon: Rescue Team DX';

UPDATE game SET
  total_rating = 72
WHERE igdb_id = 10906 AND name = 'Pokémon Super Mystery Dungeon';

-- Pokemon Stadium Series
UPDATE game SET
  total_rating = 73
WHERE igdb_id = 2289 AND name = 'Pokémon Stadium';

UPDATE game SET
  total_rating = 68
WHERE igdb_id = 2290 AND name = 'Pokémon Stadium 2';

-- Pokemon Colosseum/XD
UPDATE game SET
  total_rating = 72
WHERE igdb_id = 2725 AND name = 'Pokémon Colosseum';

UPDATE game SET
  total_rating = 56
WHERE igdb_id = 2724 AND name = 'Pokémon XD: Gale of Darkness';

-- Pokemon Ranger Series
UPDATE game SET
  total_rating = 68
WHERE igdb_id = 14606 AND name = 'Pokémon Ranger';

UPDATE game SET
  total_rating = 71
WHERE igdb_id = 14699 AND name = 'Pokémon Ranger: Shadows of Almia';

UPDATE game SET
  total_rating = 69
WHERE igdb_id = 4565 AND name = 'Pokémon Ranger: Guardian Signs';

-- ============================================
-- FAN GAMES & ROM HACKS - Mark with lower ratings
-- These should generally be filtered out
-- ============================================

-- Popular fan games that might slip through
UPDATE game SET
  total_rating = 0,  -- Zero rating helps filtering
  developer = COALESCE(developer, 'Fan Made'),
  publisher = COALESCE(publisher, 'Fan Made')
WHERE name IN (
  'Pokémon Uranium',
  'Pokémon Insurgence',
  'Pokémon Reborn',
  'Pokémon Rejuvenation',
  'Pokémon Radical Red',
  'Pokémon Clover',
  'Pokémon Prism',
  'Pokémon Gaia',
  'Pokémon Glazed',
  'Pokémon Blazed Glazed',
  'Pokémon Light Platinum',
  'Pokémon Dark Rising',
  'Pokémon Flora Sky',
  'Pokémon Liquid Crystal',
  'Pokémon Ash Gray',
  'Pokémon Cloud White',
  'Pokémon Theta Emerald',
  'Pokémon Vega',
  'Pokémon Altair',
  'Pokémon Sirius',
  'Pokémon CAWPS',
  'Pokémon Outlaw',
  'Pokémon Korosu',
  'Pokémon Snakewood',
  'Pokémon Ruby Destiny',
  'Pokémon Bronze',
  'Pokémon Bronze Version 2',
  'Pokémon Brown',
  'Pokémon Cyan',
  'Pokémon Quartz',
  'PETA''s Pokémon Black & Blue'
);

-- ============================================
-- FIX GAMES WITH WRONG DATA
-- ============================================

-- Fix Pokemon Red with wrong publisher
UPDATE game SET
  developer = 'Game Freak',
  publisher = 'Nintendo'
WHERE igdb_id = 1561 AND publisher = 'Gradiente';

-- ============================================
-- MOBILE & MODERN GAMES
-- ============================================

UPDATE game SET
  total_rating = 53
WHERE igdb_id = 135381 AND name = 'Pokémon Unite';

UPDATE game SET
  total_rating = 64
WHERE igdb_id = 119156 AND name = 'Pokémon Masters';

UPDATE game SET
  total_rating = 62
WHERE igdb_id = 135233 AND name = 'Pokémon Café Mix';

UPDATE game SET
  total_rating = 71
WHERE igdb_id = 102874 AND name = 'Pokémon Quest';

-- ============================================
-- ADD MISSING MAJOR TITLES
-- These need to be inserted if they don't exist
-- ============================================

-- Check if Pokemon Legends: Arceus exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '119388',
  'Pokémon Legends: Arceus',
  'Game Freak',
  'Nintendo',
  119388,
  83,
  '2022-01-28',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 119388
);

-- Check if Pokemon Brilliant Diamond exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '119387',
  'Pokémon Brilliant Diamond',
  'ILCA',
  'Nintendo',
  119387,
  73,
  '2021-11-19',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 119387
);

-- Check if Pokemon Shining Pearl exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '131435',
  'Pokémon Shining Pearl',
  'ILCA',
  'Nintendo',
  131435,
  73,
  '2021-11-19',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 131435
);

-- Check if Pokemon Scarlet exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '207879',
  'Pokémon Scarlet',
  'Game Freak',
  'Nintendo',
  207879,
  72,
  '2022-11-18',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 207879
);

-- Check if Pokemon Violet exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '207880',
  'Pokémon Violet',
  'Game Freak',
  'Nintendo',
  207880,
  72,
  '2022-11-18',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 207880
);

-- Check if Pokemon Gold exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1515',
  'Pokémon Gold Version',
  'Game Freak',
  'Nintendo',
  1515,
  89,
  '1999-11-21',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1515
);

-- Check if Pokemon Silver exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1516',
  'Pokémon Silver Version',
  'Game Freak',
  'Nintendo',
  1516,
  89,
  '1999-11-21',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1516
);

-- Check if Pokemon Ruby exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1517',
  'Pokémon Ruby Version',
  'Game Freak',
  'Nintendo',
  1517,
  82,
  '2002-11-21',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1517
);

-- Check if Pokemon Sapphire exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1518',
  'Pokémon Sapphire Version',
  'Game Freak',
  'Nintendo',
  1518,
  82,
  '2002-11-21',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1518
);

-- Check if Pokemon Emerald exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1520',
  'Pokémon Emerald Version',
  'Game Freak',
  'Nintendo',
  1520,
  84,
  '2004-09-16',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1520
);

-- Check if Pokemon Diamond exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1522',
  'Pokémon Diamond Version',
  'Game Freak',
  'Nintendo',
  1522,
  83,
  '2006-09-28',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1522
);

-- Check if Pokemon Pearl exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1523',
  'Pokémon Pearl Version',
  'Game Freak',
  'Nintendo',
  1523,
  83,
  '2006-09-28',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1523
);

-- Check if Pokemon Platinum exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1524',
  'Pokémon Platinum Version',
  'Game Freak',
  'Nintendo',
  1524,
  85,
  '2008-09-13',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1524
);

-- Check if Pokemon HeartGold exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1525',
  'Pokémon HeartGold Version',
  'Game Freak',
  'Nintendo',
  1525,
  87,
  '2009-09-12',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1525
);

-- Check if Pokemon SoulSilver exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1526',
  'Pokémon SoulSilver Version',
  'Game Freak',
  'Nintendo',
  1526,
  87,
  '2009-09-12',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1526
);

-- Check if Pokemon White exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1527',
  'Pokémon White Version',
  'Game Freak',
  'Nintendo',
  1527,
  85,
  '2010-09-18',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1527
);

-- Check if Pokemon Yellow exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1560',
  'Pokémon Yellow Version: Special Pikachu Edition',
  'Game Freak',
  'Nintendo',
  1560,
  88,
  '1998-09-12',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1560
);

-- Check if Pokemon LeafGreen exists, if not, insert it
INSERT INTO game (
  game_id,
  name,
  developer,
  publisher,
  igdb_id,
  total_rating,
  release_date,
  follows
)
SELECT
  '1565',
  'Pokémon LeafGreen Version',
  'Game Freak',
  'Nintendo',
  1565,
  82,
  '2004-01-29',
  0
WHERE NOT EXISTS (
  SELECT 1 FROM game WHERE igdb_id = 1565
);

-- ============================================
-- SUMMARY QUERY - Run this to check results
-- ============================================

/*
-- Check how many Pokemon games now have complete metadata:
SELECT
  COUNT(*) as total_games,
  COUNT(CASE WHEN developer IS NOT NULL THEN 1 END) as with_developer,
  COUNT(CASE WHEN publisher IS NOT NULL THEN 1 END) as with_publisher,
  COUNT(CASE WHEN total_rating IS NOT NULL THEN 1 END) as with_rating,
  COUNT(CASE WHEN developer IS NOT NULL AND publisher IS NOT NULL THEN 1 END) as complete_metadata
FROM game
WHERE LOWER(name) LIKE '%pokemon%' OR LOWER(name) LIKE '%pokémon%';

-- List top Pokemon games by rating:
SELECT name, developer, publisher, total_rating, release_date
FROM game
WHERE (LOWER(name) LIKE '%pokemon%' OR LOWER(name) LIKE '%pokémon%')
  AND developer IS NOT NULL
  AND publisher IS NOT NULL
ORDER BY total_rating DESC NULLS LAST
LIMIT 50;
*/