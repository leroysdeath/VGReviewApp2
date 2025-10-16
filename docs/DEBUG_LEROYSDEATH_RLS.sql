-- Test 1: Direct query (should work as admin)
SELECT id, provider_id, email, username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';

-- Test 2: Check all users (to confirm leroysdeath exists)
SELECT id, provider_id, email, username
FROM "user"
WHERE id = 1;

-- Test 3: Check RLS policies again
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user'
ORDER BY policyname;

-- Test 4: Disable RLS temporarily to see if that's the issue
ALTER TABLE "user" DISABLE ROW LEVEL SECURITY;

-- Now try the query again
SELECT id, provider_id, email, username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';

-- Re-enable RLS
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
