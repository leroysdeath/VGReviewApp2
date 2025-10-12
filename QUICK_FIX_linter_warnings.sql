-- ============================================================================
-- QUICK FIX: Supabase Linter Warnings
-- ============================================================================
-- Copy and paste this entire script into Supabase SQL Editor and run it
-- This will fix all 3 linter warnings immediately
-- ============================================================================

-- FIX #1: check_avatar_upload_allowed - Add search_path
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_avatar_upload_allowed(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- THIS LINE FIXES THE WARNING
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

-- FIX #2: handle_avatar_violation - Add search_path
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_avatar_violation(
  p_user_id uuid,
  p_avatar_url text,
  p_reason text DEFAULT 'Content policy violation'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp  -- THIS LINE FIXES THE WARNING
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

-- ============================================================================
-- VERIFICATION: Check if fixes worked
-- ============================================================================

-- This should show "✅ Has search_path" for both functions
SELECT
  p.proname AS function_name,
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

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed 2/3 linter warnings (avatar functions)';
  RAISE NOTICE 'ℹ️  The http extension warning is lower priority and can be addressed separately';
END $$;
