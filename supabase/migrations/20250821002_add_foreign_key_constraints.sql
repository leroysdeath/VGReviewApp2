-- =====================================================
-- Phase 2: Add Foreign Key Constraints
-- =====================================================
-- This migration adds foreign key constraints to prevent future orphaned data
-- and ensures referential integrity across the database

-- Add foreign key constraints for rating table with conflict checking
DO $$
BEGIN
    -- Rating -> Game foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_rating_game_id'
        AND table_name = 'rating'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE rating 
        ADD CONSTRAINT fk_rating_game_id 
        FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_rating_game_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_rating_game_id already exists';
    END IF;

    -- Rating -> User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_rating_user_id'
        AND table_name = 'rating'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE rating 
        ADD CONSTRAINT fk_rating_user_id 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_rating_user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_rating_user_id already exists';
    END IF;
END $$;

-- Add foreign key constraints for game_progress table with conflict checking
DO $$
BEGIN
    -- Game Progress -> Game foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_game_progress_game_id'
        AND table_name = 'game_progress'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE game_progress 
        ADD CONSTRAINT fk_game_progress_game_id 
        FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_game_progress_game_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_game_progress_game_id already exists';
    END IF;

    -- Game Progress -> User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_game_progress_user_id'
        AND table_name = 'game_progress'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE game_progress 
        ADD CONSTRAINT fk_game_progress_user_id 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_game_progress_user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_game_progress_user_id already exists';
    END IF;
END $$;

-- Add foreign key constraints for comment table with conflict checking
DO $$
BEGIN
    -- Comment -> Rating foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_comment_rating_id'
        AND table_name = 'comment'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE comment 
        ADD CONSTRAINT fk_comment_rating_id 
        FOREIGN KEY (rating_id) REFERENCES rating(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_comment_rating_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_comment_rating_id already exists';
    END IF;
    
    -- Comment -> User foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_comment_user_id'
        AND table_name = 'comment'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE comment 
        ADD CONSTRAINT fk_comment_user_id 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_comment_user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_comment_user_id already exists';
    END IF;
END $$;

-- Add foreign key constraints for other critical tables
DO $$
BEGIN
    -- platform_games table -> Game foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_platform_games_game_id'
        AND table_name = 'platform_games'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE platform_games 
        ADD CONSTRAINT fk_platform_games_game_id 
        FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_platform_games_game_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_platform_games_game_id already exists';
    END IF;
    
    -- platform_games table -> Platform foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_platform_games_platform_id'
        AND table_name = 'platform_games'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE platform_games 
        ADD CONSTRAINT fk_platform_games_platform_id 
        FOREIGN KEY (platform_id) REFERENCES platform(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_platform_games_platform_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_platform_games_platform_id already exists';
    END IF;
    
    -- user_game_list table with unique constraint names
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_game_list_user_id'
        AND table_name = 'user_game_list'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_game_list 
        ADD CONSTRAINT fk_user_game_list_user_id 
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_user_game_list_user_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_user_game_list_user_id already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_user_game_list_game_id'
        AND table_name = 'user_game_list'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_game_list 
        ADD CONSTRAINT fk_user_game_list_game_id 
        FOREIGN KEY (game_id) REFERENCES game(id) ON DELETE CASCADE;
        RAISE NOTICE 'Created foreign key constraint: fk_user_game_list_game_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_user_game_list_game_id already exists';
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