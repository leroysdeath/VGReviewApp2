-- Migration: Add Computed Columns for Performance Optimization
-- Purpose: Denormalize frequently accessed counts for massive performance gains
-- Date: 2025-08-23
-- Strategy: Keep original tables + Add computed columns + Triggers for sync

-- =====================================================
-- PHASE 1: ADD COMPUTED COLUMNS
-- =====================================================

-- Add computed columns to rating table (for fast feed/profile display)
ALTER TABLE rating 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- Add computed columns to user table (for fast profile display)  
ALTER TABLE "user"
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_games_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS started_games_count INTEGER DEFAULT 0;

-- Add computed columns to comment table (for nested like display)
ALTER TABLE comment 
ADD COLUMN IF NOT EXISTS like_count INTEGER DEFAULT 0;

-- =====================================================
-- PHASE 2: CREATE MAINTENANCE TRIGGERS
-- =====================================================

-- Function to update rating like count
CREATE OR REPLACE FUNCTION update_rating_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update like count for the rating
    UPDATE rating 
    SET like_count = (
      SELECT COUNT(*) 
      FROM content_like 
      WHERE rating_id = NEW.rating_id AND is_like = true
    )
    WHERE id = NEW.rating_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update like count for the rating
    UPDATE rating 
    SET like_count = (
      SELECT COUNT(*) 
      FROM content_like 
      WHERE rating_id = OLD.rating_id AND is_like = true
    )
    WHERE id = OLD.rating_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment like count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update like count for the comment
    UPDATE comment 
    SET like_count = (
      SELECT COUNT(*) 
      FROM content_like 
      WHERE comment_id = NEW.comment_id AND is_like = true
    )
    WHERE id = NEW.comment_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update like count for the comment
    UPDATE comment 
    SET like_count = (
      SELECT COUNT(*) 
      FROM content_like 
      WHERE comment_id = OLD.comment_id AND is_like = true
    )
    WHERE id = OLD.comment_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update user follower/following counts
CREATE OR REPLACE FUNCTION update_user_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update following count for follower
    UPDATE "user" 
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    -- Update follower count for followed user
    UPDATE "user" 
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update following count for follower
    UPDATE "user" 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
    
    -- Update follower count for followed user
    UPDATE "user" 
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.following_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update user review count
CREATE OR REPLACE FUNCTION update_user_review_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Only count published reviews with actual review text
    IF NEW.is_published = true AND NEW.review IS NOT NULL AND LENGTH(TRIM(NEW.review)) > 0 THEN
      UPDATE "user" 
      SET total_reviews = total_reviews + 1
      WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle publish status changes
    IF OLD.is_published != NEW.is_published OR 
       (OLD.review IS NULL) != (NEW.review IS NULL) OR
       (LENGTH(TRIM(COALESCE(OLD.review, ''))) = 0) != (LENGTH(TRIM(COALESCE(NEW.review, ''))) = 0) THEN
      
      -- Recompute the count
      UPDATE "user" 
      SET total_reviews = (
        SELECT COUNT(*) 
        FROM rating 
        WHERE user_id = NEW.user_id 
          AND is_published = true 
          AND review IS NOT NULL 
          AND LENGTH(TRIM(review)) > 0
      )
      WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Subtract if it was a published review
    IF OLD.is_published = true AND OLD.review IS NOT NULL AND LENGTH(TRIM(OLD.review)) > 0 THEN
      UPDATE "user" 
      SET total_reviews = GREATEST(0, total_reviews - 1)
      WHERE id = OLD.user_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update comment count on ratings
CREATE OR REPLACE FUNCTION update_rating_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published = true THEN
      UPDATE rating 
      SET comment_count = comment_count + 1
      WHERE id = NEW.rating_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle publish status changes
    IF OLD.is_published != NEW.is_published THEN
      IF NEW.is_published = true THEN
        UPDATE rating SET comment_count = comment_count + 1 WHERE id = NEW.rating_id;
      ELSE
        UPDATE rating SET comment_count = GREATEST(0, comment_count - 1) WHERE id = NEW.rating_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_published = true THEN
      UPDATE rating 
      SET comment_count = GREATEST(0, comment_count - 1)
      WHERE id = OLD.rating_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update user game progress counts
CREATE OR REPLACE FUNCTION update_user_game_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "user" 
    SET 
      completed_games_count = completed_games_count + CASE WHEN NEW.completed = true THEN 1 ELSE 0 END,
      started_games_count = started_games_count + CASE WHEN NEW.started = true AND NEW.completed = false THEN 1 ELSE 0 END
    WHERE id = NEW.user_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.completed != NEW.completed OR OLD.started != NEW.started THEN
      -- Recompute both counts to handle all edge cases
      UPDATE "user" 
      SET 
        completed_games_count = (SELECT COUNT(*) FROM game_progress WHERE user_id = NEW.user_id AND completed = true),
        started_games_count = (SELECT COUNT(*) FROM game_progress WHERE user_id = NEW.user_id AND started = true AND completed = false)
      WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "user" 
    SET 
      completed_games_count = GREATEST(0, completed_games_count - CASE WHEN OLD.completed = true THEN 1 ELSE 0 END),
      started_games_count = GREATEST(0, started_games_count - CASE WHEN OLD.started = true AND OLD.completed = false THEN 1 ELSE 0 END)
    WHERE id = OLD.user_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PHASE 3: CREATE TRIGGERS
-- =====================================================

