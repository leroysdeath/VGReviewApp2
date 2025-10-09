-- Fix the final 2 game table policies using a helper function approach
-- Run this in Supabase SQL Editor

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT (auth.jwt()->>'role') = 'admin'
$$;

-- Fix game_select_policy using the helper function
DROP POLICY IF EXISTS "game_select_policy" ON game;
CREATE POLICY "game_select_policy" ON game
  FOR SELECT USING (
    (redlight_flag IS NULL OR redlight_flag = false)
    OR
    is_admin()
  );

-- Fix game_update_policy using the helper function
DROP POLICY IF EXISTS "game_update_policy" ON game;
CREATE POLICY "game_update_policy" ON game
  FOR UPDATE USING (
    is_admin()
    OR
    (redlight_flag IS NULL OR redlight_flag = false)
  );
