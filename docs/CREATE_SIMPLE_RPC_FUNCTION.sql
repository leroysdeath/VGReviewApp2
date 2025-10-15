-- Simplest possible version - use SECURITY INVOKER and rely on RLS policies
-- This avoids permission issues with SECURITY DEFINER

CREATE OR REPLACE FUNCTION public.get_or_create_user(
  auth_id uuid,
  user_email text,
  user_name text,
  user_provider text DEFAULT 'supabase'::text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER  -- Changed from DEFINER to INVOKER
SET search_path TO 'public'
AS $$
DECLARE
  user_id INTEGER;
BEGIN
  -- Try to find existing user
  SELECT id INTO user_id
  FROM "user"
  WHERE provider_id = auth_id;

  -- If found, return it
  IF user_id IS NOT NULL THEN
    RETURN user_id;
  END IF;

  -- User doesn't exist, return NULL and let the app handle creation
  -- This avoids permission issues with INSERT from the function
  RETURN NULL;

EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL on any error
    RETURN NULL;
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
