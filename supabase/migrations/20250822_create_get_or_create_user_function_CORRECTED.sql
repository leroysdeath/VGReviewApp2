-- Corrected get_or_create_user function
-- This migration supersedes the original 20250822 migration
-- Key fixes:
-- 1. Uses UUID type for auth_id (not TEXT)
-- 2. Grants permission to BOTH authenticated AND anon roles
-- 3. Includes SET search_path for security
-- 4. Comprehensive error handling

-- Drop any existing versions to avoid conflicts
DROP FUNCTION IF EXISTS get_or_create_user(text, text, text, text);
DROP FUNCTION IF EXISTS get_or_create_user(UUID, TEXT, TEXT, TEXT);

-- Create the corrected function
CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id UUID,                    -- UUID type for type safety and validation
  user_email TEXT,
  user_name TEXT,
  user_provider TEXT DEFAULT 'supabase'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public          -- Security: Prevent search_path attacks
AS $$
DECLARE
  user_id INTEGER;
BEGIN
  -- First try to get existing user
  -- Cast UUID to TEXT for comparison with provider_id column (which is TEXT)
  SELECT id INTO user_id
  FROM "user"
  WHERE provider_id = auth_id::TEXT;

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
    auth_id::TEXT,               -- Cast UUID to TEXT for storage
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
    -- Handle race condition - another transaction created the user
    -- This can happen if two signup requests come in simultaneously
    SELECT id INTO user_id
    FROM "user"
    WHERE provider_id = auth_id::TEXT;

    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;

    -- If we still don't have a user_id, something went wrong
    RAISE EXCEPTION 'Failed to get or create user after race condition';
END;
$$;

-- Grant execute permission to authenticated users (existing users)
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Grant execute permission to anonymous users (signup flow - CRITICAL)
-- Without this, new users cannot be created during signup
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO anon;

-- Add comprehensive documentation
COMMENT ON FUNCTION get_or_create_user IS
'Atomically gets or creates a user based on their Supabase auth provider ID.

Parameters:
- auth_id: UUID from Supabase auth (e.g., session.user.id)
- user_email: User email address
- user_name: Display name for the user
- user_provider: Authentication provider (default: supabase)

Returns:
- INTEGER: The database user.id (primary key)

Security:
- Grants to both authenticated and anon roles
- anon grant is required for signup flow
- Uses SECURITY DEFINER with explicit search_path

Error Handling:
- Handles race conditions via ON CONFLICT
- Gracefully handles duplicate concurrent signup attempts

Called by:
- src/services/userService.ts:229 (getOrCreateUser method)
- src/services/authService.ts:48 (signUp method via userService)
- src/hooks/useAuth.ts:190 (authentication flow)
';

-- Verification queries (run these after applying migration)
-- SELECT proname, proargtypes FROM pg_proc WHERE proname = 'get_or_create_user';
-- SELECT grantee, privilege_type FROM information_schema.routine_privileges WHERE routine_name = 'get_or_create_user';
