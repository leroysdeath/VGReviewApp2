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
    border: 'border-purple-800/30',
    hoverBorder: 'hover:border-purple-500/70',
    accent: 'text-purple-400',
    gradient: 'from-purple-600 to-purple-800',
    // Removed theme-specific background - using consistent gradient for all cards
  },
  green: {
    border: 'border-green-800/30',
    hoverBorder: 'hover:border-green-500/70',
    accent: 'text-green-400',
    gradient: 'from-green-600 to-green-800',
    // Removed theme-specific background - using consistent gradient for all cards
  },
  orange: {
    border: 'border-orange-500/50',
    hoverBorder: 'hover:border-orange-400',
    accent: 'text-orange-400',
    gradient: 'from-orange-600 to-orange-800',
    // Removed theme-specific background - using consistent gradient for all cards
  },
  blue: {
    border: 'border-blue-800/30',
    hoverBorder: 'hover:border-blue-500/70',
    accent: 'text-blue-400',
    gradient: 'from-blue-600 to-blue-800',
    // Removed theme-specific background - using consistent gradient for all cards
  },
  red: {
    border: 'border-red-500/50',
    hoverBorder: 'hover:border-red-400',
    accent: 'text-red-400',
    gradient: 'from-red-600 to-red-800',
    // Removed theme-specific background - using consistent gradient for all cards
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

  // Helper function to get rating badge color classes
  const getRatingColorClasses = (rating: number): string => {
    if (rating <= 3) return 'bg-red-500 text-white';
    if (rating <= 5) return 'bg-orange-500 text-white';
    if (rating <= 7) return 'bg-yellow-400 text-gray-700';
    if (rating <= 9.5) return 'bg-green-500 text-white';
    return 'bg-blue-500 text-white';
  };
  
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
        block p-4 md:p-6 bg-gradient-to-br from-gray-900/80 to-gray-800/70 border ${themeStyles.border}
        rounded-lg ${themeStyles.hoverBorder} transition-all duration-300
        shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30
        ${className}
      `}
    >
      {/* Card content with unified grid layout */}
      <div className="relative">
          <div className="grid grid-cols-[auto,1fr,auto] grid-rows-[auto,auto,auto,1px,auto] gap-x-2 md:gap-x-4">
            {/* Avatar (spans rows 1-4) */}
            <div className="row-start-1 row-span-4 col-start-1">
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
                    className="w-10 h-10 md:w-16 md:h-16 rounded-full object-cover ring-2 ring-gray-700/50 ring-offset-1 md:ring-offset-2 ring-offset-gray-900
                      transition-all duration-300 group-hover/avatar:ring-gray-500"
                  />
                ) : (
                  <div className={`
                    w-10 h-10 md:w-16 md:h-16 rounded-full ring-2 ring-gray-700/50 ring-offset-1 md:ring-offset-2 ring-offset-gray-900
                    bg-gradient-to-br ${themeStyles.gradient}
                    flex items-center justify-center font-bold text-white text-base md:text-xl
                    transition-all duration-300 group-hover/avatar:ring-gray-500
                  `}>
                    {getUserInitial(review.author)}
                  </div>
                )}
              </div>
            </div>

            {/* Row 1: Username (column 2) */}
            <div className="row-start-1 col-start-2 mb-1">
              <span
                className="font-medium md:font-semibold text-white text-sm md:text-base cursor-pointer hover:text-purple-400 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/user/${review.userId}`);
                }}
              >
                {review.author}
              </span>
            </div>

            {/* Game Cover + Rating (column 3, spans rows 2-4) */}
            {showGameTitle && (review.gameCoverUrl || review.rating) && (
              <div className="row-start-2 row-span-3 col-start-3 flex flex-col items-center justify-center">
                {/* Game cover */}
                {review.gameCoverUrl && (
                  <img
                    src={review.gameCoverUrl}
                    alt={review.gameTitle}
                    className={`
                      object-cover rounded shadow-lg
                      ${compact ? 'w-14 h-20 md:w-16' : 'w-16 h-24 md:w-20 md:h-28'}
                    `}
                    loading="lazy"
                  />
                )}

                {/* Rating badge */}
                {review.rating && (
                  <div className="mt-2">
                    <div className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded-md font-bold text-xs md:text-sm ${getRatingColorClasses(review.rating)}`}>
                      {review.rating === 10 ? '10' : review.rating.toFixed(1)}/10
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Row 2: Date (column 2) */}
            <div className="row-start-2 col-start-2 text-xs md:text-sm text-gray-400 mb-1 md:mb-2">
              {getRelativeTime(review.date)}
            </div>

            {/* Row 3: Game Title (column 2) */}
            {showGameTitle && review.gameTitle && (
              <div className="row-start-3 col-start-2 text-gray-300 text-sm md:text-base font-medium mb-1 md:mb-2">
                {review.gameTitle}
              </div>
            )}

            {/* Row 4: Separator (spans all columns) */}
            {showGameTitle && (
              <div className="row-start-4 col-start-1 col-span-3 h-px bg-gradient-to-r from-transparent from-1% via-gray-600 to-transparent to-99% mb-2 md:mb-3"></div>
            )}

            {/* Row 5: Review Text (spans all columns) */}
            {review.hasText && (
              <div className="row-start-5 col-start-1 col-span-3 relative">
                <p
                  className="text-sm md:text-base text-gray-400 leading-relaxed whitespace-pre-line overflow-hidden"
                  style={{
                    height: '3.75rem', // 2.5 lines - consistent for both mobile and desktop
                    maxHeight: '3.75rem'
                  }}
                >
                  {escapeHtml(truncateText(review.text, 144))}
                </p>
                {/* Gradient fade overlay */}
                <div
                  className="absolute bottom-0 left-0 right-0 pointer-events-none"
                  style={{
                    height: '0.375rem',
                    background: 'linear-gradient(to bottom, transparent 0%, rgba(17, 24, 39, 0.9) 100%)'
                  }}
                />
              </div>
            )}
          </div>

          {/* Review Interactions (outside grid) */}
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
            className="mt-2 md:mt-3"
            reviewAuthorId={parseInt(review.userId)}
            currentUserId={currentUserId}
            disableCommentHover={true}
            disableComments={true}
          />
      </div>

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
