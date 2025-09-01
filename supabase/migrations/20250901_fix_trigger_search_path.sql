-- Fix the search_path syntax in trigger functions
-- The previous migration had incorrect syntax for SET search_path

-- Drop and recreate the trigger function with correct search_path syntax
DROP FUNCTION IF EXISTS public.update_rating_like_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_rating_like_count()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update like count for the rating
    UPDATE rating 
    SET like_count = (
      SELECT COUNT(*) 
      FROM content_like 
      WHERE rating_id = NEW.rating_id AND is_like = true
    )
    WHERE id = NEW.rating_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update like count for the rating
    UPDATE rating 
    SET like_count = (
      SELECT COUNT(*) 
      FROM content_like 
      WHERE rating_id = OLD.rating_id AND is_like = true
    )
    WHERE id = OLD.rating_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Also fix the comment count trigger
DROP FUNCTION IF EXISTS public.update_rating_comment_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_rating_comment_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published = true THEN
      UPDATE rating 
      SET comment_count = comment_count + 1
      WHERE id = NEW.rating_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle publish status changes
    IF OLD.is_published != NEW.is_published THEN
      IF NEW.is_published = true THEN
        UPDATE rating SET comment_count = comment_count + 1 WHERE id = NEW.rating_id;
      ELSE
        UPDATE rating SET comment_count = GREATEST(0, comment_count - 1) WHERE id = NEW.rating_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_published = true THEN
      UPDATE rating 
      SET comment_count = GREATEST(0, comment_count - 1)
      WHERE id = OLD.rating_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Recreate the triggers
DROP TRIGGER IF EXISTS trigger_update_rating_like_count ON public.content_like;
CREATE TRIGGER trigger_update_rating_like_count
AFTER INSERT OR UPDATE OR DELETE ON public.content_like
FOR EACH ROW
EXECUTE FUNCTION public.update_rating_like_count();

DROP TRIGGER IF EXISTS trigger_update_rating_comment_count ON public.comment;
CREATE TRIGGER trigger_update_rating_comment_count
AFTER INSERT OR UPDATE OR DELETE ON public.comment
FOR EACH ROW
EXECUTE FUNCTION public.update_rating_comment_count();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_rating_like_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_rating_comment_count() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION public.update_rating_like_count() IS 'Updates rating like_count when content_like changes. Uses SECURITY DEFINER to bypass RLS checks for count updates. Fixed search_path syntax.';
COMMENT ON FUNCTION public.update_rating_comment_count() IS 'Updates rating comment_count when comment changes. Uses SECURITY DEFINER to bypass RLS checks for count updates. Fixed search_path syntax.';