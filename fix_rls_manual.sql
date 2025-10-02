-- Manual SQL to fix remaining RLS policies
-- Run this directly in Supabase SQL Editor

-- Step 1: Create helper function
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS INTEGER
LANGUAGE SQL STABLE
AS $$
  SELECT id FROM "user" WHERE provider_id = auth.uid()
$$;

-- Step 2: Fix all the policies that need updating
-- user_sessions
DROP POLICY IF EXISTS "user_sessions_select" ON user_sessions;
CREATE POLICY "user_sessions_select" ON user_sessions
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "user_sessions_insert" ON user_sessions;
CREATE POLICY "user_sessions_insert" ON user_sessions
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "user_sessions_update" ON user_sessions;
CREATE POLICY "user_sessions_update" ON user_sessions
  FOR UPDATE USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "user_sessions_delete" ON user_sessions;
CREATE POLICY "user_sessions_delete" ON user_sessions
  FOR DELETE USING (user_id = get_current_user_id());

-- notification
DROP POLICY IF EXISTS "notification_select_own" ON notification;
CREATE POLICY "notification_select_own" ON notification
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "notification_update_own" ON notification;
CREATE POLICY "notification_update_own" ON notification
  FOR UPDATE USING (user_id = get_current_user_id());

-- rating
DROP POLICY IF EXISTS "Users can manage own ratings" ON rating;
CREATE POLICY "Users can manage own ratings" ON rating
  FOR ALL USING (user_id = get_current_user_id());

-- game_state_history
DROP POLICY IF EXISTS "Users can view own game state history" ON game_state_history;
CREATE POLICY "Users can view own game state history" ON game_state_history
  FOR SELECT USING (user_id = get_current_user_id());

-- content_like
DROP POLICY IF EXISTS "Users can manage own likes" ON content_like;
CREATE POLICY "Users can manage own likes" ON content_like
  FOR ALL USING (user_id = get_current_user_id());

-- user_follow
DROP POLICY IF EXISTS "Users can follow other users" ON user_follow;
CREATE POLICY "Users can follow other users" ON user_follow
  FOR INSERT WITH CHECK (follower_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can unfollow other users" ON user_follow;
CREATE POLICY "Users can unfollow other users" ON user_follow
  FOR DELETE USING (follower_id = get_current_user_id());

-- user_collection
DROP POLICY IF EXISTS "Users can insert own collection items" ON user_collection;
CREATE POLICY "Users can insert own collection items" ON user_collection
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can update own collection items" ON user_collection;
CREATE POLICY "Users can update own collection items" ON user_collection
  FOR UPDATE USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can delete own collection items" ON user_collection;
CREATE POLICY "Users can delete own collection items" ON user_collection
  FOR DELETE USING (user_id = get_current_user_id());

-- user_wishlist
DROP POLICY IF EXISTS "Users can insert own wishlist items" ON user_wishlist;
CREATE POLICY "Users can insert own wishlist items" ON user_wishlist
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can update own wishlist items" ON user_wishlist;
CREATE POLICY "Users can update own wishlist items" ON user_wishlist
  FOR UPDATE USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can delete own wishlist items" ON user_wishlist;
CREATE POLICY "Users can delete own wishlist items" ON user_wishlist
  FOR DELETE USING (user_id = get_current_user_id());

-- user_game_list
DROP POLICY IF EXISTS "user_game_list_select" ON user_game_list;
CREATE POLICY "user_game_list_select" ON user_game_list
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "user_game_list_insert" ON user_game_list;
CREATE POLICY "user_game_list_insert" ON user_game_list
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

DROP POLICY IF EXISTS "user_game_list_update" ON user_game_list;
CREATE POLICY "user_game_list_update" ON user_game_list
  FOR UPDATE USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "user_game_list_delete" ON user_game_list;
CREATE POLICY "user_game_list_delete" ON user_game_list
  FOR DELETE USING (user_id = get_current_user_id());

-- user_preferences
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- game_views
DROP POLICY IF EXISTS "Users can view own game views" ON game_views;
CREATE POLICY "Users can view own game views" ON game_views
  FOR SELECT USING (user_id = get_current_user_id());

-- privacy_audit_log
DROP POLICY IF EXISTS "Users can view own audit log" ON privacy_audit_log;
CREATE POLICY "Users can view own audit log" ON privacy_audit_log
  FOR SELECT USING (user_id = get_current_user_id());

-- game_requests
DROP POLICY IF EXISTS "Users can view own requests" ON game_requests;
CREATE POLICY "Users can view own requests" ON game_requests
  FOR SELECT USING (user_id = get_current_user_id());

DROP POLICY IF EXISTS "Users can create requests" ON game_requests;
CREATE POLICY "Users can create requests" ON game_requests
  FOR INSERT WITH CHECK (user_id = get_current_user_id());

-- search_analytics (user_id is UUID, not integer)
DROP POLICY IF EXISTS "Users can view own search history" ON search_analytics;
CREATE POLICY "Users can view own search history" ON search_analytics
  FOR SELECT USING (user_id = (SELECT auth.uid()) OR user_id IS NULL);

DROP POLICY IF EXISTS "Anyone can insert anonymous searches" ON search_analytics;
CREATE POLICY "Anyone can insert anonymous searches" ON search_analytics
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own search history" ON search_analytics;
CREATE POLICY "Users can delete own search history" ON search_analytics
  FOR DELETE USING (user_id = (SELECT auth.uid()));

-- referrals
DROP POLICY IF EXISTS "Users can see their own referral" ON referrals;
CREATE POLICY "Users can see their own referral" ON referrals
  FOR SELECT USING (user_id = get_current_user_id());

-- referral_conversions
DROP POLICY IF EXISTS "Users can see their own conversion data" ON referral_conversions;
CREATE POLICY "Users can see their own conversion data" ON referral_conversions
  FOR SELECT USING (
    referral_id IN (
      SELECT id FROM referrals WHERE user_id = get_current_user_id()
    )
  );
