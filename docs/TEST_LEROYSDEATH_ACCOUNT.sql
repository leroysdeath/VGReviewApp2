-- Test the function with leroysdeath account UUID
SELECT get_or_create_user(
  '8c06387a-5ee0-413e-bd94-b8cb29610d9d'::UUID,
  'joshuateusink@yahoo.com',
  'leroysdeath',
  'supabase'
);

-- Also check if this user already exists
SELECT id, provider_id, email, name, username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
