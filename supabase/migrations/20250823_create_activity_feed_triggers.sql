-- Migration: Create Activity Feed Refresh Triggers
-- Purpose: Auto-refresh materialized view when source data changes
-- Date: 2025-08-23

-- Add triggers to source tables to refresh activity feed materialized view
-- These triggers use STATEMENT level to avoid excessive refreshes

-- Rating table triggers
DROP TRIGGER IF EXISTS rating_activity_refresh ON rating;
CREATE TRIGGER rating_activity_refresh
AFTER INSERT OR UPDATE OR DELETE ON rating
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

-- Comment table triggers
DROP TRIGGER IF EXISTS comment_activity_refresh ON comment;
CREATE TRIGGER comment_activity_refresh
AFTER INSERT OR UPDATE OR DELETE ON comment
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

-- User follow table triggers
DROP TRIGGER IF EXISTS user_follow_activity_refresh ON user_follow;
CREATE TRIGGER user_follow_activity_refresh
AFTER INSERT OR DELETE ON user_follow
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

-- Content like table triggers
DROP TRIGGER IF EXISTS content_like_activity_refresh ON content_like;
CREATE TRIGGER content_like_activity_refresh
AFTER INSERT OR DELETE ON content_like
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

-- Game progress table triggers
DROP TRIGGER IF EXISTS game_progress_activity_refresh ON game_progress;
CREATE TRIGGER game_progress_activity_refresh
AFTER INSERT OR UPDATE ON game_progress
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

-- User table triggers (for when user info changes, affecting display names/avatars)
DROP TRIGGER IF EXISTS user_activity_refresh ON "user";
CREATE TRIGGER user_activity_refresh
AFTER UPDATE ON "user"
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

-- Game table triggers (for when game info changes, affecting game names/covers)
DROP TRIGGER IF EXISTS game_activity_refresh ON game;
CREATE TRIGGER game_activity_refresh
AFTER UPDATE ON game
FOR EACH STATEMENT EXECUTE FUNCTION schedule_activity_feed_refresh();

-- Create a background job function to process refresh notifications
-- This should be called periodically (e.g., every 5 minutes) by a cron job
CREATE OR REPLACE FUNCTION process_activity_feed_refresh_queue()
RETURNS void AS $$
DECLARE
  notification_count INTEGER := 0;
BEGIN
  -- Check if there are any pending refresh notifications
  -- This is a simple implementation - in production you might use a proper queue
  
  -- For now, just refresh the materialized view
  -- In a production system, you'd want to implement proper queuing and rate limiting
  REFRESH MATERIALIZED VIEW CONCURRENTLY activity_feed_materialized;
  
  -- Log the refresh
  RAISE NOTICE 'Activity feed materialized view refreshed at %', NOW();
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Failed to refresh activity feed materialized view: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_activity_feed_refresh_queue() TO authenticated;

-- Comment explaining how to set up periodic refresh
/*
To set up periodic refresh of the activity feed, you can:

1. Use a background job service (recommended for Supabase):
   - Set up a serverless function that calls process_activity_feed_refresh_queue()
   - Schedule it to run every 5-10 minutes using Supabase Edge Functions + cron
   
2. Manual refresh when needed:
   SELECT refresh_activity_feed();

The materialized view will be automatically refreshed whenever source data changes
via the triggers, but you can also manually refresh or set up periodic jobs.
*/