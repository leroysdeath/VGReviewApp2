-- Fix All Security Warnings Migration (Final Safe Version)
-- Purpose: Address all security warnings with proper overload handling
-- Date: 2025-09-22
-- Issues Fixed:
--   1. Function Search Path Mutable - Set search_path for all function overloads
--   2. Materialized View in API - Secure materialized view access
--   3. Handles function overloads properly

BEGIN;

-- =====================================================
-- PART 1: Create Advanced Helper Function for Overloads
-- =====================================================

CREATE OR REPLACE FUNCTION safe_alter_all_function_overloads(
  func_name text,
  func_schema text DEFAULT 'public',
  new_search_path text DEFAULT 'public'
)
RETURNS text[]
LANGUAGE plpgsql
AS $$
DECLARE
  func_record RECORD;
  result_messages text[] := '{}';
  function_signature text;
  success_count integer := 0;
BEGIN
  -- Find all overloads of the function
  FOR func_record IN
    SELECT 
      p.oid,
      p.proname,
      n.nspname,
      pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = func_schema AND p.proname = func_name
  LOOP
    BEGIN
      -- Build the complete function signature
      function_signature := quote_ident(func_record.nspname) || '.' || 
                           quote_ident(func_record.proname) || '(' || 
                           func_record.args || ')';
      
      -- Execute the ALTER for this specific overload
      EXECUTE format('ALTER FUNCTION %s SET search_path = %s', function_signature, new_search_path);
      
      result_messages := result_messages || ('SUCCESS: Set search_path for ' || function_signature);
      success_count := success_count + 1;
      
    EXCEPTION 
      WHEN OTHERS THEN
        result_messages := result_messages || ('ERROR: Failed to alter ' || function_signature || ': ' || SQLERRM);
    END;
  END LOOP;
  
  -- If no functions found
  IF success_count = 0 AND array_length(result_messages, 1) IS NULL THEN
    result_messages := result_messages || ('SKIPPED: Function ' || func_schema || '.' || func_name || ' does not exist');
  END IF;
  
  -- Log all results
  FOR i IN 1..array_length(result_messages, 1) LOOP
    RAISE NOTICE '%', result_messages[i];
  END LOOP;
  
  RETURN result_messages;
END;
$$;

-- =====================================================
-- PART 2: Fix Function Search Path Mutable Warnings (All Overloads)
-- =====================================================

-- Set search_path for all function overloads
SELECT safe_alter_all_function_overloads('schedule_activity_feed_refresh');
SELECT safe_alter_all_function_overloads('get_user_activity_feed'); -- This was causing the error
SELECT safe_alter_all_function_overloads('refresh_activity_feed');
SELECT safe_alter_all_function_overloads('process_activity_feed_refresh_queue');

-- Game State Functions  
SELECT safe_alter_all_function_overloads('manage_game_state_exclusivity');
SELECT safe_alter_all_function_overloads('log_game_state_transition');

-- Rating and Review Functions
SELECT safe_alter_all_function_overloads('update_rating_slug');
SELECT safe_alter_all_function_overloads('update_user_review_count');
SELECT safe_alter_all_function_overloads('user_has_liked_review');
SELECT safe_alter_all_function_overloads('update_rating_like_count');
SELECT safe_alter_all_function_overloads('fix_rating_slugs');

-- Popularity and Metrics Functions
SELECT safe_alter_all_function_overloads('calculate_popularity_score');
SELECT safe_alter_all_function_overloads('update_popularity_score');
SELECT safe_alter_all_function_overloads('get_metrics_completion_stats');
SELECT safe_alter_all_function_overloads('aggregate_daily_metrics');

-- Search Functions
SELECT safe_alter_all_function_overloads('search_games_with_aliases');
SELECT safe_alter_all_function_overloads('search_games_optimized');
SELECT safe_alter_all_function_overloads('get_search_performance_metrics');
SELECT safe_alter_all_function_overloads('refresh_popular_searches');
SELECT safe_alter_all_function_overloads('get_trending_searches');

-- Utility Functions
SELECT safe_alter_all_function_overloads('update_updated_at_column');

