-- Fix the final 3 RLS policies with auth.jwt() calls
-- Run this in Supabase SQL Editor

-- Fix game_select_policy - wrap auth.jwt() in subquery
DROP POLICY IF EXISTS "game_select_policy" ON game;
CREATE POLICY "game_select_policy" ON game
  FOR SELECT USING (
    (redlight_flag IS NULL OR redlight_flag = false)
    OR
    ((SELECT auth.jwt()->>'role') = 'admin')
  );

-- Fix game_update_policy - wrap auth.jwt() in subquery
DROP POLICY IF EXISTS "game_update_policy" ON game;
CREATE POLICY "game_update_policy" ON game
  FOR UPDATE USING (
    ((SELECT auth.jwt()->>'role') = 'admin')
    OR
    (redlight_flag IS NULL OR redlight_flag = false)
  );

-- Fix game_views_insert_policy - wrap auth.uid() in subquery
DROP POLICY IF EXISTS "game_views_insert_policy" ON game_views;
CREATE POLICY "game_views_insert_policy" ON game_views
  FOR INSERT WITH CHECK (
    user_id = get_current_user_id()
    OR
    (user_id IS NULL AND (SELECT auth.uid()) IS NULL)
  );
