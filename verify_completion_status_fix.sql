-- =====================================================
-- Verification Script for Completion Status Fix
-- =====================================================
-- Run this script after applying all migrations to verify the fix worked

-- 1. Check completion status distribution
SELECT 
    'Current completion status distribution' as check_name,
    completion_status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM rating), 2) as percentage
FROM rating 
GROUP BY completion_status 
ORDER BY count DESC;

-- 2. Verify data consistency between rating and game_progress
SELECT 
    'Data consistency check' as check_name,
    r.id as rating_id,
    r.user_id,
    r.game_id,
    r.rating,
    r.completion_status,
    gp.started as game_progress_started,
    CASE 
        WHEN r.completion_status IN ('started', 'in_progress', 'completed') AND gp.started = true THEN '✅ Consistent'
        WHEN r.completion_status = 'not_started' AND (gp.started IS NULL OR gp.started = false) THEN '✅ Consistent'
        ELSE '❌ Inconsistent'
    END as consistency_status
FROM rating r
LEFT JOIN game_progress gp ON r.user_id = gp.user_id AND r.game_id = gp.game_id
ORDER BY r.post_date_time DESC;

-- 3. Check for any constraint violations (should be 0)
SELECT 
    'Constraint violation check' as check_name,
    'Reviews with not_started status' as violation_type,
    COUNT(*) as violation_count
FROM rating 
WHERE rating IS NOT NULL 
AND completion_status = 'not_started';

-- 4. Check trigger functionality exists
SELECT 
    'Trigger check' as check_name,
    trigger_name,
    event_manipulation,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'rating'
AND trigger_name = 'rating_completion_status_sync';

-- 5. Check constraints exist
SELECT 
    'Constraint check' as check_name,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'rating'::regclass
AND conname IN ('valid_completion_status', 'rating_requires_started_game', 'finished_game_completion_logic');

-- 6. Performance check - ensure indexes exist
SELECT 
    'Index check' as check_name,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'rating'
AND indexname IN ('idx_rating_completion_status', 'idx_rating_user_completion');

-- 7. Sample of recent data to verify business logic
SELECT 
    'Recent data sample' as check_name,
    r.id,
    r.user_id,
    r.game_id,
    r.rating,
    r.completion_status,
    r.finished,
    r.post_date_time,
    gp.started as game_started,
    gp.started_date
FROM rating r
LEFT JOIN game_progress gp ON r.user_id = gp.user_id AND r.game_id = gp.game_id
ORDER BY r.post_date_time DESC
LIMIT 5;

-- Summary report
SELECT 
    'SUMMARY REPORT' as report_section,
    (SELECT COUNT(*) FROM rating WHERE completion_status = 'started') as started_reviews,
    (SELECT COUNT(*) FROM rating WHERE completion_status = 'not_started') as not_started_reviews,
    (SELECT COUNT(*) FROM rating WHERE rating IS NOT NULL AND completion_status = 'not_started') as violations,
    CASE 
        WHEN (SELECT COUNT(*) FROM rating WHERE rating IS NOT NULL AND completion_status = 'not_started') = 0 
        THEN '✅ ALL CHECKS PASSED'
        ELSE '❌ VIOLATIONS FOUND'
    END as overall_status;