-- Migration: Fix Remaining Supabase Linter Warnings
-- Date: 2025-10-09
-- Issues Fixed:
--   1. function_search_path_mutable for check_avatar_upload_allowed
--   2. function_search_path_mutable for handle_avatar_violation
--   3. extension_in_public for http extension

-- ============================================================================
-- ISSUE 1 & 2: Fix search_path for avatar functions
-- ============================================================================

-- Drop and recreate check_avatar_upload_allowed with explicit search_path
DROP FUNCTION IF EXISTS public.check_avatar_upload_allowed(uuid);

CREATE OR REPLACE FUNCTION public.check_avatar_upload_allowed(user_id uuid)
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_avatar_upload_allowed(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.check_avatar_upload_allowed(uuid) IS
  'Checks if a user is allowed to upload/change their avatar based on violation history. Fixed search_path for security.';


-- Drop and recreate handle_avatar_violation with explicit search_path
DROP FUNCTION IF EXISTS public.handle_avatar_violation(uuid, text, text);

CREATE OR REPLACE FUNCTION public.handle_avatar_violation(
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.handle_avatar_violation(uuid, text, text) TO service_role;

-- Add comment
COMMENT ON FUNCTION public.handle_avatar_violation(uuid, text, text) IS
  'Handles avatar policy violations by recording the violation, resetting avatar, and notifying user. Fixed search_path for security.';


-- ============================================================================
-- ISSUE 3: Move http extension from public schema to extensions schema
-- ============================================================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Grant usage on extensions schema
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move http extension to extensions schema
-- Note: We need to drop and recreate because ALTER EXTENSION SET SCHEMA doesn't work for all extensions
DO $$
BEGIN
  -- Check if http extension exists in public schema
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'http' AND n.nspname = 'public'
  ) THEN
    -- Drop from public schema
    DROP EXTENSION IF EXISTS http CASCADE;

    -- Recreate in extensions schema
    CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;

    RAISE NOTICE 'Moved http extension from public to extensions schema';
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'http'
  ) THEN
    -- Extension doesn't exist at all, create it in extensions schema
    CREATE EXTENSION IF NOT EXISTS http SCHEMA extensions;

    RAISE NOTICE 'Created http extension in extensions schema';
  ELSE
    RAISE NOTICE 'http extension already in correct schema';
  END IF;
END $$;

-- Ensure proper permissions on http extension functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA extensions TO postgres, service_role;

-- ============================================================================
-- Verification
-- ============================================================================

-- Verify functions have search_path set
DO $$
DECLARE
  func_count integer;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN ('check_avatar_upload_allowed', 'handle_avatar_violation')
    AND pg_get_function_identity_arguments(p.oid) != ''
    AND NOT (prosecdef AND (
      SELECT array_to_string(proconfig, ',') LIKE '%search_path%'
      FROM pg_proc p2
      WHERE p2.oid = p.oid
    ));

  IF func_count > 0 THEN
    RAISE WARNING 'Some functions still missing search_path configuration';
  ELSE
    RAISE NOTICE '✅ All avatar functions have search_path configured';
  END IF;
END $$;

-- Verify http extension is in extensions schema
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON e.extnamespace = n.oid
    WHERE e.extname = 'http' AND n.nspname = 'extensions'
  ) THEN
    RAISE NOTICE '✅ http extension is in extensions schema';
  ELSE
    RAISE WARNING 'http extension may not be in correct schema';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA extensions IS 'Schema for PostgreSQL extensions to avoid cluttering public schema';
