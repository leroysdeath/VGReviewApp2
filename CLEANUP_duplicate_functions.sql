-- ============================================================================
-- CLEANUP: Remove Duplicate Avatar Functions
-- ============================================================================
-- You have duplicate functions - need to drop the old ones and keep only the
-- versions with search_path set
-- ============================================================================

-- First, let's see exactly what we have
SELECT
  p.oid,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE
    WHEN p.proconfig IS NOT NULL AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
    THEN '✅ Has search_path'
    ELSE '❌ Missing search_path'
  END AS status,
  array_to_string(p.proconfig, ', ') AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation')
ORDER BY p.proname, p.oid;

-- ============================================================================
-- SOLUTION: Drop ALL versions and recreate clean
-- ============================================================================

-- Drop ALL versions of check_avatar_upload_allowed
DROP FUNCTION IF EXISTS public.check_avatar_upload_allowed(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.check_avatar_upload_allowed CASCADE;

-- Drop ALL versions of handle_avatar_violation
DROP FUNCTION IF EXISTS public.handle_avatar_violation(uuid, text, text) CASCADE;
DROP FUNCTION IF EXISTS public.handle_avatar_violation CASCADE;

-- Now recreate ONLY the correct versions with search_path
CREATE FUNCTION public.check_avatar_upload_allowed(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  violation_count integer;
  last_violation_date timestamptz;
  days_since_violation integer;
BEGIN
  -- Check if user has any avatar violations
  SELECT
    COUNT(*),
    MAX(violation_date)
  INTO
    violation_count,
    last_violation_date
  FROM public.avatar_violations
  WHERE avatar_violations.user_id = check_avatar_upload_allowed.user_id
    AND resolved = false;

  -- If no violations, allow upload
  IF violation_count = 0 THEN
    RETURN true;
  END IF;

  -- Calculate days since last violation
  days_since_violation := EXTRACT(DAY FROM (NOW() - last_violation_date));

  -- Block if violation is recent (within 30 days)
  IF days_since_violation < 30 THEN
    RETURN false;
  END IF;

  -- Allow if violation is old
  RETURN true;
END;
$$;

CREATE FUNCTION public.handle_avatar_violation(
  p_user_id uuid,
  p_avatar_url text,
  p_reason text DEFAULT 'Content policy violation'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Insert violation record
  INSERT INTO public.avatar_violations (
    user_id,
    avatar_url,
    violation_reason,
    violation_date,
    resolved
  ) VALUES (
    p_user_id,
    p_avatar_url,
    p_reason,
    NOW(),
    false
  );

  -- Reset user's avatar to default
  UPDATE public."user"
  SET avatar_url = NULL
  WHERE id = p_user_id;

  -- Create notification for user
  INSERT INTO public.notification (
    user_id,
    type,
    message,
    created_at,
    read
  ) VALUES (
    p_user_id,
    'avatar_violation',
    'Your avatar was removed due to: ' || p_reason,
    NOW(),
    false
  );

  -- Log the action
  RAISE NOTICE 'Avatar violation handled for user %', p_user_id;
END;
$$;

-- Restore permissions
GRANT EXECUTE ON FUNCTION public.check_avatar_upload_allowed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_avatar_violation(uuid, text, text) TO service_role;

-- ============================================================================
-- VERIFICATION: Should now show ONLY ONE of each function
-- ============================================================================

SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE
    WHEN p.proconfig IS NOT NULL AND array_to_string(p.proconfig, ',') LIKE '%search_path%'
    THEN '✅ Has search_path'
    ELSE '❌ Missing search_path'
  END AS status,
  array_to_string(p.proconfig, ', ') AS config_settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation')
ORDER BY p.proname;

-- Expected output: 2 rows total (one per function), both with ✅ Has search_path

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
DECLARE
  func_count integer;
  good_count integer;
BEGIN
  -- Count total functions
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation');

  -- Count functions with search_path
  SELECT COUNT(*) INTO good_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation')
    AND p.proconfig IS NOT NULL
    AND array_to_string(p.proconfig, ',') LIKE '%search_path%';

  IF func_count = 2 AND good_count = 2 THEN
    RAISE NOTICE '✅ SUCCESS! Both functions fixed, no duplicates';
    RAISE NOTICE '   - check_avatar_upload_allowed: OK';
    RAISE NOTICE '   - handle_avatar_violation: OK';
  ELSIF func_count > 2 THEN
    RAISE WARNING '⚠️  Still have % functions (expected 2)', func_count;
  ELSE
    RAISE WARNING '⚠️  Only found % functions with search_path (expected 2)', good_count;
  END IF;
END $$;
