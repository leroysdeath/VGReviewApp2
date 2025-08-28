-- Migration: Add collection and wishlist tables for game tracking
-- Created: 2025-01-01

-- Create user_collection table for owned games
CREATE TABLE IF NOT EXISTS user_collection (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game_id INTEGER REFERENCES game(id) ON DELETE CASCADE,
  igdb_id INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_collection_user FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_collection UNIQUE(user_id, igdb_id)
);

-- Create user_wishlist table for games users want
CREATE TABLE IF NOT EXISTS user_wishlist (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  game_id INTEGER REFERENCES game(id) ON DELETE CASCADE,
  igdb_id INTEGER NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  priority INTEGER DEFAULT 0,
  notes TEXT,
  CONSTRAINT fk_wishlist_user FOREIGN KEY (user_id) REFERENCES public.user(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_wishlist UNIQUE(user_id, igdb_id)
);

-- Create indexes for user_collection
CREATE INDEX IF NOT EXISTS idx_collection_user ON user_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_igdb ON user_collection(igdb_id);
CREATE INDEX IF NOT EXISTS idx_collection_user_igdb ON user_collection(user_id, igdb_id);
CREATE INDEX IF NOT EXISTS idx_collection_added ON user_collection(user_id, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_game ON user_collection(game_id) WHERE game_id IS NOT NULL;

-- Create indexes for user_wishlist
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON user_wishlist(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_igdb ON user_wishlist(igdb_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_igdb ON user_wishlist(user_id, igdb_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_priority ON user_wishlist(user_id, priority DESC, added_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishlist_game ON user_wishlist(game_id) WHERE game_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE user_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_wishlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_collection
CREATE POLICY "Anyone can view collections" 
  ON user_collection FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own collection items" 
  ON user_collection FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id));

CREATE POLICY "Users can update own collection items" 
  ON user_collection FOR UPDATE 
  USING (auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id));

CREATE POLICY "Users can delete own collection items" 
  ON user_collection FOR DELETE 
  USING (auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id));

-- RLS Policies for user_wishlist
CREATE POLICY "Anyone can view wishlists" 
  ON user_wishlist FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert own wishlist items" 
  ON user_wishlist FOR INSERT 
  WITH CHECK (auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id));

CREATE POLICY "Users can update own wishlist items" 
  ON user_wishlist FOR UPDATE 
  USING (auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id));

CREATE POLICY "Users can delete own wishlist items" 
  ON user_wishlist FOR DELETE 
  USING (auth.uid() = (SELECT provider_id FROM public.user WHERE id = user_id));

-- Add helpful comments
COMMENT ON TABLE user_collection IS 'Stores games that users own in their collection';
COMMENT ON TABLE user_wishlist IS 'Stores games that users want to play/acquire';
COMMENT ON COLUMN user_wishlist.priority IS 'Priority level for wishlist items (higher = more wanted)';
COMMENT ON COLUMN user_wishlist.notes IS 'Optional user notes about why they want this game';