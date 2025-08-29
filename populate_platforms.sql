-- Populate missing platforms in the platform table
-- These are the display names that the platformMapping.ts maps TO (not FROM)
-- The review system looks up these display names in the platform table

-- First, let's see what we already have (for reference)
-- Current platforms: PC, PlayStation 5, PlayStation 4, Xbox Series X/S, Xbox One, Nintendo Switch, Steam Deck, Android, iOS

-- Insert missing platforms that are mapped TO in platformMapping.ts
INSERT INTO platform (name, slug, description, is_active) VALUES
  -- PlayStation family (missing ones)
  ('PS5', 'ps5', 'Sony PlayStation 5', true),
  ('PS4', 'ps4', 'Sony PlayStation 4', true), 
  ('PS3', 'ps3', 'Sony PlayStation 3', true),
  ('PS2', 'ps2', 'Sony PlayStation 2', true),
  ('PS1', 'ps1', 'Sony PlayStation', true),
  ('PSP', 'psp', 'PlayStation Portable', true),
  ('PS Vita', 'ps-vita', 'PlayStation Vita', true),
  
  -- Xbox family (missing ones)
  ('Xbox 360', 'xbox-360', 'Microsoft Xbox 360', true),
  ('Xbox', 'xbox', 'Microsoft Xbox', true),
  
  -- Nintendo family
  ('Switch', 'switch', 'Nintendo Switch', true),
  ('Switch 2', 'switch-2', 'Nintendo Switch 2', true),
  ('3DS', '3ds', 'Nintendo 3DS', true),
  ('New 3DS', 'new-3ds', 'New Nintendo 3DS', true),
  ('DS', 'ds', 'Nintendo DS family', true),
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

ON CONFLICT (name) DO NOTHING;

-- Note: We're not inserting the original IGDB names (like "PC (Microsoft Windows)")
-- because the mapping system converts those to display names before database lookup.
-- The platform table should contain the display names that users see and select.