-- =====================================================
-- Add Database Constraints for Completion Status Validation
-- =====================================================
-- This migration adds constraints to ensure data integrity and enforce
-- business rules around completion status and reviews

-- Step 1: Add constraint to ensure valid completion status values
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_completion_status'
    ) THEN
        ALTER TABLE rating 
        ADD CONSTRAINT valid_completion_status 
        CHECK (completion_status IN ('not_started', 'started', 'in_progress', 'completed', 'dropped'));
        
        RAISE NOTICE 'Added valid_completion_status constraint';
    ELSE
        RAISE NOTICE 'valid_completion_status constraint already exists';
    END IF;
END $$;

-- Step 2: Add constraint to ensure reviews require started status
-- (A rating/review cannot exist for a game that hasn't been started)
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'rating_requires_started_game'
    ) THEN
        ALTER TABLE rating 
        ADD CONSTRAINT rating_requires_started_game 
        CHECK (
            (rating IS NULL) OR 
            (rating IS NOT NULL AND completion_status IN ('started', 'in_progress', 'completed'))
        );
        
        RAISE NOTICE 'Added rating_requires_started_game constraint';
    ELSE
        RAISE NOTICE 'rating_requires_started_game constraint already exists';
    END IF;
END $$;

-- Step 3: Add constraint to ensure finished games have appropriate completion status
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'finished_game_completion_logic'
    ) THEN
        ALTER TABLE rating 
        ADD CONSTRAINT finished_game_completion_logic 
        CHECK (
            (finished = false) OR 
            (finished = true AND completion_status IN ('completed', 'dropped'))
        );
        
        RAISE NOTICE 'Added finished_game_completion_logic constraint';
    ELSE
        RAISE NOTICE 'finished_game_completion_logic constraint already exists';
    END IF;
END $$;

-- Step 4: Add index for better performance on completion_status queries
CREATE INDEX IF NOT EXISTS idx_rating_completion_status 
ON rating(completion_status) 
WHERE completion_status IS NOT NULL;

-- Step 5: Add index for better performance on user completion status queries
CREATE INDEX IF NOT EXISTS idx_rating_user_completion 
ON rating(user_id, completion_status) 
WHERE completion_status IS NOT NULL;

-- Step 6: Update any existing data that violates the new constraints
-- (This should be minimal since we fixed the data in the previous migration)
DO $$
DECLARE
    violation_count INTEGER;
BEGIN
    -- Check for any remaining violations
    SELECT COUNT(*) INTO violation_count
    FROM rating 
    WHERE rating IS NOT NULL 
    AND completion_status = 'not_started';
    
    IF violation_count > 0 THEN
        RAISE WARNING 'Found % rating records with not_started status. These may cause constraint violations.', violation_count;
        
        -- Fix any remaining violations
        UPDATE rating 
        SET completion_status = 'started'
        WHERE rating IS NOT NULL 
        AND completion_status = 'not_started';
        
        RAISE NOTICE 'Fixed % constraint violations by updating completion_status to started', violation_count;
    ELSE
        RAISE NOTICE 'No constraint violations found. All data is consistent.';
    END IF;
END $$;

RAISE NOTICE 'Completion status constraints added successfully';