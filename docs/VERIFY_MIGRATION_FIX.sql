-- ============================================================================
-- VERIFICATION QUERIES - Database Function Fix
-- ============================================================================
-- Run these in Supabase SQL Editor to verify the migration was applied correctly
-- ============================================================================

-- ============================================================================
-- QUERY 1: Check Function Signature
-- ============================================================================
-- Verifies the function exists with correct UUID parameter type

SELECT
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments,
  pg_catalog.pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_or_create_user'
  AND n.nspname = 'public';

-- EXPECTED RESULT:
-- function_name: get_or_create_user
-- arguments: auth_id uuid, user_email text, user_name text, user_provider text DEFAULT 'supabase'::text
-- return_type: integer

-- ✅ If you see "uuid" in arguments (not "text") = SUCCESS


-- ============================================================================
-- QUERY 2: Check Function Permissions
-- ============================================================================
-- Verifies both authenticated and anon roles have execute permission

SELECT
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges
WHERE routine_name = 'get_or_create_user'
  AND routine_schema = 'public';

-- EXPECTED RESULT (should see 2 rows):
-- grantee: authenticated | privilege_type: EXECUTE
-- grantee: anon          | privilege_type: EXECUTE

-- ✅ If you see BOTH roles = SUCCESS


-- ============================================================================
-- QUERY 3: Test the Function (Dry Run)
-- ============================================================================
-- Tests calling the function with your actual user ID
-- REPLACE 'YOUR_USER_UUID' with your actual UUID from the logs

SELECT get_or_create_user(
  'f14ad903-24b3-4af6-9cc8-9c2bd62b1f51'::UUID,  -- Your user ID from logs
  'test@example.com',
  'Test User',
  'supabase'
);

-- EXPECTED RESULT:
-- Should return an integer (your database user ID, probably 5)
-- Should NOT error with "operator does not exist: uuid = text"

-- ✅ If returns a number = SUCCESS
-- ❌ If errors = MIGRATION NOT APPLIED CORRECTLY


-- ============================================================================
-- QUERY 4: Check User Record Exists
-- ============================================================================
-- Verifies your user record is in the database

SELECT
  id,
  provider_id,
  email,
  username,
  name,
  created_at
FROM "user"
WHERE provider_id = 'f14ad903-24b3-4af6-9cc8-9c2bd62b1f51';

-- EXPECTED RESULT:
-- Should return your user record with id = 5

-- ✅ If returns your record = SUCCESS


-- ============================================================================
-- QUERY 5: Check for Old Function Versions (Cleanup Check)
-- ============================================================================
-- Ensures old broken versions were dropped

SELECT
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as signature
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_or_create_user'
  AND n.nspname = 'public';

-- EXPECTED RESULT:
-- Should only show ONE function with UUID parameter
-- Should NOT show any with (text, text, text, text)

-- ✅ If only 1 row with UUID = SUCCESS
-- ⚠️ If multiple rows = Old versions not cleaned up


-- ============================================================================
-- SUMMARY OF WHAT TO LOOK FOR
-- ============================================================================

-- Query 1: ✅ Arguments include "auth_id uuid" (not text)
-- Query 2: ✅ Both 'authenticated' and 'anon' have EXECUTE permission
-- Query 3: ✅ Returns an integer without errors
-- Query 4: ✅ Your user record exists
-- Query 5: ✅ Only one function version exists

-- If ALL checks pass = Migration successfully applied! 🎉
-- If ANY fail = Something went wrong, may need to re-run migration

-- ============================================================================
-- NEXT STEP: Test in Browser
-- ============================================================================
-- After verifying database:
-- 1. Reload your app with debug mode enabled
-- 2. Check logs for "userService_db_function_success" instead of "failed"
-- 3. Should see NO recovery banner
-- 4. Page should load faster (no 2-second timeout)
