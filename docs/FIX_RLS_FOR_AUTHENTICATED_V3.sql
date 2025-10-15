-- Fix: Cast provider_id (TEXT) to UUID for comparison with auth.uid()

-- Check current policies
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'user';

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can insert own profile" ON "user";
DROP POLICY IF EXISTS "Users can update their own profile" ON "user";
DROP POLICY IF EXISTS "Authenticated can insert own profile" ON "user";
DROP POLICY IF EXISTS "Authenticated can update own profile" ON "user";

-- Add policy for authenticated users to SELECT from user table
DROP POLICY IF EXISTS "Authenticated can read all profiles" ON "user";
CREATE POLICY "Authenticated can read all profiles"
  ON "user"
  FOR SELECT
  TO authenticated
  USING (true);

-- Add policy for authenticated users to INSERT their own profile
-- Cast provider_id to UUID for comparison
CREATE POLICY "Authenticated can insert own profile"
  ON "user"
  FOR INSERT
  TO authenticated
  WITH CHECK (provider_id::UUID = auth.uid());

-- Add policy for authenticated users to UPDATE their own profile
-- Cast provider_id to UUID for comparison
CREATE POLICY "Authenticated can update own profile"
  ON "user"
  FOR UPDATE
  TO authenticated
  USING (provider_id::UUID = auth.uid())
  WITH CHECK (provider_id::UUID = auth.uid());

-- Verify policies were created
SELECT policyname, cmd, roles, permissive
FROM pg_policies
WHERE tablename = 'user'
ORDER BY policyname;
