-- Migration: Add Missing Foreign Key Constraints
-- Purpose: Enable Supabase foreign key syntax for efficient joins
-- Date: 2025-08-23
-- Fixes: GamesModal, ReviewsModal, FollowersFollowingModal loading issues

-- Add foreign key constraints for user_follow table
-- This enables the following:following_id and follower:follower_id syntax

ALTER TABLE user_follow 
ADD CONSTRAINT fk_user_follow_follower 
FOREIGN KEY (follower_id) 
REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE user_follow 
ADD CONSTRAINT fk_user_follow_following 
FOREIGN KEY (following_id) 
REFERENCES "user"(id) ON DELETE CASCADE;

-- Add foreign key constraint for game_progress table
-- This enables the game:game_id syntax

ALTER TABLE game_progress 
ADD CONSTRAINT fk_game_progress_user 
FOREIGN KEY (user_id) 
REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE game_progress 
ADD CONSTRAINT fk_game_progress_game 
FOREIGN KEY (game_id) 
REFERENCES game(id) ON DELETE CASCADE;

-- Add foreign key constraint for rating table
-- This enables the game:game_id syntax in reviews

ALTER TABLE rating 
ADD CONSTRAINT fk_rating_user 
FOREIGN KEY (user_id) 
REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE rating 
ADD CONSTRAINT fk_rating_game 
FOREIGN KEY (game_id) 
REFERENCES game(id) ON DELETE CASCADE;

-- Add foreign key constraint for comment table
-- This ensures referential integrity for comments

ALTER TABLE comment 
ADD CONSTRAINT fk_comment_user 
FOREIGN KEY (user_id) 
REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE comment 
ADD CONSTRAINT fk_comment_rating 
FOREIGN KEY (rating_id) 
REFERENCES rating(id) ON DELETE CASCADE;

-- Add foreign key constraint for content_like table
-- This ensures referential integrity for likes

ALTER TABLE content_like 
ADD CONSTRAINT fk_content_like_user 
FOREIGN KEY (user_id) 
REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE content_like 
ADD CONSTRAINT fk_content_like_rating 
FOREIGN KEY (rating_id) 
REFERENCES rating(id) ON DELETE CASCADE;

ALTER TABLE content_like 
ADD CONSTRAINT fk_content_like_comment 
FOREIGN KEY (comment_id) 
REFERENCES comment(id) ON DELETE CASCADE;

-- Create indexes for the foreign key columns to improve JOIN performance
-- These indexes will make the foreign key joins much faster

CREATE INDEX IF NOT EXISTS idx_user_follow_follower_id ON user_follow(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follow_following_id ON user_follow(following_id);

CREATE INDEX IF NOT EXISTS idx_game_progress_user_id ON game_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_game_progress_game_id ON game_progress(game_id);

CREATE INDEX IF NOT EXISTS idx_rating_user_id ON rating(user_id);
CREATE INDEX IF NOT EXISTS idx_rating_game_id ON rating(game_id);

CREATE INDEX IF NOT EXISTS idx_comment_user_id ON comment(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_rating_id ON comment(rating_id);

CREATE INDEX IF NOT EXISTS idx_content_like_user_id ON content_like(user_id);
CREATE INDEX IF NOT EXISTS idx_content_like_rating_id ON content_like(rating_id);
CREATE INDEX IF NOT EXISTS idx_content_like_comment_id ON content_like(comment_id);

-- Note: After applying this migration, the original Supabase foreign key syntax
-- in the following components will work correctly:
--
-- 1. FollowersFollowingModal.tsx:
--    - following:following_id ✓
--    - follower:follower_id ✓
--
-- 2. GamesModal.tsx (can be reverted to original syntax):
--    - game:game_id ✓
--
-- 3. ReviewsModal.tsx (can be reverted to original syntax):
--    - game:game_id ✓
--
-- Performance benefits:
-- - Single query instead of multiple queries
-- - Server-side JOINs (faster than client-side)
-- - Proper indexing for optimal query performance
-- - Reduced network overhead and data transfer
