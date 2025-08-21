-- =====================================================
-- Phase 2: Add Foreign Key Constraints
-- =====================================================
-- This migration adds foreign key constraints to prevent future orphaned data
-- and ensures referential integrity across the database

-- Add foreign key constraints for rating table
ALTER TABLE rating 
ADD CONSTRAINT fk_rating_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

ALTER TABLE rating 
ADD CONSTRAINT fk_rating_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- Add foreign key constraints for game_progress table
ALTER TABLE game_progress 
ADD CONSTRAINT fk_game_progress_game 
FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;

ALTER TABLE game_progress 
ADD CONSTRAINT fk_game_progress_user 
FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;

-- Add foreign key constraints for comment table (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_comment_rating'
    ) THEN
        ALTER TABLE comment 
        ADD CONSTRAINT fk_comment_rating 
        FOREIGN KEY (rating_id) REFERENCES rating(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_comment_user'
    ) THEN
        ALTER TABLE comment 
        ADD CONSTRAINT fk_comment_user 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraints for other critical tables
DO $$
BEGIN
    -- platform_games table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_platform_games_game'
    ) THEN
        ALTER TABLE platform_games 
        ADD CONSTRAINT fk_platform_games_game 
        FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_platform_games_platform'
    ) THEN
        ALTER TABLE platform_games 
        ADD CONSTRAINT fk_platform_games_platform 
        FOREIGN KEY (platform_id) REFERENCES platform(id) ON DELETE CASCADE;
    END IF;
    
    -- user_game_list table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_game_list_user'
    ) THEN
        ALTER TABLE user_game_list 
        ADD CONSTRAINT fk_user_game_list_user 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_game_list_game'
    ) THEN
        ALTER TABLE user_game_list 
        ADD CONSTRAINT fk_user_game_list_game 
        FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Log successful constraint creation
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count 
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_schema = 'public';
    
    RAISE NOTICE 'Total foreign key constraints in database: %', constraint_count;
END $$;