-- Flag Management Functions
SELECT safe_alter_all_function_overloads('set_game_flag');
SELECT safe_alter_all_function_overloads('get_flagged_games_summary');

-- Like System Functions
SELECT safe_alter_all_function_overloads('update_comment_like_count');
SELECT safe_alter_all_function_overloads('simple_toggle_like');
SELECT safe_alter_all_function_overloads('get_review_like_count');
SELECT safe_alter_all_function_overloads('test_simple_like_system');
SELECT safe_alter_all_function_overloads('check_like_system_health');

-- Import Queue Functions
SELECT safe_alter_all_function_overloads('queue_game_for_import');
SELECT safe_alter_all_function_overloads('import_game_from_queue');
SELECT safe_alter_all_function_overloads('get_pending_imports');
SELECT safe_alter_all_function_overloads('request_game');

-- User Management Functions
SELECT safe_alter_all_function_overloads('update_user_game_counts');
SELECT safe_alter_all_function_overloads('update_game_progress_slug');

-- Security Audit Functions (that we created)
SELECT safe_alter_all_function_overloads('audit_auth_users_exposure');
SELECT safe_alter_all_function_overloads('audit_rls_coverage');
SELECT safe_alter_all_function_overloads('audit_function_security');

-- Privacy/Tracking Functions
SELECT safe_alter_all_function_overloads('cleanup_old_tracking_data');
SELECT safe_alter_all_function_overloads('export_user_tracking_data');
SELECT safe_alter_all_function_overloads('delete_user_tracking_data');
SELECT safe_alter_all_function_overloads('user_has_tracking_consent');
SELECT safe_alter_all_function_overloads('get_user_tracking_level');

-- =====================================================
-- PART 3: Secure Materialized View Access
-- =====================================================

-- Fix "Materialized View in API" warning for popular_searches
DO $$
BEGIN
  -- Check if materialized view exists
  IF EXISTS (
    SELECT 1 FROM pg_matviews 
    WHERE schemaname = 'public' AND matviewname = 'popular_searches'
  ) THEN
    -- Enable RLS on the materialized view
    EXECUTE 'ALTER MATERIALIZED VIEW popular_searches ENABLE ROW LEVEL SECURITY';
    
    -- Create policy for materialized view access
    EXECUTE 'CREATE POLICY "Public read access to popular searches" ON popular_searches
      FOR SELECT TO anon, authenticated USING (true)';
    
    RAISE NOTICE 'SUCCESS: Secured popular_searches materialized view';
  ELSE
    RAISE NOTICE 'SKIPPED: popular_searches materialized view does not exist';
  END IF;
EXCEPTION 
  WHEN duplicate_object THEN
    RAISE NOTICE 'SKIPPED: Policy already exists for popular_searches';
  WHEN OTHERS THEN
    RAISE WARNING 'Error securing popular_searches: %', SQLERRM;
END $$;

-- =====================================================
-- PART 4: Enhanced Security Monitoring
-- =====================================================

