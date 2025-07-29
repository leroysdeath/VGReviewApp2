/*
  # Complete Gaming Platform Database Schema

  1. New Tables
    - `user` - User profiles with authentication integration
    - `platform` - Gaming platforms (PC, PlayStation, Xbox, etc.)
    - `game` - Game information with IGDB integration
    - `platform_games` - Junction table for game-platform relationships
    - `rating` - User ratings and reviews for games
    - `comment` - Comments on ratings with threading support
    - `comment_like` - Like/dislike system for comments

  2. Security
    - Enable RLS on all tables
    - Policies for authenticated users to read public data
    - Users can only modify their own content
    - Public read access for games and platforms

  3. Performance
    - Comprehensive indexing strategy
    - Full-text search support with trigram indexes
    - Optimized queries for common operations

  4. Features
    - User authentication integration
    - Rating system (1.0-10.0 scale)
    - Review system with comments
    - Platform tracking
    - IGDB API integration support
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- User table
CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'supabase',
  provider_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  picurl TEXT,
  bio TEXT,
  location VARCHAR(255),
  website VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform table
CREATE TABLE IF NOT EXISTS platform (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game table
CREATE TABLE IF NOT EXISTS game (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  release_date DATE,
  description TEXT,
  pic_url TEXT,
  dev VARCHAR(255),
  publisher VARCHAR(255),
  igdb_link TEXT,
  genre VARCHAR(255),
  igdb_id INTEGER,
  metacritic_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform games junction table
CREATE TABLE IF NOT EXISTS platform_games (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  plat_id INTEGER NOT NULL REFERENCES platform(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, plat_id)
);

-- Rating table
CREATE TABLE IF NOT EXISTS rating (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  rating DECIMAL(3,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 10.0),
  post_date_time TIMESTAMPTZ DEFAULT NOW(),
  review TEXT,
  finished BOOLEAN DEFAULT FALSE,
  playtime_hours INTEGER,
  platform_id INTEGER REFERENCES platform(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, game_id)
);

-- Comment table
CREATE TABLE IF NOT EXISTS comment (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  rating_id INTEGER REFERENCES rating(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES comment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment like table
CREATE TABLE IF NOT EXISTS comment_like (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  comment_id INTEGER NOT NULL REFERENCES comment(id) ON DELETE CASCADE,
  liked_or_dislike BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, comment_id)
);

-- Enable Row Level Security
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform ENABLE ROW LEVEL SECURITY;
ALTER TABLE game ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_like ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- User policies
CREATE POLICY "Users can read all profiles"
  ON "user"
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON "user"
  FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid()::text);

-- Platform policies (read-only for all)
CREATE POLICY "Anyone can read platforms"
  ON platform
  FOR SELECT
  TO authenticated
  USING (true);

-- Game policies (read-only for all)
CREATE POLICY "Anyone can read games"
  ON game
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Anyone can read platform_games"
  ON platform_games
  FOR SELECT
  TO authenticated
  USING (true);

-- Rating policies
CREATE POLICY "Anyone can read ratings"
  ON rating
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own ratings"
  ON rating
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own ratings"
  ON rating
  FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own ratings"
  ON rating
  FOR DELETE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

-- Comment policies
CREATE POLICY "Anyone can read comments"
  ON comment
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON comment
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own comments"
  ON comment
  FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own comments"
  ON comment
  FOR DELETE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

-- Comment like policies
CREATE POLICY "Anyone can read comment likes"
  ON comment_like
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own comment likes"
  ON comment_like
  FOR ALL
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_game_updated_at BEFORE UPDATE ON game
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rating_updated_at BEFORE UPDATE ON rating
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comment_updated_at BEFORE UPDATE ON comment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance (created after tables exist)
CREATE INDEX IF NOT EXISTS idx_user_provider_id ON "user"(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_game_game_id ON game(game_id);
CREATE INDEX IF NOT EXISTS idx_game_name_trgm ON game USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_rating_user_id ON rating(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_game_id ON rating(game_id);
CREATE INDEX IF NOT EXISTS idx_rating_rating ON rating(rating);
CREATE INDEX IF NOT EXISTS idx_rating_post_date ON rating(post_date_time);
CREATE INDEX IF NOT EXISTS idx_comment_rating_id ON comment(rating_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent_id ON comment(parent_id);
CREATE INDEX IF NOT EXISTS idx_platform_games_game_id ON platform_games(game_id);
CREATE INDEX IF NOT EXISTS idx_platform_games_plat_id ON platform_games(plat_id);

-- Add index for igdb_id after confirming the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'game' AND column_name = 'igdb_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_game_igdb_id ON game(igdb_id);
  END IF;
END $$;