-- DATABASE HEALTH CHECKS FOR USER STATE DEBUGGING
-- Run these queries in Supabase SQL Editor to diagnose user interaction issues
-- Generated: January 2025

-- =============================================================================
-- QUERY 1: Inspect the First User (Your Account)
-- =============================================================================
-- This will show if the first user's record has any data integrity issues
SELECT
  id,
  provider_id,
  email,
  username,
  name,
  created_at,
  updated_at
FROM "user"
ORDER BY created_at ASC
LIMIT 1;

-- WHAT TO LOOK FOR:
-- ✅ All fields should be populated (not NULL)
-- ✅ provider_id should be a valid UUID string
-- ✅ email should match your account email
-- ❌ If provider_id is NULL or invalid = data corruption
-- ❌ If email doesn't match = wrong user returned


-- =============================================================================
-- QUERY 2: Check for Orphaned Auth Records
-- =============================================================================
-- Finds users who exist in Supabase Auth but have no database record
SELECT
  auth.users.id AS auth_id,
  auth.users.email AS auth_email,
  auth.users.created_at AS auth_created,
  "user".id AS db_user_id
FROM auth.users
LEFT JOIN "user" ON auth.users.id::TEXT = "user".provider_id
WHERE "user".id IS NULL
ORDER BY auth.users.created_at ASC
LIMIT 10;

-- WHAT TO LOOK FOR:
-- ✅ Should return 0 rows (all auth users have DB records)
-- ❌ If rows exist = orphaned auth records, get_or_create_user failed
-- 🔧 FIX: Run get_or_create_user for each orphaned user


-- =============================================================================
-- QUERY 3: Check for Duplicate Provider IDs
-- =============================================================================
-- Finds users with the same provider_id (should be impossible with unique constraint)
SELECT
  provider_id,
  COUNT(*) as count,
  ARRAY_AGG(id) as user_ids,
  ARRAY_AGG(email) as emails
FROM "user"
GROUP BY provider_id
HAVING COUNT(*) > 1;

-- WHAT TO LOOK FOR:
-- ✅ Should return 0 rows (provider_id has unique constraint)
-- ❌ If rows exist = database constraint violation, data corruption
-- 🔧 FIX: Manually merge duplicate records, delete extras


-- =============================================================================
-- QUERY 4: User Account Statistics
-- =============================================================================
-- Shows total users and recent signup activity
SELECT
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as users_last_7_days,
  COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as users_last_24_hours,
  MIN(created_at) as first_user_created,
  MAX(created_at) as last_user_created
FROM "user";

-- WHAT TO LOOK FOR:
-- ✅ total_users should match expected user count
-- ✅ Recent signups indicate healthy user creation flow
-- ❌ If users_last_24_hours = 0 but you just created test users = creation failing


-- =============================================================================
-- QUERY 5: Check for Null or Invalid Critical Fields
-- =============================================================================
-- Finds users with missing required data
SELECT
  id,
  provider_id,
  email,
  username,
  name,
  created_at
FROM "user"
WHERE provider_id IS NULL
   OR email IS NULL
   OR email = ''
   OR provider_id = ''
ORDER BY created_at ASC
LIMIT 10;

-- WHAT TO LOOK FOR:
-- ✅ Should return 0 rows (all required fields populated)
-- ❌ If rows exist = data validation failed during creation
-- 🔧 FIX: Manually update records or delete and recreate


-- =============================================================================
-- QUERY 6: Check Auth Users Table (Compare with DB Users)
-- =============================================================================
-- Shows recent auth users and their status
SELECT
  id AS auth_id,
  email,
  created_at,
  confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- WHAT TO LOOK FOR:
-- ✅ confirmed_at should be set for email-confirmed users
-- ✅ last_sign_in_at shows recent activity
-- ❌ If confirmed_at is NULL = user hasn't confirmed email
-- ❌ Compare count with QUERY 4 - should match


