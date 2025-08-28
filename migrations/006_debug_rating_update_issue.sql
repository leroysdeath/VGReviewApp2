-- Debug migration: Understand why rating updates are failing
-- Date: 2025-08-27
-- Purpose: Diagnose the rating table update issue

-- Step 1: Check current user and permissions in Dashboard
SELECT 
  'Current user info' as info,
  current_user as user_name,
  session_user as session_user,
  current_setting('is_superuser') as is_superuser;

-- Step 2: Check specific table permissions
SELECT 
  'Table permissions' as info,
  has_table_privilege('rating', 'SELECT') as can_select,
  has_table_privilege('rating', 'UPDATE') as can_update,
  has_table_privilege('rating', 'INSERT') as can_insert,
  has_table_privilege('rating', 'DELETE') as can_delete;

-- Step 3: Check RLS status again
SELECT 
  'RLS status' as info,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname = 'rating' AND n.nspname = 'public';

-- Step 4: Try a simple update with explicit WHERE clause
UPDATE rating 
SET slug = 'debug-test-' || id::text 
WHERE id = 1;

-- Step 5: Check if the update worked
SELECT 
  'Update test result' as info,
  id, 
  slug,
  CASE 
    WHEN slug LIKE 'debug-test-%' THEN 'UPDATE_WORKED'
    ELSE 'UPDATE_FAILED'
  END as status
FROM rating 
WHERE id = 1;

-- Step 6: Roll back the test update
UPDATE rating 
SET slug = 'giants-citizen-kabuto'
WHERE id = 1;