-- Triggers for content_like changes (affects rating and comment like counts)
DROP TRIGGER IF EXISTS trigger_update_rating_like_count ON content_like;
CREATE TRIGGER trigger_update_rating_like_count
AFTER INSERT OR UPDATE OR DELETE ON content_like
FOR EACH ROW EXECUTE FUNCTION update_rating_like_count();

DROP TRIGGER IF EXISTS trigger_update_comment_like_count ON content_like;  
CREATE TRIGGER trigger_update_comment_like_count
AFTER INSERT OR UPDATE OR DELETE ON content_like
FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- Triggers for user_follow changes (affects user follower/following counts)
DROP TRIGGER IF EXISTS trigger_update_user_follow_counts ON user_follow;
CREATE TRIGGER trigger_update_user_follow_counts
AFTER INSERT OR DELETE ON user_follow
FOR EACH ROW EXECUTE FUNCTION update_user_follow_counts();

-- Triggers for rating changes (affects user review count)
DROP TRIGGER IF EXISTS trigger_update_user_review_count ON rating;
CREATE TRIGGER trigger_update_user_review_count
AFTER INSERT OR UPDATE OR DELETE ON rating
FOR EACH ROW EXECUTE FUNCTION update_user_review_count();

-- Triggers for comment changes (affects rating comment count)
DROP TRIGGER IF EXISTS trigger_update_rating_comment_count ON comment;
CREATE TRIGGER trigger_update_rating_comment_count
AFTER INSERT OR UPDATE OR DELETE ON comment
FOR EACH ROW EXECUTE FUNCTION update_rating_comment_count();

-- Triggers for game_progress changes (affects user game counts)
DROP TRIGGER IF EXISTS trigger_update_user_game_counts ON game_progress;
CREATE TRIGGER trigger_update_user_game_counts
AFTER INSERT OR UPDATE OR DELETE ON game_progress
FOR EACH ROW EXECUTE FUNCTION update_user_game_counts();

-- =====================================================
-- PHASE 4: BACKFILL EXISTING DATA  
-- =====================================================

-- Update rating like counts
UPDATE rating 
SET like_count = (
  SELECT COUNT(*) 
  FROM content_like 
  WHERE rating_id = rating.id AND is_like = true
);

-- Update rating comment counts
UPDATE rating 
SET comment_count = (
  SELECT COUNT(*) 
  FROM comment 
  WHERE rating_id = rating.id AND is_published = true
);

-- Update comment like counts
UPDATE comment 
SET like_count = (
  SELECT COUNT(*) 
  FROM content_like 
  WHERE comment_id = comment.id AND is_like = true
);

-- Update user follower counts
UPDATE "user" 
SET follower_count = (
  SELECT COUNT(*) 
  FROM user_follow 
  WHERE following_id = "user".id
);

-- Update user following counts
UPDATE "user" 
SET following_count = (
  SELECT COUNT(*) 
  FROM user_follow 
  WHERE follower_id = "user".id
);

-- Update user review counts
UPDATE "user" 
SET total_reviews = (
  SELECT COUNT(*) 
  FROM rating 
  WHERE user_id = "user".id 
    AND is_published = true 
    AND review IS NOT NULL 
    AND LENGTH(TRIM(review)) > 0
);

-- Update user completed games counts
UPDATE "user" 
SET completed_games_count = (
  SELECT COUNT(*) 
  FROM game_progress 
  WHERE user_id = "user".id AND completed = true
);

-- Update user started games counts  
UPDATE "user" 
SET started_games_count = (
  SELECT COUNT(*) 
  FROM game_progress 
  WHERE user_id = "user".id AND started = true AND completed = false
);

-- =====================================================
-- PHASE 5: CREATE INDEXES FOR NEW COLUMNS
-- =====================================================

-- Index computed columns for fast sorting/filtering
CREATE INDEX IF NOT EXISTS idx_rating_like_count ON rating(like_count DESC);
CREATE INDEX IF NOT EXISTS idx_rating_comment_count ON rating(comment_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_follower_count ON "user"(follower_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_following_count ON "user"(following_count DESC); 
CREATE INDEX IF NOT EXISTS idx_user_total_reviews ON "user"(total_reviews DESC);
CREATE INDEX IF NOT EXISTS idx_comment_like_count ON comment(like_count DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_rating_user_like_count ON rating(user_id, like_count DESC);
CREATE INDEX IF NOT EXISTS idx_rating_game_like_count ON rating(game_id, like_count DESC);

-- =====================================================
-- VERIFICATION QUERIES (for testing)
-- =====================================================

/*
-- Verify the computed columns are working:

-- Test 1: Check like counts match reality
SELECT r.id, r.like_count, COUNT(cl.id) as actual_likes
FROM rating r 
LEFT JOIN content_like cl ON r.id = cl.rating_id AND cl.is_like = true
GROUP BY r.id, r.like_count
HAVING r.like_count != COUNT(cl.id)
LIMIT 5;

-- Test 2: Check user follower counts  
SELECT u.id, u.username, u.follower_count, COUNT(uf.id) as actual_followers
FROM "user" u
LEFT JOIN user_follow uf ON u.id = uf.following_id
GROUP BY u.id, u.username, u.follower_count  
HAVING u.follower_count != COUNT(uf.id)
LIMIT 5;

-- Test 3: Performance comparison
EXPLAIN ANALYZE SELECT * FROM rating WHERE like_count > 5; -- Fast!
EXPLAIN ANALYZE SELECT r.* FROM rating r JOIN content_like cl ON r.id = cl.rating_id GROUP BY r.id HAVING COUNT(cl.id) > 5; -- Slow!
*/