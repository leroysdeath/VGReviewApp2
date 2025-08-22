-- Create get_or_create_user function
-- This function is required by the userService to atomically get or create users

CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id UUID,
  user_email TEXT,
  user_name TEXT,
  user_provider TEXT DEFAULT 'supabase'
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_id INTEGER;
BEGIN
  -- First try to get existing user
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
    auth_id::TEXT,
    user_email,
    user_name,
    user_provider,
    NOW(),
    NOW()
  )
  ON CONFLICT (provider_id) DO UPDATE
    SET updated_at = NOW()
  RETURNING id INTO user_id;
  
  RETURN user_id;
  
EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition - another transaction created the user
    SELECT id INTO user_id
    FROM "user"
    WHERE provider_id = auth_id::TEXT;
    
    RETURN user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_user(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_or_create_user IS 'Atomically gets or creates a user based on their auth provider ID';