-- Create a comprehensive function to check search_path compliance
CREATE OR REPLACE FUNCTION check_function_search_paths()
RETURNS TABLE (
  function_signature text,
  schema_name text,
  function_name text,
  argument_types text,
  has_search_path boolean,
  search_path_value text,
  recommendation text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pg_get_function_identity_arguments(p.oid) as function_signature,
    n.nspname::text as schema_name,
    p.proname::text as function_name,
    pg_get_function_arguments(p.oid) as argument_types,
    CASE 
      WHEN p.proconfig IS NOT NULL AND 
           EXISTS (SELECT 1 FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%')
      THEN true
      ELSE false
    END as has_search_path,
    COALESCE(
      (SELECT config FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%' LIMIT 1),
      'none'
    ) as search_path_value,
    CASE 
      WHEN p.proconfig IS NULL OR 
           NOT EXISTS (SELECT 1 FROM unnest(p.proconfig) AS config WHERE config LIKE 'search_path=%')
      THEN 'Set search_path for this function'
      ELSE 'OK: Function has search_path configured'
    END as recommendation
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname NOT LIKE 'pg_%'
  ORDER BY has_search_path ASC, p.proname, pg_get_function_identity_arguments(p.oid);
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_function_search_paths() TO authenticated;

-- =====================================================
-- PART 5: Security Documentation Update
-- =====================================================

-- Add new security guidelines
INSERT INTO security_guidelines (category, guideline, severity, example) VALUES
('Functions', 'Set search_path for all function overloads to prevent injection', 'HIGH', 'ALTER FUNCTION my_func(int) SET search_path = public;'),
('Functions', 'Handle function overloads when setting security properties', 'MEDIUM', 'Use pg_get_function_identity_arguments() to get exact signatures'),
('Views', 'Enable RLS on materialized views exposed to API', 'MEDIUM', 'ALTER MATERIALIZED VIEW my_view ENABLE ROW LEVEL SECURITY;'),
('Functions', 'Use specific schema references in function bodies', 'MEDIUM', 'SELECT * FROM public.my_table; -- not just my_table'),
('Security', 'Enable leaked password protection in Auth settings', 'HIGH', 'Configure in Supabase Dashboard > Authentication > Settings'),
('Maintenance', 'Keep PostgreSQL version updated for security patches', 'HIGH', 'Upgrade database in Supabase Dashboard when patches available'),
('Monitoring', 'Regularly check for functions without search_path', 'MEDIUM', 'SELECT * FROM check_function_search_paths() WHERE has_search_path = false;')
ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 6: Comprehensive Verification and Reporting
-- =====================================================

-- Check for any remaining functions without search_path
SELECT 'REMAINING FUNCTIONS WITHOUT SEARCH_PATH:' as audit_header;
SELECT function_name, argument_types, recommendation 
FROM check_function_search_paths() 
WHERE has_search_path = false
ORDER BY function_name;

-- Summary report with overload details
SELECT 'DETAILED MIGRATION SUMMARY:' as summary_header;
SELECT 
  COUNT(*) as total_function_overloads,
  SUM(CASE WHEN has_search_path THEN 1 ELSE 0 END) as overloads_with_search_path,
  SUM(CASE WHEN NOT has_search_path THEN 1 ELSE 0 END) as overloads_without_search_path
FROM check_function_search_paths();

-- Show functions with their current search_path values
SELECT 'FUNCTIONS WITH SEARCH_PATH SET:' as success_header;
SELECT function_name, search_path_value 
FROM check_function_search_paths() 
WHERE has_search_path = true
ORDER BY function_name;

-- =====================================================
-- PART 7: Cleanup
-- =====================================================

-- Drop the helper function as it's no longer needed
DROP FUNCTION IF EXISTS safe_alter_all_function_overloads(text, text, text);

-- =====================================================
-- PART 8: Comments and Documentation
-- =====================================================

COMMENT ON FUNCTION check_function_search_paths() IS 'Comprehensive audit of all public functions for search_path configuration, including function overloads. Handles duplicate function names properly. Updated 2025-09-22.';

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify the migration worked:
-- 
-- 1. Check remaining functions without search_path:
--    SELECT * FROM check_function_search_paths() WHERE has_search_path = false;
-- 
-- 2. View all functions with their search_path status:
--    SELECT function_name, argument_types, has_search_path, search_path_value 
--    FROM check_function_search_paths() ORDER BY function_name;
-- 
-- 3. Get summary statistics:
--    SELECT 
--      COUNT(*) as total_functions,
--      SUM(CASE WHEN has_search_path THEN 1 ELSE 0 END) as secured_functions
--    FROM check_function_search_paths();

-- =====================================================
-- FINAL SAFE MIGRATION SUMMARY
-- =====================================================
-- 
-- ✅ OVERLOAD SAFE: Handles multiple function signatures properly
-- ✅ ERROR PROOF: Won't fail on missing functions or duplicate names
-- ✅ COMPREHENSIVE: Covers all function overloads individually
-- ✅ DETAILED REPORTING: Shows exactly which overloads were secured
-- ✅ VERIFIED: Built-in verification shows results per overload
-- 
-- This migration handles the "function name is not unique" error properly!