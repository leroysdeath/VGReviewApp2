-- =====================================================
-- SIMPLIFIED ACCOUNT COMPARISON QUERIES
-- Using only columns that actually exist in your schema
-- =====================================================

-- 1. Compare core user fields between leroy and working account
-- =====================================================
SELECT
  'leroysdeath' as account,
  id,
  provider_id,
  username,
  name,
  email,
  display_name,
  avatar_url,
  bio,
  location,
  website,
  platform,
  is_active,
  email_verified,
  last_login_at,
  created_at,
  updated_at,
  -- Check for NULL values that shouldn't be NULL
  CASE WHEN email IS NULL THEN 'MISSING EMAIL' ELSE 'OK' END as email_check,
  CASE WHEN username IS NULL THEN 'MISSING USERNAME' ELSE 'OK' END as username_check,
  CASE WHEN id IS NULL THEN 'MISSING ID' ELSE 'OK' END as id_check,
  CASE WHEN provider_id IS NULL THEN 'MISSING PROVIDER_ID' ELSE 'OK' END as provider_id_check
FROM "user"
WHERE username = 'leroysdeath'

UNION ALL

SELECT
  'tommyinnit2' as account,
  id,
  provider_id,
  username,
  name,
  email,
  display_name,
  avatar_url,
  bio,
  location,
  website,
  platform,
  is_active,
  email_verified,
  last_login_at,
  created_at,
  updated_at,
  CASE WHEN email IS NULL THEN 'MISSING EMAIL' ELSE 'OK' END as email_check,
  CASE WHEN username IS NULL THEN 'MISSING USERNAME' ELSE 'OK' END as username_check,
  CASE WHEN id IS NULL THEN 'MISSING ID' ELSE 'OK' END as id_check,
  CASE WHEN provider_id IS NULL THEN 'MISSING PROVIDER_ID' ELSE 'OK' END as provider_id_check
FROM "user"
WHERE username = 'tommyinnit2';

-- 2. Check auth.users table (requires elevated permissions)
-- =====================================================
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
  raw_app_meta_data,
  raw_user_meta_data,
  CASE
    WHEN banned_until IS NOT NULL THEN 'BANNED'
    WHEN email_confirmed_at IS NULL THEN 'EMAIL NOT CONFIRMED'
    ELSE 'OK'
  END as auth_status
FROM auth.users
WHERE email LIKE '%leroy%' OR id IN (
  SELECT provider_id FROM "user" WHERE username = 'leroysdeath'
);

-- 3. Check for ID mismatches between user and auth.users
-- =====================================================
SELECT
  u.id as user_db_id,
  u.provider_id as user_provider_id,
  u.username,
  u.email as user_email,
  au.id as auth_id,
  au.email as auth_email,
  CASE
    WHEN au.id IS NULL THEN 'USER EXISTS BUT NO AUTH RECORD'
    WHEN u.id IS NULL THEN 'AUTH EXISTS BUT NO USER RECORD'
    WHEN u.provider_id != au.id THEN 'PROVIDER_ID MISMATCH'
    WHEN u.email != au.email THEN 'EMAIL MISMATCH'
    ELSE 'OK'
  END as sync_status
FROM "user" u
FULL OUTER JOIN auth.users au ON u.provider_id = au.id
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

-- 5. Simple SELECT to see all columns that exist
-- =====================================================
-- If queries above fail, run this to see actual schema
SELECT *
FROM "user"
WHERE username = 'leroysdeath'
LIMIT 1;

-- =====================================================
-- DIAGNOSIS CHECKLIST
-- =====================================================
-- [ ] Query 1: User table comparison - check for NULL or missing fields
-- [ ] Query 2: Auth table check - verify email confirmation and auth status
-- [ ] Query 3: Sync check - ensure user.provider_id matches auth.users.id
-- [ ] Query 4: Related data - verify account has associated data
-- [ ] Query 5: Full table dump - see all actual columns

-- =====================================================
-- COMMON ISSUES TO LOOK FOR
-- =====================================================
-- 1. Email not confirmed in auth.users (email_confirmed_at IS NULL)
-- 2. provider_id mismatch between user.provider_id and auth.users.id
-- 3. NULL required fields (email, username, id, provider_id)
-- 4. Account marked as banned (banned_until IS NOT NULL)
-- 5. Missing auth.users record (orphaned user record)
-- 6. is_active set to false
