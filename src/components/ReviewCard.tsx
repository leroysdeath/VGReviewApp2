import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ThumbsUp, ThumbsDown, Calendar, Star } from 'lucide-react';
import { StarRating } from './StarRating';

// TypeScript interfaces for review data
export interface ReviewData {
  id: string;
  userId: string;
  gameId: string;
  gameTitle: string;
  rating: number;
  text: string;
  date: string;
  hasText: boolean;
  author: string;
  authorAvatar: string;
  theme?: 'purple' | 'green' | 'orange' | 'blue' | 'red';
}

interface ReviewCardProps {
  review: ReviewData;
  compact?: boolean;
  showGameTitle?: boolean;
  className?: string;
}

// Theme configurations for border colors
const themeConfig = {
  purple: {
    border: 'border-purple-500/50',
    hoverBorder: 'hover:border-purple-400',
    accent: 'text-purple-400',
    gradient: 'from-purple-600 to-purple-800'
  },
  green: {
    border: 'border-green-500/50',
    hoverBorder: 'hover:border-green-400',
    accent: 'text-green-400',
    gradient: 'from-green-600 to-green-800'
  },
  orange: {
    border: 'border-orange-500/50',
    hoverBorder: 'hover:border-orange-400',
    accent: 'text-orange-400',
    gradient: 'from-orange-600 to-orange-800'
  },
  blue: {
    border: 'border-blue-500/50',
    hoverBorder: 'hover:border-blue-400',
    accent: 'text-blue-400',
    gradient: 'from-blue-600 to-blue-800'
  },
  red: {
    border: 'border-red-500/50',
    hoverBorder: 'hover:border-red-400',
    accent: 'text-red-400',
    gradient: 'from-red-600 to-red-800'
  }
};

export const ReviewCard: React.FC<ReviewCardProps> = ({ 
  review, 
  compact = false, 
  showGameTitle = true,
  className = ''
}) => {
  const theme = review.theme || 'purple';
  const themeStyles = themeConfig[theme];

  // Generate user initial from username
  const getUserInitial = (username: string): string => {
    return username.charAt(0).toUpperCase();
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Truncate review text for compact view
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  return (
    <div className={`
      group relative overflow-hidden rounded-xl border-2 
      bg-gray-900/80 backdrop-blur-lg
      transition-all duration-500 ease-out
      hover:scale-[1.02] hover:shadow-2xl hover:shadow-gray-900/50
      ${themeStyles.border} ${themeStyles.hoverBorder}
      ${compact ? 'p-4' : 'p-6'}
      ${className}
    `}>
      {/* Background gradient overlay on hover */}
      <div className={`
        absolute inset-0 opacity-0 group-hover:opacity-10 
        bg-gradient-to-br ${themeStyles.gradient}
        transition-opacity duration-500 pointer-events-none
      `} />

      {/* Card content */}
      <div className="relative flex items-start gap-4">
        {/* User Avatar */}
        <div className="flex-shrink-0">
          <Link to={`/user/${review.userId}`} className="group/avatar">
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
          </Link>
        </div>

        {/* Review Content */}
        <div className="flex-1 min-w-0">
          {/* Header with username and game title */}
          <div className="mb-3">
            <Link
              to={`/user/${review.userId}`}
              className={`
                font-semibold transition-colors duration-300
                text-white hover:${themeStyles.accent.replace('text-', 'text-')}
                ${compact ? 'text-sm' : 'text-base'}
              `}
            >
              {review.author}
            </Link>
            
            {showGameTitle && review.gameTitle && (
              <div className={`${compact ? 'text-xs' : 'text-sm'} text-gray-400 mt-1`}>
                reviewed <span className="text-gray-300 font-medium">{review.gameTitle}</span>
              </div>
            )}
          </div>

          {/* Rating and Date */}
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-2">
              <StarRating rating={review.rating} size={compact ? 'sm' : 'md'} />
              <span className={`
                font-bold transition-colors duration-300
                ${themeStyles.accent} group-hover:text-white
                ${compact ? 'text-sm' : 'text-base'}
              `}>
                {review.rating.toFixed(1)}/10
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-gray-500">
              <Calendar className={`${compact ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <span className={`${compact ? 'text-xs' : 'text-sm'}`}>
                {formatDate(review.date)}
              </span>
            </div>
          </div>

          {/* Review Text */}
          {review.hasText && (
            <p className={`
              text-gray-300 leading-relaxed mb-4 transition-colors duration-300
              group-hover:text-gray-200
              ${compact ? 'text-sm' : 'text-base'}
            `}>
              {compact ? truncateText(review.text, 120) : review.text}
            </p>
          )}

          {/* Action Buttons (only show in non-compact mode) */}
          {!compact && review.hasText && (
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <button className="flex items-center gap-1 hover:text-green-400 transition-colors">
                <ThumbsUp className="h-4 w-4" />
                <span>Helpful</span>
              </button>
              <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                <ThumbsDown className="h-4 w-4" />
                <span>Not helpful</span>
              </button>
              <button className={`flex items-center gap-1 hover:${themeStyles.accent.replace('text-', 'text-')} transition-colors`}>
                <MessageCircle className="h-4 w-4" />
                <span>Discuss</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hover glow effect */}
      <div className={`
        absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100
        transition-opacity duration-500 pointer-events-none -z-10
        bg-gradient-to-r ${themeStyles.gradient} blur-xl
      `} />
    </div>
  );
};