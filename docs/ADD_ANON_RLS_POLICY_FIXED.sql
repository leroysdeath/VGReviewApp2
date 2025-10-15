-- Add RLS policy to allow anon users to read user table
-- Drop first to avoid "already exists" error, then create

-- Drop if exists
DROP POLICY IF EXISTS "Anon can read all profiles" ON "user";

-- Create policy for anon role to SELECT from user table
CREATE POLICY "Anon can read all profiles"
  ON "user"
  FOR SELECT
  TO anon
  USING (true);

-- Verify it was created
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'user'
ORDER BY policyname;
