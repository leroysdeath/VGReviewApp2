-- Test if the RPC function works when called as anon role
-- This simulates what happens when the browser calls it

-- First, verify the user exists
SELECT id, provider_id, email, username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';

-- Test calling the function (this runs as your admin role)
SELECT get_or_create_user(
  '8c06387a-5ee0-413e-bd94-b8cb29610d9d'::UUID,
  'joshuateusink@yahoo.com',
  'leroysdeath',
  'supabase'
);

-- Check if anon role can SELECT from user table
SET ROLE anon;
SELECT id, provider_id FROM "user" WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
RESET ROLE;

-- This shows if anon can call the function
SET ROLE anon;
SELECT get_or_create_user(
  '8c06387a-5ee0-413e-bd94-b8cb29610d9d'::UUID,
  'joshuateusink@yahoo.com',
  'leroysdeath',
  'supabase'
);
RESET ROLE;
