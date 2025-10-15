-- =====================================================
-- DIAGNOSE LEROYSDEATH ID MISMATCH
-- Find out why user ID comes back as null on login
-- =====================================================

-- 1. Check the user table for leroysdeath
-- =====================================================
SELECT
  id as user_table_id,
  username,
  email,
  provider_id,
  provider,
  created_at,
  updated_at
FROM "user"
WHERE username = 'leroysdeath' OR id = 1;

-- 2. Check auth.users for leroysdeath
-- =====================================================
SELECT
  id as auth_user_id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email LIKE '%leroy%' OR email LIKE '%joshuateusink%';

-- 3. Check for provider_id mismatch
-- =====================================================
-- This is the critical query - does the provider_id in user table
-- match the auth.users.id for leroysdeath?
SELECT
  u.id as user_table_id,
  u.username,
  u.provider_id as user_provider_id,
  au.id as auth_users_id,
  CASE
    WHEN u.provider_id = au.id THEN 'MATCH ✓'
    WHEN u.provider_id IS NULL THEN 'NULL PROVIDER_ID ✗'
    WHEN au.id IS NULL THEN 'NO AUTH RECORD ✗'
    ELSE 'MISMATCH ✗'
  END as id_status,
  u.email as user_email,
  au.email as auth_email
FROM "user" u
FULL OUTER JOIN auth.users au ON u.provider_id = au.id
WHERE u.username = 'leroysdeath'
   OR u.id = 1
   OR au.email LIKE '%leroy%'
   OR au.email LIKE '%joshuateusink%';

-- 4. List ALL users to check for patterns
-- =====================================================
-- This shows if other users have the same issue
SELECT
  u.id,
  u.username,
  u.provider_id,
  au.id as auth_id,
  CASE
    WHEN u.provider_id = au.id THEN 'OK'
    WHEN u.provider_id IS NULL THEN 'NULL'
    ELSE 'MISMATCH'
  END as status
FROM "user" u
LEFT JOIN auth.users au ON u.provider_id = au.id
ORDER BY u.id ASC
LIMIT 20;

-- =====================================================
-- EXPECTED ISSUE
-- =====================================================
-- Likely problem: Leroysdeath has user.id = 1 in the "user" table,
-- but either:
-- 1. user.provider_id is NULL
-- 2. user.provider_id doesn't match auth.users.id
-- 3. No record in auth.users at all
--
-- The lookupExistingUser function (userService.ts:336) queries:
--   .eq('provider_id', providerId)
--
-- If provider_id is NULL or mismatched, the lookup fails and returns null,
-- causing the dbUserId to be null in the auth flow.
-- =====================================================

-- 5. Check if there's a correct record we should be matching to
-- =====================================================
SELECT
  id as user_id,
  username,
  provider_id,
  email,
  'Check if provider_id matches auth.users table above' as note
FROM "user"
WHERE id = 1;

-- =====================================================
-- FIX OPTIONS (depending on diagnosis results)
-- =====================================================
-- Option 1: If provider_id is NULL, update it with correct auth.users.id
-- UPDATE "user"
-- SET provider_id = (SELECT id FROM auth.users WHERE email = 'joshuateusink@yahoo.com')
-- WHERE username = 'leroysdeath';

-- Option 2: If there's a mismatch, correct the provider_id
-- UPDATE "user"
-- SET provider_id = '<CORRECT_AUTH_USERS_ID_HERE>'
-- WHERE username = 'leroysdeath';

-- Option 3: If no auth.users record exists, that's a bigger problem
-- (Leroy needs to create an auth account or link existing account)
