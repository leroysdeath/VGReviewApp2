-- =====================================================
-- Create Trigger for Automatic Completion Status Sync
-- =====================================================
-- This trigger ensures that when a rating is created, the completion_status
-- is automatically set to 'started' and game_progress is properly tracked

-- First, ensure game_progress table has unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'game_progress_user_game_unique'
    ) THEN
        ALTER TABLE game_progress 
        ADD CONSTRAINT game_progress_user_game_unique 
        UNIQUE (user_id, game_id);
    END IF;
END $$;

-- Create function to automatically sync completion_status with game_progress
CREATE OR REPLACE FUNCTION sync_rating_completion_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When inserting a rating, ensure game is marked as started
    IF TG_OP = 'INSERT' THEN
        -- First, ensure game_progress record exists and is marked as started
        INSERT INTO game_progress (user_id, game_id, started, started_date)
        VALUES (NEW.user_id, NEW.game_id, true, NOW())
        ON CONFLICT (user_id, game_id) 
        DO UPDATE SET 
            started = true, 
            started_date = COALESCE(game_progress.started_date, NOW());
        
        -- Set completion_status to 'started' if not explicitly provided
        IF NEW.completion_status IS NULL OR NEW.completion_status = 'not_started' THEN
            NEW.completion_status = 'started';
        END IF;
        
        RAISE LOG 'Rating created for user % game % with completion_status: %', 
                  NEW.user_id, NEW.game_id, NEW.completion_status;
    END IF;
    
    -- When updating a rating, sync completion status changes to game_progress if needed
    IF TG_OP = 'UPDATE' THEN
        -- If completion_status changed to 'completed', we could update game_progress
        -- (This is optional for future enhancement)
        IF OLD.completion_status != NEW.completion_status THEN
            RAISE LOG 'Completion status changed for user % game % from % to %',
                      NEW.user_id, NEW.game_id, OLD.completion_status, NEW.completion_status;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on rating table (BEFORE INSERT to modify NEW record)
DROP TRIGGER IF EXISTS rating_completion_status_sync ON rating;
CREATE TRIGGER rating_completion_status_sync
    BEFORE INSERT OR UPDATE ON rating
    FOR EACH ROW 
    EXECUTE FUNCTION sync_rating_completion_status();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION sync_rating_completion_status() TO authenticated;

RAISE NOTICE 'Completion status sync trigger created successfully';