/*
  # Activity Tracking System

  1. New Tables
    - `user_activity` - Tracks all user activities
    - `review_like` - Tracks likes on reviews
    - `user_activity_view` - View for easy activity querying

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Features
    - Activity tracking for reviews, comments, likes
    - Support for nested comments
    - Like/unlike functionality
*/

-- Create review_like table
CREATE TABLE IF NOT EXISTS review_like (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  review_id INTEGER NOT NULL REFERENCES rating(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

-- Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('review', 'rating', 'comment', 'like', 'completion', 'wishlist', 'started', 'achievement')),
  game_id INTEGER REFERENCES game(id) ON DELETE CASCADE,
  review_id INTEGER REFERENCES rating(id) ON DELETE CASCADE,
  comment_id INTEGER REFERENCES comment(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  data JSONB -- For additional activity-specific data
);

-- Create view for easier activity querying
CREATE OR REPLACE VIEW user_activity_view AS
SELECT
  a.id,
  a.user_id,
  a.type,
  a.game_id,
  a.review_id,
  a.comment_id,
  a.timestamp,
  a.data,
  u.name as user_name,
  u.picurl as user_picurl,
  g.name as game_name,
  g.pic_url as game_pic_url,
  r.rating as review_rating,
  r.review as review_content,
  c.content as comment_content
FROM
  user_activity a
LEFT JOIN
  "user" u ON a.user_id = u.id
LEFT JOIN
  game g ON a.game_id = g.id
LEFT JOIN
  rating r ON a.review_id = r.id
LEFT JOIN
  comment c ON a.comment_id = c.id;

-- Enable Row Level Security
ALTER TABLE review_like ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_like
CREATE POLICY "Anyone can read review likes"
  ON review_like
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own likes"
  ON review_like
  FOR ALL
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

-- RLS Policies for user_activity
CREATE POLICY "Anyone can read user activities"
  ON user_activity
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage their own activities"
  ON user_activity
  FOR ALL
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity(type);
CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_activity_game_id ON user_activity(game_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_review_id ON user_activity(review_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_comment_id ON user_activity(comment_id);

CREATE INDEX IF NOT EXISTS idx_review_like_user_id ON review_like(user_id);
CREATE INDEX IF NOT EXISTS idx_review_like_review_id ON review_like(review_id);

-- Trigger to create activity records for new reviews
CREATE OR REPLACE FUNCTION create_review_activity()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_activity (user_id, type, game_id, review_id)
  VALUES (NEW.user_id, 'review', NEW.game_id, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_review_insert
  AFTER INSERT ON rating
  FOR EACH ROW
  EXECUTE FUNCTION create_review_activity();

-- Trigger to create activity records for new comments
CREATE OR REPLACE FUNCTION create_comment_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the game_id from the associated review
  DECLARE
    v_game_id INTEGER;
    v_review_id INTEGER;
  BEGIN
    SELECT r.game_id, r.id INTO v_game_id, v_review_id
    FROM rating r
    WHERE r.id = NEW.rating_id;
    
    INSERT INTO user_activity (user_id, type, game_id, review_id, comment_id)
    VALUES (NEW.user_id, 'comment', v_game_id, v_review_id, NEW.id);
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_comment_insert
  AFTER INSERT ON comment
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_activity();