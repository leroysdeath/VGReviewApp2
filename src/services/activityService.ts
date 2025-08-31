import { supabase } from './supabase';

/**
 * Interface for activity data
 */
export interface Activity {
  id: number;
  type: 'review' | 'rating' | 'comment' | 'like';
  user_id: number;
  game_id?: number;
  review_id?: number;
  comment_id?: number;
  timestamp: string;
  // Joined data
  user?: {
    id: number;
    name: string;
    avatar_url?: string;
  };
  game?: {
    id: number;
    name: string;
    cover_url?: string;
  };
  review?: {
    id: number;
    rating: number;
    review?: string;
  };
  comment?: {
    id: number;
    content: string;
  };
}

/**
 * Interface for pagination parameters
 */
interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Interface for standardized response
 */
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

/**
 * Get all activities for a specific user with pagination
 */
export const getUserActivities = async (
  userId: number,
  { limit = 20, offset = 0 }: PaginationParams = {}
): Promise<ServiceResponse<Activity[]>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }

    // Fetch user activities with joins for related data
    const { data, error, count } = await supabase
      .from('user_activity_view')
      .select(`
        *,
        user:user_id(id, name, picurl),
        game:game_id(id, name, cover_url),
        review:review_id(id, rating, review),
        comment:comment_id(id, content)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      success: true,
      data: data as Activity[],
      count
    };
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch user activities'
    };
  }
};

/**
 * Like a review
 */
export const likeReview = async (
  userId: number,
  reviewId: number
): Promise<ServiceResponse<{ likeCount: number }>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }

    // Start a transaction
    const { data: existingLike, error: checkError } = await supabase
      .from('review_like')
      .select('id')
      .eq('user_id', userId)
      .eq('review_id', reviewId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw checkError;
    }

    // If like already exists, return early
    if (existingLike) {
      // Get current like count
      const { data: likeCount, error: countError } = await supabase
        .from('review_like')
        .select('id', { count: 'exact' })
        .eq('review_id', reviewId);

      if (countError) throw countError;

      return {
        success: true,
        data: { likeCount: likeCount?.length || 0 },
        error: 'User already liked this review'
      };
    }

    // Insert new like
    const { error: insertError } = await supabase
      .from('review_like')
      .insert({
        user_id: userId,
        review_id: reviewId
      });

    if (insertError) throw insertError;

    // Create activity record
    await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        type: 'like',
        review_id: reviewId
      });

    // Get updated like count
    const { data: likeCount, error: countError } = await supabase
      .from('review_like')
      .select('id', { count: 'exact' })
      .eq('review_id', reviewId);

    if (countError) throw countError;

    return {
      success: true,
      data: { likeCount: likeCount?.length || 0 }
    };
  } catch (error) {
    console.error('Error liking review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to like review'
    };
  }
};

/**
 * Unlike a review
 */
export const unlikeReview = async (
  userId: number,
  reviewId: number
): Promise<ServiceResponse<{ likeCount: number }>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }

    // Delete the like
    const { error: deleteError } = await supabase
      .from('review_like')
      .delete()
      .eq('user_id', userId)
      .eq('review_id', reviewId);

    if (deleteError) throw deleteError;

    // Delete the activity
    await supabase
      .from('user_activity')
      .delete()
      .eq('user_id', userId)
      .eq('type', 'like')
      .eq('review_id', reviewId);

    // Get updated like count
    const { data: likeCount, error: countError } = await supabase
      .from('review_like')
      .select('id', { count: 'exact' })
      .eq('review_id', reviewId);

    if (countError) throw countError;

    return {
      success: true,
      data: { likeCount: likeCount?.length || 0 }
    };
  } catch (error) {
    console.error('Error unliking review:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike review'
    };
  }
};

/**
 * Like a comment
 */
export const likeComment = async (
  userId: number,
  commentId: number
): Promise<ServiceResponse<{ likeCount: number }>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!commentId || isNaN(commentId)) {
      return { success: false, error: 'Invalid comment ID' };
    }

    // Check if like already exists
    const { data: existingLike, error: checkError } = await supabase
      .from('comment_like')
      .select('id')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .eq('liked_or_dislike', true)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw checkError;
    }

    // If like already exists, return early
    if (existingLike) {
      // Get current like count
      const { data: likeCount, error: countError } = await supabase
        .from('comment_like')
        .select('id', { count: 'exact' })
        .eq('comment_id', commentId)
        .eq('liked_or_dislike', true);

      if (countError) throw countError;

      return {
        success: true,
        data: { likeCount: likeCount?.length || 0 },
        error: 'User already liked this comment'
      };
    }

    // Insert new like
    const { error: insertError } = await supabase
      .from('comment_like')
      .insert({
        user_id: userId,
        comment_id: commentId,
        liked_or_dislike: true
      });

    if (insertError) throw insertError;

    // Create activity record
    await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        type: 'like',
        comment_id: commentId
      });

    // Get updated like count
    const { data: likeCount, error: countError } = await supabase
      .from('comment_like')
      .select('id', { count: 'exact' })
      .eq('comment_id', commentId)
      .eq('liked_or_dislike', true);

    if (countError) throw countError;

    return {
      success: true,
      data: { likeCount: likeCount?.length || 0 }
    };
  } catch (error) {
    console.error('Error liking comment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to like comment'
    };
  }
};

/**
 * Unlike a comment
 */
export const unlikeComment = async (
  userId: number,
  commentId: number
): Promise<ServiceResponse<{ likeCount: number }>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!commentId || isNaN(commentId)) {
      return { success: false, error: 'Invalid comment ID' };
    }

    // Delete the like
    const { error: deleteError } = await supabase
      .from('comment_like')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .eq('liked_or_dislike', true);

    if (deleteError) throw deleteError;

    // Delete the activity
    await supabase
      .from('user_activity')
      .delete()
      .eq('user_id', userId)
      .eq('type', 'like')
      .eq('comment_id', commentId);

    // Get updated like count
    const { data: likeCount, error: countError } = await supabase
      .from('comment_like')
      .select('id', { count: 'exact' })
      .eq('comment_id', commentId)
      .eq('liked_or_dislike', true);

    if (countError) throw countError;

    return {
      success: true,
      data: { likeCount: likeCount?.length || 0 }
    };
  } catch (error) {
    console.error('Error unliking comment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unlike comment'
    };
  }
};

/**
 * Add a comment to a review
 */
export const addComment = async (
  userId: number,
  reviewId: number,
  content: string,
  parentCommentId?: number
): Promise<ServiceResponse<any>> => {
  try {
    // Validate input
    if (!userId || isNaN(userId)) {
      return { success: false, error: 'Invalid user ID' };
    }
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }
    if (!content || content.trim().length === 0) {
      return { success: false, error: 'Comment content cannot be empty' };
    }

    // Sanitize content (basic implementation - in production use a proper sanitizer)
    const sanitizedContent = content.trim();

    // Validate parent comment if provided
    if (parentCommentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comment')
        .select('id')
        .eq('id', parentCommentId)
        .single();

      if (parentError) {
        return { success: false, error: 'Parent comment not found' };
      }
    }

    // Insert comment
    const { data: newComment, error: insertError } = await supabase
      .from('comment')
      .insert({
        user_id: userId,
        rating_id: reviewId,
        content: sanitizedContent,
        parent_id: parentCommentId || null
      })
      .select(`
        *,
        user:user_id(id, name, picurl)
      `)
      .single();

    if (insertError) throw insertError;

    // Create activity record
    await supabase
      .from('user_activity')
      .insert({
        user_id: userId,
        type: 'comment',
        review_id: reviewId,
        comment_id: newComment.id
      });

    return {
      success: true,
      data: newComment
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add comment'
    };
  }
};

/**
 * Get all comments for a review
 */
export const getCommentsForReview = async (
  reviewId: number,
  { limit = 50, offset = 0 }: PaginationParams = {}
): Promise<ServiceResponse<any>> => {
  try {
    // Validate input
    if (!reviewId || isNaN(reviewId)) {
      return { success: false, error: 'Invalid review ID' };
    }

    // Fetch all comments for the review
    const { data: comments, error, count } = await supabase
      .from('comment')
      .select(`
        *,
        user:user_id(id, name, picurl),
        likes:comment_id(count),
        replies:comment!parent_id(
          *,
          user:user_id(id, name, picurl),
          likes:comment_id(count)
        )
      `, { count: 'exact' })
      .eq('rating_id', reviewId)
      .is('parent_id', null) // Only get top-level comments
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Build nested structure
    const commentsWithReplies = comments?.map(comment => {
      // Sort replies by timestamp
      if (comment.replies) {
        comment.replies.sort((a: any, b: any) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      }
      
      // Get like count
      comment.likeCount = comment.likes?.length || 0;
      delete comment.likes; // Remove the raw likes data
      
      // Process replies
      if (comment.replies) {
        comment.replies = comment.replies.map((reply: any) => {
          reply.likeCount = reply.likes?.length || 0;
          delete reply.likes;
          return reply;
        });
      }
      
      return comment;
    });

    return {
      success: true,
      data: commentsWithReplies || [],
      count
    };
  } catch (error) {
    console.error('Error fetching comments:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch comments'
    };
  }
};