-- Check current RLS policies on user table
-- Run this in Supabase SQL Editor to see what policies exist

-- 1. Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'user';

-- 2. List all current policies
SELECT
  policyname,
  cmd as command,
  roles,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE tablename = 'user'
ORDER BY policyname;

-- 3. Test query as authenticated user (simulated)
-- This should return the leroysdeath user
SET LOCAL ROLE authenticated;
SELECT id, provider_id, email, username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
RESET ROLE;

-- 4. Test query as anon (simulated)
SET LOCAL ROLE anon;
SELECT id, provider_id, email, username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
RESET ROLE;

-- 5. Check if there are any other constraints or issues
SELECT conname, contype, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'public.user'::regclass;
