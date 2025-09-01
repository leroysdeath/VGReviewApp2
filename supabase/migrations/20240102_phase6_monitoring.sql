-- Phase 6: Monitoring & Testing
-- This migration adds performance monitoring and debugging capabilities

-- 1. Create performance monitoring table
CREATE TABLE IF NOT EXISTS like_performance_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(20) NOT NULL,
    execution_time_ms INTEGER,
    user_id INTEGER REFERENCES "user"(id),
    review_id INTEGER REFERENCES rating(id),
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance queries
CREATE INDEX idx_performance_log_created ON like_performance_log(created_at DESC);
CREATE INDEX idx_performance_log_operation ON like_performance_log(operation, created_at DESC);
CREATE INDEX idx_performance_log_user ON like_performance_log(user_id) WHERE user_id IS NOT NULL;

-- 2. Create enhanced toggle function with performance logging
CREATE OR REPLACE FUNCTION toggle_review_like_monitored(
    p_user_id INTEGER,
    p_review_id INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_time TIMESTAMP;
    v_end_time TIMESTAMP;
    v_execution_time_ms INTEGER;
    v_result JSON;
    v_operation VARCHAR(20);
BEGIN
    v_start_time := clock_timestamp();
    
    -- Call the actual toggle function
    v_result := toggle_review_like(p_user_id, p_review_id);
    
    v_end_time := clock_timestamp();
    v_execution_time_ms := EXTRACT(MILLISECONDS FROM (v_end_time - v_start_time))::INTEGER;
    
    -- Determine operation type
    IF (v_result->>'liked')::BOOLEAN THEN
        v_operation := 'LIKE';
    ELSE
        v_operation := 'UNLIKE';
    END IF;
    
    -- Log performance
    INSERT INTO like_performance_log (
        operation, 
        execution_time_ms, 
        user_id, 
        review_id, 
        success,
        error_message
    ) VALUES (
        v_operation,
        v_execution_time_ms,
        p_user_id,
        p_review_id,
        (v_result->>'success')::BOOLEAN,
        v_result->>'error'
    );
    
    -- Add execution time to result
    RETURN v_result || jsonb_build_object('execution_ms', v_execution_time_ms);
END;
$$;

-- 3. Create performance statistics view
CREATE OR REPLACE VIEW like_performance_stats AS
SELECT 
    operation,
    COUNT(*) as total_operations,
    COUNT(*) FILTER (WHERE success = true) as successful_ops,
    COUNT(*) FILTER (WHERE success = false) as failed_ops,
    ROUND(AVG(execution_time_ms)::numeric, 2) as avg_time_ms,
    MIN(execution_time_ms) as min_time_ms,
    MAX(execution_time_ms) as max_time_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms) as median_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_time_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms) as p99_time_ms
FROM like_performance_log
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY operation;

-- 4. Create health check function
CREATE OR REPLACE FUNCTION check_like_system_health()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_auth_check BOOLEAN;
    v_policy_check BOOLEAN;
    v_trigger_check BOOLEAN;
    v_index_check BOOLEAN;
    v_perf_stats JSON;
BEGIN
    -- Check auth context
    v_auth_check := auth.uid() IS NOT NULL;
    
    -- Check RLS policy exists
    SELECT EXISTS(
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'content_like' 
        AND policyname = 'Users can manage own likes'
    ) INTO v_policy_check;
    
    -- Check trigger exists
    SELECT EXISTS(
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_rating_like_count_trigger'
    ) INTO v_trigger_check;
    
    -- Check indexes exist
    SELECT EXISTS(
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'content_like' 
        AND indexname = 'content_like_user_id_rating_id_key'
    ) INTO v_index_check;
    
    -- Get performance stats
    SELECT json_agg(row_to_json(t))
    FROM (
        SELECT * FROM like_performance_stats
    ) t INTO v_perf_stats;
    
    RETURN json_build_object(
        'timestamp', NOW(),
        'auth_context_available', v_auth_check,
        'rls_policy_exists', v_policy_check,
        'trigger_exists', v_trigger_check,
        'indexes_exist', v_index_check,
        'performance_stats', COALESCE(v_perf_stats, '[]'::json),
        'overall_health', v_auth_check AND v_policy_check AND v_trigger_check AND v_index_check
    );
END;
$$;

