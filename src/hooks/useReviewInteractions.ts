import { useState, useEffect, useCallback } from 'react';
import { 
  getReview, 
  hasUserLikedReview, 
  likeReview, 
  unlikeReview,
  getCommentsForReview,
  addComment,
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

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Get review data
        const reviewResponse = await getReview(reviewId);
        if (reviewResponse.success && reviewResponse.data) {
          setLikeCount(reviewResponse.data.likeCount || 0);
          setCommentCount(reviewResponse.data.commentCount || 0);
        }

        // Check if user has liked the review
        if (userId) {
          const likeResponse = await hasUserLikedReview(userId, reviewId);
          if (likeResponse.success) {
            setIsLiked(likeResponse.data || false);
          }
        }
      } catch (err) {
        setError('Failed to load review data');
        console.error('Error loading review data:', err);
      }
    };

    if (reviewId) {
      loadInitialData();
    }
  }, [reviewId, userId]);

  // Toggle like status
  const toggleLike = useCallback(async () => {
    if (!userId) {
      setError('You must be logged in to like reviews');
      return;
    }

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

  // Load comments
  const loadComments = useCallback(async () => {
    setIsLoadingComments(true);
    setError(null);

    try {
      const response = await getCommentsForReview(reviewId);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      setComments(response.data || []);
      setCommentCount(response.count || 0);
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, [reviewId]);

  // Post a new comment
  const postComment = useCallback(async (content: string, parentId?: number) => {
    if (!userId) {
      throw new Error('You must be logged in to comment');
    }

    setError(null);

    try {
      const response = await addComment(userId, reviewId, content, parentId);
      
      if (!response.success) {
        throw new Error(response.error);
      }

      // Reload comments to get the updated list
      await loadComments();
    } catch (err) {
      setError('Failed to post comment');
      console.error('Error posting comment:', err);
      throw err;
    }
  }, [userId, reviewId, loadComments]);

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
    postComment
  };
};