-- Force drop all policies and create simple ones
-- Run this line by line if needed

-- Drop each policy individually
DROP POLICY IF EXISTS "Anyone can view user profiles" ON "user";
DROP POLICY IF EXISTS "Authenticated can insert own profile" ON "user";
DROP POLICY IF EXISTS "Authenticated can update own profile" ON "user";
DROP POLICY IF EXISTS "Anon can read all profiles" ON "user";
DROP POLICY IF EXISTS "Authenticated can read all profiles" ON "user";
DROP POLICY IF EXISTS "Users can insert own profile" ON "user";
DROP POLICY IF EXISTS "Users can update their own profile" ON "user";

-- Create simple policies that definitely work
CREATE POLICY "auth_all"
  ON "user"
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_read"
  ON "user"
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_write"
  ON "user"
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Verify
SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'user';

-- Test the query that's failing
SELECT id, provider_id, email FROM "user" WHERE provider_id = '8c06387a-5ee0-413e-bd94-b8cb29610d9d';
