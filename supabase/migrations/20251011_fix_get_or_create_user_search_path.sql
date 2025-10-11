-- Migration: Fix get_or_create_user search_path
-- Date: 2025-10-11
-- Purpose: Restore auth schema access to get_or_create_user function

-- ============================================================================
-- PROBLEM DIAGNOSIS
-- ============================================================================
-- The 20250922_fix_security_warnings_final migration set search_path = 'public'
-- for many functions, breaking those that need access to auth schema.
-- get_or_create_user needs both public (for "user" table) and auth schemas.
--
-- Current broken state: search_path = 'public, pg_temp'
-- Needed state: search_path = 'public, auth, pg_temp'
-- ============================================================================

-- Fix the search_path for get_or_create_user
ALTER FUNCTION public.get_or_create_user(uuid, text, text, text)
  SET search_path = 'public', 'auth', 'pg_temp';

-- Verify the fix
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  (SELECT config FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path%' LIMIT 1) AS search_path_setting
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_or_create_user';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed get_or_create_user search_path';
  RAISE NOTICE '   Old: search_path = public, pg_temp';
  RAISE NOTICE '   New: search_path = public, auth, pg_temp';
  RAISE NOTICE '   Function can now access auth.uid() and public.user table';
END $$;
