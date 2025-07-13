import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Review, 
  Comment,
  getReview,
  hasUserLikedReview,
  likeReview,
  unlikeReview,
  getCommentsForReview,
  addComment
} from '../services/reviewService';

interface ReviewContextType {
  reviews: Map<number, Review>;
  comments: Map<number, Comment[]>;
  likedReviews: Set<number>;
  isLoadingReview: boolean;
  isLoadingComments: boolean;
  error: string | null;
  getReviewById: (reviewId: number) => Promise<Review | null>;
  getCommentsById: (reviewId: number) => Promise<Comment[]>;
  toggleLike: (reviewId: number, userId: number) => Promise<void>;
  addNewComment: (userId: number, reviewId: number, content: string, parentId?: number) => Promise<void>;
}

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

interface ReviewProviderProps {
  children: ReactNode;
  currentUserId?: number;
}

export const ReviewProvider: React.FC<ReviewProviderProps> = ({ children, currentUserId }) => {
  const [reviews, setReviews] = useState<Map<number, Review>>(new Map());
  const [comments, setComments] = useState<Map<number, Comment[]>>(new Map());
  const [likedReviews, setLikedReviews] = useState<Set<number>>(new Set());
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load liked reviews for current user
  useEffect(() => {
    const loadLikedReviews = async () => {
      if (!currentUserId) return;
      
      // In a real app, you would fetch all liked reviews for the user
      // For now, we'll just use local storage to persist likes between refreshes
      const storedLikes = localStorage.getItem(`user_${currentUserId}_likes`);
      if (storedLikes) {
        try {
          const likedIds = JSON.parse(storedLikes) as number[];
          setLikedReviews(new Set(likedIds));
        } catch (err) {
          console.error('Error parsing stored likes:', err);
        }
      }
    };

    loadLikedReviews();
  }, [currentUserId]);

  // Save liked reviews to local storage when they change
  useEffect(() => {
    if (!currentUserId) return;
    
    localStorage.setItem(
      `user_${currentUserId}_likes`, 
      JSON.stringify(Array.from(likedReviews))
    );
  }, [likedReviews, currentUserId]);

  // Get a review by ID
  const getReviewById = async (reviewId: number): Promise<Review | null> => {
    // Check if we already have this review cached
    if (reviews.has(reviewId)) {
      return reviews.get(reviewId) || null;
    }

    setIsLoadingReview(true);
    setError(null);

    try {
      const response = await getReview(reviewId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to fetch review');
      }

      const review = response.data;
      
      // Cache the review
      setReviews(prev => {
        const updated = new Map(prev);
        updated.set(reviewId, review);
        return updated;
      });

      // Check if user has liked this review
      if (currentUserId) {
        const likeResponse = await hasUserLikedReview(currentUserId, reviewId);
        if (likeResponse.success && likeResponse.data) {
          setLikedReviews(prev => {
            const updated = new Set(prev);
            updated.add(reviewId);
            return updated;
          });
        }
      }

      return review;
    } catch (err) {
      setError('Failed to load review');
      console.error('Error loading review:', err);
      return null;
    } finally {
      setIsLoadingReview(false);
    }
  };

  // Get comments for a review
  const getCommentsById = async (reviewId: number): Promise<Comment[]> => {
    setIsLoadingComments(true);
    setError(null);

    try {
      const response = await getCommentsForReview(reviewId);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch comments');
      }

      const reviewComments = response.data || [];
      
      // Cache the comments
      setComments(prev => {
        const updated = new Map(prev);
        updated.set(reviewId, reviewComments);
        return updated;
      });

      return reviewComments;
    } catch (err) {
      setError('Failed to load comments');
      console.error('Error loading comments:', err);
      return [];
    } finally {
      setIsLoadingComments(false);
    }
  };

  // Toggle like status for a review
  const toggleLike = async (reviewId: number, userId: number): Promise<void> => {
    if (!userId) {
      setError('You must be logged in to like reviews');
      return;
    }

    setError(null);

    try {
      const isCurrentlyLiked = likedReviews.has(reviewId);
      
      // Optimistic update
      setLikedReviews(prev => {
        const updated = new Set(prev);
        if (isCurrentlyLiked) {
          updated.delete(reviewId);
        } else {
          updated.add(reviewId);
        }
        return updated;
      });

      // Update review like count optimistically
      setReviews(prev => {
        const updated = new Map(prev);
        const review = updated.get(reviewId);
        if (review) {
          const newLikeCount = isCurrentlyLiked 
            ? Math.max(0, (review.likeCount || 0) - 1)
            : (review.likeCount || 0) + 1;
          
          updated.set(reviewId, {
            ...review,
            likeCount: newLikeCount
          });
        }
        return updated;
      });

      // Make API call
      const response = isCurrentlyLiked
        ? await unlikeReview(userId, reviewId)
        : await likeReview(userId, reviewId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to update like status');
      }

      // Update with actual count from server
      if (response.data) {
        setReviews(prev => {
          const updated = new Map(prev);
          const review = updated.get(reviewId);
          if (review) {
            updated.set(reviewId, {
              ...review,
              likeCount: response.data!.likeCount
            });
          }
          return updated;
        });
      }
    } catch (err) {
      // Revert optimistic updates on error
      setLikedReviews(prev => {
        const updated = new Set(prev);
        if (likedReviews.has(reviewId)) {
          updated.add(reviewId);
        } else {
          updated.delete(reviewId);
        }
        return updated;
      });

      setError('Failed to update like status');
      console.error('Error toggling like:', err);
    }
  };

  // Add a new comment
  const addNewComment = async (
    userId: number, 
    reviewId: number, 
    content: string,
    parentId?: number
  ): Promise<void> => {
    if (!userId) {
      setError('You must be logged in to comment');
      return;
    }

    setError(null);

    try {
      const response = await addComment(userId, reviewId, content, parentId);
      
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to add comment');
      }

      const newComment = response.data;
      
      // Update comments cache
      setComments(prev => {
        const updated = new Map(prev);
        const reviewComments = updated.get(reviewId) || [];
        
        if (parentId) {
          // Add reply to parent comment
          const updatedComments = reviewComments.map(comment => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newComment]
              };
            }
            return comment;
          });
          updated.set(reviewId, updatedComments);
        } else {
          // Add as top-level comment
          updated.set(reviewId, [newComment, ...reviewComments]);
        }
        
        return updated;
      });

      // Update review comment count
      setReviews(prev => {
        const updated = new Map(prev);
        const review = updated.get(reviewId);
        if (review) {
          updated.set(reviewId, {
            ...review,
            commentCount: (review.commentCount || 0) + 1
          });
        }
        return updated;
      });
    } catch (err) {
      setError('Failed to add comment');
      console.error('Error adding comment:', err);
    }
  };

  const value = {
    reviews,
    comments,
    likedReviews,
    isLoadingReview,
    isLoadingComments,
    error,
    getReviewById,
    getCommentsById,
    toggleLike,
    addNewComment
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
};

export const useReviewContext = (): ReviewContextType => {
  const context = useContext(ReviewContext);
  if (context === undefined) {
    throw new Error('useReviewContext must be used within a ReviewProvider');
  }
  return context;
};