-- Phase 1 Batch 2A: Gundam, Oregon Trail, and Dragon Ball Games
-- This migration adds missing games from three major franchises
-- Total: ~27 games

BEGIN;

-- Gundam Franchise (5 games)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('gundam_target_in_sight', 'Mobile Suit Gundam: Target in Sight', 'mobile-suit-gundam-target-in-sight', 'Gundam', ARRAY['PlayStation 3'], 'manual', true, '2006-11-30', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_vs_gundam', 'Gundam vs. Gundam', 'gundam-vs-gundam', 'Gundam', ARRAY['PSP'], 'manual', true, '2008-11-20', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_vs_gundam_next', 'Gundam vs. Gundam Next', 'gundam-vs-gundam-next', 'Gundam', ARRAY['PSP'], 'manual', true, '2009-12-03', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_unicorn', 'Mobile Suit Gundam: Unicorn', 'mobile-suit-gundam-unicorn-game', 'Gundam', ARRAY['PlayStation 3'], 'manual', true, '2012-03-08', 'Bandai Namco', 'Bandai Namco', NOW()),
  ('gundam_breaker_2', 'Gundam Breaker 2', 'gundam-breaker-2', 'Gundam', ARRAY['PlayStation 3', 'PlayStation Vita'], 'manual', true, '2014-12-18', 'Bandai Namco', 'Bandai Namco', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Oregon Trail Franchise (11 games)
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

-- Dragon Ball Franchise (11 games)
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
    ELSE jsonb_build_array()
END
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 minute';

COMMIT;

-- Summary:
-- Added 27 games from Phase 1 Batch 2A
-- Franchises covered:
-- - Gundam: 5 games
-- - Oregon Trail: 11 games
-- - Dragon Ball: 11 games