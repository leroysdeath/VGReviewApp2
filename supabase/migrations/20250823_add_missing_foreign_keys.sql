-- Migration: Add Missing Foreign Key Constraints
-- Purpose: Enable Supabase foreign key syntax for efficient joins
-- Date: 2025-08-23
-- Fixes: GamesModal, ReviewsModal, FollowersFollowingModal loading issues

-- Add foreign key constraints for user_follow table
-- This enables the following:following_id and follower:follower_id syntax

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_follow_follower' 
        AND table_name = 'user_follow'
    ) THEN
        ALTER TABLE user_follow 
        ADD CONSTRAINT fk_user_follow_follower 
        FOREIGN KEY (follower_id) 
        REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_user_follow_follower';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_user_follow_follower';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_follow_following' 
        AND table_name = 'user_follow'
    ) THEN
        ALTER TABLE user_follow 
        ADD CONSTRAINT fk_user_follow_following 
        FOREIGN KEY (following_id) 
        REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_user_follow_following';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_user_follow_following';
    END IF;
END $$;

-- Add foreign key constraint for game_progress table
-- This enables the game:game_id syntax

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_game_progress_user' 
        AND table_name = 'game_progress'
    ) THEN
        ALTER TABLE game_progress 
        ADD CONSTRAINT fk_game_progress_user 
        FOREIGN KEY (user_id) 
        REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_game_progress_user';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_game_progress_user';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_game_progress_game' 
        AND table_name = 'game_progress'
    ) THEN
        ALTER TABLE game_progress 
        ADD CONSTRAINT fk_game_progress_game 
        FOREIGN KEY (game_id) 
        REFERENCES game(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_game_progress_game';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_game_progress_game';
    END IF;
END $$;

-- Add foreign key constraint for rating table
-- This enables the game:game_id syntax in reviews

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_rating_user' 
        AND table_name = 'rating'
    ) THEN
        ALTER TABLE rating 
        ADD CONSTRAINT fk_rating_user 
        FOREIGN KEY (user_id) 
        REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_rating_user';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_rating_user';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_rating_game' 
        AND table_name = 'rating'
    ) THEN
        ALTER TABLE rating 
        ADD CONSTRAINT fk_rating_game 
        FOREIGN KEY (game_id) 
        REFERENCES game(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_rating_game';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_rating_game';
    END IF;
END $$;

-- Add foreign key constraint for comment table
-- This ensures referential integrity for comments

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_comment_user' 
        AND table_name = 'comment'
    ) THEN
        ALTER TABLE comment 
        ADD CONSTRAINT fk_comment_user 
        FOREIGN KEY (user_id) 
        REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_comment_user';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_comment_user';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_comment_rating' 
        AND table_name = 'comment'
    ) THEN
        ALTER TABLE comment 
        ADD CONSTRAINT fk_comment_rating 
        FOREIGN KEY (rating_id) 
        REFERENCES rating(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_comment_rating';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_comment_rating';
    END IF;
END $$;

-- Add foreign key constraint for content_like table
-- This ensures referential integrity for likes

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_content_like_user' 
        AND table_name = 'content_like'
    ) THEN
        ALTER TABLE content_like 
        ADD CONSTRAINT fk_content_like_user 
        FOREIGN KEY (user_id) 
        REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_content_like_user';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_content_like_user';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_content_like_rating' 
        AND table_name = 'content_like'
    ) THEN
        ALTER TABLE content_like 
        ADD CONSTRAINT fk_content_like_rating 
        FOREIGN KEY (rating_id) 
        REFERENCES rating(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_content_like_rating';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_content_like_rating';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_content_like_comment' 
        AND table_name = 'content_like'
    ) THEN
        ALTER TABLE content_like 
        ADD CONSTRAINT fk_content_like_comment 
        FOREIGN KEY (comment_id) 
        REFERENCES comment(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created constraint: fk_content_like_comment';
    ELSE
        RAISE NOTICE 'Constraint already exists: fk_content_like_comment';
    END IF;
END $$;

-- Create indexes for foreign key columns that don't already have them
-- Note: Most indexes already exist, only creating missing ones

-- content_like.comment_id is the only missing index needed
CREATE INDEX IF NOT EXISTS idx_content_like_comment_id ON content_like(comment_id);

-- All other indexes already exist:
-- ✓ user_follow(follower_id) → idx_user_follow_follower  
-- ✓ user_follow(following_id) → idx_user_follow_following
-- ✓ game_progress(user_id) → idx_game_progress_user_id
-- ✓ game_progress(game_id) → idx_game_progress_game_id  
-- ✓ rating(user_id) → idx_rating_user_id
-- ✓ rating(game_id) → idx_rating_game_id
-- ✓ comment(user_id) → idx_comment_user_id
-- ✓ content_like(user_id) → idx_content_like_user
-- ✓ content_like(rating_id) → idx_content_like_rating

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
