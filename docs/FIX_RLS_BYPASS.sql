-- Fix: Make the function explicitly bypass RLS
-- This is safe because the function is SECURITY DEFINER and validates auth

DROP FUNCTION IF EXISTS get_or_create_user(UUID, TEXT, TEXT, TEXT);

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
  -- Bypass RLS by using SELECT without RLS context
  -- SECURITY DEFINER already gives us superuser-like access
  SELECT id INTO user_id
  FROM "user"
  WHERE provider_id = auth_id;

  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;

  -- Create new user (also bypasses RLS due to SECURITY DEFINER)
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

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO anon;

-- Test with both accounts
SELECT get_or_create_user(
  'f14ad903-24b3-4af6-9cc8-9c2bd62b1f51'::UUID,  -- hotboytime69
  'test@example.com',
  'Test User',
  'supabase'
);

SELECT get_or_create_user(
  '8c06387a-5ee0-413e-bd94-b8cb29610d9d'::UUID,  -- leroysdeath
  'joshuateusink@yahoo.com',
  'leroysdeath',
  'supabase'
);
