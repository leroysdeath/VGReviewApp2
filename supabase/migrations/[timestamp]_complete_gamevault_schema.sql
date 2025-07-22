-- =====================================================
-- GameVault Complete Database Schema with Authentication
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- AUTHENTICATION & USER MANAGEMENT
-- =====================================================

-- User profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS "user" (
  id SERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'supabase',
  provider_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  picurl TEXT,
  bio TEXT,
  location VARCHAR(255),
  website VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'dark',
  language VARCHAR(10) DEFAULT 'en',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  privacy_level VARCHAR(20) DEFAULT 'public',
  show_email BOOLEAN DEFAULT FALSE,
  show_real_name BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- User sessions table (for tracking active sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  session_token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  device_info TEXT,
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- GAMING PLATFORM & CONTENT
-- =====================================================

-- Gaming platforms table
CREATE TABLE IF NOT EXISTS platform (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table with IGDB integration
CREATE TABLE IF NOT EXISTS game (
  id SERIAL PRIMARY KEY,
  game_id VARCHAR(255) NOT NULL UNIQUE,
  igdb_id INTEGER UNIQUE,
  name VARCHAR(500) NOT NULL,
  slug VARCHAR(500),
  release_date DATE,
  description TEXT,
  summary TEXT,
  pic_url TEXT,
  cover_url TEXT,
  screenshots TEXT[],
  developer VARCHAR(255),
  publisher VARCHAR(255),
  igdb_link TEXT,
  genre VARCHAR(255),
  genres TEXT[],
  platforms TEXT[],
  igdb_rating INTEGER,
  metacritic_score INTEGER,
  esrb_rating VARCHAR(10),
  steam_id INTEGER,
  gog_id VARCHAR(50),
  epic_id VARCHAR(50),
  is_verified BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Platform-Game relationship table
CREATE TABLE IF NOT EXISTS platform_games (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES platform(id) ON DELETE CASCADE,
  release_date DATE,
  store_url TEXT,
  price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(game_id, platform_id)
);

-- =====================================================
-- USER CONTENT & INTERACTIONS
-- =====================================================

-- User ratings and reviews
CREATE TABLE IF NOT EXISTS rating (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  rating DECIMAL(3,1) NOT NULL CHECK (rating >= 1.0 AND rating <= 10.0),
  review TEXT,
  is_spoiler BOOLEAN DEFAULT FALSE,
  playtime_hours INTEGER,
  platform_id INTEGER REFERENCES platform(id),
  completion_status VARCHAR(20) DEFAULT 'not_started',
  is_recommended BOOLEAN,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  replay_value INTEGER CHECK (replay_value >= 1 AND replay_value <= 5),
  is_published BOOLEAN DEFAULT TRUE,
  like_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  post_date_time TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, game_id)
);

-- Comments on reviews
CREATE TABLE IF NOT EXISTS comment (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  rating_id INTEGER REFERENCES rating(id) ON DELETE CASCADE,
  parent_comment_id INTEGER REFERENCES comment(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_spoiler BOOLEAN DEFAULT FALSE,
  is_published BOOLEAN DEFAULT TRUE,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CHECK (char_length(content) >= 1 AND char_length(content) <= 2000)
);

-- Likes on comments and reviews
CREATE TABLE IF NOT EXISTS content_like (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  rating_id INTEGER REFERENCES rating(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comment(id) ON DELETE CASCADE,
  is_like BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, rating_id),
  UNIQUE(user_id, comment_id),
  CHECK ((rating_id IS NOT NULL AND comment_id IS NULL) OR (rating_id IS NULL AND comment_id IS NOT NULL))
);

-- User game lists (wishlist, favorites, etc.)
CREATE TABLE IF NOT EXISTS user_game_list (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  list_type VARCHAR(20) NOT NULL,
  notes TEXT,
  priority INTEGER,
  is_public BOOLEAN DEFAULT TRUE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, game_id, list_type)
);

-- User follows/friends
CREATE TABLE IF NOT EXISTS user_follow (
  id SERIAL PRIMARY KEY,
  follower_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  following_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  is_mutual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

-- Activity feed/notifications
CREATE TABLE IF NOT EXISTS notification (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  actor_id INTEGER REFERENCES "user"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System-wide tags for games and content
CREATE TABLE IF NOT EXISTS tag (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7),
  is_official BOOLEAN DEFAULT FALSE,
  usage_count INTEGER DEFAULT 0,
  created_by INTEGER REFERENCES "user"(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game-Tag relationships
CREATE TABLE IF NOT EXISTS game_tag (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES game(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(game_id, tag_id)
);

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_user_provider_id ON "user"(provider_id);
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_username ON "user"(username);

-- User sessions indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);

-- Platform indexes
CREATE INDEX IF NOT EXISTS idx_platform_slug ON platform(slug);
CREATE INDEX IF NOT EXISTS idx_platform_active ON platform(is_active);

-- Game indexes
CREATE INDEX IF NOT EXISTS idx_game_igdb_id ON game(igdb_id);
CREATE INDEX IF NOT EXISTS idx_game_name ON game(name);
CREATE INDEX IF NOT EXISTS idx_game_slug ON game(slug);
CREATE INDEX IF NOT EXISTS idx_game_release_date ON game(release_date);
CREATE INDEX IF NOT EXISTS idx_game_verified ON game(is_verified);

-- Platform games indexes
CREATE INDEX IF NOT EXISTS idx_platform_games_game_id ON platform_games(game_id);
CREATE INDEX IF NOT EXISTS idx_platform_games_platform_id ON platform_games(platform_id);

-- Rating indexes
CREATE INDEX IF NOT EXISTS idx_rating_game_published ON rating(game_id, is_published);
CREATE INDEX IF NOT EXISTS idx_rating_user_id ON rating(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_rating ON rating(rating);
CREATE INDEX IF NOT EXISTS idx_rating_date ON rating(post_date_time);
CREATE INDEX IF NOT EXISTS idx_rating_likes ON rating(like_count);

-- Comment indexes
CREATE INDEX IF NOT EXISTS idx_comment_rating_published ON comment(rating_id, is_published);
CREATE INDEX IF NOT EXISTS idx_comment_user_id ON comment(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_parent ON comment(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_created ON comment(created_at);

-- Content like indexes
CREATE INDEX IF NOT EXISTS idx_content_like_rating ON content_like(rating_id);
CREATE INDEX IF NOT EXISTS idx_content_like_comment ON content_like(comment_id);
CREATE INDEX IF NOT EXISTS idx_content_like_user ON content_like(user_id);

-- User game list indexes
CREATE INDEX IF NOT EXISTS idx_user_game_list_user_type ON user_game_list(user_id, list_type);
CREATE INDEX IF NOT EXISTS idx_user_game_list_game ON user_game_list(game_id);

-- User follow indexes
CREATE INDEX IF NOT EXISTS idx_user_follow_follower ON user_follow(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follow_following ON user_follow(following_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notification_user_read ON notification(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created ON notification(created_at);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification(type);

-- Tag indexes
CREATE INDEX IF NOT EXISTS idx_tag_slug ON tag(slug);
CREATE INDEX IF NOT EXISTS idx_tag_official ON tag(is_official);
CREATE INDEX IF NOT EXISTS idx_tag_usage ON tag(usage_count);

-- Game tag indexes
CREATE INDEX IF NOT EXISTS idx_game_tag_game ON game_tag(game_id);
CREATE INDEX IF NOT EXISTS idx_game_tag_tag ON game_tag(tag_id);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_updated_at BEFORE UPDATE ON game FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rating_updated_at BEFORE UPDATE ON rating FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comment_updated_at BEFORE UPDATE ON comment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."user" (provider_id, email, name, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  
  INSERT INTO public.user_preferences (user_id)
  VALUES ((SELECT id FROM public."user" WHERE provider_id = NEW.id));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update like counts
CREATE OR REPLACE FUNCTION update_like_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.rating_id IS NOT NULL THEN
      UPDATE rating SET like_count = like_count + 1 WHERE id = NEW.rating_id;
    END IF;
    IF NEW.comment_id IS NOT NULL THEN
      UPDATE comment SET like_count = like_count + 1 WHERE id = NEW.comment_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.rating_id IS NOT NULL THEN
      UPDATE rating SET like_count = like_count - 1 WHERE id = OLD.rating_id;
    END IF;
    IF OLD.comment_id IS NOT NULL THEN
      UPDATE comment SET like_count = like_count - 1 WHERE id = OLD.comment_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for like count updates
CREATE TRIGGER update_like_counts_trigger
  AFTER INSERT OR DELETE ON content_like
  FOR EACH ROW EXECUTE FUNCTION update_like_counts();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform ENABLE ROW LEVEL SECURITY;
ALTER TABLE game ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE rating ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_like ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_game_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follow ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_tag ENABLE ROW LEVEL SECURITY;

-- User policies
CREATE POLICY "Users can view public profiles" ON "user" FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON "user" FOR UPDATE USING (auth.uid() = provider_id);

-- User preferences policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = user_preferences.user_id AND provider_id = auth.uid())
);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR ALL USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = user_preferences.user_id AND provider_id = auth.uid())
);

-- Platform and game policies (public read)
CREATE POLICY "Anyone can view platforms" ON platform FOR SELECT USING (true);
CREATE POLICY "Anyone can view games" ON game FOR SELECT USING (true);
CREATE POLICY "Anyone can view platform_games" ON platform_games FOR SELECT USING (true);

-- Rating policies
CREATE POLICY "Anyone can view published ratings" ON rating FOR SELECT USING (is_published = true);
CREATE POLICY "Users can manage own ratings" ON rating FOR ALL USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = rating.user_id AND provider_id = auth.uid())
);

-- Comment policies
CREATE POLICY "Anyone can view published comments" ON comment FOR SELECT USING (is_published = true);
CREATE POLICY "Users can manage own comments" ON comment FOR ALL USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = comment.user_id AND provider_id = auth.uid())
);

-- Like policies
CREATE POLICY "Users can view all likes" ON content_like FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes" ON content_like FOR ALL USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = content_like.user_id AND provider_id = auth.uid())
);

-- User game list policies
CREATE POLICY "Users can view public lists" ON user_game_list FOR SELECT USING (
  is_public = true OR EXISTS (SELECT 1 FROM "user" WHERE id = user_game_list.user_id AND provider_id = auth.uid())
);
CREATE POLICY "Users can manage own lists" ON user_game_list FOR ALL USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = user_game_list.user_id AND provider_id = auth.uid())
);

-- Follow policies
CREATE POLICY "Anyone can view follows" ON user_follow FOR SELECT USING (true);
CREATE POLICY "Users can manage own follows" ON user_follow FOR ALL USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = user_follow.follower_id AND provider_id = auth.uid())
);

