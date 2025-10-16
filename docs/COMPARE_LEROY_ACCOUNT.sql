-- =====================================================
-- COMPREHENSIVE ACCOUNT COMPARISON QUERIES
-- Run these in Supabase SQL Editor to diagnose leroy account
-- =====================================================

-- 1. Compare user table structure between leroy and working account
-- =====================================================
SELECT
  'leroysdeath' as account,
  id,
  username,
  email,
  display_name,
  created_at,
  updated_at,
  is_private,
  account_status,
  email_verified,
  profile_completed,
  total_reviews,
  total_ratings,
  last_online,
  -- Check for NULL values that shouldn't be NULL
  CASE WHEN email IS NULL THEN 'MISSING EMAIL' ELSE 'OK' END as email_check,
  CASE WHEN username IS NULL THEN 'MISSING USERNAME' ELSE 'OK' END as username_check,
  CASE WHEN id IS NULL THEN 'MISSING ID' ELSE 'OK' END as id_check,
  -- JSON fields
  preferences,
  notification_settings,
  privacy_settings
FROM "user"
WHERE username = 'leroysdeath'

UNION ALL

SELECT
  'tommyinnit2' as account,
  id,
  username,
  email,
  display_name,
  created_at,
  updated_at,
  is_private,
  account_status,
  email_verified,
  profile_completed,
  total_reviews,
  total_ratings,
  last_online,
  CASE WHEN email IS NULL THEN 'MISSING EMAIL' ELSE 'OK' END as email_check,
  CASE WHEN username IS NULL THEN 'MISSING USERNAME' ELSE 'OK' END as username_check,
  CASE WHEN id IS NULL THEN 'MISSING ID' ELSE 'OK' END as id_check,
  preferences,
  notification_settings,
  privacy_settings
FROM "user"
WHERE username = 'tommyinnit2';

-- 2. Check auth.users table (requires elevated permissions)
-- =====================================================
-- Note: This may require service_role permissions
SELECT
  id,
  email,
  email_confirmed_at,
  last_sign_in_at,
  created_at,
  updated_at,
  confirmation_sent_at,
  recovery_sent_at,
  email_change_sent_at,
  banned_until,
  -- Check auth metadata
  raw_app_meta_data,
  raw_user_meta_data,
  -- Check if account is locked or has issues
  CASE
    WHEN banned_until IS NOT NULL THEN 'BANNED'
    WHEN email_confirmed_at IS NULL THEN 'EMAIL NOT CONFIRMED'
    ELSE 'OK'
  END as auth_status
FROM auth.users
WHERE email LIKE '%leroy%' OR id IN (
  SELECT id FROM "user" WHERE username = 'leroysdeath'
);

-- 3. Check for orphaned records or mismatches
-- =====================================================
SELECT
  u.id as user_id,
  u.username,
  u.email as user_email,
  au.id as auth_id,
  au.email as auth_email,
  CASE
    WHEN au.id IS NULL THEN 'USER EXISTS BUT NO AUTH RECORD'
    WHEN u.id IS NULL THEN 'AUTH EXISTS BUT NO USER RECORD'
    WHEN u.id != au.id THEN 'ID MISMATCH'
    WHEN u.email != au.email THEN 'EMAIL MISMATCH'
    ELSE 'OK'
  END as sync_status
FROM "user" u
FULL OUTER JOIN auth.users au ON u.id = au.id
WHERE u.username = 'leroysdeath' OR au.email LIKE '%leroy%';

-- 4. Check related data (ratings, reviews, etc.)
-- =====================================================
WITH leroy_id AS (
  SELECT id FROM "user" WHERE username = 'leroysdeath'
)
SELECT
  'ratings' as data_type,
  COUNT(*) as count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM rating
WHERE user_id = (SELECT id FROM leroy_id)

UNION ALL

SELECT
  'comments' as data_type,
  COUNT(*) as count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM comment
WHERE user_id = (SELECT id FROM leroy_id)

UNION ALL

SELECT
  'notifications' as data_type,
  COUNT(*) as count,
  MIN(created_at) as oldest_record,
  MAX(created_at) as newest_record
FROM notification
WHERE user_id = (SELECT id FROM leroy_id);

-- 5. Check RLS policies affecting the account
-- =====================================================
-- Test if RLS is blocking reads for this specific user
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user', 'rating', 'comment', 'notification')
ORDER BY tablename, policyname;

-- 6. Check for corrupted JSON fields
-- =====================================================
SELECT
  username,
  -- Validate JSON structure
  CASE
    WHEN preferences IS NULL THEN 'NULL'
    WHEN jsonb_typeof(preferences) != 'object' THEN 'INVALID JSON TYPE'
    ELSE 'OK'
  END as preferences_check,
  CASE
    WHEN notification_settings IS NULL THEN 'NULL'
    WHEN jsonb_typeof(notification_settings) != 'object' THEN 'INVALID JSON TYPE'
    ELSE 'OK'
  END as notification_settings_check,
  CASE
    WHEN privacy_settings IS NULL THEN 'NULL'
    WHEN jsonb_typeof(privacy_settings) != 'object' THEN 'INVALID JSON TYPE'
    ELSE 'OK'
  END as privacy_settings_check,
  -- Show actual JSON content
  preferences,
  notification_settings,
  privacy_settings
FROM "user"
WHERE username = 'leroysdeath';

-- 7. Check for recent errors or issues in logs
-- =====================================================
-- This requires access to Supabase logs via dashboard
-- Look for: auth errors, RLS violations, constraint violations

-- 8. Test account visibility with different RLS contexts
-- =====================================================
-- NOTE: These queries test RLS in a transaction - run separately if needed

-- Test as anon user
BEGIN;
SET LOCAL role TO anon;
SELECT id, username, email FROM "user" WHERE username = 'leroysdeath';
ROLLBACK;

-- Test as authenticated user (simplified - requires manual JWT setup in Supabase)
-- You'll need to test this by logging in as leroy in the app
-- Then check browser console for actual JWT claims being sent

-- =====================================================
-- DIAGNOSIS CHECKLIST
-- =====================================================
-- [ ] Query 1: User table comparison - check for NULL or missing fields
-- [ ] Query 2: Auth table check - verify email confirmation and auth status
-- [ ] Query 3: Sync check - ensure user and auth records match
-- [ ] Query 4: Related data - verify account has associated data
-- [ ] Query 5: RLS policies - check if policies are too restrictive
-- [ ] Query 6: JSON validation - ensure no corrupted JSON fields
-- [ ] Query 7: Check Supabase logs for auth/RLS errors
-- [ ] Query 8: RLS context test - verify visibility in different contexts

-- =====================================================
-- COMMON ISSUES TO LOOK FOR
-- =====================================================
-- 1. Email not confirmed in auth.users (email_confirmed_at IS NULL)
-- 2. ID mismatch between user and auth.users tables
-- 3. NULL required fields (email, username, id)
-- 4. Corrupted JSON in preferences/settings
-- 5. Account marked as banned (banned_until IS NOT NULL)
-- 6. RLS policies blocking legitimate access
-- 7. Missing auth.users record (orphaned user record)
-- 8. account_status set to 'suspended' or 'banned'
