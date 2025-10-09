-- =====================================================
-- Check Existing Function Definitions
-- =====================================================
-- Run this FIRST to see the current function definitions
-- before applying the security fix migration

-- Check is_admin function
SELECT
  'is_admin' as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'is_admin';

-- Check bulk_update_games_from_staging function
SELECT
  'bulk_update_games_from_staging' as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'bulk_update_games_from_staging';

-- Check get_current_user_id function
SELECT
  'get_current_user_id' as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_current_user_id';

-- Check fetch_igdb_data function
SELECT
  'fetch_igdb_data' as function_name,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'fetch_igdb_data';

-- =====================================================
-- Copy the output from above and send it to me
-- I'll update the migration to preserve the exact logic
-- =====================================================
