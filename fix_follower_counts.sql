-- =====================================================
-- FIX FOLLOWER COUNT SYNCHRONIZATION ISSUE
-- =====================================================
-- Run this migration in your Supabase SQL Editor
-- This will:
-- 1. Sync all existing follower/following counts
-- 2. Create the missing trigger function with proper permissions
-- 3. Attach the trigger to automatically update counts going forward
-- =====================================================

-- STEP 1: Fix all existing follower/following count mismatches
-- This updates the stored counts to match actual relationships
UPDATE "user" 
SET follower_count = (
  SELECT COUNT(*) 
  FROM user_follow 
  WHERE following_id = "user".id
);

UPDATE "user" 
SET following_count = (
  SELECT COUNT(*) 
  FROM user_follow 
  WHERE follower_id = "user".id
);

-- STEP 2: Drop existing function if it exists (clean slate)
DROP FUNCTION IF EXISTS update_user_follow_counts() CASCADE;

-- STEP 3: Create the trigger function with SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION update_user_follow_counts()
RETURNS TRIGGER 
SECURITY DEFINER -- CRITICAL: This allows the trigger to bypass RLS and update any user's counts
SET search_path = public
AS $$
BEGIN
  -- Handle new follow relationship
  IF TG_OP = 'INSERT' THEN
    -- Increment follower count for the user being followed
    UPDATE "user" 
    SET follower_count = follower_count + 1
    WHERE id = NEW.following_id;
    
    -- Increment following count for the user doing the following
    UPDATE "user" 
    SET following_count = following_count + 1
    WHERE id = NEW.follower_id;
    
    RETURN NEW;
  END IF;
  
  -- Handle unfollow
  IF TG_OP = 'DELETE' THEN
    -- Decrement follower count for the user being unfollowed
    UPDATE "user" 
    SET follower_count = GREATEST(0, follower_count - 1)
    WHERE id = OLD.following_id;
    
    -- Decrement following count for the user doing the unfollowing
    UPDATE "user" 
    SET following_count = GREATEST(0, following_count - 1)
    WHERE id = OLD.follower_id;
    
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Set proper ownership (important for SECURITY DEFINER)
ALTER FUNCTION update_user_follow_counts() OWNER TO postgres;

-- STEP 5: Create the trigger
DROP TRIGGER IF EXISTS user_follow_count_trigger ON user_follow;

CREATE TRIGGER user_follow_count_trigger
  AFTER INSERT OR DELETE ON user_follow
  FOR EACH ROW
  EXECUTE FUNCTION update_user_follow_counts();

-- STEP 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_follow_follower_id ON user_follow(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follow_following_id ON user_follow(following_id);

-- STEP 7: Verify the fix worked
-- This will show you the before/after for leroysdeath
DO $$
DECLARE
  v_user RECORD;
BEGIN
  -- Check leroysdeath specifically
  SELECT 
    username,
    follower_count,
    following_count,
    (SELECT COUNT(*) FROM user_follow WHERE following_id = u.id) as actual_followers,
    (SELECT COUNT(*) FROM user_follow WHERE follower_id = u.id) as actual_following
  INTO v_user
  FROM "user" u
  WHERE username = 'leroysdeath';
  
  RAISE NOTICE 'leroysdeath counts - Followers: % (actual: %), Following: % (actual: %)', 
    v_user.follower_count, 
    v_user.actual_followers,
    v_user.following_count,
    v_user.actual_following;
    
  IF v_user.follower_count = v_user.actual_followers AND v_user.following_count = v_user.actual_following THEN
    RAISE NOTICE '✅ SUCCESS: leroysdeath follower counts are now synchronized!';
  ELSE
    RAISE WARNING '❌ ERROR: Counts still mismatched. Manual investigation needed.';
  END IF;
END;
$$;