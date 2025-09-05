-- Create stored procedure for toggling comment likes
-- This procedure handles both liking and unliking comments atomically
-- It updates both the content_like table and the comment like_count

CREATE OR REPLACE FUNCTION public.simple_toggle_comment_like(
    p_user_id bigint,
    p_comment_id bigint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_liked boolean;
    v_like_count int;
    v_auth_user_id bigint;
BEGIN
    -- Verify user matches auth context (same pattern as simple_toggle_like)
    SELECT id INTO v_auth_user_id
    FROM "user"
    WHERE provider_id = auth.uid()
    LIMIT 1;
    
    -- Allow if auth check passes OR if running in admin context
    IF (v_auth_user_id IS NOT NULL AND v_auth_user_id = p_user_id) OR auth.uid() IS NULL THEN
        -- Check if user already liked this comment
        SELECT EXISTS (
            SELECT 1 FROM content_like 
            WHERE user_id = p_user_id 
            AND comment_id = p_comment_id
            AND is_like = true
        ) INTO v_is_liked;
        
        IF v_is_liked THEN
            -- Unlike: Remove the like
            DELETE FROM content_like 
            WHERE user_id = p_user_id 
            AND comment_id = p_comment_id;
            
            -- Update comment like_count
            UPDATE comment 
            SET like_count = GREATEST(like_count - 1, 0)
            WHERE id = p_comment_id;
            
            -- Get updated count
            SELECT like_count 
            FROM comment 
            WHERE id = p_comment_id 
            INTO v_like_count;
            
            RETURN json_build_object(
                'success', true,
                'action', 'unliked',
                'likeCount', COALESCE(v_like_count, 0),
                'isLiked', false
            );
        ELSE
            -- Like: Add the like
            INSERT INTO content_like (user_id, comment_id, is_like)
            VALUES (p_user_id, p_comment_id, true)
            ON CONFLICT (user_id, comment_id) DO UPDATE
            SET is_like = true;
            
            -- Update comment like_count
            UPDATE comment 
            SET like_count = like_count + 1
            WHERE id = p_comment_id;
            
            -- Get updated count
            SELECT like_count 
            FROM comment 
            WHERE id = p_comment_id 
            INTO v_like_count;
            
            RETURN json_build_object(
                'success', true,
                'action', 'liked',
                'likeCount', COALESCE(v_like_count, 0),
                'isLiked', true
            );
        END IF;
    ELSE
        RETURN json_build_object(
            'success', false,
            'error', 'Unauthorized',
            'likeCount', 0,
            'isLiked', false
        );
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'likeCount', 0,
            'isLiked', false
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.simple_toggle_comment_like TO authenticated;

-- Add comment to explain the function
COMMENT ON FUNCTION public.simple_toggle_comment_like IS 'Toggles like status for a comment. If user has already liked, it removes the like. If not liked, it adds a like. Updates comment like_count atomically and returns the new state.';