-- Check all user IDs and their mappings
SELECT
  id as database_id,
  provider_id as auth_uuid,
  email,
  username,
  name
FROM "user"
ORDER BY id;

-- Check specifically for leroysdeath
SELECT
  id,
  provider_id,
  email,
  username,
  name,
  created_at
FROM "user"
WHERE email = 'joshuateusink@yahoo.com'
   OR username = 'leroysdeath'
   OR provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';

-- Check for hotboytime69 (working account)
SELECT
  id,
  provider_id,
  email,
  username,
  name,
  created_at
FROM "user"
WHERE email = 'hotboytime69@gmail.com'
   OR provider_id = 'f14ad903-24b3-4af6-9cc8-9c2bd62b1f51';