-- Notification policies
CREATE POLICY "Users can view own notifications" ON notification FOR SELECT USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = notification.user_id AND provider_id = auth.uid())
);
CREATE POLICY "Users can update own notifications" ON notification FOR UPDATE USING (
  EXISTS (SELECT 1 FROM "user" WHERE id = notification.user_id AND provider_id = auth.uid())
);

-- Tag policies
CREATE POLICY "Anyone can view tags" ON tag FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tags" ON tag FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Game tag policies
CREATE POLICY "Anyone can view game tags" ON game_tag FOR SELECT USING (true);
CREATE POLICY "Authenticated users can manage game tags" ON game_tag FOR ALL USING (auth.uid() IS NOT NULL);

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default platforms
INSERT INTO platform (name, slug, description) VALUES
('PC', 'pc', 'Personal Computer'),
('PlayStation 5', 'ps5', 'Sony PlayStation 5'),
('PlayStation 4', 'ps4', 'Sony PlayStation 4'),
('Xbox Series X/S', 'xbox-series', 'Microsoft Xbox Series X/S'),
('Xbox One', 'xbox-one', 'Microsoft Xbox One'),
('Nintendo Switch', 'switch', 'Nintendo Switch'),
('Steam Deck', 'steam-deck', 'Valve Steam Deck'),
('iOS', 'ios', 'Apple iOS'),
('Android', 'android', 'Google Android')
ON CONFLICT (name) DO NOTHING;

-- Insert default tags
INSERT INTO tag (name, slug, description, is_official) VALUES
('Action', 'action', 'Fast-paced gameplay with combat', true),
('Adventure', 'adventure', 'Exploration and story-driven', true),
('RPG', 'rpg', 'Role-playing games', true),
('Strategy', 'strategy', 'Tactical and strategic gameplay', true),
('Simulation', 'simulation', 'Realistic simulation games', true),
('Puzzle', 'puzzle', 'Problem-solving games', true),
('Racing', 'racing', 'Racing and driving games', true),
('Sports', 'sports', 'Sports simulation games', true),
('Fighting', 'fighting', 'Combat fighting games', true),
('Shooter', 'shooter', 'Shooting games', true),
('Horror', 'horror', 'Horror and scary games', true),
('Indie', 'indie', 'Independent games', true),
('Multiplayer', 'multiplayer', 'Games with multiplayer features', true),
('Singleplayer', 'singleplayer', 'Single-player only games', true),
('Co-op', 'co-op', 'Cooperative gameplay', true)
ON CONFLICT (name) DO NOTHING;
