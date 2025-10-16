-- ============================================================================
-- EMERGENCY FIX V2: Database Function Type Mismatch
-- ============================================================================
-- Run this in Supabase SQL Editor to fix "operator does not exist: uuid = text"
-- ============================================================================
-- The issue: provider_id column is TEXT, we need to cast UUID to TEXT properly
-- ============================================================================

-- Step 1: Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS get_or_create_user(text, text, text, text);
DROP FUNCTION IF EXISTS get_or_create_user(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_or_create_user(UUID, TEXT, TEXT);

-- Step 2: Create the corrected function with proper type handling
CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id UUID,                    -- ← UUID type from Supabase auth
  user_email TEXT,
  user_name TEXT,
  user_provider TEXT DEFAULT 'supabase'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_id INTEGER;
  auth_id_text TEXT;
BEGIN
  -- Convert UUID to TEXT once at the start
  auth_id_text := auth_id::TEXT;

  -- First try to get existing user
  SELECT id INTO user_id
  FROM "user"
  WHERE provider_id = auth_id_text;

  -- If user exists, return their ID
  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;

  -- Otherwise, create new user
  INSERT INTO "user" (
    provider_id,
    email,
    name,
    provider,
    created_at,
    updated_at
  ) VALUES (
    auth_id_text,
    user_email,
    user_name,
    user_provider,
    NOW(),
    NOW()
  )
  ON CONFLICT (provider_id) DO UPDATE
    SET updated_at = NOW(),
        email = EXCLUDED.email,
        name = EXCLUDED.name
  RETURNING id INTO user_id;

  RETURN user_id;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition
    SELECT id INTO user_id
    FROM "user"
    WHERE provider_id = auth_id_text;

    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;

    RAISE EXCEPTION 'Failed to get or create user after race condition';
END;
$$;

-- Step 3: Grant permissions to BOTH roles
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO anon;

-- ============================================================================
-- VERIFICATION (Run these immediately after to confirm fix)
-- ============================================================================

-- Check 1: Confirm function signature has UUID (should show "uuid" not "text")
SELECT
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_or_create_user'
  AND n.nspname = 'public';

-- Check 2: Confirm both roles have permission (should show 2 rows)
SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_or_create_user'
  AND routine_schema = 'public';

-- Check 3: Test the function with YOUR user UUID
SELECT get_or_create_user(
  'f14ad903-24b3-4af6-9cc8-9c2bd62b1f51'::UUID,
  'test@example.com',
  'Test User',
  'supabase'
);
-- ^ Should return 5 (your dbUserId) with NO ERRORS

-- ============================================================================
-- EXPECTED RESULTS:
-- ============================================================================
-- Check 1: arguments should contain "auth_id uuid" (not text)
-- Check 2: Should see 2 rows (authenticated and anon)
-- Check 3: Should return: 5 (with NO ERRORS about operators)
-- ============================================================================
