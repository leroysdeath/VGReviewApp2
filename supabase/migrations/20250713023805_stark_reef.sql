/*
  # Review Comments and Likes System

  1. New Tables
    - `review_comment` - Comments on reviews with threading support
    - `review_like` - Tracks likes on reviews

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users

  3. Features
    - Threaded comments with parent-child relationships
    - Like/unlike functionality for reviews
    - Activity tracking integration
*/

-- Create review_comment table
CREATE TABLE IF NOT EXISTS review_comment (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  review_id INTEGER NOT NULL REFERENCES rating(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES review_comment(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create review_like table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS review_like (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  review_id INTEGER NOT NULL REFERENCES rating(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, review_id)
);

-- Enable Row Level Security
ALTER TABLE review_comment ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_like ENABLE ROW LEVEL SECURITY;

-- RLS Policies for review_comment
CREATE POLICY "Anyone can read review comments"
  ON review_comment
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create review comments"
  ON review_comment
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

CREATE POLICY "Users can update own review comments"
  ON review_comment
  FOR UPDATE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete own review comments"
  ON review_comment
  FOR DELETE
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

-- RLS Policies for review_like
CREATE POLICY "Anyone can read review likes"
  ON review_like
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can manage own review likes"
  ON review_like
  FOR ALL
  TO authenticated
  USING (user_id IN (
    SELECT id FROM "user" WHERE provider_id = auth.uid()::text
  ));

-- Triggers for updated_at
CREATE TRIGGER update_review_comment_updated_at BEFORE UPDATE ON review_comment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_review_comment_review_id ON review_comment(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comment_parent_id ON review_comment(parent_id);
CREATE INDEX IF NOT EXISTS idx_review_comment_user_id ON review_comment(user_id);
CREATE INDEX IF NOT EXISTS idx_review_like_review_id ON review_like(review_id);
CREATE INDEX IF NOT EXISTS idx_review_like_user_id ON review_like(user_id);

-- Create functions to get comment counts
CREATE OR REPLACE FUNCTION get_review_comment_count(review_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  comment_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO comment_count FROM review_comment WHERE review_id = $1;
  RETURN comment_count;
END;
$$ LANGUAGE plpgsql;

-- Create functions to get like counts
CREATE OR REPLACE FUNCTION get_review_like_count(review_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  like_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO like_count FROM review_like WHERE review_id = $1;
  RETURN like_count;
END;
$$ LANGUAGE plpgsql;