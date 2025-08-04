import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Star, 
  ThumbsUp, 
  Reply, 
  Clock, 
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Bell,
  CheckCheck,
  ArrowUp
} from 'lucide-react';
import { useSwipeable } from 'react-swipeable';
import { useRef, useEffect, useState } from 'react';
import { useNotificationStore } from '../store/notificationStore';

// Activity types
export type ActivityType = 'review' | 'review_like' | 'comment' | 'comment_like' | 'comment_reply';

// Activity interface
export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  targetUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  game?: {
    id: string;
    title: string;
    coverImage?: string;
  };
  review?: {
    id: string;
    rating: number;
    content: string;
  };
  comment?: {
    id: string;
    content: string;
    parentId?: string;
  };
}

interface ActivityFeedProps {
  activities?: Activity[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  showNotificationControls?: boolean;
  userId?: string;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities = [],
  isLoading = false,
  error = null,
  onRetry,
  onLoadMore,
  hasMore = false,
  showNotificationControls = false,
  userId,
  className = '',
}) => {
  const { unreadCount, markAllAsRead } = useNotificationStore();
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const navigate = useNavigate();
  
  // Set up swipe handlers for pull-to-refresh and item actions
  const swipeHandlers = useSwipeable({
    onSwiped: (eventData) => {
      if (eventData.dir === 'down' && eventData.velocity > 0.5 && eventData.initial[1] < 100) {
        // Pull-to-refresh gesture detected
        if (onRetry) {
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
          onRetry();
        }
      }
    },
    preventScrollOnSwipe: false,
    trackMouse: false,
    trackTouch: true,
  });
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (index < activities.length - 1) {
          setFocusedItemIndex(index + 1);
          itemRefs.current[index + 1]?.focus();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (index > 0) {
          setFocusedItemIndex(index - 1);
          itemRefs.current[index - 1]?.focus();
        }
        break;
      case 'Enter':
      case ' ': // Space key
        e.preventDefault();
        const activity = activities[index];
        if (activity.game) {
          navigate(`/game/${activity.game.id}`);
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
        }
        break;
    }
  };
  
  // Monitor scroll position to show/hide scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      if (feedRef.current) {
        const scrollTop = feedRef.current.scrollTop;
        setShowScrollToTop(scrollTop > 300);
      }
    };
    
    const feedElement = feedRef.current;
    if (feedElement) {
      feedElement.addEventListener('scroll', handleScroll);
    }
    
    return () => {
      if (feedElement) {
        feedElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);
  
  // Scroll to top function
  const scrollToTop = () => {
    if (feedRef.current) {
      feedRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      
      // Focus on first item after scrolling
      setTimeout(() => {
        if (itemRefs.current[0]) {
          itemRefs.current[0].focus();
          setFocusedItemIndex(0);
        }
      }, 500);
      
      // Provide haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }
  };
  
  // Announce new content to screen readers
  useEffect(() => {
    if (!isLoading && activities.length > 0) {
      const newActivitiesCount = activities.length;
      const announcement = `Loaded ${newActivitiesCount} activities.`;
      
      // Create and use a live region to announce new content
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.classList.add('sr-only'); // Screen reader only
      liveRegion.textContent = announcement;
      
      document.body.appendChild(liveRegion);
      
      // Remove after announcement is made
      setTimeout(() => {
        document.body.removeChild(liveRegion);
      }, 3000);
    }
  }, [isLoading, activities.length]);
  
  // Format relative time
  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffTime / (1000 * 60));
        return diffMinutes === 0 ? 'just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  // Get activity icon based on type
  const getActivityIcon = (type: ActivityType) => {
    switch (type) {
      case 'review':
        return <Star className="h-5 w-5 text-[#7289DA]" />;
      case 'review_like':
        return <ThumbsUp className="h-5 w-5 text-[#7289DA]" />;
      case 'comment':
        return <MessageSquare className="h-5 w-5 text-[#7289DA]" />;
      case 'comment_like':
        return <ThumbsUp className="h-5 w-5 text-[#7289DA]" />;
      case 'comment_reply':
        return <Reply className="h-5 w-5 text-[#7289DA]" />;
      default:
        return <Clock className="h-5 w-5 text-[#7289DA]" />;
    }
  };

  // Render activity content based on type
  const renderActivityContent = (activity: Activity) => {
    switch (activity.type) {
      case 'review':
        return (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link 
                to={`/game/${activity.game?.id}`}
                className="font-medium text-white hover:text-[#7289DA] transition-colors"
              >
                {activity.game?.title}
              </Link>
              {activity.review && (
                <div className="flex items-center gap-1">
                  {renderStarRating(activity.review.rating)}
                  <span className="text-white font-medium">{(activity.review.rating || 0).toFixed(1)}</span>
                </div>
              )}
            </div>
            {activity.review?.content && (
              <p className="text-[#B3B3B3] line-clamp-2">
                {activity.review.content}
              </p>
            )}
          </div>
        );
        
      case 'review_like':
        return (
          <div>
            <p className="text-[#B3B3B3]">
              liked a review of{' '}
              <Link 
                to={`/game/${activity.game?.id}`}
                className="font-medium text-white hover:text-[#7289DA] transition-colors"
              >
                {activity.game?.title}
              </Link>
            </p>
            {activity.review?.content && (
              <div className="mt-2 p-3 bg-[#121212] rounded-lg">
                <p className="text-[#B3B3B3] text-sm line-clamp-2">
                  "{activity.review.content}"
                </p>
              </div>
            )}
          </div>
        );
        
      case 'comment':
        return (
          <div>
            <p className="text-[#B3B3B3]">
              commented on a review of{' '}
              <Link 
                to={`/game/${activity.game?.id}`}
                className="font-medium text-white hover:text-[#7289DA] transition-colors"
              >
                {activity.game?.title}
              </Link>
            </p>
            {activity.comment?.content && (
              <div className="mt-2 p-3 bg-[#121212] rounded-lg">
                <p className="text-[#B3B3B3] text-sm line-clamp-2">
                  {activity.comment.content}
                </p>
              </div>
            )}
          </div>
        );
        
      case 'comment_like':
        return (
          <div>
            <p className="text-[#B3B3B3]">
              liked a comment on{' '}
              <Link 
                to={`/game/${activity.game?.id}`}
                className="font-medium text-white hover:text-[#7289DA] transition-colors"
              >
                {activity.game?.title}
              </Link>
            </p>
            {activity.comment?.content && (
              <div className="mt-2 p-3 bg-[#121212] rounded-lg">
                <p className="text-[#B3B3B3] text-sm line-clamp-2">
                  "{activity.comment.content}"
                </p>
              </div>
            )}
          </div>
        );
        
      case 'comment_reply':
        return (
          <div>
            <p className="text-[#B3B3B3]">
              replied to a comment on{' '}
              <Link 
                to={`/game/${activity.game?.id}`}
                className="font-medium text-white hover:text-[#7289DA] transition-colors"
              >
                {activity.game?.title}
              </Link>
            </p>
            {activity.comment?.content && (
              <div className="mt-2 p-3 bg-[#121212] rounded-lg">
                <p className="text-[#B3B3B3] text-sm line-clamp-2">
                  {activity.comment.content}
                </p>
              </div>
            )}
          </div>
        );
        
      default:
        return (
          <p className="text-[#B3B3B3]">
            performed an activity
          </p>
        );
    }
  };

  // Render star rating
  const renderStarRating = (rating: number) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = rating % 2 >= 1;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return (
      <div className="flex items-center" aria-label={`${rating} out of 10 rating`}>
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && (
          <div className="relative">
            <Star className="h-4 w-4 text-gray-600" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-gray-600" />
        ))}
      </div>
    );
  };

  // Empty state
  if (activities.length === 0 && !isLoading && !error) {
    return (
      <div 
        className={`bg-[#1E1E1E] rounded-lg p-6 text-center ${className}`}
        role="status"
        aria-label="No activities available"
      >
        <Clock className="h-12 w-12 text-[#7289DA] mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No Activity Yet</h3>
        <p className="text-[#B3B3B3]">
          Activities will appear here once you start interacting with games, reviews, and comments.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={feedRef}
      className={`space-y-4 ${className} overflow-y-auto`} 
      role="feed"
      aria-label="Activity Timeline"
      {...swipeHandlers}
      style={{ 
        scrollBehavior: 'smooth', 
        WebkitOverflowScrolling: 'touch',
        maxHeight: '80vh'
      }}
    >
      {/* Skip link for keyboard users */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-gray-800 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>
      
      {/* Notification Controls */}
      {showNotificationControls && (
        <div 
          className="flex items-center justify-between bg-gray-800 rounded-lg p-3 mb-2"
          role="region"
          aria-label="Notification controls"
        >
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-400" />
            <span className="text-white font-medium">Activity Feed</span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          
          {unreadCount > 0 && (
            <button
              aria-label={`Mark all ${unreadCount} notifications as read`}
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg transition-colors text-sm min-h-[44px] min-w-[44px]"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div 
          className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 mb-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-4 py-2 bg-red-800/50 text-white rounded-lg hover:bg-red-700/50 transition-colors text-sm min-h-[44px] min-w-[44px]"
              aria-label="Try loading activities again"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && activities.length === 0 && (
        <div 
          className="space-y-4"
          role="status"
          aria-busy="true"
          aria-label="Loading activities"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <div 
              key={index}
              className="bg-[#1E1E1E] rounded-lg p-4 animate-pulse"
              aria-busy="true"
              aria-label="Loading activity item"
            >
              <div className="flex gap-3">
                {/* Avatar skeleton */}
                <div className="w-10 h-10 bg-[#121212] rounded-full flex-shrink-0"></div>
                
                {/* Content skeleton */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="h-4 bg-[#121212] rounded w-32"></div>
                    <div className="h-4 bg-[#121212] rounded w-16"></div>
                  </div>
                  <div className="h-4 bg-[#121212] rounded w-full mb-2"></div>
                  <div className="h-4 bg-[#121212] rounded w-3/4"></div>
                  <div className="h-16 bg-[#121212] rounded w-full mt-2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activities list */}
      <div id="main-content" className="space-y-4">
        {activities.map((activity, index) => (
          <div 
            key={activity.id}
            ref={el => itemRefs.current[index] = el}
            className={`bg-[#1E1E1E] rounded-lg p-4 hover:bg-[#2A2A2A] transition-colors duration-200 ${
              focusedItemIndex === index ? 'ring-2 ring-[#7289DA]' : ''
            }`}
            role="article"
            aria-label={`${activity.user.name}'s ${activity.type} activity from ${formatRelativeTime(activity.timestamp)}`}
            tabIndex={0}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            <div className="flex gap-3">
              {/* Activity icon */}
              <div className="w-10 h-10 bg-[#121212] rounded-full flex items-center justify-center flex-shrink-0">
                {getActivityIcon(activity.type)}
              </div>
              
              {/* Activity content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Link 
                      to={`/user/${activity.user.id}`}
                      className="font-medium text-white hover:text-[#7289DA] transition-colors"
                    >
                      {activity.user.name}
                    </Link>
                    <span className="text-[#B3B3B3] text-sm">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                  
                  {activity.game?.coverImage && (
                    <Link to={`/game/${activity.game.id}`} className="flex-shrink-0">
                      <img 
                        loading="lazy"
                        src={activity.game.coverImage} 
                        alt={activity.game.title}
                        className="w-8 h-8 rounded object-cover"
                      />
                    </Link>
                  )}
                </div>
                
                {/* Activity-specific content */}
                {renderActivityContent(activity)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Loading indicator */}
      {isLoading && activities.length > 0 && (
        <div 
          className="flex justify-center items-center py-4"
          role="status"
          aria-busy="true"
          aria-live="polite"
        >
          <RefreshCw className="h-6 w-6 text-[#7289DA] animate-spin" />
          <span className="ml-2 text-[#B3B3B3]">Loading activities...</span>
        </div>
      )}

      {/* Load more trigger */}
      {hasMore && !isLoading && onLoadMore && (
        <div 
          className="flex justify-center items-center py-4 cursor-pointer hover:bg-[#1E1E1E] rounded-lg transition-colors min-h-[44px]"
          onClick={onLoadMore}
          role="button"
          tabIndex={0}
          aria-label="Load more activities"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onLoadMore();
            }
          }}
        >
          <ChevronDown className="h-5 w-5 text-[#7289DA]" />
          <span className="ml-2 text-[#B3B3B3]">Load more</span>
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && activities.length > 0 && !isLoading && (
        <div 
          className="text-center py-4 text-[#B3B3B3] text-sm"
          role="status"
          aria-live="polite"
        >
          You've reached the end of the feed
        </div>
      )}
      
      {/* Scroll to top button */}
      {showScrollToTop && (
        <button
          className="fixed bottom-6 right-6 p-3 bg-[#7289DA] text-white rounded-full shadow-lg hover:bg-[#5a6ebd] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          onClick={scrollToTop}
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};
