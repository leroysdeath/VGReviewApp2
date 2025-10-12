-- Verification Script: Check Supabase Linter Warnings Before Migration
-- Run this to see current state of the warnings

\echo '================================================'
\echo 'CHECKING FUNCTION SEARCH_PATH CONFIGURATION'
\echo '================================================'

-- Check if check_avatar_upload_allowed has search_path
SELECT
  p.proname AS function_name,
  n.nspname AS schema,
  CASE
    WHEN p.prosecdef THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security,
  CASE
    WHEN p.proconfig IS NOT NULL AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
    THEN '✅ Has search_path'
    ELSE '❌ Missing search_path'
  END AS search_path_status,
  array_to_string(p.proconfig, ', ') AS config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation');

\echo ''
\echo '================================================'
\echo 'CHECKING HTTP EXTENSION SCHEMA'
\echo '================================================'

-- Check which schema the http extension is in
SELECT
  e.extname AS extension_name,
  n.nspname AS schema,
  CASE
    WHEN n.nspname = 'public' THEN '❌ In public schema (should be moved)'
    WHEN n.nspname = 'extensions' THEN '✅ In extensions schema'
    ELSE '⚠️ In ' || n.nspname || ' schema'
  END AS status
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE e.extname = 'http';

\echo ''
\echo '================================================'
\echo 'SUMMARY OF ISSUES'
\echo '================================================'

-- Count issues
SELECT
  COUNT(*) FILTER (
    WHERE p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation')
      AND p.prosecdef
      AND (p.proconfig IS NULL OR array_to_string(p.proconfig, ',') NOT LIKE '%search_path%')
  ) AS functions_missing_search_path,
  COUNT(*) FILTER (
    WHERE e.extname = 'http' AND n.nspname = 'public'
  ) AS extensions_in_public_schema
FROM pg_proc p
JOIN pg_namespace pn ON p.pronamespace = pn.oid
FULL OUTER JOIN pg_extension e ON true
FULL OUTER JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE (pn.nspname = 'public' AND p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation'))
   OR (e.extname = 'http' AND n.nspname = 'public');

\echo ''
\echo 'Run the migration 20251009_fix_remaining_linter_warnings.sql to fix these issues'
