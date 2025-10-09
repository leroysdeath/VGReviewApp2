-- Migration: Fix Review Insert Timeout
-- Date: 2025-10-07
-- Purpose: Disable the expensive materialized view refresh trigger that causes
--          statement timeouts when inserting reviews. The trigger was refreshing
--          the ENTIRE rating_with_details_cached view on every single insert.
--
-- Root Cause: refresh_rating_details_trigger calls REFRESH MATERIALIZED VIEW
--             CONCURRENTLY which scans all ratings, causing 57014 timeout errors.
--
-- Solution: Drop the per-row trigger. The materialized view can be refreshed:
--           1. On a schedule (pg_cron every 5-10 minutes)
--           2. Manually when needed
--           3. Not at all (queries can use rating table directly with joins)

-- Drop the expensive trigger that refreshes materialized view on every insert
DROP TRIGGER IF EXISTS refresh_rating_details_trigger ON rating;
DROP TRIGGER IF EXISTS smart_refresh_rating_details_trigger ON rating;

-- Drop the trigger function (no longer needed)
DROP FUNCTION IF EXISTS trigger_refresh_rating_details() CASCADE;
DROP FUNCTION IF EXISTS smart_refresh_rating_details() CASCADE;

-- Only add comment if the view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_matviews
    WHERE schemaname = 'public'
    AND matviewname = 'rating_with_details_cached'
  ) THEN
    COMMENT ON MATERIALIZED VIEW rating_with_details_cached IS
    'Pre-joined rating data with user and game details. Eliminates expensive LATERAL JOINs.
    WARNING: Auto-refresh trigger was removed due to performance issues (caused statement timeouts).
    Refresh manually via: SELECT refresh_rating_details_cache();
    Or schedule with pg_cron for periodic updates.';
  END IF;
END $$;

-- Grant refresh permission if function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'refresh_rating_details_cache'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION refresh_rating_details_cache() TO authenticated';
  END IF;
END $$;

-- Optional: Add a less expensive trigger that only refreshes for specific conditions
-- Uncomment if you want to refresh only for high-value reviews (e.g., popular games)
/*
CREATE OR REPLACE FUNCTION smart_refresh_rating_details()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  game_review_count INTEGER;
BEGIN
  -- Only refresh for games with fewer than 100 reviews (low overhead)
  SELECT COUNT(*) INTO game_review_count
  FROM rating
  WHERE game_id = NEW.game_id AND is_published = true;

  IF game_review_count < 100 THEN
    -- Still expensive but only for less popular games
    PERFORM refresh_rating_details_cache();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER smart_refresh_rating_details_trigger
AFTER INSERT OR UPDATE OF is_published, rating, review, like_count ON rating
FOR EACH ROW
WHEN (NEW.is_published = true)
EXECUTE FUNCTION smart_refresh_rating_details();
*/
