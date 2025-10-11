-- Migration: CRITICAL FIX - handle_new_user search_path
-- Date: 2025-10-11
-- Purpose: Fix the ONE function blocking all logins

-- ============================================================================
-- ROOT CAUSE IDENTIFIED
-- ============================================================================
-- When ANY user tries to log in, a trigger fires:
--   auth.users -> on_auth_user_created -> handle_new_user()
--
-- handle_new_user has search_path="" (empty), so it CANNOT see public.user table
-- This causes:
--   - INSERT INTO public.user fails
--   - Trigger fails
--   - Login fails with HTTP 400
--   - "relation 'user' does not exist"
-- ============================================================================

-- THE FIX: Give handle_new_user access to public schema
ALTER FUNCTION public.handle_new_user()
  SET search_path = 'public', 'pg_temp';

-- Verify the fix
SELECT
  p.proname AS function_name,
  (SELECT config FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path%' LIMIT 1) AS new_search_path
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ CRITICAL FIX APPLIED';
  RAISE NOTICE '   handle_new_user can now access public.user table';
  RAISE NOTICE '   Login should work for ALL users now';
  RAISE NOTICE '   Test: Try logging in as user ID 1';
END $$;
