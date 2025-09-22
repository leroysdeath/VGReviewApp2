-- Add Street Fighter 6 to the database
-- IGDB ID: 114795 (confirmed from IGDB API)

INSERT INTO game (
  igdb_id,
  name,
  slug,
  summary,
  release_date,
  cover_url,
  genres,
  platforms,
  developer,
  publisher,
  igdb_rating,
  total_rating,
  rating_count,
  follows,
  hypes,
  greenlight_flag,
  created_at,
  updated_at
) VALUES (
  114795,
  'Street Fighter 6',
  'street-fighter-6',
  'Street Fighter 6 offers a highly evolved combat system with three control types - Fighting Ground, World Tour and Battle Hub. Learn the basics or master combos, anyone can play and enjoy. Take on the role of 18 diverse fighters, each with their own unique story.',
  '2023-06-02',
  'https://images.igdb.com/igdb/image/upload/t_cover_big/co5vst.jpg',
  ARRAY['Fighting'],
  ARRAY['PC (Microsoft Windows)', 'PlayStation 4', 'PlayStation 5', 'Xbox Series X|S'],
  'Capcom',
  'Capcom',
  85,
  87,
  89,
  367,
  0,
  true, -- Setting greenlight flag to ensure it shows up prominently
  NOW(),
  NOW()
) ON CONFLICT (igdb_id)
DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  summary = EXCLUDED.summary,
  release_date = EXCLUDED.release_date,
  cover_url = EXCLUDED.cover_url,
  genres = EXCLUDED.genres,
  platforms = EXCLUDED.platforms,
  developer = EXCLUDED.developer,
  publisher = EXCLUDED.publisher,
  igdb_rating = EXCLUDED.igdb_rating,
  total_rating = EXCLUDED.total_rating,
  rating_count = EXCLUDED.rating_count,
  follows = EXCLUDED.follows,
  hypes = EXCLUDED.hypes,
  greenlight_flag = EXCLUDED.greenlight_flag,
  updated_at = NOW();