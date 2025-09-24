import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageSquare } from 'lucide-react';
import { ReviewInteractions } from './ReviewInteractions';
import { useReviewInteractions } from '../hooks/useReviewInteractions';
import { escapeHtml } from '../utils/sanitize';
import { getRelativeTime } from '../utils/dateUtils';

// TypeScript interfaces for review data
export interface ReviewData {
  id: string;
  userId: string;
  gameId: string;
  igdbGameId?: string; // IGDB game ID for proper routing
  gameTitle: string;
  gameCoverUrl?: string; // Game cover image URL
  rating: number;
  text: string;
  date: string;
  hasText: boolean;
  author: string;
  authorAvatar: string;
  likeCount?: number;
  commentCount?: number;
  theme?: 'purple' | 'green' | 'orange' | 'blue' | 'red';
}

interface ReviewCardProps {
  review: ReviewData;
  compact?: boolean;
  showGameTitle?: boolean;
  className?: string;
  currentUserId?: number;
}

// Theme configurations for border colors and backgrounds
const themeConfig = {
  purple: {
    border: 'border-gray-700/60',
    hoverBorder: 'hover:border-purple-700/50',
    accent: 'text-purple-400',
    gradient: 'from-purple-600 to-purple-800',
    background: 'bg-gradient-to-br from-gray-900/90 via-purple-900/10 to-gray-800/80'
  },
  green: {
    border: 'border-gray-700/60',
    hoverBorder: 'hover:border-green-700/50',
    accent: 'text-green-400',
    gradient: 'from-green-600 to-green-800',
    background: 'bg-gradient-to-br from-gray-900/90 via-green-900/10 to-gray-800/80'
  },
  orange: {
    border: 'border-orange-500/50',
    hoverBorder: 'hover:border-orange-400',
    accent: 'text-orange-400',
    gradient: 'from-orange-600 to-orange-800',
    background: 'bg-gradient-to-br from-gray-900/90 via-orange-900/10 to-gray-800/80'
  },
  blue: {
    border: 'border-gray-700/60',
    hoverBorder: 'hover:border-blue-700/50',
    accent: 'text-blue-400',
    gradient: 'from-blue-600 to-blue-800',
    background: 'bg-gradient-to-br from-gray-900/90 via-blue-900/10 to-gray-800/80'
  },
  red: {
    border: 'border-red-500/50',
    hoverBorder: 'hover:border-red-400',
    accent: 'text-red-400',
    gradient: 'from-red-600 to-red-800',
    background: 'bg-gradient-to-br from-gray-900/90 via-red-900/10 to-gray-800/80'
  }
};

