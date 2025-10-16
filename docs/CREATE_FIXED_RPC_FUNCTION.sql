-- Fixed version of get_or_create_user function
-- Removes the problematic UUID::TEXT casting

CREATE OR REPLACE FUNCTION public.get_or_create_user(
  auth_id uuid,
  user_email text,
  user_name text,
  user_provider text DEFAULT 'supabase'::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_id INTEGER;
  v_provider_id TEXT;
BEGIN
  -- Convert UUID to text once at the start
  v_provider_id := auth_id::TEXT;

  -- Try to find existing user
  SELECT id INTO user_id
  FROM "user"
  WHERE provider_id = v_provider_id;

  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;

  -- User doesn't exist, create them
  -- NOTE: username is a required field, so generate one from email or name
  INSERT INTO "user" (
    provider_id,
    email,
    name,
    username,
    provider,
    created_at,
    updated_at
  ) VALUES (
    v_provider_id,
    user_email,
    COALESCE(user_name, 'User'),
    -- Generate username from email (before @) or use timestamp
    COALESCE(
      LOWER(REGEXP_REPLACE(SPLIT_PART(user_email, '@', 1), '[^a-z0-9_]', '_', 'g')),
      'user_' || EXTRACT(EPOCH FROM NOW())::BIGINT
    ),
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
    -- Handle race condition - another process created the user
    SELECT id INTO user_id
    FROM "user"
    WHERE provider_id = v_provider_id;

    IF user_id IS NOT NULL THEN
      RETURN user_id;
    END IF;

    RAISE EXCEPTION 'Failed to get or create user after race condition';

  WHEN OTHERS THEN
    -- Log the actual error for debugging
    RAISE WARNING 'Error in get_or_create_user: % %', SQLERRM, SQLSTATE;
    RAISE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_user(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_user(uuid, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_user(uuid, text, text, text) TO public;

-- Test it
SELECT get_or_create_user(
  '8c06387a-5ee0-413e-bd94-b8cb29610d9d'::uuid,
  'joshuateusink@yahoo.com',
  'leroysdeath',
  'supabase'
);
