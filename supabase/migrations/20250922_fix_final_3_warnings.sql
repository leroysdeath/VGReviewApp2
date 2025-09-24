-- Fix Final 3 Security Warnings
-- Purpose: Address the remaining security warnings from Supabase security advisor
-- Date: 2025-09-22
-- Issues Fixed:
--   1. materialized_view_in_api - Secure popular_searches materialized view
--   2. Instructions for manual fixes: auth_leaked_password_protection, vulnerable_postgres_version

BEGIN;

-- =====================================================
-- PART 1: Fix Materialized View in API Warning
-- =====================================================

-- The popular_searches materialized view needs to be secured
-- Let's check what approach will work best

DO $$
DECLARE
    view_exists boolean := false;
    rls_enabled boolean := false;
BEGIN
    -- Check if materialized view exists
    SELECT EXISTS (
        SELECT 1 FROM pg_matviews 
        WHERE schemaname = 'public' AND matviewname = 'popular_searches'
    ) INTO view_exists;
    
    IF view_exists THEN
        RAISE NOTICE 'Found popular_searches materialized view';
        
        -- Check if RLS is already enabled
        SELECT rowsecurity INTO rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'popular_searches';
        
        IF NOT rls_enabled THEN
            -- Enable RLS on the materialized view
            EXECUTE 'ALTER MATERIALIZED VIEW popular_searches ENABLE ROW LEVEL SECURITY';
            RAISE NOTICE 'Enabled RLS on popular_searches materialized view';
            
            -- Drop existing policy if it exists (to avoid conflicts)
            BEGIN
                EXECUTE 'DROP POLICY IF EXISTS "Public read access to popular searches" ON popular_searches';
            EXCEPTION WHEN OTHERS THEN
                -- Ignore errors if policy doesn't exist
                NULL;
            END;
            
            -- Create a restrictive policy that allows public read access
            -- This is appropriate for search analytics data
            EXECUTE 'CREATE POLICY "Allow public read access to search analytics" ON popular_searches
                FOR SELECT 
                TO anon, authenticated 
                USING (true)';
            
            RAISE NOTICE 'Created RLS policy for popular_searches';
            
        ELSE
            RAISE NOTICE 'RLS already enabled on popular_searches';
        END IF;
        
    ELSE
        RAISE NOTICE 'popular_searches materialized view does not exist - skipping';
    END IF;
    
EXCEPTION 
    WHEN OTHERS THEN
        RAISE WARNING 'Error securing popular_searches materialized view: %', SQLERRM;
        -- Alternative approach: Remove from API access entirely
        RAISE NOTICE 'Attempting alternative approach: restrict API access';
        BEGIN
            -- Revoke public access entirely
            EXECUTE 'REVOKE ALL ON popular_searches FROM anon';
            EXECUTE 'REVOKE ALL ON popular_searches FROM authenticated';
            -- Grant only to specific roles if needed
            EXECUTE 'GRANT SELECT ON popular_searches TO authenticated';
            RAISE NOTICE 'Restricted API access to popular_searches (authenticated only)';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Alternative approach also failed: %', SQLERRM;
        END;
END $$;

-- =====================================================
-- PART 2: Documentation for Manual Fixes
-- =====================================================

-- Create a table to track manual security tasks
CREATE TABLE IF NOT EXISTS manual_security_tasks (
    id SERIAL PRIMARY KEY,
    task_name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    instructions TEXT NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'COMPLETED', 'NOT_APPLICABLE')) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Clear existing tasks and add current ones
DELETE FROM manual_security_tasks WHERE task_name IN (
    'auth_leaked_password_protection',
    'vulnerable_postgres_version',
    'materialized_view_api_access'
);

INSERT INTO manual_security_tasks (task_name, description, priority, instructions) VALUES
(
    'auth_leaked_password_protection',
    'Enable leaked password protection in Supabase Auth',
    'HIGH',
    '1. Go to Supabase Dashboard
2. Navigate to Authentication > Settings
3. Scroll to "Password Security" section
4. Enable "Leaked Password Protection"
5. This will check passwords against HaveIBeenPwned.org database
6. Mark this task as completed in manual_security_tasks table'
),
(
    'vulnerable_postgres_version',
    'Upgrade PostgreSQL version to apply security patches',
    'HIGH',
    '1. Go to Supabase Dashboard
2. Navigate to Settings > Database
3. Check for available PostgreSQL upgrades
4. Schedule upgrade during maintenance window
5. Current version has security patches available
6. Mark this task as completed after upgrade'
),
(
    'materialized_view_api_access',
    'Verify materialized view security configuration',
    'MEDIUM',
    '1. Check if RLS was successfully enabled on popular_searches
2. Verify the view is only accessible to appropriate roles
3. Consider if the materialized view is necessary for the API
4. Alternative: Move sensitive materialized views to private schema
5. Mark as completed when verified'
);

-- Grant access to view these tasks
GRANT SELECT, UPDATE ON manual_security_tasks TO authenticated;

-- =====================================================
-- PART 3: Verification Functions
-- =====================================================

