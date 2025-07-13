/*
  # Fix User Policy Conflict

  1. Policy Fixes
    - Drop existing "Users can read all profiles" policy if it exists
    - Create "Users can read all profiles" policy with proper configuration
    - Ensure RLS is enabled on the user table
*/

-- First, drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can read all profiles" ON "user";

-- Then create the policy with the correct configuration
CREATE POLICY "Users can read all profiles" ON "user" 
  FOR SELECT 
  USING (true);

-- Ensure RLS is enabled on the user table
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;