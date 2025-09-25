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
    hoverBorder: 'hover:border-purple-500/70 hover:border-2',
    accent: 'text-purple-400',
    gradient: 'from-purple-600 to-purple-800',
    background: 'bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-purple-900/10'
  },
  green: {
    border: 'border-green-800/30',
    hoverBorder: 'hover:border-green-500/70 hover:border-2',
    accent: 'text-green-400',
    gradient: 'from-green-600 to-green-800',
    background: 'bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-green-900/10'
  },
  orange: {
    border: 'border-orange-500/50',
    hoverBorder: 'hover:border-orange-400',
    accent: 'text-orange-400',
    gradient: 'from-orange-600 to-orange-800',
    background: 'bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-orange-900/10'
  },
  blue: {
    border: 'border-blue-800/30',
    hoverBorder: 'hover:border-blue-500/70 hover:border-2',
    accent: 'text-blue-400',
    gradient: 'from-blue-600 to-blue-800',
    background: 'bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-blue-900/10'
  },
  red: {
    border: 'border-red-500/50',
    hoverBorder: 'hover:border-red-400',
    accent: 'text-red-400',
    gradient: 'from-red-600 to-red-800',
    background: 'bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-red-900/10'
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
        block p-4 md:p-8 bg-gray-900/95 border ${themeStyles.border}
        rounded-lg ${themeStyles.hoverBorder} transition-all duration-300
        ${className}
      `}
    >
      {/* Card content with responsive layout */}
      <div className="relative">
        {/* MOBILE LAYOUT (default) */}
        <div className="md:hidden">
          {/* Row 1: Avatar + Author */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="group/avatar cursor-pointer flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/user/${review.userId}`);
              }}
            >
              {review.authorAvatar ? (
                <img
                  src={review.authorAvatar}
                  alt={review.author}
                  className="w-12 h-12 rounded-full object-cover border-2 border-gray-600
                    transition-all duration-300 group-hover/avatar:border-gray-400
                    group-hover/avatar:scale-110"
                />
              ) : (
                <div className={`
                  w-12 h-12 rounded-full border-2 border-gray-600
                  bg-gradient-to-br ${themeStyles.gradient}
                  flex items-center justify-center font-bold text-white text-lg
                  transition-all duration-300 group-hover/avatar:border-gray-400
                  group-hover/avatar:scale-110
                `}>
                  {getUserInitial(review.author)}
                </div>
              )}
            </div>
            <div>
              <span
                className="font-semibold text-white hover:text-purple-400 cursor-pointer transition-colors duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/user/${review.userId}`);
                }}
              >
                {review.author}
              </span>
              <div className="text-sm text-gray-400">{getRelativeTime(review.date)}</div>
            </div>
          </div>

          {/* Row 2: Game Title with wrapping for cover + Separator */}
          {showGameTitle && review.gameTitle && (
            <div className="relative">
              {/* Right-side content stack: Rating + Cover */}
              <div className="absolute right-0 -bottom-20 z-10 w-20">
                {/* Rating badge */}
                <div className="flex justify-center mb-2">
                  <div className="bg-yellow-400 text-gray-900 px-2 py-1 rounded-md font-bold text-sm">
                    {review.rating === 10 ? '10' : (review.rating || 0).toFixed(1)}/10
                  </div>
                </div>

                {/* Game cover */}
                {review.gameCoverUrl && (
                  <img
                    src={review.gameCoverUrl}
                    alt={review.gameTitle}
                    className="w-20 h-28 object-cover rounded shadow-lg"
                    loading="lazy"
                  />
                )}
              </div>

              {/* Game Title - wraps around cover if needed */}
              <div className="mb-2 text-center pr-24">
                <span className="text-gray-300 font-medium">
                  {review.gameTitle}
                </span>
              </div>

              {/* Separator line */}
              <div className="h-px bg-gradient-to-r from-transparent from-1% via-gray-600 to-transparent to-99%"></div>
            </div>
          )}

          {/* Row 3: Review Text */}
          <div className="relative">
            <div className="flex-1 pt-2 pr-24">
              {/* Review Text - with padding to avoid cover */}
              {review.hasText && (
                <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">
                  {escapeHtml(truncateText(review.text, 144))}
                </p>
              )}
            </div>
          </div>

          {/* Review Interactions */}
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
            className="mt-2"
            reviewAuthorId={parseInt(review.userId)}
            currentUserId={currentUserId}
            disableCommentHover={true}
            disableComments={true}
          />
        </div>

        {/* DESKTOP LAYOUT */}
        <div className="hidden md:block">
          <div className="flex items-start gap-4">
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
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-600
                      transition-all duration-300 group-hover/avatar:border-gray-400
                      group-hover/avatar:scale-110"
                  />
                ) : (
                  <div className={`
                    w-16 h-16 rounded-full border-2 border-gray-600
                    bg-gradient-to-br ${themeStyles.gradient}
                    flex items-center justify-center font-bold text-white text-xl
                    transition-all duration-300 group-hover/avatar:border-gray-400
                    group-hover/avatar:scale-110
                  `}>
                    {getUserInitial(review.author)}
                  </div>
                )}
              </div>
            </div>

            {/* Review Content */}
            <div className="flex-1 min-w-0">
              {/* Row 1: Author */}
              <div className="mb-2">
                <span
                  className="font-semibold text-white cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/user/${review.userId}`);
                  }}
                >
                  {review.author}
                </span>
              </div>

              {/* Row 2: Date (rating moved to bottom) */}
              <div className="mb-2 text-sm">
                <span className="text-gray-400">{getRelativeTime(review.date)}</span>
              </div>

              {/* Row 3: Game Title */}
              {showGameTitle && review.gameTitle && (
                <div className="mb-2">
                  <span className="text-gray-300 font-medium">
                    {review.gameTitle}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Separator and Cover Container */}
          {showGameTitle && review.gameTitle && (
            <div className="relative">
              {/* Right-side content stack: Rating + Cover */}
              <div className="absolute right-0 -top-20 z-10 w-20">
                {/* Rating badge */}
                <div className="flex justify-center mb-2">
                  <div className="bg-yellow-400 text-gray-900 px-2 py-1 rounded-md font-bold text-sm">
                    {review.rating === 10 ? '10' : (review.rating || 0).toFixed(1)}/10
                  </div>
                </div>

                {/* Game cover */}
                {review.gameCoverUrl && (
                  <img
                    src={review.gameCoverUrl}
                    alt={review.gameTitle}
                    className={`
                      object-cover rounded shadow-lg
                      ${compact ? 'w-16 h-20' : 'w-20 h-28'}
                    `}
                    loading="lazy"
                  />
                )}
              </div>

              {/* Full-width separator */}
              <div className="h-px bg-gradient-to-r from-transparent from-1% via-gray-600 to-transparent to-99%"></div>
            </div>
          )}

          {/* Row 4: Review Text */}
          <div className="relative">
            <div className="flex-1 pt-2 pr-24">
              {/* Review Text - with padding to avoid cover */}
              {review.hasText && (
                <p className="text-base text-gray-400 leading-relaxed whitespace-pre-line">
                  {escapeHtml(truncateText(review.text, 144))}
                </p>
              )}
            </div>
          </div>

          {/* Review Interactions */}
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
