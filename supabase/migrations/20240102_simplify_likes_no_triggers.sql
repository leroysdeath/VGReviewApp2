-- =====================================================
-- SIMPLIFIED LIKE SYSTEM - NO TRIGGERS, NO COMPLEXITY
-- =====================================================
-- This migration simplifies the like system to match the comment pattern
-- Removes triggers and calculates counts dynamically for reliability
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Remove all trigger complexity
-- =====================================================

-- Drop existing triggers and functions that were causing issues
DROP TRIGGER IF EXISTS update_rating_like_count_trigger ON content_like;
DROP FUNCTION IF EXISTS update_rating_like_count() CASCADE;
DROP FUNCTION IF EXISTS toggle_review_like(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS toggle_review_like_monitored(INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS batch_like_operations(INTEGER, JSON) CASCADE;

-- =====================================================
-- STEP 2: Fix the RLS policy (keep the working inline pattern)
-- =====================================================

DROP POLICY IF EXISTS "Users can manage own likes" ON content_like;

CREATE POLICY "Users can manage own likes" ON content_like
FOR ALL 
USING (true)  -- Anyone can view likes
WITH CHECK (
    user_id IN (
        SELECT id FROM "user" 
        WHERE provider_id = auth.uid()
    )
);

-- =====================================================
-- STEP 3: Create view for ratings with calculated counts
-- =====================================================

DROP VIEW IF EXISTS rating_with_counts CASCADE;

CREATE OR REPLACE VIEW rating_with_counts AS
SELECT 
    r.*,
    COALESCE((
        SELECT COUNT(*)::INTEGER 
        FROM content_like cl 
        WHERE cl.rating_id = r.id
    ), 0) as calculated_like_count,
    COALESCE((
        SELECT COUNT(*)::INTEGER 
        FROM comment c 
        WHERE c.rating_id = r.id
    ), 0) as calculated_comment_count
FROM rating r;

-- Grant permissions
GRANT SELECT ON rating_with_counts TO authenticated;
GRANT SELECT ON rating_with_counts TO anon;

-- =====================================================
-- STEP 4: Create simple helper functions
-- =====================================================

-- Simple function to check if user liked a review
CREATE OR REPLACE FUNCTION user_has_liked_review(
    p_user_id INTEGER,
    p_review_id INTEGER
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM content_like 
        WHERE user_id = p_user_id 
        AND rating_id = p_review_id
    );
$$;

-- Simple function to get like count for a review
CREATE OR REPLACE FUNCTION get_review_like_count(
    p_review_id INTEGER
) RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
    FROM content_like
    WHERE rating_id = p_review_id;
$$;

-- Simple function to toggle like (returns success/failure)
CREATE OR REPLACE FUNCTION simple_toggle_like(
    p_user_id INTEGER,
    p_review_id INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_exists BOOLEAN;
    v_auth_user_id INTEGER;
BEGIN
    -- Verify user matches auth context
    SELECT id INTO v_auth_user_id
    FROM "user"
    WHERE provider_id = auth.uid()
    LIMIT 1;
    
    -- Allow if auth check passes OR if running in admin context
    IF (v_auth_user_id IS NOT NULL AND v_auth_user_id = p_user_id) OR auth.uid() IS NULL THEN
        -- Check if like exists
        SELECT EXISTS(
            SELECT 1 FROM content_like 
            WHERE user_id = p_user_id 
            AND rating_id = p_review_id
        ) INTO v_exists;
        
        IF v_exists THEN
            -- Unlike
            DELETE FROM content_like 
            WHERE user_id = p_user_id 
            AND rating_id = p_review_id;
            
            RETURN json_build_object(
                'success', true,
                'action', 'unliked',
                'liked', false
            );
        ELSE
            -- Like
            INSERT INTO content_like (user_id, rating_id, is_like)
            VALUES (p_user_id, p_review_id, true)
            ON CONFLICT (user_id, rating_id) DO NOTHING;
            
            RETURN json_build_object(
                'success', true,
                'action', 'liked',
                'liked', true
            );
        END IF;
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Unauthorized',
            'liked', false
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'liked', false
        );
END;
$$;

-- =====================================================
-- STEP 5: Ensure content_like table has proper defaults
-- =====================================================

-- Set default for is_like column
ALTER TABLE content_like ALTER COLUMN is_like SET DEFAULT true;

-- =====================================================
-- STEP 6: Create indexes for performance
-- =====================================================

-- These already exist but let's ensure they're there
CREATE INDEX IF NOT EXISTS idx_content_like_rating ON content_like(rating_id);
CREATE INDEX IF NOT EXISTS idx_content_like_user ON content_like(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_like_unique ON content_like(user_id, rating_id);

-- =====================================================
-- STEP 7: Update the stored like_count column to match actual counts
-- (One-time sync, after this it won't be used for new likes)
-- =====================================================

UPDATE rating r
SET like_count = (
    SELECT COUNT(*)
    FROM content_like cl
    WHERE cl.rating_id = r.id
);

-- =====================================================
-- STEP 8: Create simple test function
-- =====================================================

CREATE OR REPLACE FUNCTION test_simple_like_system()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_test_user_id INTEGER;
    v_test_review_id INTEGER;
    v_initial_liked BOOLEAN;
    v_after_toggle_liked BOOLEAN;
    v_toggle_result JSON;
BEGIN
    -- Get a test user and review
    SELECT id INTO v_test_user_id FROM "user" LIMIT 1;
    SELECT id INTO v_test_review_id FROM rating LIMIT 1;
    
    IF v_test_user_id IS NULL OR v_test_review_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No test data available'
        );
    END IF;
    
    -- Check initial state
    v_initial_liked := user_has_liked_review(v_test_user_id, v_test_review_id);
    
    -- Toggle like
    v_toggle_result := simple_toggle_like(v_test_user_id, v_test_review_id);
    
    -- Check new state
    v_after_toggle_liked := user_has_liked_review(v_test_user_id, v_test_review_id);
    
    -- Toggle back to original state
    PERFORM simple_toggle_like(v_test_user_id, v_test_review_id);
    
    RETURN json_build_object(
        'success', true,
        'test_user_id', v_test_user_id,
        'test_review_id', v_test_review_id,
        'initial_liked', v_initial_liked,
        'after_toggle_liked', v_after_toggle_liked,
        'toggle_worked', (v_initial_liked != v_after_toggle_liked),
        'toggle_result', v_toggle_result
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION simple_toggle_like TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_liked_review TO authenticated;
GRANT EXECUTE ON FUNCTION get_review_like_count TO authenticated, anon;
GRANT EXECUTE ON FUNCTION test_simple_like_system TO authenticated;

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Test the system
SELECT test_simple_like_system();

-- Show sample of the view
SELECT id, like_count, calculated_like_count, calculated_comment_count
FROM rating_with_counts
LIMIT 5;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SIMPLIFIED LIKE SYSTEM INSTALLED SUCCESSFULLY!';
    RAISE NOTICE '';
    RAISE NOTICE 'What changed:';
    RAISE NOTICE '  - Removed complex triggers that were failing';
    RAISE NOTICE '  - Like counts now calculated dynamically (like comments)';
    RAISE NOTICE '  - Simpler = more reliable';
    RAISE NOTICE '';
    RAISE NOTICE 'How to use:';
    RAISE NOTICE '  - Likes work exactly like comments now';
    RAISE NOTICE '  - Use rating_with_counts view to get counts';
    RAISE NOTICE '  - Or call get_review_like_count(review_id) directly';
    RAISE NOTICE '';
END $$;