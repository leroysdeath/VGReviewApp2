-- Phase 2: Optimize Related Tables & Triggers
-- This migration fixes trigger function syntax and creates the missing trigger

-- 1. Drop and recreate the trigger function with correct syntax
DROP FUNCTION IF EXISTS update_rating_like_count() CASCADE;

CREATE OR REPLACE FUNCTION update_rating_like_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- Fixed syntax (was "TO 'public'")
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment like count
        UPDATE rating 
        SET like_count = COALESCE(like_count, 0) + 1 
        WHERE id = NEW.rating_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement like count (prevent negative)
        UPDATE rating 
        SET like_count = GREATEST(0, COALESCE(like_count, 1) - 1)
        WHERE id = OLD.rating_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

-- 2. Create the trigger (it doesn't exist based on our check)
CREATE TRIGGER update_rating_like_count_trigger
AFTER INSERT OR DELETE ON content_like
FOR EACH ROW
WHEN (NEW.rating_id IS NOT NULL OR OLD.rating_id IS NOT NULL)
EXECUTE FUNCTION update_rating_like_count();

-- 3. Create function to recalculate like counts (for data consistency)
CREATE OR REPLACE FUNCTION recalculate_all_like_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset all like counts based on actual data
    UPDATE rating r
    SET like_count = (
        SELECT COUNT(*)
        FROM content_like cl
        WHERE cl.rating_id = r.id
    );
    
    RAISE NOTICE 'Recalculated like counts for all ratings';
END;
$$;

-- 4. Run the recalculation to ensure data consistency
SELECT recalculate_all_like_counts();

-- 5. Add comment to document the trigger
COMMENT ON TRIGGER update_rating_like_count_trigger ON content_like IS 
'Automatically updates rating.like_count when likes are added/removed. Optimized for performance with COALESCE and GREATEST.';

-- 6. Create index on rating.like_count if not exists (already exists as idx_rating_like_count)
-- Skipping as it already exists

RAISE NOTICE 'Phase 2 migration complete: Triggers optimized and like counts recalculated';