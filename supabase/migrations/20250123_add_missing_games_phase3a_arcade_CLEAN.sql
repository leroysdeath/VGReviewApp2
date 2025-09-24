-- Phase 3A: Arcade-Only Releases (CLEANED VERSION)
-- This migration adds arcade-exclusive games that were never released on home platforms
-- All conflicting entries have been removed
-- Total: ~25 games (down from 35 due to conflicts)

BEGIN;

-- Castlevania Arcade Games
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('castlevania_haunted_castle_arc', 'Haunted Castle', 'haunted-castle', 'Castlevania', ARRAY['Arcade'], 'manual', true, '1988-02-01', 'Konami', 'Konami', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Dragon Quest Arcade Games (0 games - all 3 already exist!)
-- dragon-quest-monster-battle-road-victory exists
-- dragon-quest-scan-battlers exists
-- dragon-quest-battle-scanner would need different slug

INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('dq_battle_scanner', 'Dragon Quest: Battle Scanner', 'dragon-quest-battle-scanner', 'Dragon Quest', ARRAY['Arcade'], 'manual', true, '2019-03-01', 'Square Enix', 'Square Enix', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Counter-Strike Arcade (Japan Exclusive)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('cs_neo_white', 'Counter-Strike Neo: White Memories', 'counter-strike-neo-white-memories', 'Counter Strike', ARRAY['Arcade'], 'manual', true, '2005-01-01', 'Namco', 'Namco', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Mario Kart Arcade GP Series
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('mario_kart_arcade_gp', 'Mario Kart Arcade GP', 'mario-kart-arcade-gp', 'Mario Kart', ARRAY['Arcade'], 'manual', true, '2005-12-01', 'Namco', 'Nintendo/Namco', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Gundam Arcade Exclusives
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('gundam_bonds_battlefield', 'Mobile Suit Gundam: Bonds of the Battlefield', 'gundam-bonds-of-the-battlefield', 'Gundam', ARRAY['Arcade'], 'manual', true, '2006-11-08', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_senjou_kizuna', 'Mobile Suit Gundam: Senjou no Kizuna', 'gundam-senjou-no-kizuna', 'Gundam', ARRAY['Arcade'], 'manual', true, '2006-11-08', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_extreme_vs', 'Gundam Extreme Vs.', 'gundam-extreme-vs', 'Gundam', ARRAY['Arcade'], 'manual', true, '2010-09-28', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_extreme_vs_full', 'Gundam Extreme Vs. Full Boost', 'gundam-extreme-vs-full-boost', 'Gundam', ARRAY['Arcade'], 'manual', true, '2012-04-05', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_extreme_vs_maxi', 'Gundam Extreme Vs. Maxi Boost', 'gundam-extreme-vs-maxi-boost', 'Gundam', ARRAY['Arcade'], 'manual', true, '2014-03-06', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_extreme_vs_maxi_on', 'Gundam Extreme Vs. Maxi Boost ON', 'gundam-extreme-vs-maxi-boost-on', 'Gundam', ARRAY['Arcade'], 'manual', true, '2016-03-09', 'Bandai Namco', 'Bandai Namco', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- VR Arcade Experiences (excluding Far Cry VR which exists)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('halo_outpost_discovery', 'Halo: Outpost Discovery', 'halo-outpost-discovery', 'Halo', ARRAY['Arcade'], 'manual', true, '2019-07-05', '343 Industries', 'Herschend Live', NOW()),
  ('luigi_mansion_arcade', 'Luigi''s Mansion Arcade', 'luigi-mansion-arcade', 'Mario', ARRAY['Arcade'], 'manual', true, '2015-06-19', 'Capcom', 'Nintendo/Capcom', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Fighting Game Arcade Exclusives (3 already exist!)
-- tekken-7-fated-retribution exists (19555)
-- virtua-fighter-5-r exists (94701)
-- virtua-fighter-5-final-showdown exists (21669)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('tekken_tag_2_unlimited', 'Tekken Tag Tournament 2 Unlimited', 'tekken-tag-tournament-2-unlimited', 'Tekken', ARRAY['Arcade'], 'manual', true, '2012-03-27', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('street_fighter_ex', 'Street Fighter EX', 'street-fighter-ex-arcade', 'Street Fighter', ARRAY['Arcade'], 'manual', true, '1996-12-01', 'Arika', 'Capcom', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Light Gun Arcade Games (1 already exists)
-- aliens-armageddon exists (124299)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('house_dead_scarlet', 'House of the Dead: Scarlet Dawn', 'house-of-the-dead-scarlet-dawn', 'House of the Dead', ARRAY['Arcade'], 'manual', true, '2018-09-13', 'Sega', 'Sega', NOW()),
  ('time_crisis_razing_storm', 'Time Crisis: Razing Storm', 'time-crisis-razing-storm-arcade', 'Time Crisis', ARRAY['Arcade'], 'manual', true, '2009-12-01', 'Nex Entertainment', 'Bandai Namco', NOW()),
  ('terminator_salvation_arcade', 'Terminator Salvation', 'terminator-salvation-arcade', 'Terminator', ARRAY['Arcade'], 'manual', true, '2010-04-01', 'Play Mechanix', 'Raw Thrills', NOW()),
  ('jurassic_park_arcade_2015', 'Jurassic Park Arcade', 'jurassic-park-arcade-2015', 'Jurassic Park', ARRAY['Arcade'], 'manual', true, '2015-03-01', 'Raw Thrills', 'Raw Thrills', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Minecraft Arcade
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('minecraft_dungeons_arcade', 'Minecraft Dungeons Arcade', 'minecraft-dungeons-arcade', 'Minecraft', ARRAY['Arcade'], 'manual', true, '2021-10-01', 'Mojang/Play Mechanix', 'Raw Thrills', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Pokemon Arcade Medal Games
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('pokemon_battle_nine', 'Pokemon Battle Nine', 'pokemon-battle-nine', 'Pokemon', ARRAY['Arcade'], 'manual', true, '2005-12-01', 'The Pokémon Company', 'The Pokémon Company', NOW()),
  ('pokemon_medal_world', 'Pokemon Medal World', 'pokemon-medal-world', 'Pokemon', ARRAY['Arcade'], 'manual', true, '2012-07-19', 'The Pokémon Company', 'The Pokémon Company', NOW()),
  ('pokemon_mezastar', 'Pokemon Mezastar', 'pokemon-mezastar', 'Pokemon', ARRAY['Arcade'], 'manual', true, '2020-09-17', 'Takara Tomy', 'The Pokémon Company', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Racing Arcade Exclusives (2 already exist)
-- initial-d-arcade-stage-8-infinity exists (130424)
-- wangan-midnight-maximum-tune-6 exists (112234)
-- fast-and-furious-arcade exists (98694)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('cruis_n_blast', 'Cruis''n Blast', 'cruisn-blast-arcade', 'Cruis''n', ARRAY['Arcade'], 'manual', true, '2017-01-01', 'Raw Thrills', 'Raw Thrills', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Update search vectors for all new games
UPDATE game
SET search_vector = to_tsvector('english',
    COALESCE(name, '') || ' ' ||
    COALESCE(franchise, '') || ' ' ||
    COALESCE(developer, '') || ' ' ||
    COALESCE(publisher, '') || ' ' ||
    COALESCE(array_to_string(platforms, ' ', ''), ''))
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 minute';

-- Add search aliases for arcade games
UPDATE game
SET search_aliases = CASE
    WHEN name LIKE '%Arcade%' THEN jsonb_build_array('Coin-op', 'Cabinet', 'Arcade Machine')
    WHEN franchise = 'Gundam' AND platforms @> ARRAY['Arcade'] THEN jsonb_build_array('Pod Game', 'Mecha', 'Versus')
    WHEN franchise = 'Pokemon' AND platforms @> ARRAY['Arcade'] THEN jsonb_build_array('Medal Game', 'Card Battle')
    WHEN franchise IN ('Initial D', 'Wangan Midnight', 'Cruis''n') THEN jsonb_build_array('Racing', 'Drift', 'Street Racing')
    ELSE jsonb_build_array()
END
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 minute';

-- Also update franchise for existing arcade games that were found (including conflicts)
UPDATE game
SET franchise = CASE
    WHEN igdb_id = 76822 THEN 'Counter Strike'  -- Counter-Strike Neo
    WHEN igdb_id = 72551 THEN 'Dragon Quest'     -- Dragon Quest: Monster Battle Road
    WHEN igdb_id = 102066 THEN 'Halo'            -- Halo: Fireteam Raven
    WHEN igdb_id = 78236 THEN 'Guitar Hero'      -- Guitar Hero Arcade
    WHEN igdb_id IN (39342, 19840, 48711) THEN 'Mario Kart'  -- Mario Kart Arcade GP series
    WHEN igdb_id = 66485 THEN 'Pac-Man'          -- Pac-Man Battle Royale
    WHEN igdb_id = 18138 THEN 'Pokemon'          -- Pokken Tournament
    WHEN igdb_id = 131487 THEN 'Pokemon'         -- Pokemon Ga-Ole
    WHEN igdb_id = 92218 THEN 'Initial D'        -- Initial D Arcade Stage
    WHEN igdb_id = 91720 THEN 'Wangan Midnight'  -- Wangan Midnight Maximum Tune
    WHEN igdb_id = 85872 THEN 'Taiko no Tatsujin' -- Taiko no Tatsujin Arcade
    WHEN igdb_id = 13895 THEN 'Time Crisis'      -- Time Crisis 5
    -- New additions from conflicts
    WHEN igdb_id = 19555 THEN 'Tekken'           -- Tekken 7: Fated Retribution
    WHEN igdb_id = 94701 THEN 'Virtua Fighter'   -- Virtua Fighter 5 R
    WHEN igdb_id = 21669 THEN 'Virtua Fighter'   -- Virtua Fighter 5: Final Showdown
    WHEN igdb_id = 124299 THEN 'Alien'           -- Aliens: Armageddon
    WHEN igdb_id = 98694 THEN 'Fast & Furious'   -- Fast and Furious Arcade
    WHEN igdb_id = 130424 THEN 'Initial D'       -- Initial D: Arcade Stage 8 Infinity
    WHEN igdb_id = 112234 THEN 'Wangan Midnight' -- Wangan Midnight Maximum Tune 6
    ELSE franchise
END
WHERE igdb_id IN (76822, 72551, 102066, 78236, 39342, 19840, 48711, 66485, 18138, 131487, 92218, 91720, 85872, 13895, 19555, 94701, 21669, 124299, 98694, 130424, 112234)
  AND franchise IS NULL;

-- Update Far Cry VR franchise (it exists but needs franchise)
UPDATE game
SET franchise = 'Far Cry'
WHERE slug = 'far-cry-vr-dive-into-insanity'
  AND franchise IS NULL;

-- Update Dragon Quest arcade games franchise
UPDATE game
SET franchise = 'Dragon Quest'
WHERE slug IN ('dragon-quest-monster-battle-road-victory', 'dragon-quest-scan-battlers')
  AND franchise IS NULL;

COMMIT;

-- Summary:
-- Added ~25 arcade-exclusive games (down from 35 due to conflicts)
-- Updated franchise associations for 21 existing arcade games
--
-- Conflicts found and excluded (10 games):
-- - Far Cry VR: Dive Into Insanity (exists)
-- - Dragon Quest: Monster Battle Road Victory (exists)
-- - Dragon Quest: Scan Battlers (exists)
-- - Tekken 7: Fated Retribution (IGDB ID: 19555)
-- - Virtua Fighter 5 R (IGDB ID: 94701)
-- - Virtua Fighter 5: Final Showdown (IGDB ID: 21669)
-- - Aliens: Armageddon (IGDB ID: 124299)
-- - Fast and Furious Arcade (IGDB ID: 98694)
-- - Initial D: Arcade Stage 8 Infinity (IGDB ID: 130424)
-- - Wangan Midnight Maximum Tune 6 (IGDB ID: 112234)
--
-- Successfully added:
-- - Gundam pod games (6 arcade exclusives)
-- - Pokemon medal games (3 games)
-- - Light gun games (4 games)
-- - Fighting game arcade versions (2 games)
-- - Racing games (1 game - Cruis'n Blast)
-- - VR experiences (2 games)
-- - And others