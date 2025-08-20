-- =====================================================
-- Fix Completion Status Data Consistency
-- =====================================================
-- This migration fixes the completion_status inconsistency where all reviews
-- show 'not_started' despite having corresponding game_progress entries

-- Step 1: Fix existing data by updating completion_status to 'started' 
-- for all reviews where game_progress shows the game was started
UPDATE rating 
SET completion_status = 'started',
    updated_at = NOW()
WHERE completion_status = 'not_started' 
AND EXISTS (
    SELECT 1 FROM game_progress gp 
    WHERE gp.user_id = rating.user_id 
    AND gp.game_id = rating.game_id 
    AND gp.started = true
);

-- Log the results for verification
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % rating records from not_started to started', updated_count;
END $$;