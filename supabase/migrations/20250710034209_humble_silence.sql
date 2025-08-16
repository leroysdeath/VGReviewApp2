/*
  # Platform Table Creation and Seeding

  1. New Tables
    - `platform`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `platform` table
    - Add policy for public read access to platforms

  3. Data
    - Insert all gaming platforms with proper slugs
*/

-- Create platform table
CREATE TABLE IF NOT EXISTS platform (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE platform ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to platforms
CREATE POLICY "Platforms are publicly readable"
  ON platform
  FOR SELECT
  TO public
  USING (true);

-- Insert platform data
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