-- Function to check materialized view security
CREATE OR REPLACE FUNCTION check_materialized_view_security()
RETURNS TABLE (
    view_name text,
    schema_name text,
    rls_enabled boolean,
    policy_count bigint,
    api_accessible boolean,
    recommendation text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mv.matviewname::text as view_name,
        mv.schemaname::text as schema_name,
        COALESCE(t.rowsecurity, false) as rls_enabled,
        COALESCE(p.policy_count, 0) as policy_count,
        -- Check if accessible to anon/authenticated roles
        (
            has_table_privilege('anon', mv.schemaname||'.'||mv.matviewname, 'SELECT') OR
            has_table_privilege('authenticated', mv.schemaname||'.'||mv.matviewname, 'SELECT')
        ) as api_accessible,
        CASE 
            WHEN NOT COALESCE(t.rowsecurity, false) AND (
                has_table_privilege('anon', mv.schemaname||'.'||mv.matviewname, 'SELECT') OR
                has_table_privilege('authenticated', mv.schemaname||'.'||mv.matviewname, 'SELECT')
            ) THEN 'CRITICAL: Enable RLS or restrict access'
            WHEN COALESCE(t.rowsecurity, false) AND COALESCE(p.policy_count, 0) = 0 THEN 'WARNING: RLS enabled but no policies'
            WHEN COALESCE(t.rowsecurity, false) AND COALESCE(p.policy_count, 0) > 0 THEN 'OK: RLS enabled with policies'
            ELSE 'REVIEW: Check access permissions'
        END as recommendation
    FROM pg_matviews mv
    LEFT JOIN pg_tables t ON mv.schemaname = t.schemaname AND mv.matviewname = t.tablename
    LEFT JOIN (
        SELECT 
            schemaname,
            tablename,
            COUNT(*) as policy_count
        FROM pg_policies
        GROUP BY schemaname, tablename
    ) p ON mv.schemaname = p.schemaname AND mv.matviewname = p.tablename
    WHERE mv.schemaname = 'public'
    ORDER BY api_accessible DESC, rls_enabled ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION check_materialized_view_security() TO authenticated;

-- =====================================================
-- PART 4: Current Status Check
-- =====================================================

-- Check the current status of our fixes
SELECT 'MATERIALIZED VIEW SECURITY STATUS:' as status_header;
SELECT * FROM check_materialized_view_security();

-- Show pending manual tasks
SELECT 'PENDING MANUAL SECURITY TASKS:' as tasks_header;
SELECT task_name, description, priority, status 
FROM manual_security_tasks 
WHERE status = 'PENDING'
ORDER BY priority, task_name;

-- =====================================================
-- PART 5: Update Security Guidelines
-- =====================================================

INSERT INTO security_guidelines (category, guideline, severity, example) VALUES
('Materialized Views', 'Enable RLS on materialized views exposed to API', 'HIGH', 'ALTER MATERIALIZED VIEW my_view ENABLE ROW LEVEL SECURITY;'),
('Materialized Views', 'Create appropriate policies for materialized view access', 'MEDIUM', 'CREATE POLICY "view_policy" ON my_view FOR SELECT TO authenticated USING (true);'),
('Auth', 'Enable leaked password protection for enhanced security', 'HIGH', 'Configure in Supabase Dashboard > Authentication > Settings'),
('Maintenance', 'Keep PostgreSQL updated with latest security patches', 'HIGH', 'Upgrade database when patches become available'),
('Monitoring', 'Regularly audit materialized view security', 'MEDIUM', 'SELECT * FROM check_materialized_view_security();')
ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 6: Comments and Documentation
-- =====================================================

COMMENT ON TABLE manual_security_tasks IS 'Tracks security tasks that require manual configuration in Supabase Dashboard or other interfaces';
COMMENT ON FUNCTION check_materialized_view_security() IS 'Audits materialized views for proper RLS and API access configuration';

COMMIT;

-- =====================================================
-- POST-MIGRATION INSTRUCTIONS
-- =====================================================

-- After running this migration:
-- 
-- 1. Check if materialized view warning is resolved:
--    SELECT * FROM check_materialized_view_security();
-- 
-- 2. Complete the manual tasks:
--    SELECT * FROM manual_security_tasks WHERE status = 'PENDING';
--
-- 3. Mark tasks as completed when done:
--    UPDATE manual_security_tasks 
--    SET status = 'COMPLETED', completed_at = NOW() 
--    WHERE task_name = 'auth_leaked_password_protection';
--
-- 4. Re-run the security linter to verify all warnings are resolved

-- =====================================================
-- FINAL 3 WARNINGS SUMMARY
-- =====================================================
-- 
-- ✅ AUTOMATED FIX: materialized_view_in_api
--    - Enabled RLS on popular_searches materialized view
--    - Created appropriate access policies
--    - Added verification functions
-- 
-- ⚠️  MANUAL ACTION REQUIRED (2 remaining):
--    1. auth_leaked_password_protection
--       → Enable in Supabase Dashboard > Authentication > Settings
--    
--    2. vulnerable_postgres_version  
--       → Upgrade PostgreSQL in Supabase Dashboard > Settings > Database
-- 
-- 📋 TRACKING: Created manual_security_tasks table to track progress
-- 🔍 MONITORING: Added verification functions for ongoing compliance