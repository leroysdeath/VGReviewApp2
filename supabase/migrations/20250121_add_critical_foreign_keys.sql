-- =====================================================
-- CRITICAL DATABASE INTEGRITY FIX
-- Add Missing Foreign Key Constraints
-- =====================================================
-- This migration adds foreign key constraints that should have existed 
-- from the beginning. The lack of these constraints has caused data corruption.

-- First, clean up orphaned data before adding constraints
DO $$
DECLARE
    orphaned_ratings INTEGER;
    orphaned_progress INTEGER;
BEGIN
    -- Count orphaned data
    SELECT COUNT(*) INTO orphaned_ratings
    FROM rating r 
    LEFT JOIN game g ON r.game_id = g.id 
    WHERE g.id IS NULL;
    
    SELECT COUNT(*) INTO orphaned_progress
    FROM game_progress gp 
    LEFT JOIN game g ON gp.game_id = g.id 
    WHERE g.id IS NULL;
    
    RAISE NOTICE 'Found % orphaned ratings and % orphaned game_progress records', 
                 orphaned_ratings, orphaned_progress;
    
    -- Clean up orphaned data
    DELETE FROM rating WHERE game_id NOT IN (SELECT id FROM game);
    DELETE FROM game_progress WHERE game_id NOT IN (SELECT id FROM game);
    
    RAISE NOTICE 'Cleaned up orphaned data before adding foreign keys';
END $$;

-- Add foreign key constraints for rating table
ALTER TABLE rating 
ADD CONSTRAINT fk_rating_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE rating 
ADD CONSTRAINT fk_rating_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

-- Add foreign key constraints for game_progress table
ALTER TABLE game_progress 
ADD CONSTRAINT fk_game_progress_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE game_progress 
ADD CONSTRAINT fk_game_progress_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

-- Add foreign key constraints for platform_games table
ALTER TABLE platform_games 
ADD CONSTRAINT fk_platform_games_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

ALTER TABLE platform_games 
ADD CONSTRAINT fk_platform_games_platform 
FOREIGN KEY (platform_id) REFERENCES platform(id) ON DELETE CASCADE;

-- Add foreign key constraints for comment table
ALTER TABLE comment 
ADD CONSTRAINT fk_comment_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- Only add rating FK if rating_id column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'comment' 
        AND column_name = 'rating_id'
    ) THEN
        ALTER TABLE comment 
        ADD CONSTRAINT fk_comment_rating 
        FOREIGN KEY (rating_id) REFERENCES rating(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for content_like table
ALTER TABLE content_like 
ADD CONSTRAINT fk_content_like_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- Add foreign key constraints for user_game_list table
ALTER TABLE user_game_list 
ADD CONSTRAINT fk_user_game_list_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE user_game_list 
ADD CONSTRAINT fk_user_game_list_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

-- Add foreign key constraints for user_follow table
ALTER TABLE user_follow 
ADD CONSTRAINT fk_user_follow_follower 
FOREIGN KEY (follower_id) REFERENCES "user"(id) ON DELETE CASCADE;

ALTER TABLE user_follow 
ADD CONSTRAINT fk_user_follow_following 
FOREIGN KEY (following_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- Add data integrity constraints
ALTER TABLE rating 
ADD CONSTRAINT rating_value_check 
CHECK (rating >= 1.0 AND rating <= 10.0);

ALTER TABLE rating 
ADD CONSTRAINT review_length_check 
CHECK (review IS NULL OR char_length(review) <= 5000);

-- Add unique constraint to prevent duplicate ratings
ALTER TABLE rating 
ADD CONSTRAINT unique_user_game_rating 
UNIQUE (user_id, game_id);

-- Add unique constraint to prevent duplicate game progress
ALTER TABLE game_progress 
ADD CONSTRAINT unique_user_game_progress 
UNIQUE (user_id, game_id);

-- Verify all constraints were added
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Successfully added foreign key constraints. Total FK constraints: %', fk_count;
END $$;