-- =============================================================================
-- QUERY 7: Detailed First User Analysis
-- =============================================================================
-- Cross-reference auth and DB records for the first user
WITH first_db_user AS (
  SELECT id, provider_id, email, username, name, created_at
  FROM "user"
  ORDER BY created_at ASC
  LIMIT 1
)
SELECT
  'DB Record' AS source,
  fdu.id::TEXT AS user_id,
  fdu.provider_id AS auth_reference,
  fdu.email,
  fdu.username,
  fdu.name,
  fdu.created_at
FROM first_db_user fdu

UNION ALL

SELECT
  'Auth Record' AS source,
  au.id::TEXT AS user_id,
  'N/A' AS auth_reference,
  au.email,
  'N/A' AS username,
  au.raw_user_meta_data->>'name' AS name,
  au.created_at
FROM auth.users au
WHERE au.id::TEXT = (SELECT provider_id FROM first_db_user);

-- WHAT TO LOOK FOR:
-- ✅ Should return 2 rows (DB record + matching Auth record)
-- ✅ provider_id should match auth.users.id
-- ✅ Email should match in both records
-- ❌ If only 1 row = orphaned record, mismatch issue
-- ❌ If emails don't match = data corruption


-- =============================================================================
-- QUERY 8: Check RLS Policies on User Table
-- =============================================================================
-- Shows Row Level Security policies that might block access
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
WHERE schemaname = 'public'
  AND tablename = 'user';

-- WHAT TO LOOK FOR:
-- ✅ Policies should allow authenticated users to read their own records
-- ❌ If policies are too restrictive = users can't access their data
-- 🔧 FIX: Adjust RLS policies in Supabase dashboard


-- =============================================================================
-- QUERY 9: Check for Users with Activity but No Interactions
-- =============================================================================
-- Finds users who have logged in but haven't created any content
SELECT
  u.id,
  u.email,
  u.username,
  u.created_at,
  u.updated_at,
  COUNT(r.id) as review_count,
  COUNT(c.id) as comment_count
FROM "user" u
LEFT JOIN rating r ON u.id = r.user_id
LEFT JOIN comment c ON u.id = c.user_id
WHERE u.created_at < NOW() - INTERVAL '1 day'
GROUP BY u.id, u.email, u.username, u.created_at, u.updated_at
HAVING COUNT(r.id) = 0 AND COUNT(c.id) = 0
ORDER BY u.created_at ASC
LIMIT 10;

-- WHAT TO LOOK FOR:
-- First user should appear here if they "can't interact with the site"
-- ✅ If review_count and comment_count = 0 for first user = no interactions working
-- 🔧 FIX: Check if it's state issue (cache) or permission issue (RLS)


-- =============================================================================
-- QUERY 10: Test RLS as the First User
-- =============================================================================
-- Simulates database access as a specific user to test RLS
-- REPLACE 'FIRST_USER_PROVIDER_ID' with actual provider_id from QUERY 1

-- First, get the provider_id from QUERY 1, then run:
/*
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims.sub = 'FIRST_USER_PROVIDER_ID';

-- Try to read user's own record
SELECT id, email, username, name
FROM "user"
WHERE provider_id = 'FIRST_USER_PROVIDER_ID';

-- If this returns 0 rows = RLS is blocking access
-- If this returns 1 row = RLS is working, issue is elsewhere
*/

-- NOTE: You may need to run this in a transaction:
-- BEGIN;
-- [the SET LOCAL commands above]
-- [the SELECT query]
-- ROLLBACK;


-- =============================================================================
-- INSTRUCTIONS FOR RUNNING THESE QUERIES
-- =============================================================================
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to: SQL Editor
-- 3. Copy and paste queries ONE AT A TIME
-- 4. Click "Run" for each query
-- 5. Save results for analysis

-- PRIORITIZE THESE QUERIES:
-- 1. QUERY 1 (First User) - Highest priority
-- 2. QUERY 2 (Orphaned Auth) - Shows signup failures
-- 3. QUERY 7 (Detailed First User) - Cross-reference records
-- 4. QUERY 9 (No Interactions) - Confirms "can't interact" symptom

-- After running queries, look for:
-- ❌ NULL or empty required fields
-- ❌ Mismatched auth/DB records
-- ❌ Orphaned auth users
-- ❌ Overly restrictive RLS policies
