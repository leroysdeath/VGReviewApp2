-- ================================================================
-- MISSING GAMES MIGRATION - PHASE 1 (FINAL CLEAN - NO CONFLICTS)
-- Adding only games that don't already exist in the database
-- Generated: 2025-01-22
-- Total: ~87 games (after removing 75 total conflicts)
-- ================================================================

-- This FINAL clean version excludes ALL 75 games that already exist:
-- - 72 originally identified conflicts
-- - 3 additional conflicts found: majin-tensei-blind-thinker,
--   shin-megami-tensei-devil-summoner, tales-of-phantasia-narikiri-dungeon

BEGIN;

-- ================================================================
-- GAME AND WATCH FRANCHISE (17 new games, 7 skipped)
-- ================================================================
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
-- Wide Screen Series (1981-1982) - New entries only
('gw_fire_1980', 'Game & Watch: Fire', 'game-and-watch-fire', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1980-07-31', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_lion_1981', 'Game & Watch: Lion', 'game-and-watch-lion', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1981-04-29', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_parachute_1981', 'Game & Watch: Parachute', 'game-and-watch-parachute', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1981-06-19', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_octopus_1981', 'Game & Watch: Octopus', 'game-and-watch-octopus', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1981-07-16', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_popeye_1981', 'Game & Watch: Popeye', 'game-and-watch-popeye', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1981-08-05', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_mickey_mouse_1981', 'Game & Watch: Mickey Mouse', 'game-and-watch-mickey-mouse', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1981-10-09', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_egg_1981', 'Game & Watch: Egg', 'game-and-watch-egg', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1981-10-09', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_turtle_bridge_1982', 'Game & Watch: Turtle Bridge', 'game-and-watch-turtle-bridge', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1982-02-01', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_fire_attack_1982', 'Game & Watch: Fire Attack', 'game-and-watch-fire-attack', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1982-03-26', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_snoopy_tennis_1982', 'Game & Watch: Snoopy Tennis', 'game-and-watch-snoopy-tennis', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1982-04-28', 'Nintendo R&D1', 'Nintendo', NOW()),
-- Multi Screen Series
('gw_oil_panic_1982', 'Game & Watch: Oil Panic', 'game-and-watch-oil-panic', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1982-05-28', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_donkey_kong_1982', 'Game & Watch: Donkey Kong', 'game-and-watch-donkey-kong', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1982-06-03', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_donkey_kong_jr_1982', 'Game & Watch: Donkey Kong Jr.', 'game-and-watch-donkey-kong-jr', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1982-10-26', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_mario_bros_1983', 'Game & Watch: Mario Bros.', 'game-and-watch-mario-bros', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1983-03-14', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_rain_shower_1983', 'Game & Watch: Rain Shower', 'game-and-watch-rain-shower', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1983-08-10', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_lifeboat_1983', 'Game & Watch: Lifeboat', 'game-and-watch-lifeboat', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1983-10-25', 'Nintendo R&D1', 'Nintendo', NOW()),
('gw_pinball_1983', 'Game & Watch: Pinball', 'game-and-watch-pinball', 'Game and Watch', ARRAY['Game & Watch'], 'manual', true, '1983-12-05', 'Nintendo R&D1', 'Nintendo', NOW()),

-- ================================================================
-- DRAGON QUEST FRANCHISE (18 new games, 7 skipped)
-- ================================================================
('dq_1_2_snes', 'Dragon Quest I & II', 'dragon-quest-1-2', 'Dragon Quest', ARRAY['Super Nintendo', 'Game Boy Color'], 'manual', true, '1993-12-18', 'Chunsoft', 'Enix', NOW()),
('dq_collection_2011', 'Dragon Quest Collection', 'dragon-quest-collection', 'Dragon Quest', ARRAY['Wii'], 'manual', true, '2011-09-15', 'Square Enix', 'Square Enix', NOW()),
('dq_keshi_2021', 'Dragon Quest Keshi Keshi', 'dragon-quest-keshi-keshi', 'Dragon Quest', ARRAY['iOS', 'Android'], 'manual', true, '2021-12-01', 'Square Enix', 'Square Enix', NOW()),
('dq_monsters_2_luca', 'Dragon Quest Monsters 2: Iru and Luca''s Marvelous Mysterious Key', 'dragon-quest-monsters-2-iru-luca', 'Dragon Quest', ARRAY['Nintendo 3DS'], 'manual', true, '2014-02-06', 'Square Enix', 'Square Enix', NOW()),
('dq_monsters_super_light', 'Dragon Quest Monsters: Super Light', 'dragon-quest-monsters-super-light', 'Dragon Quest', ARRAY['iOS', 'Android'], 'manual', true, '2014-01-23', 'Square Enix', 'Square Enix', NOW()),
('dq_monsters_terry_3d', 'Dragon Quest Monsters: Terry''s Wonderland 3D', 'dragon-quest-monsters-terrys-wonderland-3d', 'Dragon Quest', ARRAY['Nintendo 3DS'], 'manual', true, '2012-05-31', 'Square Enix', 'Square Enix', NOW()),
('dq_monsters_wanted', 'Dragon Quest Monsters: Wanted!', 'dragon-quest-monsters-wanted', 'Dragon Quest', ARRAY['iOS', 'Android'], 'manual', true, '2015-11-06', 'Square Enix', 'Square Enix', NOW()),
('dq_rivals', 'Dragon Quest Rivals', 'dragon-quest-rivals', 'Dragon Quest', ARRAY['PC', 'iOS', 'Android', 'Nintendo Switch'], 'manual', true, '2017-11-02', 'Square Enix', 'Square Enix', NOW()),
('dq_wars', 'Dragon Quest Wars', 'dragon-quest-wars', 'Dragon Quest', ARRAY['DSiWare'], 'manual', true, '2009-06-24', 'Square Enix', 'Square Enix', NOW()),
('dq_xii', 'Dragon Quest XII: The Flames of Fate', 'dragon-quest-xii-the-flames-of-fate', 'Dragon Quest', ARRAY['TBA'], 'manual', true, NULL, 'Square Enix', 'Square Enix', NOW()),
('dq_battle_road_victory', 'Dragon Quest: Monster Battle Road Victory', 'dragon-quest-monster-battle-road-victory', 'Dragon Quest', ARRAY['Arcade', 'Wii'], 'manual', true, '2010-07-15', 'Square Enix', 'Square Enix', NOW()),
('dq_scan_battlers', 'Dragon Quest: Scan Battlers', 'dragon-quest-scan-battlers', 'Dragon Quest', ARRAY['Arcade'], 'manual', true, '2016-11-17', 'Square Enix', 'Square Enix', NOW()),
('dq_young_yangus', 'Dragon Quest: Young Yangus and the Mystery Dungeon', 'dragon-quest-young-yangus-mystery-dungeon', 'Dragon Quest', ARRAY['PlayStation 2'], 'manual', true, '2006-04-20', 'Cavia', 'Square Enix', NOW()),
('itadaki_street_30th', 'Itadaki Street: Dragon Quest & Final Fantasy 30th Anniversary', 'itadaki-street-dq-ff-30th', 'Dragon Quest', ARRAY['PlayStation 4', 'PlayStation Vita'], 'manual', true, '2017-10-19', 'Square Enix', 'Square Enix', NOW()),
('slime_mori_1', 'Slime MoriMori Dragon Quest', 'slime-morimori-dragon-quest', 'Dragon Quest', ARRAY['Game Boy Advance'], 'manual', true, '2003-11-14', 'TOSE', 'Square Enix', NOW()),
('slime_mori_3', 'Slime MoriMori Dragon Quest 3', 'slime-morimori-dragon-quest-3', 'Dragon Quest', ARRAY['Nintendo 3DS'], 'manual', true, '2011-11-02', 'Square Enix', 'Square Enix', NOW()),
('torneko_mystery_1', 'Torneko''s Great Adventure: Mystery Dungeon', 'tornekos-great-adventure-mystery-dungeon', 'Dragon Quest', ARRAY['Super Nintendo'], 'manual', true, '1993-09-19', 'Chunsoft', 'Chunsoft', NOW()),
('torneko_mystery_3', 'Torneko''s Great Adventure 3: Mystery Dungeon', 'tornekos-great-adventure-3', 'Dragon Quest', ARRAY['PlayStation 2', 'Game Boy Advance'], 'manual', true, '2002-10-31', 'Chunsoft', 'Enix', NOW()),

-- ================================================================
-- LEGO GAMES FRANCHISE (13 new games, 11 skipped)
-- ================================================================
('lego_drome_racers', 'LEGO Drome Racers', 'lego-drome-racers', 'Lego Games', ARRAY['PC', 'PlayStation 2', 'GameCube'], 'manual', true, '2002-11-10', 'Attention to Detail', 'Electronic Arts', NOW()),
('lego_island_xtreme', 'LEGO Island Xtreme Stunts', 'lego-island-xtreme-stunts', 'Lego Games', ARRAY['PC', 'PlayStation 2', 'Game Boy Advance'], 'manual', true, '2002-11-25', 'Silicon Dreams', 'Electronic Arts', NOW()),
('lego_city_my_city', 'LEGO City My City', 'lego-city-my-city', 'Lego Games', ARRAY['iOS', 'Android'], 'manual', true, '2012-03-15', 'TT Games', 'LEGO', NOW()),
('lego_city_my_city_2', 'LEGO City My City 2', 'lego-city-my-city-2', 'Lego Games', ARRAY['iOS', 'Android'], 'manual', true, '2016-05-12', 'TT Games', 'LEGO', NOW()),
('lego_cube', 'LEGO Cube', 'lego-cube', 'Lego Games', ARRAY['iOS', 'Android'], 'manual', true, '2021-06-24', 'LEGO', 'LEGO', NOW()),
('lego_duplo_world', 'LEGO Duplo World', 'lego-duplo-world', 'Lego Games', ARRAY['iOS', 'Android'], 'manual', true, '2020-01-08', 'StoryToys', 'LEGO', NOW()),
('lego_football_mania', 'LEGO Football Mania', 'lego-football-mania', 'Lego Games', ARRAY['PC', 'PlayStation 2', 'Game Boy Advance'], 'manual', true, '2002-06-18', 'Silicon Dreams', 'Electronic Arts', NOW()),
('lego_horizon', 'LEGO Horizon Adventures', 'lego-horizon-adventures', 'Lego Games', ARRAY['PlayStation 5', 'PC', 'Nintendo Switch'], 'manual', true, '2024-11-14', 'Guerrilla Games', 'PlayStation Studios', NOW()),
('lego_juniors_cruise', 'LEGO Juniors Create & Cruise', 'lego-juniors-create-cruise', 'Lego Games', ARRAY['iOS', 'Android'], 'manual', true, '2014-03-20', 'TT Games', 'LEGO', NOW()),
('lego_chima_online', 'LEGO Legends of Chima Online', 'lego-legends-of-chima-online', 'Lego Games', ARRAY['PC', 'Browser'], 'manual', true, '2014-01-23', 'WB Games Montreal', 'Warner Bros.', NOW()),
('lego_life', 'LEGO Life', 'lego-life', 'Lego Games', ARRAY['iOS', 'Android'], 'manual', true, '2017-01-27', 'LEGO', 'LEGO', NOW()),
('lego_sw_castaways', 'LEGO Star Wars: Castaways', 'lego-star-wars-castaways', 'Lego Games', ARRAY['Apple Arcade'], 'manual', true, '2021-11-19', 'Gameloft', 'Gameloft', NOW()),
('lego_sw_quest_r2d2', 'LEGO Star Wars: The Quest for R2-D2', 'lego-star-wars-quest-r2d2', 'Lego Games', ARRAY['Browser'], 'manual', true, '2009-08-29', 'Three Melons', 'LEGO', NOW()),

-- ================================================================
-- MEGAMI TENSEI FRANCHISE (12 new games, 9 skipped)
-- ================================================================
-- Excluding: majin-tensei-blind-thinker, shin-megami-tensei-devil-summoner
-- Plus the original 7: demikids-dark/light, jack-bros, majin-tensei, ronde, smt-nine, smt-imagine
('giten_megaten', 'Giten Megami Tensei: Tokyo Mokushiroku', 'giten-megami-tensei', 'Megami Tensei', ARRAY['PC'], 'manual', true, '1997-04-04', 'ASCII', 'ASCII', NOW()),
('last_bible_another', 'Last Bible: Another Bible', 'last-bible-another-bible', 'Megami Tensei', ARRAY['Game Gear'], 'manual', true, '1995-03-17', 'Sega', 'Atlus', NOW()),
('majin_tensei_2', 'Majin Tensei II: Spiral Nemesis', 'majin-tensei-2-spiral-nemesis', 'Megami Tensei', ARRAY['Super Nintendo'], 'manual', true, '1995-02-18', 'Atlus', 'Atlus', NOW()),
('megaten_1', 'Megami Tensei', 'megami-tensei', 'Megami Tensei', ARRAY['Nintendo Entertainment System'], 'manual', true, '1987-09-11', 'Atlus', 'Namco', NOW()),
('megaten_gaiden_lb1', 'Megami Tensei Gaiden: Last Bible', 'megami-tensei-gaiden-last-bible', 'Megami Tensei', ARRAY['Game Boy'], 'manual', true, '1992-12-23', 'Atlus', 'Atlus', NOW()),
('megaten_gaiden_lb2', 'Megami Tensei Gaiden: Last Bible II', 'megami-tensei-gaiden-last-bible-2', 'Megami Tensei', ARRAY['Game Boy'], 'manual', true, '1993-11-19', 'Atlus', 'Atlus', NOW()),
('megaten_gaiden_lb3', 'Megami Tensei Gaiden: Last Bible III', 'megami-tensei-gaiden-last-bible-3', 'Megami Tensei', ARRAY['Super Nintendo'], 'manual', true, '1995-03-04', 'Atlus', 'Atlus', NOW()),
('megaten_gaiden_lb_special', 'Megami Tensei Gaiden: Last Bible Special', 'megami-tensei-gaiden-last-bible-special', 'Megami Tensei', ARRAY['Sega CD'], 'manual', true, '1995-03-24', 'Multimedia Intelligence Transfer', 'Atlus', NOW()),
('megaten_2', 'Megami Tensei II', 'megami-tensei-2', 'Megami Tensei', ARRAY['Nintendo Entertainment System'], 'manual', true, '1990-04-06', 'Atlus', 'Namco', NOW()),
('smt_card_summoner', 'Shin Megami Tensei Trading Card: Card Summoner', 'smt-trading-card-summoner', 'Megami Tensei', ARRAY['Game Boy Advance'], 'manual', true, '2001-04-06', 'Enterbrain', 'Enterbrain', NOW()),
('smt_devil_collection', 'Shin Megami Tensei: Devil Collection', 'smt-devil-collection', 'Megami Tensei', ARRAY['Mobile'], 'manual', true, '2012-12-27', 'Index Corporation', 'Index Corporation', NOW()),
('smt_if', 'Shin Megami Tensei: if...', 'shin-megami-tensei-if', 'Megami Tensei', ARRAY['Super Nintendo', 'PlayStation', 'Game Boy Advance', 'PSP'], 'manual', true, '1994-10-28', 'Atlus', 'Atlus', NOW()),

-- ================================================================
-- TALES FRANCHISE (10 new games, 8 skipped)
-- ================================================================
-- Excluding: tales-of-phantasia-narikiri-dungeon
-- Plus the original 7: tales-of-asteria, crestoria, destiny-directors-cut, innocence-r, link, the-rays, vs
('tales_destiny_2', 'Tales of Destiny 2', 'tales-of-destiny-2', 'Tales', ARRAY['PlayStation 2'], 'manual', true, '2002-11-28', 'Namco Tales Studio', 'Namco', NOW()),
('tales_fandom_1', 'Tales of Fandom Vol. 1', 'tales-of-fandom-vol-1', 'Tales', ARRAY['PlayStation'], 'manual', true, '2002-01-31', 'Namco', 'Namco', NOW()),
('tales_fandom_2', 'Tales of Fandom Vol. 2', 'tales-of-fandom-vol-2', 'Tales', ARRAY['PlayStation 2'], 'manual', true, '2007-06-28', 'Namco Tales Studio', 'Bandai Namco', NOW()),
('tales_hearts_ds', 'Tales of Hearts', 'tales-of-hearts', 'Tales', ARRAY['Nintendo DS'], 'manual', true, '2008-12-18', 'Namco Tales Studio', 'Bandai Namco', NOW()),
('tales_innocence_ds', 'Tales of Innocence', 'tales-of-innocence', 'Tales', ARRAY['Nintendo DS'], 'manual', true, '2007-12-06', 'Namco Tales Studio', 'Bandai Namco', NOW()),
('tales_luminaria', 'Tales of Luminaria', 'tales-of-luminaria', 'Tales', ARRAY['iOS', 'Android'], 'manual', true, '2021-11-03', 'Colopl', 'Bandai Namco', NOW()),
('tales_rebirth', 'Tales of Rebirth', 'tales-of-rebirth', 'Tales', ARRAY['PlayStation 2', 'PSP'], 'manual', true, '2004-12-16', 'Namco Tales Studio', 'Namco', NOW()),
('tales_radiant_2', 'Tales of the World: Radiant Mythology 2', 'tales-world-radiant-mythology-2', 'Tales', ARRAY['PSP'], 'manual', true, '2009-01-29', 'Alfa System', 'Bandai Namco', NOW()),
('tales_radiant_3', 'Tales of the World: Radiant Mythology 3', 'tales-world-radiant-mythology-3', 'Tales', ARRAY['PSP'], 'manual', true, '2011-02-10', 'Alfa System', 'Bandai Namco', NOW()),
('tales_summoners', 'Tales of the World: Summoner''s Lineage', 'tales-world-summoners-lineage', 'Tales', ARRAY['Game Boy Advance'], 'manual', true, '2003-03-07', 'Namco', 'Namco', NOW()),

-- ================================================================
-- OTHER HIGH-PRIORITY FRANCHISES (cleaned)
-- ================================================================

-- Batman (2 new)
('batman_arkham_underworld', 'Batman: Arkham Underworld', 'batman-arkham-underworld', 'Batman', ARRAY['iOS', 'Android'], 'manual', true, '2016-07-14', 'Turbine', 'Warner Bros.', NOW()),
('batman_hero_run', 'Batman & The Flash: Hero Run', 'batman-the-flash-hero-run', 'Batman', ARRAY['iOS', 'Android'], 'manual', true, '2013-11-07', 'Glu Mobile', 'Glu Mobile', NOW()),

-- Crash Bandicoot (1 new)
('crash_boom_bang', 'Crash Boom Bang!', 'crash-boom-bang', 'Crash Bandicoot', ARRAY['Nintendo DS'], 'manual', true, '2006-10-10', 'Dimps', 'Vivendi', NOW()),

-- Far Cry (1 new)
('far_cry_vr', 'Far Cry VR: Dive Into Insanity', 'far-cry-vr-dive-into-insanity', 'Far Cry', ARRAY['VR'], 'manual', true, '2021-06-01', 'Ubisoft', 'Ubisoft', NOW()),

-- Gears of War (1 new)
('gears_6', 'Gears 6', 'gears-6', 'Gears of War', ARRAY['TBA'], 'manual', true, NULL, 'The Coalition', 'Xbox Game Studios', NOW()),

-- Kingdom Hearts (1 new)
('kh_chi_browser', 'Kingdom Hearts χ [chi]', 'kingdom-hearts-chi', 'Kingdom Hearts', ARRAY['Browser'], 'manual', true, '2013-07-18', 'Square Enix', 'Square Enix', NOW()),

-- Minecraft (1 new)
('minecraft_story_mode_s2', 'Minecraft: Story Mode - Season Two', 'minecraft-story-mode-season-two', 'Minecraft', ARRAY['Multi-platform'], 'manual', true, '2017-07-11', 'Telltale Games', 'Telltale Games', NOW()),

-- PUBG (1 new)
('game_for_peace', 'Game for Peace', 'game-for-peace', 'PUBG', ARRAY['iOS', 'Android'], 'manual', true, '2019-05-08', 'PUBG Corporation', 'Tencent', NOW()),

-- Star Wars (2 new)
('sw_galaxies', 'Star Wars Galaxies', 'star-wars-galaxies', 'Star Wars', ARRAY['PC'], 'manual', true, '2003-06-26', 'Sony Online', 'LucasArts', NOW()),
('vader_immortal', 'Vader Immortal', 'vader-immortal', 'Star Wars', ARRAY['VR'], 'manual', true, '2019-05-21', 'ILMxLAB', 'Disney', NOW()),

-- Tetris (1 new)
('tetris_friends', 'Tetris Friends', 'tetris-friends', 'Tetris', ARRAY['Browser'], 'manual', true, '2007-11-20', 'Tetris Online', 'Tetris Online', NOW()),

-- The Witcher (2 new)
('witcher_4', 'The Witcher 4', 'the-witcher-4', 'The Witcher', ARRAY['TBA'], 'manual', true, NULL, 'CD Projekt Red', 'CD Projekt', NOW()),
('witcher_remake', 'The Witcher Remake', 'the-witcher-remake', 'The Witcher', ARRAY['TBA'], 'manual', true, NULL, 'Fool''s Theory', 'CD Projekt', NOW()),

-- WWE (1 new)
('wwe_undefeated', 'WWE Undefeated', 'wwe-undefeated', 'WWE', ARRAY['iOS', 'Android'], 'manual', true, '2020-12-03', 'nWay', '2K', NOW()),

-- Warcraft (1 new)
('wow_arclight', 'World of Warcraft: Arclight Rumble', 'world-of-warcraft-arclight-rumble', 'Warcraft', ARRAY['iOS', 'Android'], 'manual', true, '2022-11-03', 'Blizzard', 'Blizzard', NOW())

ON CONFLICT (game_id) DO NOTHING;

-- Update search vectors for all newly added games
UPDATE game
SET search_vector = to_tsvector('english',
    name || ' ' ||
    COALESCE(franchise, '') || ' ' ||
    COALESCE(developer, '') || ' ' ||
    COALESCE(publisher, '')
)
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 hour';

-- Add search aliases for better discovery
UPDATE game
SET search_aliases = jsonb_build_array(
    LOWER(REPLACE(name, ':', '')),
    LOWER(REPLACE(name, ' & ', ' and ')),
    LOWER(REPLACE(name, '''', ''))
)
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 hour'
  AND search_aliases IS NULL;

COMMIT;

-- ================================================================
-- SUMMARY - FINAL CLEAN VERSION
-- ================================================================
-- Phase 1 FINAL Clean: ~87 games added (no conflicts)
--
-- Total Excluded: 75 games
-- - 72 originally identified
-- - 3 additional found:
--   * majin-tensei-blind-thinker (IGDB: 112319)
--   * shin-megami-tensei-devil-summoner (IGDB: 23088)
--   * tales-of-phantasia-narikiri-dungeon (IGDB: 69114)
--
-- Added games from:
-- - Game and Watch: 17 games (7 skipped)
-- - Dragon Quest: 18 games (7 skipped)
-- - Lego Games: 13 games (11 skipped)
-- - Megami Tensei: 12 games (9 skipped - was 7+2 more)
-- - Tales: 10 games (8 skipped - was 7+1 more)
-- - Plus additional games from other franchises
--
-- This migration is now truly safe to run without any slug conflicts
-- ================================================================