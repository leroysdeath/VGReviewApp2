-- Fix RLS issues with rating count triggers
-- The triggers need SECURITY DEFINER to bypass RLS when updating counts

-- Drop existing trigger functions
DROP FUNCTION IF EXISTS update_rating_like_count() CASCADE;
DROP FUNCTION IF EXISTS update_rating_comment_count() CASCADE;

-- Recreate update_rating_like_count with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_rating_like_count()
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

-- Recreate update_rating_comment_count with SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_rating_comment_count()
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

-- Recreate the triggers (they reference the functions above)
DROP TRIGGER IF EXISTS trigger_update_rating_like_count ON content_like;
CREATE TRIGGER trigger_update_rating_like_count
AFTER INSERT OR UPDATE OR DELETE ON content_like
FOR EACH ROW
EXECUTE FUNCTION update_rating_like_count();

DROP TRIGGER IF EXISTS trigger_update_rating_comment_count ON comment;
CREATE TRIGGER trigger_update_rating_comment_count
AFTER INSERT OR UPDATE OR DELETE ON comment
FOR EACH ROW
EXECUTE FUNCTION update_rating_comment_count();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_rating_like_count() TO authenticated;
GRANT EXECUTE ON FUNCTION update_rating_comment_count() TO authenticated;

-- Add comment explaining the security model
COMMENT ON FUNCTION update_rating_like_count() IS 'Updates rating like_count when content_like changes. Uses SECURITY DEFINER to bypass RLS since this is just updating counts after the actual security check on content_like insert.';
COMMENT ON FUNCTION update_rating_comment_count() IS 'Updates rating comment_count when comment changes. Uses SECURITY DEFINER to bypass RLS since this is just updating counts after the actual security check on comment insert.';