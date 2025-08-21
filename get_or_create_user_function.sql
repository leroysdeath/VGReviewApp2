-- Database function for atomic user creation/lookup
-- This function should be executed manually in Supabase SQL Editor

CREATE OR REPLACE FUNCTION get_or_create_user(
  auth_id text,
  user_email text,
  user_name text,
  user_provider text DEFAULT 'supabase'
) RETURNS integer AS $$
DECLARE
  user_id integer;
BEGIN
  -- Try to get existing user
  SELECT id INTO user_id 
  FROM "user" 
  WHERE provider_id = auth_id;
  
  -- If user exists, return the ID
  IF FOUND THEN
    RETURN user_id;
  END IF;
  
  -- If user doesn't exist, create one
  INSERT INTO "user" (provider_id, email, name, provider, created_at, updated_at)
  VALUES (auth_id, user_email, user_name, user_provider, NOW(), NOW())
  ON CONFLICT (provider_id) DO UPDATE SET
    updated_at = NOW(),
    email = EXCLUDED.email,
    name = EXCLUDED.name
  RETURNING id INTO user_id;
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_or_create_user(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user(text, text, text, text) TO anon;