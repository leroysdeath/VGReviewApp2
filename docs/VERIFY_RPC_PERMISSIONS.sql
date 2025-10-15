-- Verify RPC function permissions

SELECT
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'get_or_create_user';

-- If this returns rows showing EXECUTE granted to authenticated/anon/public,
-- then the permissions are set correctly
