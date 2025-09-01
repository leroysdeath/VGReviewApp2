-- Fix rating table reference and enable self-liking
-- This migration fixes the "rating does not exist" error and allows users to like their own reviews

-- First, let's check and update the ReviewInteractions component logic
-- The self-liking restriction should be removed from the frontend

-- Drop and recreate the trigger function with proper schema qualification
DROP FUNCTION IF EXISTS public.update_rating_like_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_rating_like_count()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, pg_catalog
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Update like count for the rating with explicit schema
    UPDATE public.rating 
    SET like_count = (
      SELECT COUNT(*) 
      FROM public.content_like 
      WHERE rating_id = NEW.rating_id AND is_like = true
    )
    WHERE id = NEW.rating_id;
    
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Update like count for the rating with explicit schema
    UPDATE public.rating 
    SET like_count = (
      SELECT COUNT(*) 
      FROM public.content_like 
      WHERE rating_id = OLD.rating_id AND is_like = true
    )
    WHERE id = OLD.rating_id;
    
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Also update the comment count trigger for consistency
DROP FUNCTION IF EXISTS public.update_rating_comment_count() CASCADE;

CREATE OR REPLACE FUNCTION public.update_rating_comment_count()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, pg_catalog
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_published = true THEN
      UPDATE public.rating 
      SET comment_count = comment_count + 1
      WHERE id = NEW.rating_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle publish status changes
    IF OLD.is_published != NEW.is_published THEN
      IF NEW.is_published = true THEN
        UPDATE public.rating SET comment_count = comment_count + 1 WHERE id = NEW.rating_id;
      ELSE
        UPDATE public.rating SET comment_count = GREATEST(0, comment_count - 1) WHERE id = NEW.rating_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.is_published = true THEN
      UPDATE public.rating 
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.update_rating_like_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_rating_comment_count() TO authenticated;

-- Update comments
COMMENT ON FUNCTION public.update_rating_like_count() IS 'Updates rating like_count when content_like changes. Uses SECURITY DEFINER to bypass RLS. Explicitly references public schema to avoid "relation does not exist" errors.';
COMMENT ON FUNCTION public.update_rating_comment_count() IS 'Updates rating comment_count when comment changes. Uses SECURITY DEFINER to bypass RLS. Explicitly references public schema to avoid "relation does not exist" errors.';

-- Note: Self-liking is now allowed at the database level
-- The frontend component ReviewInteractions.tsx should be updated to remove the isReviewAuthor check for the like button