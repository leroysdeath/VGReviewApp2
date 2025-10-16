-- Get the full definition of the get_or_create_user function

SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'get_or_create_user';

-- This will show us the exact SQL code of the function
-- so we can see what's broken