const ReviewCardComponent: React.FC<ReviewCardProps> = ({ 
  review, 
  compact = false, 
  showGameTitle = true,
  className = '',
  currentUserId
}) => {
  const navigate = useNavigate();
  const theme = review.theme || 'purple';
  const themeStyles = themeConfig[theme];
  
  // Use the review interactions hook
  const {
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
    toggleCommentLike,
    likingCommentId
  } = useReviewInteractions({
    reviewId: parseInt(review.id),
    userId: currentUserId
  });

  // Generate user initial from username
  const getUserInitial = (username: string): string => {
    return username.charAt(0).toUpperCase();
  };

  // Split game title at colon for better formatting
  const splitGameTitle = (title: string) => {
    const colonIndex = title.indexOf(':');
    if (colonIndex !== -1) {
      return {
        firstPart: title.substring(0, colonIndex + 1),
        secondPart: title.substring(colonIndex + 1).trim()
      };
    }
    return { firstPart: title, secondPart: null };
  };


  // Truncate review text for compact view
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  // Generate and validate review URL
  const generateReviewUrl = (review: ReviewData): string => {
    const userId = review.userId;
    const gameId = review.igdbGameId || review.gameId;
    
    // Validate components
    if (!userId || !gameId) {
      console.error('❌ Invalid URL components:', { userId, gameId, review });
      return '/search'; // Fallback to search page
    }
    
    const url = `/review/${userId}/${gameId}`;
    
    return url;
  };

  const reviewUrl = generateReviewUrl(review);

  return (
    <Link
      to={reviewUrl}
      className={`
        group relative overflow-hidden rounded-lg border block
        ${themeStyles.background} backdrop-blur-lg
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-2xl hover:shadow-gray-900/50
        ${themeStyles.border} ${themeStyles.hoverBorder}
        ${compact ? 'p-4' : 'p-6'}
        ${className}
      `}
    >
      {/* Card content */}
      <div className="relative flex items-start gap-4">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          <div 
            className="group/avatar cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/user/${review.userId}`);
            }}
          >
            {review.authorAvatar ? (
              <img
                src={review.authorAvatar}
                alt={review.author}
                className={`
                  rounded-full object-cover border-2 border-gray-600
                  transition-all duration-300 group-hover/avatar:border-gray-400
                  group-hover/avatar:scale-110
                  ${compact ? 'w-10 h-10' : 'w-12 h-12'}
                `}
              />
            ) : (
              <div className={`
                rounded-full border-2 border-gray-600
                bg-gradient-to-br ${themeStyles.gradient}
                flex items-center justify-center font-bold text-white
                transition-all duration-300 group-hover/avatar:border-gray-400
                group-hover/avatar:scale-110
                ${compact ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-lg'}
              `}>
                {getUserInitial(review.author)}
              </div>
            )}
          </div>
        </div>

        {/* Review Content */}
        <div className="flex-1 min-w-0 relative">
          {/* Game Cover Image - positioned on the right */}
          {showGameTitle && review.gameTitle && review.gameCoverUrl && (
            <div className={`
              float-right ml-4 mb-4 flex-shrink-0
              ${compact ? 'w-16' : 'w-20'}
            `}>
              <img
                src={review.gameCoverUrl}
                alt={review.gameTitle}
                className={`
                  w-full object-cover rounded
                  ${compact ? 'w-16 h-20' : 'w-20 h-28'}
                `}
                loading="lazy"
              />
            </div>
          )}

          {/* Header with username and game title */}
          <div className="mb-3">
            <span
              className={`
                font-semibold transition-colors duration-300 cursor-pointer
                text-white hover:${themeStyles.accent.replace('text-', 'text-')}
                ${compact ? 'text-sm' : 'text-base'}
              `}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user/${review.userId}`);
              }}
            >
              {review.author}
            </span>
            
            {showGameTitle && review.gameTitle && (
              <div className={`${compact ? 'text-xs' : 'text-sm'} text-gray-400 mt-1`}>
                reviewed{' '}
                <span className="text-gray-300 font-medium">
                  {review.gameTitle}
                </span>
                
                {/* Date and Rating */}
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center text-gray-500">
                    <span className={`${compact ? 'text-xs' : 'text-sm'}`}>
                      {getRelativeTime(review.date)}
                    </span>
                  </div>
                  <span className="text-yellow-400 font-semibold">
                    {review.rating === 10 ? '10' : (review.rating || 0).toFixed(1)}/10
                  </span>
                </div>
              </div>
            )}
            
            {/* Date and Rating for when no game title is shown */}
            {!showGameTitle || !review.gameTitle ? (
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center text-gray-500">
                  <span className={`${compact ? 'text-xs' : 'text-sm'}`}>
                    {getRelativeTime(review.date)}
                  </span>
                </div>
                <span className="text-yellow-400 font-semibold">
                  {review.rating === 10 ? '10' : (review.rating || 0).toFixed(1)}/10
                </span>
              </div>
            ) : null}
          </div>

          {/* Review Text - wraps around the floated image */}
          {review.hasText && (
            <p className={`
              text-gray-300 leading-relaxed mb-4 transition-colors duration-300
              group-hover:text-gray-200 whitespace-pre-line line-clamp-3
              ${compact ? 'text-sm' : 'text-base'}
            `}>
              {escapeHtml(truncateText(review.text, 144))}
            </p>
          )}

          {/* Clear float to ensure interactions appear below */}
          <div className="clear-both"></div>

          {/* Review Interactions - now shown for both compact and full modes */}
          <ReviewInteractions
            reviewId={review.id}
            initialLikeCount={review.likeCount || likeCount}
            initialCommentCount={review.commentCount || commentCount}
            isLiked={isLiked}
            onLike={toggleLike}
            onUnlike={toggleLike}
            comments={comments}
            onAddComment={postComment}
            onEditComment={updateComment}
            onDeleteComment={removeComment}
            onLikeComment={toggleCommentLike}
            onUnlikeComment={toggleCommentLike}
            isLoadingComments={isLoadingComments}
            isLoadingLike={isLoadingLike}
            isLikingComment={false}
            likingCommentId={likingCommentId}
            error={error || undefined}
            className="mt-3"
            reviewAuthorId={parseInt(review.userId)}
            currentUserId={currentUserId}
            disableCommentHover={true}
            disableComments={true}
          />
        </div>
      </div>

      {/* Hover glow effect */}
      <div className={`
        absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
        transition-opacity duration-500 pointer-events-none -z-10
        bg-gradient-to-r ${themeStyles.gradient} blur-xl
      `} />
    </Link>
  );
};

// Memoized version with custom comparison for performance
export const ReviewCard = React.memo(ReviewCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.review.id === nextProps.review.id &&
    prevProps.review.likeCount === nextProps.review.likeCount &&
    prevProps.review.commentCount === nextProps.review.commentCount &&
    prevProps.review.text === nextProps.review.text &&
    prevProps.review.rating === nextProps.review.rating &&
    prevProps.compact === nextProps.compact &&
    prevProps.showGameTitle === nextProps.showGameTitle &&
    prevProps.className === nextProps.className &&
    prevProps.currentUserId === nextProps.currentUserId
  );
});
