-- Phase 1 Batch 2B: Castlevania, Sports, and Other Games
-- This migration adds missing games from Castlevania, NBA Live, NHL, PGA Tour, and Batman franchises
-- Total: ~46 games

BEGIN;

-- Castlevania Franchise (16 games)
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

-- NBA Live Franchise (3 games)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('nba_live_96', 'NBA Live 96', 'nba-live-96', 'NBA Live', ARRAY['Multi Platform'], 'manual', true, '1995-10-31', 'EA Sports', 'Electronic Arts', NOW()),
  ('nba_live_99', 'NBA Live 99', 'nba-live-99', 'NBA Live', ARRAY['Multi Platform'], 'manual', true, '1998-11-01', 'EA Sports', 'Electronic Arts', NOW()),
  ('nba_live_2000', 'NBA Live 2000', 'nba-live-2000', 'NBA Live', ARRAY['Multi Platform'], 'manual', true, '1999-10-31', 'EA Sports', 'Electronic Arts', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- NHL Franchise (8 games)
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

-- PGA Tour Franchise (4 games)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('pga_tour_2k', 'PGA Tour 2K', 'pga-tour-2k', 'PGA Tour', ARRAY['Multi Platform'], 'manual', true, '2020-08-21', 'HB Studios', '2K Sports', NOW()),
  ('tiger_woods_pga_tour', 'Tiger Woods PGA Tour', 'tiger-woods-pga-tour', 'PGA Tour', ARRAY['Multi Platform'], 'manual', true, '1998-10-01', 'EA Sports', 'Electronic Arts', NOW()),
  ('tiger_woods_pga_tour_99', 'Tiger Woods PGA Tour 99', 'tiger-woods-pga-tour-99', 'PGA Tour', ARRAY['Multi Platform'], 'manual', true, '1998-10-01', 'EA Sports', 'Electronic Arts', NOW()),
  ('tiger_woods_pga_tour_2003', 'Tiger Woods PGA Tour 2003', 'tiger-woods-pga-tour-2003', 'PGA Tour', ARRAY['Multi Platform'], 'manual', true, '2002-10-28', 'EA Sports', 'Electronic Arts', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Batman Franchise (1 game)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('batman_arkham_underworld_2', 'Batman Arkham Underworld', 'batman-arkham-underworld-mobile', 'Batman', ARRAY['iOS', 'Android'], 'manual', true, '2016-07-14', 'Turbine', 'Warner Bros.', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- SingStar Franchise (0 games - all 22 already exist in database)
-- Duck Hunt Franchise (0 games - all 3 already exist in database)

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
    WHEN franchise = 'Castlevania' THEN jsonb_build_array('Dracula', 'Belmont', 'Vampire Killer')
    WHEN franchise = 'NBA Live' THEN jsonb_build_array('Basketball', 'EA NBA')
    WHEN franchise = 'NHL' THEN jsonb_build_array('Hockey', 'EA NHL')
    WHEN franchise = 'PGA Tour' THEN jsonb_build_array('Golf', 'Tiger Woods')
    WHEN franchise = 'Batman' THEN jsonb_build_array('Dark Knight', 'Arkham', 'DC Comics')
    ELSE jsonb_build_array()
END
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 minute';

COMMIT;

-- Summary:
-- Added 46 games from Phase 1 Batch 2B
-- Franchises covered:
-- - Castlevania: 16 games (no conflicts!)
-- - NBA Live: 3 games
-- - NHL: 8 games
-- - PGA Tour: 4 games
-- - Batman: 1 game
-- Note: SingStar (22 conflicts) and Duck Hunt (3 conflicts) all exist already