-- HOTFIX: Fix the trigger function search_path syntax
-- The previous migration had the old incorrect syntax still in place

-- Drop and recreate the trigger function with CORRECT syntax
DROP FUNCTION IF EXISTS update_rating_like_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_rating_like_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public  -- CORRECT syntax (no quotes, no TO)
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

-- Recreate the trigger
CREATE TRIGGER update_rating_like_count_trigger
AFTER INSERT OR DELETE ON content_like
FOR EACH ROW
EXECUTE FUNCTION public.update_rating_like_count();

-- Verify the fix
DO $$
DECLARE
    v_search_path TEXT;
BEGIN
    -- Check if the function now has correct search_path
    SELECT regexp_replace(pg_get_functiondef(oid), '.*SET search_path = (.+?)\n.*', '\1', 's')
    INTO v_search_path
    FROM pg_proc
    WHERE proname = 'update_rating_like_count';
    
    RAISE NOTICE 'Function search_path is now: %', v_search_path;
    
    -- Test that rating table is accessible
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rating') THEN
        RAISE NOTICE '✅ Rating table found and accessible';
    ELSE
        RAISE WARNING '❌ Rating table not found!';
    END IF;
END $$;

-- Also ensure the content_like insert doesn't fail by adding is_like default
-- The content_like table has an is_like column that needs a value
ALTER TABLE content_like ALTER COLUMN is_like SET DEFAULT true;