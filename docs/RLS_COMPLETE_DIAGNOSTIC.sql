-- Complete RLS Diagnostic - Run this entire file at once in Supabase SQL Editor
-- All results will appear in separate result tabs

-- ============================================================================
-- QUERY 1: Check if RLS is enabled on user table
-- ============================================================================
SELECT
  '1. RLS Status' as query_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'user';

-- ============================================================================
-- QUERY 2: List all current RLS policies (MOST IMPORTANT)
-- ============================================================================
SELECT
  '2. Current Policies' as query_name,
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'user'
ORDER BY policyname;

-- ============================================================================
-- QUERY 3: Test authenticated role access
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '3. Testing authenticated role access...';
END $$;

SET LOCAL ROLE authenticated;
SELECT
  '3. Authenticated Role Test' as query_name,
  id,
  provider_id,
  email,
  username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
RESET ROLE;

-- ============================================================================
-- QUERY 4: Test anon role access
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '4. Testing anon role access...';
END $$;

SET LOCAL ROLE anon;
SELECT
  '4. Anon Role Test' as query_name,
  id,
  provider_id,
  email,
  username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
RESET ROLE;

-- ============================================================================
-- QUERY 5: Check constraints (already ran, but including for completeness)
-- ============================================================================
SELECT
  '5. Constraints' as query_name,
  conname,
  contype,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.user'::regclass
ORDER BY contype, conname;

-- ============================================================================
-- QUERY 6: Summary - What we're looking for
-- ============================================================================
SELECT
  '6. What to look for in results' as info,
  'Query 1: rowsecurity should be TRUE' as check_1,
  'Query 2: Should show 3 policies (auth_all, anon_read, anon_write) if fix was applied' as check_2,
  'Query 3: Should return leroysdeath user record if authenticated role works' as check_3,
  'Query 4: Should return leroysdeath user record if anon role can read' as check_4,
  'If Query 2 shows different policies, those are blocking the app!' as important;
