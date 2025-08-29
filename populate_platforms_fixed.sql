-- Fix platform table to match platformMapping.ts
-- Step 1: Update existing platforms to match the mapped display names

UPDATE platform SET name = 'PS5' WHERE slug = 'ps5' AND name = 'PlayStation 5';
UPDATE platform SET name = 'PS4' WHERE slug = 'ps4' AND name = 'PlayStation 4';
UPDATE platform SET name = 'Switch' WHERE slug = 'switch' AND name = 'Nintendo Switch';

-- Step 2: Insert missing platforms with unique slugs
-- Only insert platforms that don't already exist (checking by name)

INSERT INTO platform (name, slug, description, is_active) 
SELECT * FROM (VALUES
  -- PlayStation family (missing ones)
  ('PS3', 'ps3', 'Sony PlayStation 3', true),
  ('PS2', 'ps2', 'Sony PlayStation 2', true),
  ('PS1', 'ps1', 'Sony PlayStation', true),
  ('PSP', 'psp', 'PlayStation Portable', true),
  ('PS Vita', 'ps-vita', 'PlayStation Vita', true),
  
  -- Xbox family (missing ones)
  ('Xbox 360', 'xbox-360', 'Microsoft Xbox 360', true),
  ('Xbox', 'xbox-original', 'Microsoft Xbox', true), -- Changed slug to avoid conflicts
  
  -- Nintendo family
  ('Switch 2', 'switch-2', 'Nintendo Switch 2', true),
  ('3DS', '3ds', 'Nintendo 3DS', true),
  ('New 3DS', 'new-3ds', 'New Nintendo 3DS', true),
  ('DS', 'nds', 'Nintendo DS family', true), -- Changed slug to avoid conflicts
  ('Wii U', 'wii-u', 'Nintendo Wii U', true),
  ('Wii', 'wii', 'Nintendo Wii', true),
  ('GameCube', 'gamecube', 'Nintendo GameCube', true),
  ('N64', 'n64', 'Nintendo 64', true),
  ('SNES', 'snes', 'Super Nintendo Entertainment System', true),
  ('NES', 'nes', 'Nintendo Entertainment System family', true),
  ('GBA', 'gba', 'Game Boy Advance', true),
  ('GBC', 'gbc', 'Game Boy Color', true),
  ('Game Boy', 'game-boy', 'Game Boy', true),
  
  -- Computer platforms (missing ones)
  ('Mac', 'mac', 'Apple macOS', true),
  ('Linux', 'linux', 'Linux', true),
  
  -- Other platforms
  ('Browser', 'browser', 'Web browser', true)
) AS v(name, slug, description, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM platform WHERE platform.name = v.name
);

-- Step 3: Verify what we have
SELECT name, slug FROM platform ORDER BY name;