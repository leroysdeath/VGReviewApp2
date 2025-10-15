-- Fix RPC function permissions for get_or_create_user
-- This function needs to be callable by authenticated and anonymous users

-- 1. Grant execute permission to authenticated role
GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, text) TO authenticated;

-- 2. Grant execute permission to anon role (needed for signup)
GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, text) TO anon;

-- 3. Grant execute permission to public (catches all roles)
GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, text) TO public;

-- 4. Verify permissions
SELECT
    routine_name,
    routine_type,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_or_create_user';

-- Expected result: Should show EXECUTE granted to authenticated, anon, and public
