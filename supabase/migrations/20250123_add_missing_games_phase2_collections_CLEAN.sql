-- Phase 2: Collections, Remasters, and Compilations (CLEANED VERSION)
-- This migration adds missing game collections, HD remasters, and compilation releases
-- All conflicting entries have been removed
-- Total: ~34 games (down from 45 due to conflicts)

BEGIN;

-- Dragon Quest Collections (excluding 25th Anniversary which exists)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('dq_1_2_snes', 'Dragon Quest I & II', 'dragon-quest-i-ii-snes', 'Dragon Quest', ARRAY['SNES'], 'manual', true, '1993-12-18', 'Enix', 'Enix', NOW()),
  ('dq_1_2_gbc', 'Dragon Quest I & II', 'dragon-quest-i-ii-gbc', 'Dragon Quest', ARRAY['Game Boy Color'], 'manual', true, '1999-09-23', 'Enix', 'Enix', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Far Cry Collections
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('far_cry_anthology', 'Far Cry Anthology', 'far-cry-anthology', 'Far Cry', ARRAY['PC'], 'manual', true, '2014-11-01', 'Ubisoft', 'Ubisoft', NOW()),
  ('far_cry_5_new_dawn_bundle', 'Far Cry 5 + Far Cry New Dawn Bundle', 'far-cry-5-new-dawn-bundle', 'Far Cry', ARRAY['PC', 'PlayStation 4', 'Xbox One'], 'manual', true, '2019-02-15', 'Ubisoft', 'Ubisoft', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Halo Collections
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('halo_history_pack', 'Halo History Pack', 'halo-history-pack', 'Halo', ARRAY['Xbox 360'], 'manual', true, '2009-09-01', 'Bungie', 'Microsoft', NOW()),
  ('halo_triple_pack', 'Halo Triple Pack', 'halo-triple-pack', 'Halo', ARRAY['Xbox'], 'manual', true, '2005-09-01', 'Bungie', 'Microsoft', NOW()),
  ('halo_infinite_limited', 'Halo Infinite Limited Edition', 'halo-infinite-limited-edition', 'Halo', ARRAY['Xbox Series X|S', 'PC'], 'manual', true, '2021-12-08', '343 Industries', 'Xbox Game Studios', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Tomb Raider Collections
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('tomb_raider_collection_98', 'Tomb Raider Collection', 'tomb-raider-collection-1998', 'Tomb Raider', ARRAY['PC'], 'manual', true, '1998-11-01', 'Core Design', 'Eidos', NOW()),
  ('tomb_raider_trilogy_ps3', 'Tomb Raider Trilogy', 'tomb-raider-trilogy', 'Tomb Raider', ARRAY['PlayStation 3'], 'manual', true, '2011-03-25', 'Crystal Dynamics', 'Square Enix', NOW()),
  ('tomb_raider_gold', 'Tomb Raider Gold', 'tomb-raider-gold-edition', 'Tomb Raider', ARRAY['PC'], 'manual', true, '1998-11-25', 'Core Design', 'Eidos', NOW()),
  ('tomb_raider_ii_gold', 'Tomb Raider II Gold', 'tomb-raider-ii-gold-edition', 'Tomb Raider', ARRAY['PC'], 'manual', true, '1999-12-01', 'Core Design', 'Eidos', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Tony Hawk Collections
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('tony_hawk_collection_gba', 'Tony Hawk Collection', 'tony-hawk-collection', 'Tony Hawk', ARRAY['Game Boy Advance'], 'manual', true, '2004-10-28', 'Neversoft', 'Activision', NOW()),
  ('tony_hawk_3_4_combo', 'Tony Hawk''s Pro Skater 3 + 4 Combo Pack', 'tony-hawks-pro-skater-3-4-combo-pack', 'Tony Hawk', ARRAY['PC'], 'manual', true, '2005-01-01', 'Neversoft', 'Activision', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- The Witcher Collections
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('witcher_trilogy', 'The Witcher Trilogy', 'the-witcher-trilogy', 'The Witcher', ARRAY['PC'], 'manual', true, '2016-12-01', 'CD Projekt Red', 'CD Projekt', NOW()),
  ('witcher_3_complete', 'The Witcher 3: Wild Hunt - Complete Edition', 'the-witcher-3-complete-edition', 'The Witcher', ARRAY['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'], 'manual', true, '2016-08-30', 'CD Projekt Red', 'CD Projekt', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Call of Duty Collections and Remasters (0 games - all 5 already exist!)
-- All COD collections found in database:
-- - Call of Duty: Trilogy (exists)
-- - Call of Duty: Modern Warfare Collection (exists)
-- - Call of Duty: Black Ops Collection (exists)
-- - Call of Duty: Modern Warfare Trilogy (exists)
-- - Call of Duty Classic (exists)

-- Castlevania Collections
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('castlevania_dominus_collection', 'Castlevania Dominus Collection', 'castlevania-dominus-collection', 'Castlevania', ARRAY['PC', 'PlayStation 4', 'PlayStation 5', 'Xbox One', 'Xbox Series X|S', 'Nintendo Switch'], 'manual', true, '2024-08-27', 'Konami', 'Konami', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Frogger Collections
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('frogger_25th_anniversary', 'Frogger: 25th Anniversary Edition', 'frogger-25th-anniversary-edition', 'Frogger', ARRAY['PC'], 'manual', true, '2006-11-01', 'Konami', 'Konami', NOW()),
  ('konami_anniversary_collection', 'Konami Anniversary Collection', 'konami-anniversary-collection-arcade', 'Multiple', ARRAY['PlayStation'], 'manual', true, '1999-03-31', 'Konami', 'Konami', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Dragon Ball Collections (1 game - Budokai HD exists)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('db_origins_collection', 'Dragon Ball Origins Collection', 'dragon-ball-origins-collection', 'Dragon Ball', ARRAY['Nintendo DS'], 'manual', true, '2011-06-01', 'Game Republic', 'Bandai Namco', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Forza Collections (1 game - 2 already exist)
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('forza_7_horizon_3_bundle', 'Forza Motorsport 7 and Forza Horizon 3 Bundle', 'forza-motorsport-7-horizon-3-bundle', 'Forza', ARRAY['Xbox One'], 'manual', true, '2018-02-27', 'Turn 10/Playground', 'Microsoft', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Madden Special Editions (0 games - both already exist!)
-- - Madden NFL 20: Superstar Edition (exists)
-- - Madden NFL 20: Ultimate Superstar Edition (exists)

-- PES Collection
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('pes_card_collection', 'PES Card Collection', 'pes-card-collection', 'Pro Evolution Soccer', ARRAY['iOS', 'Android'], 'manual', true, '2014-04-17', 'Konami', 'Konami', NOW())
ON CONFLICT (game_id) DO NOTHING;

-- Shin Megami Tensei Collection
INSERT INTO game (game_id, name, slug, franchise, platforms, data_source, is_official, release_date, developer, publisher, created_at)
VALUES
  ('smt_devil_collection', 'Shin Megami Tensei: Devil Collection', 'shin-megami-tensei-devil-collection', 'Megami Tensei', ARRAY['Mobile'], 'manual', true, '2012-03-01', 'Atlus', 'Atlus', NOW())
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

-- Add search aliases for collections
UPDATE game
SET search_aliases = CASE
    WHEN name LIKE '%Collection%' THEN jsonb_build_array('Bundle', 'Compilation', 'Complete')
    WHEN name LIKE '%Trilogy%' THEN jsonb_build_array('Triple Pack', 'Three Games', 'Collection')
    WHEN name LIKE '%HD%' THEN jsonb_build_array('Remaster', 'High Definition', 'Updated')
    WHEN name LIKE '%Anniversary%' THEN jsonb_build_array('Special Edition', 'Celebration', 'Classic')
    WHEN name LIKE '%Complete Edition%' THEN jsonb_build_array('GOTY', 'Game of the Year', 'All DLC')
    ELSE jsonb_build_array()
END
WHERE data_source = 'manual'
  AND created_at >= NOW() - INTERVAL '1 minute';

COMMIT;

-- Summary:
-- Added ~24 collection and remaster games from Phase 2 (down from 45)
--
-- Conflicts found and excluded (11 total):
-- - Dragon Quest: 1 conflict (25th Anniversary)
-- - Call of Duty: 5 conflicts (ALL collections already exist!)
-- - Dragon Ball: 1 conflict (Budokai HD)
-- - Forza: 2 conflicts (Anniversary, Expansions)
-- - Madden: 2 conflicts (both special editions exist)
--
-- Successfully added:
-- - Dragon Quest: 2 collections
-- - Far Cry: 2 bundles
-- - Halo: 3 collections
-- - Tomb Raider: 4 collections
-- - Tony Hawk: 2 collections
-- - The Witcher: 2 collections
-- - Castlevania: 1 collection
-- - Frogger: 2 collections
-- - Dragon Ball: 1 collection
-- - Forza: 1 bundle
-- - PES: 1 collection
-- - Shin Megami Tensei: 1 collection