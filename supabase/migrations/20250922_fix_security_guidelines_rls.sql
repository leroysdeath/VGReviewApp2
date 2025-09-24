-- Fix RLS for security_guidelines table
-- Purpose: Enable Row Level Security on security_guidelines table to resolve security linter error
-- Date: 2025-09-22
-- Issue: rls_disabled_in_public - Table public.security_guidelines is public, but RLS has not been enabled

BEGIN;

-- =====================================================
-- Enable RLS on security_guidelines table
-- =====================================================

-- Enable Row Level Security on the security_guidelines table
ALTER TABLE security_guidelines ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Create RLS policies for security_guidelines
-- =====================================================

-- Policy: Allow all authenticated users to read security guidelines
-- This is appropriate since security guidelines are meant to be educational/informational
CREATE POLICY "Everyone can read security guidelines" ON security_guidelines
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Policy: Only authenticated users can insert new guidelines (for future admin functionality)
CREATE POLICY "Authenticated users can insert guidelines" ON security_guidelines
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Only authenticated users can update guidelines (for future admin functionality)
CREATE POLICY "Authenticated users can update guidelines" ON security_guidelines
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Only authenticated users can delete guidelines (for future admin functionality)
CREATE POLICY "Authenticated users can delete guidelines" ON security_guidelines
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- Update table comment to reflect RLS status
-- =====================================================

COMMENT ON TABLE security_guidelines IS 'Database security best practices and compliance guidelines. RLS enabled - readable by all, modifiable by authenticated users only.';

-- =====================================================
-- Verification
-- =====================================================

-- Verify RLS is now enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'security_guidelines'
    AND rowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS was not enabled on security_guidelines table';
  END IF;
  
  RAISE NOTICE 'RLS successfully enabled on security_guidelines table';
END $$;

-- Verify policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'security_guidelines';
    
    IF policy_count = 0 THEN
        RAISE EXCEPTION 'No RLS policies found for security_guidelines table';
    END IF;
    
    RAISE NOTICE 'RLS policies successfully created for security_guidelines table (% policies)', policy_count;
END $$;

-- Test that the table is still accessible after enabling RLS
SELECT 'RLS Test: security_guidelines table accessible' as test_result, COUNT(*) as guideline_count 
FROM security_guidelines;

COMMIT;

-- =====================================================
-- Post-migration verification
-- =====================================================
-- 
-- After running this migration:
-- 1. The rls_disabled_in_public error should be resolved
-- 2. security_guidelines table will have RLS enabled
-- 3. All users can read guidelines (educational content)
-- 4. Only authenticated users can modify guidelines
-- 
-- To verify, run:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'security_guidelines';
-- (Should show rowsecurity = true)
-- 
-- SELECT policyname FROM pg_policies WHERE tablename = 'security_guidelines';
-- (Should show the 4 policies created above)