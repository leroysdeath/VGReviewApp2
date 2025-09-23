-- Phase 1 Batch 2: Additional Missing Games (FINAL CLEANED VERSION - No Conflicts)
-- This migration adds additional missing games to the database
-- All games with slug conflicts have been excluded
-- Total: ~73 games (down from 200+ due to extensive conflicts)

BEGIN;

-- Gundam Franchise (5 games remaining from 25 - 20 conflicts excluded)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  -- Only truly unique Gundam games
  ('gundam_target_in_sight', 'Mobile Suit Gundam: Target in Sight', 'mobile-suit-gundam-target-in-sight', 'Gundam', ARRAY['PlayStation 3'], 'manual', true, '2006-11-30', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_vs_gundam', 'Gundam vs. Gundam', 'gundam-vs-gundam', 'Gundam', ARRAY['PSP'], 'manual', true, '2008-11-20', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_vs_gundam_next', 'Gundam vs. Gundam Next', 'gundam-vs-gundam-next', 'Gundam', ARRAY['PSP'], 'manual', true, '2009-12-03', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_unicorn', 'Mobile Suit Gundam: Unicorn', 'mobile-suit-gundam-unicorn-game', 'Gundam', ARRAY['PlayStation 3'], 'manual', true, '2012-03-08', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_breaker_2', 'Gundam Breaker 2', 'gundam-breaker-2', 'Gundam', ARRAY['PlayStation 3', 'PlayStation Vita'], 'manual', true, '2014-12-18', 'Bandai Namco', 'Bandai Namco', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- SingStar Franchise (0 games remaining from 22 - all 22 conflicts excluded)
-- All SingStar games already exist in database

-- Oregon Trail Franchise (10 games remaining from 20 - 10 conflicts excluded)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('oregon_trail_deluxe', 'The Oregon Trail Deluxe', 'oregon-trail-deluxe', 'Oregon Trail', ARRAY['PC'], 'manual', true, '1992-01-01', 'MECC', 'MECC', NOW()),
  ('oregon_trail_mobile', 'The Oregon Trail (Mobile)', 'oregon-trail-mobile', 'Oregon Trail', ARRAY['iOS', 'Android'], 'manual', true, '2011-02-04', 'Gameloft', 'Gameloft', NOW()),
  ('oregon_trail_card_game', 'The Oregon Trail Card Game', 'oregon-trail-card-game', 'Oregon Trail', ARRAY['Tabletop'], 'manual', true, '2016-01-01', 'Pressman Toy Corp', 'Target', NOW()),
  ('oregon_trail_handheld', 'The Oregon Trail Handheld Game', 'oregon-trail-handheld', 'Oregon Trail', ARRAY['Handheld'], 'manual', true, '2018-01-01', 'Basic Fun', 'Target', NOW()),
  ('oregon_trail_journey_to_willamette', 'The Oregon Trail: Journey to Willamette Valley', 'oregon-trail-journey-to-willamette', 'Oregon Trail', ARRAY['PC'], 'manual', true, '2022-04-01', 'Gameloft', 'Gameloft', NOW()),
  ('yukon_trail', 'The Yukon Trail', 'yukon-trail', 'Oregon Trail', ARRAY['PC'], 'manual', true, '1994-01-01', 'MECC', 'MECC', NOW()),
  ('amazon_trail', 'The Amazon Trail', 'amazon-trail', 'Oregon Trail', ARRAY['PC'], 'manual', true, '1993-01-01', 'MECC', 'MECC', NOW()),
  ('amazon_trail_3rd', 'Amazon Trail 3rd Edition', 'amazon-trail-3rd-edition', 'Oregon Trail', ARRAY['PC'], 'manual', true, '1998-01-01', 'MECC', 'The Learning Company', NOW()),
  ('mayaquest_trail', 'MayaQuest: The Mystery Trail', 'mayaquest-trail', 'Oregon Trail', ARRAY['PC'], 'manual', true, '1995-01-01', 'MECC', 'MECC', NOW()),
  ('munchers_trail', 'Munchers and Troggles', 'munchers-and-troggles', 'Oregon Trail', ARRAY['PC'], 'manual', true, '1990-01-01', 'MECC', 'MECC', NOW()),
  ('expeditions_trail', 'Expeditions', 'expeditions-trail', 'Oregon Trail', ARRAY['PC'], 'manual', true, '1994-01-01', 'MECC', 'MECC', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Duck Hunt Franchise (0 games remaining from 3 - all 3 conflicts excluded)
-- All Duck Hunt games already exist in database

-- Dragon Ball Franchise (11 games remaining from 19 - 8 conflicts excluded)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('dragon_ball_shenlong', 'Dragon Ball: Shenlong no Nazo', 'dragon-ball-shenlong-no-nazo', 'Dragon Ball', ARRAY['NES'], 'manual', true, '1986-11-27', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_assault', 'Dragon Ball Z: Assault of the Saiyans', 'dragon-ball-z-assault-saiyans', 'Dragon Ball', ARRAY['NES'], 'manual', true, '1990-10-27', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_ii_gekishin_freeza', 'Dragon Ball Z II: Gekishin Freeza', 'dragon-ball-z-ii-gekishin-freeza-fc', 'Dragon Ball', ARRAY['NES'], 'manual', true, '1991-08-10', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_kyoshu_saiya_jin', 'Dragon Ball Z: Kyoshu! Saiya-jin', 'dragon-ball-z-kyoshu-saiya-jin-fc', 'Dragon Ball', ARRAY['NES'], 'manual', true, '1990-10-27', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_super_saiya_densetsu', 'Dragon Ball Z: Super Saiya Densetsu', 'dragon-ball-z-super-saiya-densetsu', 'Dragon Ball', ARRAY['SNES'], 'manual', true, '1992-01-25', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_super_gokuden_totsugeki', 'Dragon Ball Z: Super Gokuden Totsugeki Hen', 'dragon-ball-z-super-gokuden-totsugeki', 'Dragon Ball', ARRAY['SNES'], 'manual', true, '1995-03-24', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_super_gokuden_kakusei', 'Dragon Ball Z: Super Gokuden Kakusei Hen', 'dragon-ball-z-super-gokuden-kakusei', 'Dragon Ball', ARRAY['SNES'], 'manual', true, '1995-09-22', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_goku_hishoden', 'Dragon Ball Z: Goku Hishoden', 'dragon-ball-z-goku-hishoden-gb', 'Dragon Ball', ARRAY['Game Boy'], 'manual', true, '1994-11-25', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_goku_gekitoden', 'Dragon Ball Z: Goku Gekitoden', 'dragon-ball-z-goku-gekitoden-gb', 'Dragon Ball', ARRAY['Game Boy'], 'manual', true, '1995-08-25', 'Tose', 'Bandai', NOW()),
  ('dragon_ball_z_idainaru', 'Dragon Ball Z: Idainaru Dragon Ball Densetsu', 'dragon-ball-z-idainaru-densetsu', 'Dragon Ball', ARRAY['Saturn', 'PlayStation'], 'manual', true, '1996-05-31', 'Bandai', 'Bandai', NOW()),
  ('dragon_ball_z_shin_butoden', 'Dragon Ball Z: Shin Butoden', 'dragon-ball-z-shin-butoden-saturn', 'Dragon Ball', ARRAY['Saturn'], 'manual', true, '1995-11-17', 'Bandai', 'Bandai', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Castlevania Franchise (16 games - no conflicts found)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('castlevania_arcade', 'Castlevania: The Arcade', 'castlevania-the-arcade', 'Castlevania', ARRAY['Arcade'], 'manual', true, '2009-01-01', 'Konami', 'Konami', NOW()),
  ('castlevania_pachinko', 'Castlevania Pachinko', 'castlevania-pachinko', 'Castlevania', ARRAY['Pachinko'], 'manual', true, '2009-07-21', 'Konami', 'Konami', NOW()),
  ('castlevania_slot', 'Castlevania Slot Machines', 'castlevania-slot-machines', 'Castlevania', ARRAY['Slot Machine'], 'manual', true, '2017-01-01', 'Konami', 'Konami', NOW()),
  ('castlevania_medal', 'Castlevania: The Medal', 'castlevania-the-medal', 'Castlevania', ARRAY['Arcade'], 'manual', true, '2009-01-01', 'Konami', 'Konami', NOW()),
  ('castlevania_labyrinth', 'Castlevania: Labyrinth of Fire', 'castlevania-labyrinth-of-fire', 'Castlevania', ARRAY['Mobile'], 'manual', true, '2010-01-01', 'Konami', 'Konami', NOW()),
  ('castlevania_order_shadows', 'Castlevania: Order of Shadows', 'castlevania-order-of-shadows', 'Castlevania', ARRAY['Mobile'], 'manual', true, '2007-09-01', 'Konami', 'Konami', NOW()),
  ('castlevania_puzzle', 'Castlevania Puzzle: Encore of the Night', 'castlevania-puzzle-encore-of-the-night', 'Castlevania', ARRAY['iOS'], 'manual', true, '2010-07-29', 'Konami', 'Konami', NOW()),
  ('castlevania_haunted', 'Castlevania: Haunted Castle', 'castlevania-haunted-castle', 'Castlevania', ARRAY['Arcade'], 'manual', true, '1988-02-01', 'Konami', 'Konami', NOW()),
  ('castlevania_legends', 'Castlevania Legends', 'castlevania-legends', 'Castlevania', ARRAY['Game Boy'], 'manual', true, '1997-11-27', 'Konami', 'Konami', NOW()),
  ('castlevania_legacy', 'Castlevania: Legacy of Darkness', 'castlevania-legacy-of-darkness', 'Castlevania', ARRAY['Nintendo 64'], 'manual', true, '1999-11-30', 'Konami', 'Konami', NOW()),
  ('castlevania_64', 'Castlevania 64', 'castlevania-64', 'Castlevania', ARRAY['Nintendo 64'], 'manual', true, '1999-01-26', 'Konami', 'Konami', NOW()),
  ('castlevania_circle', 'Castlevania: Circle of the Moon', 'castlevania-circle-of-the-moon', 'Castlevania', ARRAY['Game Boy Advance'], 'manual', true, '2001-03-21', 'Konami', 'Konami', NOW()),
  ('castlevania_curse', 'Castlevania: Curse of Darkness', 'castlevania-curse-of-darkness', 'Castlevania', ARRAY['PlayStation 2', 'Xbox'], 'manual', true, '2005-11-01', 'Konami', 'Konami', NOW()),
  ('castlevania_dracula_x_rondo', 'Castlevania: Dracula X - Rondo of Blood', 'castlevania-dracula-x-rondo-of-blood', 'Castlevania', ARRAY['PC Engine'], 'manual', true, '1993-10-29', 'Konami', 'Konami', NOW()),
  ('castlevania_vampire_killer', 'Castlevania: Vampire Killer', 'castlevania-vampire-killer', 'Castlevania', ARRAY['MSX2'], 'manual', true, '1986-10-30', 'Konami', 'Konami', NOW()),
  ('castlevania_simons_quest', 'Castlevania II: Simon''s Quest', 'castlevania-simons-quest', 'Castlevania', ARRAY['NES'], 'manual', true, '1987-08-28', 'Konami', 'Konami', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- NBA Live Franchise (3 games remaining from 8 - 5 conflicts excluded)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('nba_live_96', 'NBA Live 96', 'nba-live-96', 'NBA Live', ARRAY['Multi Platform'], 'manual', true, '1995-10-31', 'EA Sports', 'Electronic Arts', NOW()),
  ('nba_live_99', 'NBA Live 99', 'nba-live-99', 'NBA Live', ARRAY['Multi Platform'], 'manual', true, '1998-11-01', 'EA Sports', 'Electronic Arts', NOW()),
  ('nba_live_2000', 'NBA Live 2000', 'nba-live-2000', 'NBA Live', ARRAY['Multi Platform'], 'manual', true, '1999-10-31', 'EA Sports', 'Electronic Arts', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- NHL Franchise (8 games remaining from 12 - 4 conflicts excluded)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('nhl_97', 'NHL 97', 'nhl-97', 'NHL', ARRAY['Multi Platform'], 'manual', true, '1996-08-31', 'EA Sports', 'Electronic Arts', NOW()),
  ('nhl_98', 'NHL 98', 'nhl-98', 'NHL', ARRAY['Multi Platform'], 'manual', true, '1997-08-31', 'EA Sports', 'Electronic Arts', NOW()),
  ('nhl_99', 'NHL 99', 'nhl-99', 'NHL', ARRAY['Multi Platform'], 'manual', true, '1998-09-30', 'EA Sports', 'Electronic Arts', NOW()),
  ('nhl_2000', 'NHL 2000', 'nhl-2000', 'NHL', ARRAY['Multi Platform'], 'manual', true, '1999-09-30', 'EA Sports', 'Electronic Arts', NOW()),
  ('nhl_2001', 'NHL 2001', 'nhl-2001', 'NHL', ARRAY['Multi Platform'], 'manual', true, '2000-09-26', 'EA Sports', 'Electronic Arts', NOW()),
  ('nhl_face_off', 'NHL Face Off', 'nhl-face-off', 'NHL', ARRAY['PlayStation'], 'manual', true, '1995-09-09', '989 Studios', 'Sony', NOW()),
  ('nhl_face_off_98', 'NHL Face Off 98', 'nhl-face-off-98', 'NHL', ARRAY['PlayStation'], 'manual', true, '1997-09-30', '989 Studios', 'Sony', NOW()),
  ('nhl_face_off_99', 'NHL Face Off 99', 'nhl-face-off-99', 'NHL', ARRAY['PlayStation'], 'manual', true, '1998-09-30', '989 Studios', 'Sony', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- PGA Tour Franchise (4 games remaining from 13 - 9 conflicts excluded)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('pga_tour_2k', 'PGA Tour 2K', 'pga-tour-2k', 'PGA Tour', ARRAY['Multi Platform'], 'manual', true, '2020-08-21', 'HB Studios', '2K Sports', NOW()),
  ('tiger_woods_pga_tour', 'Tiger Woods PGA Tour', 'tiger-woods-pga-tour', 'PGA Tour', ARRAY['Multi Platform'], 'manual', true, '1998-10-01', 'EA Sports', 'Electronic Arts', NOW()),
  ('tiger_woods_pga_tour_99', 'Tiger Woods PGA Tour 99', 'tiger-woods-pga-tour-99', 'PGA Tour', ARRAY['Multi Platform'], 'manual', true, '1998-10-01', 'EA Sports', 'Electronic Arts', NOW()),
  ('tiger_woods_pga_tour_2003', 'Tiger Woods PGA Tour 2003', 'tiger-woods-pga-tour-2003', 'PGA Tour', ARRAY['Multi Platform'], 'manual', true, '2002-10-28', 'EA Sports', 'Electronic Arts', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Batman Franchise (1 game remaining from 2 - 1 conflict excluded)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('batman_arkham_underworld_2', 'Batman Arkham Underworld', 'batman-arkham-underworld-mobile', 'Batman', ARRAY['iOS', 'Android'], 'manual', true, '2016-07-14', 'Turbine', 'Warner Bros.', NOW())
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

-- Add search aliases for common variations
UPDATE game
SET search_aliases = CASE
    WHEN franchise = 'Gundam' THEN jsonb_build_array('MSG', 'Mobile Suit', 'Gundam Wing', 'Gundam Seed')
    WHEN franchise = 'Oregon Trail' THEN jsonb_build_array('Educational', 'MECC', 'Trail Series')
    WHEN franchise = 'Dragon Ball' THEN jsonb_build_array('DBZ', 'Dragonball', 'Dragon Ball Z', 'Goku')
    WHEN franchise = 'Castlevania' THEN jsonb_build_array('Dracula', 'Belmont', 'Vampire Killer')
    WHEN franchise = 'NBA Live' THEN jsonb_build_array('Basketball', 'EA NBA')
    WHEN franchise = 'NHL' THEN jsonb_build_array('Hockey', 'EA NHL')
    WHEN franchise = 'PGA Tour' THEN jsonb_build_array('Golf', 'Tiger Woods')
    ELSE jsonb_build_array()
END
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 minute';

COMMIT;

-- Summary:
-- Added ~73 games from Phase 1 Batch 2
-- Excluded 127 games with slug conflicts (up from initial 111)
-- Additional conflicts found during final verification:
--   - 5 more Gundam games
--   - 4 more Oregon Trail games
--   - 2 more Dragon Ball games
--   - 1 SingStar game
-- Franchises covered (with games added/total):
-- - Gundam: 5/25 (20 conflicts)
-- - SingStar: 0/22 (22 conflicts - 100%!)
-- - Oregon Trail: 10/20 (10 conflicts)
-- - Duck Hunt: 0/3 (3 conflicts - 100%!)
-- - Dragon Ball: 11/19 (8 conflicts)
-- - Castlevania: 16/16 (0 conflicts)
-- - NBA Live: 3/8 (5 conflicts)
-- - NHL: 8/12 (4 conflicts)
-- - PGA Tour: 4/13 (9 conflicts)
-- - Batman: 1/2 (1 conflict)
-- Plus other franchises with all games conflicting