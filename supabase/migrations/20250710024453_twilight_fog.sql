/*
  # Seed Platform Data

  1. Insert common gaming platforms
  2. Ensure consistent platform data across environments
*/

INSERT INTO platform (name, slug) VALUES
  ('PC (Microsoft Windows)', 'pc'),
  ('Mac', 'mac'),
  ('PlayStation 5', 'ps5'),
  ('PlayStation 4', 'ps4'),
  ('PlayStation 3', 'ps3'),
  ('PlayStation 2', 'ps2'),
  ('PlayStation 1', 'ps1'),
  ('PlayStation Portable', 'psp'),
  ('PlayStation Vita', 'psvita'),
  ('Xbox Series X/S', 'xbox-series'),
  ('Xbox One', 'xbox-one'),
  ('Xbox 360', 'xbox-360'),
  ('Xbox', 'xbox'),
  ('Nintendo Switch', 'nintendo-switch'),
  ('Nintendo 3DS', 'nintendo-3ds'),
  ('Nintendo DS', 'nintendo-ds'),
  ('Nintendo Wii U', 'nintendo-wii-u'),
  ('Nintendo Wii', 'nintendo-wii'),
  ('Nintendo GameCube', 'nintendo-gamecube'),
  ('Nintendo 64', 'nintendo-64'),
  ('Super Nintendo', 'super-nintendo'),
  ('Nintendo Entertainment System', 'nes'),
  ('Game Boy Advance', 'gba'),
  ('Game Boy Color', 'gbc'),
  ('Game Boy', 'gameboy'),
  ('Sega Genesis', 'sega-genesis'),
  ('Sega Dreamcast', 'sega-dreamcast'),
  ('Sega Saturn', 'sega-saturn'),
  ('Sega Game Gear', 'sega-game-gear'),
  ('Atari 2600', 'atari-2600'),
  ('Atari 7800', 'atari-7800'),
  ('Neo Geo', 'neo-geo'),
  ('TurboGrafx-16', 'turbografx-16'),
  ('3DO', '3do'),
  ('Jaguar', 'jaguar'),
  ('Steam Deck', 'steam-deck'),
  ('iOS', 'ios'),
  ('Android', 'android'),
  ('Arcade', 'arcade'),
  ('Virtual Reality', 'vr'),
  ('Retro Handheld', 'retro-handheld')
ON CONFLICT (slug) DO NOTHING;