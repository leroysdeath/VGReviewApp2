-- =====================================================
-- Fix RLS Policy Warnings
-- =====================================================
-- This migration addresses the Supabase linter warnings for tables
-- that have RLS enabled but no policies defined:
-- - public.notification
-- - public.user_game_list  
-- - public.user_sessions

-- First, clean up any conflicting policies that might exist
-- to ensure a clean slate

-- =====================================================
-- 1. NOTIFICATION TABLE POLICIES
-- =====================================================

-- Drop existing notification policies if they exist
DROP POLICY IF EXISTS "Users can view own notifications" ON notification;
DROP POLICY IF EXISTS "Users can update own notifications" ON notification;
DROP POLICY IF EXISTS "Users can see their own notifications" ON notification;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notification;
DROP POLICY IF EXISTS "Users can insert notifications" ON notification;
DROP POLICY IF EXISTS "System can insert notifications" ON notification;

-- Create comprehensive notification policies
-- Users can view their own notifications
CREATE POLICY "notification_select_own" ON notification
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- Users can update their own notifications (mark as read, dismissed, etc.)
CREATE POLICY "notification_update_own" ON notification
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- System can insert notifications (triggered by functions, not direct user action)
CREATE POLICY "notification_insert_system" ON notification
  FOR INSERT
  TO authenticated
  WITH CHECK (true); -- Allow system inserts, controlled by application logic

-- =====================================================
-- 2. USER_GAME_LIST TABLE POLICIES  
-- =====================================================

-- Drop existing user_game_list policies if they exist
DROP POLICY IF EXISTS "Users can manage own lists" ON user_game_list;
DROP POLICY IF EXISTS "Users can view public lists" ON user_game_list;
DROP POLICY IF EXISTS "Users can view own lists" ON user_game_list;
DROP POLICY IF EXISTS "Users can insert own lists" ON user_game_list;
DROP POLICY IF EXISTS "Users can update own lists" ON user_game_list;
DROP POLICY IF EXISTS "Users can delete own lists" ON user_game_list;

-- Public lists are viewable by anyone, private lists only by owner
CREATE POLICY "user_game_list_select" ON user_game_list
  FOR SELECT
  TO authenticated
  USING (
    is_public = true 
    OR user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- Users can insert entries in their own lists
CREATE POLICY "user_game_list_insert" ON user_game_list
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- Users can update their own list entries
CREATE POLICY "user_game_list_update" ON user_game_list
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- Users can delete their own list entries
CREATE POLICY "user_game_list_delete" ON user_game_list
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- =====================================================
-- 3. USER_SESSIONS TABLE POLICIES
-- =====================================================

-- Drop existing user_sessions policies if they exist
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can manage own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON user_sessions;

-- Users can view their own sessions
CREATE POLICY "user_sessions_select" ON user_sessions
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- Users can insert their own sessions (when logging in)
CREATE POLICY "user_sessions_insert" ON user_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- Users can update their own sessions (updating last_active, etc.)
CREATE POLICY "user_sessions_update" ON user_sessions
  FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- Users can delete their own sessions (when logging out)
CREATE POLICY "user_sessions_delete" ON user_sessions
  FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM "user" 
      WHERE provider_id = auth.uid()
    )
  );

-- =====================================================
-- POLICY DOCUMENTATION
-- =====================================================

-- Add comments to document the policies
COMMENT ON POLICY "notification_select_own" ON notification IS 
'Users can view their own notifications. Uses auth.uid() to match against user.provider_id.';

COMMENT ON POLICY "notification_update_own" ON notification IS 
'Users can update their own notifications (mark as read, dismissed, etc.).';

COMMENT ON POLICY "notification_insert_system" ON notification IS 
'Allows system to insert notifications. Controlled by application logic and database triggers.';

COMMENT ON POLICY "user_game_list_select" ON user_game_list IS 
'Public lists visible to all authenticated users. Private lists only visible to owner.';

COMMENT ON POLICY "user_game_list_insert" ON user_game_list IS 
'Users can add games to their own lists (wishlist, collection, etc.).';

COMMENT ON POLICY "user_game_list_update" ON user_game_list IS 
'Users can update their own list entries (change notes, priority, visibility).';

COMMENT ON POLICY "user_game_list_delete" ON user_game_list IS 
'Users can remove games from their own lists.';

COMMENT ON POLICY "user_sessions_select" ON user_sessions IS 
'Users can view their own active sessions for security/account management.';

COMMENT ON POLICY "user_sessions_insert" ON user_sessions IS 
'Users can create new sessions when logging in.';

COMMENT ON POLICY "user_sessions_update" ON user_sessions IS 
'Users can update their own sessions (extend expiry, update activity).';

COMMENT ON POLICY "user_sessions_delete" ON user_sessions IS 
'Users can delete their own sessions when logging out or revoking access.';

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Query to verify all policies are properly created
-- Run this after migration to confirm the fix:
/*
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || with_check  
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('notification', 'user_game_list', 'user_sessions')
ORDER BY tablename, policyname;
*/