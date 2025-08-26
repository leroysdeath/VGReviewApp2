-- Fix Follower Count Synchronization Issue
-- This migration:
-- 1. Creates the missing trigger for follower/following counts
-- 2. Fixes RLS policy conflicts
-- 3. Syncs existing data

-- =====================================================
-- STEP 1: Fix existing data discrepancies
-- =====================================================

-- Update all user follower counts to match actual relationships
UPDATE "user" 
SET follower_count = (
  SELECT COUNT(*) 
  FROM user_follow 
  WHERE following_id = "user".id
);

-- Update all user following counts to match actual relationships
UPDATE "user" 
SET following_count = (
  SELECT COUNT(*) 
  FROM user_follow 
  WHERE follower_id = "user".id
);

-- =====================================================
-- STEP 2: Create or replace the trigger function with SECURITY DEFINER
-- =====================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_user_follow_counts() CASCADE;

-- Create trigger function that bypasses RLS
CREATE OR REPLACE FUNCTION update_user_follow_counts()
RETURNS TRIGGER 
SECURITY DEFINER -- This runs with the privileges of the function owner, bypassing RLS
SET search_path = public -- Security best practice
AS $$
BEGIN
  -- Handle INSERT (new follow relationship)
  IF TG_OP = 'INSERT' THEN
    -- Update follower count for the user being followed
    UPDATE "user" 
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
    -- Update following count for the user doing the following
    UPDATE "user" 
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    -- Log for debugging (can be removed in production)
    RAISE NOTICE 'Follow created: % follows %', NEW.follower_id, NEW.following_id;
    
    RETURN NEW;
  END IF;
  
  -- Handle DELETE (unfollow)
  IF TG_OP = 'DELETE' THEN
    -- Update follower count for the user being unfollowed
    UPDATE "user" 
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.following_id;
    
    -- Update following count for the user doing the unfollowing
    UPDATE "user" 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
    
    -- Log for debugging (can be removed in production)
    RAISE NOTICE 'Follow removed: % unfollowed %', OLD.follower_id, OLD.following_id;
    
    RETURN OLD;
  END IF;
  
  -- Handle UPDATE (shouldn't happen for user_follow, but included for completeness)
  IF TG_OP = 'UPDATE' THEN
    -- If the following_id changed (shouldn't happen, but handle it)
    IF OLD.following_id != NEW.following_id THEN
      -- Decrement old followed user
      UPDATE "user" 
      SET follower_count = GREATEST(0, follower_count - 1)
      WHERE id = OLD.following_id;
      
      -- Increment new followed user
      UPDATE "user" 
      SET follower_count = follower_count + 1
      WHERE id = NEW.following_id;
    END IF;
    
    -- If the follower_id changed (shouldn't happen, but handle it)
    IF OLD.follower_id != NEW.follower_id THEN
      -- Decrement old follower
      UPDATE "user" 
      SET following_count = GREATEST(0, following_count - 1)
      WHERE id = OLD.follower_id;
      
      -- Increment new follower
      UPDATE "user" 
      SET following_count = following_count + 1
      WHERE id = NEW.follower_id;
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions to the function
ALTER FUNCTION update_user_follow_counts() OWNER TO postgres;

-- =====================================================
-- STEP 3: Create the trigger
-- =====================================================

-- Drop existing trigger if it exists (it doesn't, but good practice)
DROP TRIGGER IF EXISTS user_follow_count_trigger ON user_follow;

-- Create trigger for INSERT, UPDATE, and DELETE operations
CREATE TRIGGER user_follow_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON user_follow
  FOR EACH ROW
  EXECUTE FUNCTION update_user_follow_counts();

-- =====================================================
-- STEP 4: Verify the fix
-- =====================================================

-- Test query to verify counts are now correct
DO $$
DECLARE
  v_user RECORD;
  v_actual_followers INTEGER;
  v_actual_following INTEGER;
BEGIN
  -- Check each user
  FOR v_user IN SELECT id, username, follower_count, following_count FROM "user" LOOP
    -- Get actual counts
    SELECT COUNT(*) INTO v_actual_followers 
    FROM user_follow 
    WHERE following_id = v_user.id;
    
    SELECT COUNT(*) INTO v_actual_following 
    FROM user_follow 
    WHERE follower_id = v_user.id;
    
    -- Report any mismatches
    IF v_user.follower_count != v_actual_followers OR v_user.following_count != v_actual_following THEN
      RAISE WARNING 'User % (%) has mismatched counts. Stored: % followers, % following. Actual: % followers, % following',
        v_user.username, 
        v_user.id,
        v_user.follower_count,
        v_user.following_count,
        v_actual_followers,
        v_actual_following;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Follower count verification complete';
END;
$$;

-- =====================================================
-- STEP 5: Create indexes if they don't exist
-- =====================================================

-- These indexes speed up the count queries
CREATE INDEX IF NOT EXISTS idx_user_follow_follower_id ON user_follow(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follow_following_id ON user_follow(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follower_count ON "user"(follower_count);
CREATE INDEX IF NOT EXISTS idx_user_following_count ON "user"(following_count);

-- =====================================================
-- STEP 6: Add comment documentation
-- =====================================================

COMMENT ON FUNCTION update_user_follow_counts() IS 
'Maintains synchronized follower and following counts on the user table when user_follow relationships change. 
Uses SECURITY DEFINER to bypass RLS restrictions and ensure counts are always updated.';

COMMENT ON TRIGGER user_follow_count_trigger ON user_follow IS 
'Automatically updates user.follower_count and user.following_count when follow relationships are created or removed.';

-- =====================================================
-- Final verification for leroysdeath specifically
-- =====================================================

DO $$
DECLARE
  v_leroysdeath_followers INTEGER;
  v_leroysdeath_stored INTEGER;
BEGIN
  -- Get actual follower count for leroysdeath
  SELECT COUNT(*) INTO v_leroysdeath_followers
  FROM user_follow uf
  JOIN "user" u ON u.id = uf.following_id
  WHERE u.username = 'leroysdeath';
  
  -- Get stored count
  SELECT follower_count INTO v_leroysdeath_stored
  FROM "user"
  WHERE username = 'leroysdeath';
  
  RAISE NOTICE 'leroysdeath follower count - Actual: %, Stored: %', 
    v_leroysdeath_followers, 
    v_leroysdeath_stored;
  
  IF v_leroysdeath_followers = v_leroysdeath_stored THEN
    RAISE NOTICE '✅ leroysdeath follower count is now correct!';
  ELSE
    RAISE WARNING '❌ leroysdeath follower count mismatch still exists';
  END IF;
END;
$$;