-- ============================================================================
-- DATABASE HEALTH CHECK QUERIES
-- ============================================================================
-- Purpose: Diagnose user state issues and "first user can't interact" problem
-- Instructions: Run these queries ONE AT A TIME in Supabase SQL Editor
-- Copy each result and paste into docs/DATABASE_QUERY_RESULTS.md
-- ============================================================================

-- ============================================================================
-- QUERY 1: First User Record
-- ============================================================================
-- Purpose: Check if the first user's record has data corruption
-- Expected: All fields should be populated (no NULLs)

SELECT id, provider_id, email, username, name, created_at, updated_at
FROM "user"
ORDER BY created_at ASC
LIMIT 1;

-- ============================================================================
-- QUERY 2: Orphaned Auth Records
-- ============================================================================
-- Purpose: Find users who have auth but no database record (signup failures)
-- Expected: Should return 0 rows (all auth users should have DB records)

SELECT auth.users.id AS auth_id,
       auth.users.email AS auth_email,
       auth.users.created_at AS auth_created,
       "user".id AS db_user_id
FROM auth.users
LEFT JOIN "user" ON auth.users.id = "user".provider_id::UUID
WHERE "user".id IS NULL
ORDER BY auth.users.created_at ASC
LIMIT 10;

-- ============================================================================
-- QUERY 3: Duplicate Provider IDs
-- ============================================================================
-- Purpose: Check for duplicate provider_ids (constraint violations)
-- Expected: Should return 0 rows (provider_id has unique constraint)

SELECT provider_id,
       COUNT(*) as count,
       ARRAY_AGG(id) as user_ids,
       ARRAY_AGG(email) as emails
FROM "user"
GROUP BY provider_id
HAVING COUNT(*) > 1;

-- ============================================================================
-- QUERY 4: User Statistics
-- ============================================================================
-- Purpose: Show total users and recent signup activity
-- Expected: Numbers should match your understanding of user base

SELECT COUNT(*) as total_users,
       COUNT(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 END) as users_last_7_days,
       COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as users_last_24_hours,
       MIN(created_at) as first_user_created,
       MAX(created_at) as last_user_created
FROM "user";

-- ============================================================================
-- QUERY 5: Invalid Data Check
-- ============================================================================
-- Purpose: Find users with missing required data
-- Expected: Should return 0 rows (all required fields should be populated)

SELECT id, provider_id, email, username, name, created_at
FROM "user"
WHERE provider_id IS NULL
   OR email IS NULL
   OR email = ''
ORDER BY created_at ASC
LIMIT 10;

-- ============================================================================
-- QUERY 6: Users With No Interactions (Run if Query 1 looks normal)
-- ============================================================================
-- Purpose: Find users who can't interact with the site (no reviews/comments)
-- Expected: First user should appear here if they truly "can't interact"

SELECT u.id,
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

-- ============================================================================
-- QUERY 7: First User Cross-Reference (Run if issues found in Query 1)
-- ============================================================================
-- Purpose: Cross-reference auth and DB records for first user
-- Expected: Should return 2 rows (DB record + matching Auth record)

WITH first_db_user AS (
  SELECT id, provider_id, email, username, name, created_at
  FROM "user"
  ORDER BY created_at ASC
  LIMIT 1
)
SELECT 'DB Record' AS source,
       fdu.id::TEXT AS user_id,
       fdu.provider_id::TEXT AS auth_reference,
       fdu.email,
       fdu.username,
       fdu.name,
       fdu.created_at
FROM first_db_user fdu
UNION ALL
SELECT 'Auth Record' AS source,
       au.id::TEXT AS user_id,
       'N/A' AS auth_reference,
       au.email,
       'N/A' AS username,
       au.raw_user_meta_data->>'name' AS name,
       au.created_at
FROM auth.users au
WHERE au.id = (SELECT provider_id::UUID FROM first_db_user);

-- ============================================================================
-- QUERY 8: RLS Policies Check (Run if access issues suspected)
-- ============================================================================
-- Purpose: Show Row Level Security policies that might block access
-- Expected: Policies should allow authenticated users to read their own records

SELECT schemaname,
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

-- ============================================================================
-- INSTRUCTIONS FOR RUNNING
-- ============================================================================
-- 1. Open Supabase Dashboard: https://supabase.com/dashboard
-- 2. Go to SQL Editor (left sidebar)
-- 3. Copy each query above and run ONE AT A TIME
-- 4. Copy the results
-- 5. Paste results into docs/DATABASE_QUERY_RESULTS.md
-- 6. Save the file and notify the assistant
--
-- PRIORITY ORDER:
-- - Queries 1-5: Run these first (most important)
-- - Query 6: Run if Query 1 looks normal but user still can't interact
-- - Query 7: Run if Query 1 shows issues
-- - Query 8: Run if RLS/permissions suspected
-- ============================================================================
