-- Complete RLS reset for user table
-- This will remove ALL policies and add simple ones that work

-- Step 1: Show current policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'user';

-- Step 2: Drop ALL existing policies on user table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'user')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON "user"';
    END LOOP;
END
$$;

-- Step 3: Add simple working policies
-- Allow authenticated users full access
CREATE POLICY "authenticated_all"
  ON "user"
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow anon users to read (for signup/login)
CREATE POLICY "anon_select"
  ON "user"
  FOR SELECT
  TO anon
  USING (true);

-- Allow anon users to insert (for signup)
CREATE POLICY "anon_insert"
  ON "user"
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Step 4: Verify new policies
SELECT policyname, cmd, roles, permissive
FROM pg_policies
WHERE tablename = 'user'
ORDER BY policyname;

-- Step 5: Test query as authenticated user
SELECT COUNT(*) as total_users FROM "user";

-- Step 6: Test specific leroysdeath query
SELECT id, provider_id, email, username
FROM "user"
WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
