-- Phase 3A: Arcade-Only Releases
-- This migration adds arcade-exclusive games that were never released on home platforms
-- Focus on games valued by arcade enthusiasts and completionists
-- Total: ~35 games

BEGIN;

-- Castlevania Arcade Games (Note: 4 of these were in Phase 1 Batch 2B but checking again)
-- These are unique arcade/gambling experiences
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  -- These might already exist from Batch 2B, using ON CONFLICT to be safe
  ('castlevania_haunted_castle_arc', 'Haunted Castle', 'haunted-castle', 'Castlevania', ARRAY['Arcade'], 'manual', true, '1988-02-01', 'Konami', 'Konami', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Dragon Quest Arcade Games
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('dq_battle_road_victory', 'Dragon Quest: Monster Battle Road Victory', 'dragon-quest-monster-battle-road-victory', 'Dragon Quest', ARRAY['Arcade'], 'manual', true, '2010-07-01', 'Rocket Studio', 'Square Enix', NOW()),
  ('dq_scan_battlers', 'Dragon Quest: Scan Battlers', 'dragon-quest-scan-battlers', 'Dragon Quest', ARRAY['Arcade'], 'manual', true, '2016-11-17', 'Rocket Studio', 'Square Enix', NOW()),
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

-- VR Arcade Experiences
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('far_cry_vr_insanity', 'Far Cry VR: Dive Into Insanity', 'far-cry-vr-dive-into-insanity', 'Far Cry', ARRAY['Arcade'], 'manual', true, '2021-06-01', 'Ubisoft', 'Zero Latency', NOW()),
  ('halo_outpost_discovery', 'Halo: Outpost Discovery', 'halo-outpost-discovery', 'Halo', ARRAY['Arcade'], 'manual', true, '2019-07-05', '343 Industries', 'Herschend Live', NOW()),
  ('luigi_mansion_arcade', 'Luigi''s Mansion Arcade', 'luigi-mansion-arcade', 'Mario', ARRAY['Arcade'], 'manual', true, '2015-06-19', 'Capcom', 'Nintendo/Capcom', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Fighting Game Arcade Exclusives
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('tekken_tag_2_unlimited', 'Tekken Tag Tournament 2 Unlimited', 'tekken-tag-tournament-2-unlimited', 'Tekken', ARRAY['Arcade'], 'manual', true, '2012-03-27', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('tekken_7_fated_retribution', 'Tekken 7: Fated Retribution', 'tekken-7-fated-retribution', 'Tekken', ARRAY['Arcade'], 'manual', true, '2016-07-05', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('street_fighter_ex', 'Street Fighter EX', 'street-fighter-ex-arcade', 'Street Fighter', ARRAY['Arcade'], 'manual', true, '1996-12-01', 'Arika', 'Capcom', NOW()),
  ('virtua_fighter_5_r', 'Virtua Fighter 5 R', 'virtua-fighter-5-r', 'Virtua Fighter', ARRAY['Arcade'], 'manual', true, '2008-07-24', 'Sega AM2', 'Sega', NOW()),
  ('virtua_fighter_5_final', 'Virtua Fighter 5 Final Showdown', 'virtua-fighter-5-final-showdown', 'Virtua Fighter', ARRAY['Arcade'], 'manual', true, '2010-07-29', 'Sega AM2', 'Sega', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Light Gun Arcade Games
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('house_dead_scarlet', 'House of the Dead: Scarlet Dawn', 'house-of-the-dead-scarlet-dawn', 'House of the Dead', ARRAY['Arcade'], 'manual', true, '2018-09-13', 'Sega', 'Sega', NOW()),
  ('time_crisis_razing_storm', 'Time Crisis: Razing Storm', 'time-crisis-razing-storm-arcade', 'Time Crisis', ARRAY['Arcade'], 'manual', true, '2009-12-01', 'Nex Entertainment', 'Bandai Namco', NOW()),
  ('terminator_salvation_arcade', 'Terminator Salvation', 'terminator-salvation-arcade', 'Terminator', ARRAY['Arcade'], 'manual', true, '2010-04-01', 'Play Mechanix', 'Raw Thrills', NOW()),
  ('aliens_armageddon', 'Aliens: Armageddon', 'aliens-armageddon', 'Alien', ARRAY['Arcade'], 'manual', true, '2014-04-01', 'Play Mechanix', 'Raw Thrills', NOW()),
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

-- Racing Arcade Exclusives
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('initial_d_arcade_8', 'Initial D Arcade Stage 8 Infinity', 'initial-d-arcade-stage-8-infinity', 'Initial D', ARRAY['Arcade'], 'manual', true, '2014-03-07', 'Sega', 'Sega', NOW()),
  ('wangan_midnight_6', 'Wangan Midnight Maximum Tune 6', 'wangan-midnight-maximum-tune-6', 'Wangan Midnight', ARRAY['Arcade'], 'manual', true, '2018-07-12', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('fast_furious_arcade', 'Fast & Furious Arcade', 'fast-and-furious-arcade', 'Fast & Furious', ARRAY['Arcade'], 'manual', true, '2004-03-01', 'Raw Thrills', 'Raw Thrills', NOW()),
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
    WHEN franchise IN ('Initial D', 'Wangan Midnight') THEN jsonb_build_array('Racing', 'Drift', 'Street Racing')
    ELSE jsonb_build_array()
END
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 minute';

-- Also update franchise for existing arcade games that were found
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
    ELSE franchise
END
WHERE igdb_id IN (76822, 72551, 102066, 78236, 39342, 19840, 48711, 66485, 18138, 131487, 92218, 91720, 85872, 13895)
  AND franchise IS NULL;

COMMIT;

-- Summary:
-- Added ~35 arcade-exclusive games across multiple franchises
-- Updated franchise associations for 14 existing arcade games
-- Focused on games valued by arcade enthusiasts:
--   - Japan-exclusive arcade releases
--   - Fighting game arcade versions with unique content
--   - Light gun games only available in arcades
--   - VR arcade experiences
--   - Medal/card-based arcade games
--   - Racing games with specialized cabinets
--
-- Note: Some games like Counter-Strike Neo and Halo: Fireteam Raven
-- were already in the database but lacked franchise associations