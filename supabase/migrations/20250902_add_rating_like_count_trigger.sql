-- Migration: Add trigger to maintain rating.like_count
-- Created: 2025-09-02
-- Purpose: Automatically update like_count column when likes are added/removed

-- Create function to update rating like count
CREATE OR REPLACE FUNCTION update_rating_like_count()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS trigger_update_rating_like_count ON content_like;

-- Create trigger for rating likes
CREATE TRIGGER trigger_update_rating_like_count
AFTER INSERT OR UPDATE OR DELETE ON content_like
FOR EACH ROW
WHEN (NEW.rating_id IS NOT NULL OR OLD.rating_id IS NOT NULL)
EXECUTE FUNCTION update_rating_like_count();

-- Backfill existing like counts
UPDATE rating 
SET like_count = (
  SELECT COUNT(*) 
  FROM content_like 
  WHERE content_like.rating_id = rating.id 
    AND content_like.is_like = true
);

-- Add comment explaining the trigger
COMMENT ON FUNCTION update_rating_like_count() IS 'Maintains rating.like_count column automatically when likes are added/removed';