import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  Star, 
  ThumbsUp, 
  Reply, 
  Clock, 
  AlertCircle,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { getUserActivities } from '../services/activityService';

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
  userId?: string;
  initialActivities?: Activity[];
  isLoading?: boolean;
  error?: string;
  pageSize?: number;
  className?: string;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  userId,
  initialActivities = [],
  isLoading: initialLoading = false,
  error: initialError = null,
  pageSize = 10,
  className = ''
}) => {
  const [activities, setActivities] = useState<Activity[]>(initialActivities);
  const [loading, setLoading] = useState<boolean>(initialLoading);
  const [error, setError] = useState<string | null>(initialError);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

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
        return <MessageSquare className="h-5 w-5 text-[#7289DA]" />;
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

  // Load more activities
  const loadMoreActivities = useCallback(async () => {
    if (!userId || loading || !hasMore) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const offset = page * pageSize;
      const response = await getUserActivities(parseInt(userId), { limit: pageSize, offset });
      
      if (response.success && response.data) {
        // Transform data to match our Activity interface
        const newActivities = response.data.map((item: any): Activity => ({
          id: item.id.toString(),
          type: item.type as ActivityType,
          timestamp: item.timestamp,
          user: {
            id: item.user?.id.toString() || '',
            name: item.user?.name || 'Unknown User',
            avatar: item.user?.picurl
          },
          game: item.game ? {
            id: item.game.id.toString(),
            title: item.game.name,
            coverImage: item.game.pic_url
          } : undefined,
          review: item.review ? {
            id: item.review.id.toString(),
            rating: item.review.rating,
            content: item.review.review || ''
          } : undefined,
          comment: item.comment ? {
            id: item.comment.id.toString(),
            content: item.comment.content,
            parentId: item.comment.parent_id?.toString()
          } : undefined
        }));
        
        setActivities(prev => [...prev, ...newActivities]);
        setPage(prev => prev + 1);
        setHasMore(newActivities.length === pageSize && (!response.count || offset + pageSize < response.count));
      } else {
        setError(response.error || 'Failed to load activities');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while loading activities');
    } finally {
      setLoading(false);
    }
  }, [userId, loading, hasMore, page, pageSize]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (loading) return;
    
    if (observer.current) observer.current.disconnect();
    
    const callback = (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreActivities();
      }
    };
    
    observer.current = new IntersectionObserver(callback, { rootMargin: '100px' });
    
    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }
  }, [loading, hasMore, loadMoreActivities]);

  // Initial load
  useEffect(() => {
    if (userId && activities.length === 0 && !initialActivities.length) {
      loadMoreActivities();
    }
  }, [userId, activities.length, initialActivities.length, loadMoreActivities]);

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
                  <span className="text-white font-medium">{activity.review.rating.toFixed(1)}</span>
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

  // Empty state
  if (activities.length === 0 && !loading && !error) {
    return (
      <div className={`bg-[#121212] rounded-lg p-6 text-center ${className}`}>
        <Clock className="h-12 w-12 text-[#7289DA] mx-auto mb-4" />
        <h3 className="text-white text-lg font-medium mb-2">No Activity Yet</h3>
        <p className="text-[#B3B3B3]">
          Activities will appear here once you start interacting with games, reviews, and comments.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`} aria-label="Activity feed">
      {/* Error message */}
      {error && (
        <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
          <button
            onClick={() => {
              setError(null);
              loadMoreActivities();
            }}
            className="mt-2 px-4 py-2 bg-red-800/50 text-white rounded-lg hover:bg-red-700/50 transition-colors text-sm"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Activities list */}
      <div className="space-y-4">
        {activities.map((activity) => (
          <div 
            key={activity.id}
            className="bg-[#1E1E1E] rounded-lg p-4 hover:bg-[#2A2A2A] transition-colors duration-200"
            aria-label={`${activity.user.name}'s ${activity.type} activity`}
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
      {loading && (
        <div className="flex justify-center items-center py-4">
          <RefreshCw className="h-6 w-6 text-[#7289DA] animate-spin" />
          <span className="ml-2 text-[#B3B3B3]">Loading activities...</span>
        </div>
      )}

      {/* Load more trigger */}
      {hasMore && !loading && (
        <div 
          ref={loadingRef}
          className="flex justify-center items-center py-4 cursor-pointer hover:bg-[#1E1E1E] rounded-lg transition-colors"
          onClick={loadMoreActivities}
        >
          <ChevronDown className="h-5 w-5 text-[#7289DA]" />
          <span className="ml-2 text-[#B3B3B3]">Load more</span>
        </div>
      )}

      {/* End of feed message */}
      {!hasMore && activities.length > 0 && (
        <div className="text-center py-4 text-[#B3B3B3] text-sm">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
};