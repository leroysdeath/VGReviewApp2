-- =====================================================
-- FIX LEROYSDEATH PROVIDER_ID SYNC
-- =====================================================

-- STEP 1: Verify the current state
-- =====================================================
SELECT
  'Current State Check' as check_type,
  u.id as user_table_id,
  u.username,
  u.provider_id as user_provider_id,
  au.id as auth_users_id,
  CASE
    WHEN u.provider_id = au.id THEN '✓ MATCH'
    ELSE '✗ MISMATCH - NEEDS FIX'
  END as status
FROM "user" u
LEFT JOIN auth.users au ON u.email = au.email
WHERE u.username = 'leroysdeath';

-- STEP 2: Get the correct auth.users ID for leroysdeath
-- =====================================================
SELECT
  'Auth User Lookup' as check_type,
  id as correct_auth_id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'joshuateusink@yahoo.com';

-- STEP 3: Fix the provider_id mismatch
-- =====================================================
-- This updates the user table to use the correct auth.users ID
UPDATE "user"
SET provider_id = (
  SELECT id
  FROM auth.users
  WHERE email = 'joshuateusink@yahoo.com'
)
WHERE username = 'leroysdeath'
  AND email = 'joshuateusink@yahoo.com';

-- STEP 4: Verify the fix worked
-- =====================================================
SELECT
  'After Fix Verification' as check_type,
  u.id as user_table_id,
  u.username,
  u.provider_id as user_provider_id,
  au.id as auth_users_id,
  CASE
    WHEN u.provider_id = au.id THEN '✓ FIXED - IDs NOW MATCH'
    ELSE '✗ STILL BROKEN'
  END as status,
  u.email as user_email,
  au.email as auth_email
FROM "user" u
LEFT JOIN auth.users au ON u.provider_id = au.id
WHERE u.username = 'leroysdeath';

-- =====================================================
-- WHAT THIS FIXES
-- =====================================================
-- Problem: The user.provider_id (8c06387a-5ee0-413e-bd94-b8cb29610d9d)
--          doesn't match the actual auth.users.id for joshuateusink@yahoo.com
--
-- The lookupExistingUser function (userService.ts:336) queries:
--   SELECT id FROM "user" WHERE provider_id = <auth_user_id>
--
-- When Leroy logs in:
-- 1. Auth system provides his auth.users.id (UUID)
-- 2. lookupExistingUser searches for provider_id = that UUID
-- 3. If provider_id is wrong, lookup fails
-- 4. Returns null for dbUserId
-- 5. Leroy can't interact with the site
--
-- This fix syncs the provider_id to the correct auth.users.id
-- =====================================================

-- =====================================================
-- POST-FIX INSTRUCTIONS
-- =====================================================
-- After running this fix:
-- 1. Leroy needs to sign out and sign back in
-- 2. Clear browser cache (Ctrl + Shift + R)
-- 3. The dbUserId should now be 1 when he logs in
-- 4. His avatar and all features should work
-- =====================================================
