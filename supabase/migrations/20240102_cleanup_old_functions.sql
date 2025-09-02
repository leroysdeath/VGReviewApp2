-- =====================================================
-- CLEANUP: Remove Old Broken Functions
-- =====================================================
-- This migration removes leftover functions with broken search_path
-- that are causing "relation does not exist" errors
-- =====================================================

BEGIN;

-- 1. Drop the old broken update_like_counts function
-- This has SET search_path TO '' (empty) which breaks table lookups
DROP FUNCTION IF EXISTS update_like_counts() CASCADE;

-- 2. Drop any other old trigger functions that might be lingering
DROP FUNCTION IF EXISTS update_rating_like_count() CASCADE;
DROP FUNCTION IF EXISTS update_rating_like_count_trigger() CASCADE;

-- 3. Verify no triggers exist on content_like
DO $$
DECLARE
    v_trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_trigger_count
    FROM information_schema.triggers
    WHERE event_object_table = 'content_like';
    
    IF v_trigger_count > 0 THEN
        RAISE WARNING 'Found % triggers on content_like table - these should be removed', v_trigger_count;
    ELSE
        RAISE NOTICE '✅ No triggers on content_like table (good!)';
    END IF;
END $$;

-- 4. Test that our simple functions work
DO $$
DECLARE
    v_test_result JSON;
    v_count INTEGER;
BEGIN
    -- Test get_review_like_count
    v_count := get_review_like_count(1);
    RAISE NOTICE '✅ get_review_like_count works: % likes for review 1', v_count;
    
    -- Test that content_like table is accessible
    SELECT COUNT(*) INTO v_count FROM content_like;
    RAISE NOTICE '✅ content_like table accessible: % total likes', v_count;
    
    -- Test that rating table is accessible
    SELECT COUNT(*) INTO v_count FROM rating;
    RAISE NOTICE '✅ rating table accessible: % total reviews', v_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '🎉 CLEANUP COMPLETE - Old broken functions removed';
END $$;

COMMIT;

-- =====================================================
-- VERIFY EVERYTHING IS CLEAN
-- =====================================================

-- List any remaining functions that reference "rating" table
SELECT 
    'Function "' || proname || '" still references rating table' as warning
FROM pg_proc
WHERE prosrc LIKE '%UPDATE rating%'
   OR prosrc LIKE '%INSERT INTO rating%'
   OR prosrc LIKE '%DELETE FROM rating%'
LIMIT 5;

-- Show current functions for like system
SELECT 
    proname as function_name,
    'Ready' as status
FROM pg_proc
WHERE proname IN ('simple_toggle_like', 'get_review_like_count', 'user_has_liked_review')
ORDER BY proname;