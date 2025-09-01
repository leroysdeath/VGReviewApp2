import { useState, useEffect, useCallback } from 'react';
import { 
  getReview, 
  hasUserLikedReview, 
  likeReview, 
  unlikeReview,
  getCommentsForReview,
  addComment,
  editComment,
  deleteComment,
  Comment
} from '../services/reviewService';

interface UseReviewInteractionsProps {
  reviewId: number;
  userId?: number;
}

interface UseReviewInteractionsReturn {
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  comments: Comment[];
  isLoadingLike: boolean;
  isLoadingComments: boolean;
  error: string | null;
  toggleLike: () => Promise<void>;
  loadComments: () => Promise<void>;
  postComment: (content: string, parentId?: number) => Promise<void>;
  updateComment: (commentId: number, content: string) => Promise<void>;
  removeComment: (commentId: number) => Promise<void>;
  commentsLoaded: boolean;
}

export const useReviewInteractions = ({ 
  reviewId, 
  userId 
}: UseReviewInteractionsProps): UseReviewInteractionsReturn => {
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingLike, setIsLoadingLike] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Load initial review data and like status
  useEffect(() => {
    const loadInitialData = async () => {
      if (!reviewId) return;
      
      try {
        // Get review data
        const reviewResponse = await getReview(reviewId);
        if (reviewResponse.success && reviewResponse.data) {
          setLikeCount(reviewResponse.data.likeCount || 0);
          setCommentCount(reviewResponse.data.commentCount || 0);
        }

        // Check if user has liked the review - only if userId is defined
        if (userId && userId > 0) {
          console.log('🔍 Checking if user has liked review:', { userId, reviewId });
          const likeResponse = await hasUserLikedReview(userId, reviewId);
          if (likeResponse.success) {
            setIsLiked(likeResponse.data || false);
          }
        } else {
          console.log('⏳ User ID not yet loaded, skipping like check');
          setIsLiked(false); // Default to not liked
        }
      } catch (err) {
        setError('Failed to load review data');
        console.error('Error loading review data:', err);
      }
    };

    loadInitialData();
  }, [reviewId, userId]);

  // Load comments in background after initial data loads
  useEffect(() => {
    const loadCommentsInBackground = async () => {
      if (!reviewId || commentsLoaded) return;
      
      try {
        console.log('📚 Loading comments in background for review:', reviewId);
        setIsLoadingComments(true);
        const response = await getCommentsForReview(reviewId);
        
        if (response.success) {
          setComments(response.data || []);
          setCommentCount(response.count || 0);
          setCommentsLoaded(true);
          console.log('✅ Comments loaded successfully:', response.count, 'comments');
        } else {
          console.warn('⚠️ Failed to load comments:', response.error);
        }
      } catch (err) {
        console.error('Error loading comments in background:', err);
      } finally {
        setIsLoadingComments(false);
      }
    };

    // Small delay to let initial data load first
    const timeoutId = setTimeout(loadCommentsInBackground, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, [reviewId, commentsLoaded]);

  // Reset comments when reviewId changes
  useEffect(() => {
    setComments([]);
    setCommentsLoaded(false);
  }, [reviewId]);

  // Toggle like status
  const toggleLike = useCallback(async () => {
    if (!userId || userId <= 0) {
      console.warn('⚠️ Cannot toggle like - userId is undefined or invalid:', userId);
      setError('You must be logged in to like reviews');
      return;
    }

    console.log('👍 Toggling like:', { userId, reviewId, currentIsLiked: isLiked });
    setIsLoadingLike(true);
    setError(null);

    try {
      // Optimistic update
      const newIsLiked = !isLiked;
      const newLikeCount = newIsLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
      
      setIsLiked(newIsLiked);
      setLikeCount(newLikeCount);

      // Actual API call
      const response = newIsLiked
        ? await likeReview(userId, reviewId)
        : await unlikeReview(userId, reviewId);

      if (!response.success) {
        // Revert optimistic update on failure
        setIsLiked(!newIsLiked);
        setLikeCount(likeCount);
        throw new Error(response.error);
      }

      // Update with actual count from server
      if (response.data) {
        setLikeCount(response.data.likeCount);
      }
    } catch (err) {
      setError('Failed to update like status');
      console.error('Error toggling like:', err);
    } finally {
      setIsLoadingLike(false);
    }
  }, [userId, reviewId, isLiked, likeCount]);

  // Load comments (used for manual refresh or if background loading failed)
  const loadComments = useCallback(async () => {
    // Don't reload if already loading or recently loaded
    if (isLoadingComments || commentsLoaded) {
      console.log('📚 Comments already loaded or loading, skipping...');
      return;
    }

    setIsLoadingComments(true);
    setError(null);

    try {
      console.log('🔄 Manually loading comments for review:', reviewId);
      const response = await getCommentsForReview(reviewId);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      setComments(response.data || []);
      setCommentCount(response.count || 0);
      setCommentsLoaded(true);
      console.log('✅ Comments loaded manually:', response.count, 'comments');
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [reviewId, isLoadingComments, commentsLoaded]);

  // Post a new comment
  const postComment = useCallback(async (content: string, parentId?: number) => {
    if (!userId || userId <= 0) {
      console.warn('⚠️ Cannot post comment - userId is undefined or invalid:', userId);
      throw new Error('You must be logged in to comment');
    }

    console.log('💬 Posting comment:', { userId, reviewId, contentLength: content.length });
    setError(null);

    try {
      const response = await addComment(userId, reviewId, content, parentId);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      // Force reload comments to get the updated list
      setCommentsLoaded(false); // Reset to allow reload
      await loadComments();
    } catch (err) {
      setError('Failed to post comment');
      console.error('Error posting comment:', err);
      throw err;
    }
  }, [userId, reviewId, loadComments]);

  // Update a comment
  const updateComment = useCallback(async (commentId: number, content: string) => {
    if (!commentId || !content || content.trim().length === 0) {
      throw new Error('Invalid comment data');
    }

    console.log('✏️ Updating comment:', { commentId, contentLength: content.length });
    setError(null);

    try {
      const response = await editComment(commentId, content);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      // Update the comment in the local state
      setComments(prevComments => {
        const updateCommentInList = (commentList: Comment[]): Comment[] => {
          return commentList.map(comment => {
            if (comment.id === commentId && response.data) {
              return { ...comment, content: response.data.content, updatedAt: response.data.updatedAt };
            }
            if (comment.replies && comment.replies.length > 0) {
              return { ...comment, replies: updateCommentInList(comment.replies) };
            }
            return comment;
          });
        };
        return updateCommentInList(prevComments);
      });

      console.log('✅ Comment updated successfully in UI');
    } catch (err) {
      setError('Failed to update comment');
      console.error('Error updating comment:', err);
      throw err;
    }
  }, []);

  // Delete a comment
  const removeComment = useCallback(async (commentId: number) => {
    if (!commentId) {
      throw new Error('Invalid comment ID');
    }

    console.log('🗑️ Deleting comment:', { commentId });
    setError(null);

    try {
      const response = await deleteComment(commentId);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      // Remove the comment from the local state
      setComments(prevComments => {
        const removeCommentFromList = (commentList: Comment[]): Comment[] => {
          return commentList.filter(comment => {
            if (comment.id === commentId) {
              return false;
            }
            if (comment.replies && comment.replies.length > 0) {
              comment.replies = removeCommentFromList(comment.replies);
            }
            return true;
          });
        };
        return removeCommentFromList(prevComments);
      });

      // Update comment count
      setCommentCount(prev => Math.max(0, prev - 1));

      console.log('✅ Comment deleted successfully from UI');
    } catch (err) {
      setError('Failed to delete comment');
      console.error('Error deleting comment:', err);
      throw err;
    }
  }, []);

  return {
    likeCount,
    commentCount,
    isLiked,
    comments,
    isLoadingLike,
    isLoadingComments,
    error,
    toggleLike,
    loadComments,
    postComment,
    updateComment,
    removeComment,
    commentsLoaded
  };
};