-- ============================================================================
-- FINAL FIX: Database Function Type Mismatch
-- ============================================================================
-- ISSUE: provider_id column is VARCHAR(255), but we need UUID parameter
-- SOLUTION: Don't cast - compare UUID directly with VARCHAR (PostgreSQL allows this)
-- ============================================================================

-- Step 1: Drop ALL existing versions
DROP FUNCTION IF EXISTS get_or_create_user(text, text, text, text);
DROP FUNCTION IF EXISTS get_or_create_user(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_or_create_user(UUID, TEXT, TEXT);

-- Step 2: Create function WITHOUT casting UUID to TEXT
CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id UUID,
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
BEGIN
  -- PostgreSQL can compare UUID with VARCHAR directly
  -- No casting needed!
  SELECT id INTO user_id
  FROM "user"
  WHERE provider_id = auth_id;

  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;

  -- For INSERT, we need to explicitly cast UUID to TEXT
  INSERT INTO "user" (
    provider_id,
    email,
    name,
    provider,
    created_at,
    updated_at
  ) VALUES (
    auth_id::TEXT,
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
    SELECT id INTO user_id
    FROM "user"
    WHERE provider_id = auth_id;

    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;

    RAISE EXCEPTION 'Failed to get or create user after race condition';
END;
$$;

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO anon;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  p.proname as function_name,
  pg_catalog.pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_or_create_user'
  AND n.nspname = 'public';

SELECT grantee, privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_or_create_user'
  AND routine_schema = 'public';

SELECT get_or_create_user(
  'f14ad903-24b3-4af6-9cc8-9c2bd62b1f51'::UUID,
  'test@example.com',
  'Test User',
  'supabase'
);