-- 5. Create test function to verify like functionality
CREATE OR REPLACE FUNCTION test_like_functionality(
    p_test_user_id INTEGER,
    p_test_review_id INTEGER
) RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_results JSON[];
    v_like_result JSON;
    v_unlike_result JSON;
    v_initial_count INTEGER;
    v_after_like_count INTEGER;
    v_after_unlike_count INTEGER;
BEGIN
    -- Get initial like count
    SELECT like_count INTO v_initial_count
    FROM rating WHERE id = p_test_review_id;
    
    -- Test 1: Like the review
    v_like_result := toggle_review_like_monitored(p_test_user_id, p_test_review_id);
    
    SELECT like_count INTO v_after_like_count
    FROM rating WHERE id = p_test_review_id;
    
    v_results := array_append(v_results, json_build_object(
        'test', 'like_review',
        'success', (v_like_result->>'success')::BOOLEAN,
        'liked', (v_like_result->>'liked')::BOOLEAN,
        'count_changed', v_after_like_count > v_initial_count,
        'execution_ms', v_like_result->>'execution_ms'
    ));
    
    -- Test 2: Unlike the review
    v_unlike_result := toggle_review_like_monitored(p_test_user_id, p_test_review_id);
    
    SELECT like_count INTO v_after_unlike_count
    FROM rating WHERE id = p_test_review_id;
    
    v_results := array_append(v_results, json_build_object(
        'test', 'unlike_review',
        'success', (v_unlike_result->>'success')::BOOLEAN,
        'liked', (v_unlike_result->>'liked')::BOOLEAN,
        'count_restored', v_after_unlike_count = v_initial_count,
        'execution_ms', v_unlike_result->>'execution_ms'
    ));
    
    RETURN json_build_object(
        'test_timestamp', NOW(),
        'user_id', p_test_user_id,
        'review_id', p_test_review_id,
        'initial_count', v_initial_count,
        'tests', array_to_json(v_results),
        'all_tests_passed', 
            (v_like_result->>'success')::BOOLEAN AND 
            (v_unlike_result->>'success')::BOOLEAN AND
            v_after_like_count > v_initial_count AND
            v_after_unlike_count = v_initial_count
    );
END;
$$;

-- 6. Create cleanup function for old performance logs
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    DELETE FROM like_performance_log
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN v_deleted_count;
END;
$$;

-- 7. Create dashboard view for monitoring
CREATE OR REPLACE VIEW like_system_dashboard AS
SELECT 
    -- Current status
    (SELECT COUNT(DISTINCT user_id) FROM content_like WHERE created_at > NOW() - INTERVAL '24 hours') as active_users_24h,
    (SELECT COUNT(*) FROM content_like WHERE created_at > NOW() - INTERVAL '24 hours') as likes_24h,
    (SELECT COUNT(*) FROM rating WHERE like_count > 0) as reviews_with_likes,
    (SELECT SUM(like_count) FROM rating) as total_likes,
    
    -- Performance metrics from last hour
    (SELECT AVG(execution_time_ms) FROM like_performance_log 
     WHERE created_at > NOW() - INTERVAL '1 hour' AND success = true) as avg_response_time_ms,
    
    (SELECT COUNT(*) FROM like_performance_log 
     WHERE created_at > NOW() - INTERVAL '1 hour' AND success = false) as errors_last_hour,
    
    -- Top liked reviews
    (SELECT json_agg(t) FROM (
        SELECT id, like_count, LEFT(review, 50) as review_preview
        FROM rating 
        WHERE like_count > 0
        ORDER BY like_count DESC 
        LIMIT 5
    ) t) as top_liked_reviews;

-- 8. Grant permissions
GRANT SELECT ON like_performance_log TO authenticated;
GRANT SELECT ON like_performance_stats TO authenticated;
GRANT SELECT ON like_system_dashboard TO authenticated;

-- 9. Add helpful comments
COMMENT ON TABLE like_performance_log IS 
'Tracks performance metrics for like operations. Auto-cleaned after 30 days.';

COMMENT ON VIEW like_performance_stats IS 
'Aggregated performance statistics for the last 7 days.';

COMMENT ON FUNCTION check_like_system_health IS 
'Health check for the entire like system. Returns JSON with status of all components.';

COMMENT ON FUNCTION test_like_functionality IS 
'End-to-end test of like functionality. Use with test user and review.';

COMMENT ON VIEW like_system_dashboard IS 
'Real-time dashboard metrics for monitoring like system performance and usage.';

-- 10. Initial health check
SELECT check_like_system_health();

RAISE NOTICE 'Phase 6 migration complete: Monitoring and testing infrastructure added';