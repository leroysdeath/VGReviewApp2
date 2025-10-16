-- Check if get_or_create_user RPC function exists and test it

-- 1. Check if the function exists
SELECT
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_or_create_user';

-- 2. Test the function directly with leroysdeath's ID
SELECT get_or_create_user(
    '8c06387a-5ee0-413e-bd94-b8cb29610d9d'::uuid,
    'joshuateusink@yahoo.com',
    'leroysdeath',
    'supabase'
);

-- 3. If function doesn't exist, we need to create it
-- This is likely the issue - the RPC function might be missing or broken
