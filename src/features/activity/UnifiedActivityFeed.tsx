// Unified Activity Feed Component
// Purpose: Single component consolidating features from 6 redundant components
// Replaces: ActivityFeed.tsx, OptimizedActivityFeed.tsx, VirtualizedActivityFeed.tsx, 
//           RealTimeActivityFeed.tsx, UserActivityFeed.tsx, user/ActivityFeed/index.tsx

import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Heart, MessageCircle, UserPlus, Star, Play, CheckCircle2, RefreshCw } from 'lucide-react';
import { useActivityStore } from './activityStore';
import { Activity } from './activityService';

export interface UnifiedActivityFeedProps {
  // Data source
  userId?: number;
  type?: 'all' | 'user' | 'following';
  
  // Features
  enableRealTime?: boolean;
  enableVirtualization?: boolean;
  virtualizationThreshold?: number;
  
  // Display
  variant?: 'full' | 'compact' | 'profile';
  showActions?: boolean;
  
  // Performance
  initialLimit?: number;
  pageSize?: number;
  
  // Customization
  emptyMessage?: string;
  className?: string;
}

export const UnifiedActivityFeed: React.FC<UnifiedActivityFeedProps> = ({
  userId,
  type = 'all',
  enableRealTime = false,
  enableVirtualization = true,
  virtualizationThreshold = 50,
  variant = 'full',
  showActions = true,
  initialLimit = 20,
  pageSize = 20,
  emptyMessage = 'No activities yet',
  className = ''
}) => {
  // State management
  const {
    activities,
    isLoading,
    hasMore,
    error,
    fetchActivities,
    subscribeToRealTime,
    retryFetch
  } = useActivityStore();

  // Local state for UI interactions
  const [showNewActivities, setShowNewActivities] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const listRef = useRef<List>(null);

  // Determine if virtualization should be enabled
  const shouldVirtualize = useMemo(() => {
    return enableVirtualization && activities.length >= virtualizationThreshold;
  }, [enableVirtualization, activities.length, virtualizationThreshold]);

  // Initial data fetch
  useEffect(() => {
    const fetchOptions = {
      userId: type === 'user' ? userId : undefined,
      limit: initialLimit,
      offset: 0,
      includeFollowing: type === 'following'
    };

    fetchActivities(fetchOptions);
  }, [userId, type, initialLimit, fetchActivities]);

  // Real-time subscription
  useEffect(() => {
    if (enableRealTime) {
      const unsubscribe = subscribeToRealTime(() => {
        setShowNewActivities(true);
      });

      return unsubscribe;
    }
  }, [enableRealTime, subscribeToRealTime]);

  // Scroll handling for infinite loading
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set timeout to detect scroll end
    scrollTimeoutRef.current = setTimeout(() => {
      // Scroll ended
    }, 150);

    // Load more if near bottom
    const threshold = 0.8;
    if (listRef.current) {
      const listElement = listRef.current as unknown as { _outerNode?: HTMLElement };
      const { scrollHeight, clientHeight } = listElement._outerNode || {};
      
      if (scrollHeight && clientHeight) {
        const scrollPercentage = (scrollOffset + clientHeight) / scrollHeight;
        
        if (scrollPercentage > threshold && hasMore && !isLoading) {
          const fetchOptions = {
            userId: type === 'user' ? userId : undefined,
            limit: pageSize,
            offset: activities.length,
            includeFollowing: type === 'following'
          };
          
          fetchActivities(fetchOptions);
        }
      }
    }
  }, [hasMore, isLoading, activities.length, pageSize, fetchActivities, userId, type]);

  // Item height calculation for virtualization
  const getItemHeight = useCallback((index: number) => {
    const activity = activities[index];
    if (!activity) return 120; // Default height

    // Calculate height based on content
    let height = 100; // Base height

    if (activity.reviewText && activity.reviewText.length > 100) {
      height += Math.min(60, Math.floor(activity.reviewText.length / 100) * 20);
    }

    if (variant === 'full') {
      height += 20; // Extra padding for full variant
    }

    if (variant === 'compact') {
      height -= 20; // Less padding for compact variant
    }

    return height;
  }, [activities, variant]);

  // Activity item renderer
  const renderActivityItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const activity = activities[index];
    
    if (!activity) {
      return <div style={style} className="p-4">Loading...</div>;
    }

    return (
      <div style={style}>
        <ActivityItem
          activity={activity}
          variant={variant}
        />
      </div>
    );
  }, [activities, variant]);

  // Handle new activities notification
  const handleShowNewActivities = useCallback(() => {
    setShowNewActivities(false);
    
    // Scroll to top and refresh
    if (listRef.current) {
      listRef.current.scrollTo(0);
    }

    const fetchOptions = {
      userId: type === 'user' ? userId : undefined,
      limit: initialLimit,
      offset: 0,
      includeFollowing: type === 'following'
    };

    fetchActivities(fetchOptions);
  }, [fetchActivities, userId, type, initialLimit]);

  // Error state
  if (error) {
    return (
      <div className={`activity-feed-error ${className}`}>
        <div className="text-center p-8">
          <div className="text-red-400 mb-4">
            <RefreshCw className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Failed to load activities</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={retryFetch}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (!isLoading && activities.length === 0) {
    return (
      <div className={`activity-feed-empty ${className}`}>
        <div className="text-center p-8">
          <div className="text-gray-500 mb-4">
            <MessageCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-gray-300 mb-2">{emptyMessage}</h3>
          <p className="text-gray-500">Start following users or rating games to see activities here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`activity-feed ${variant} ${className}`}>
      {/* New activities notification */}
      {showNewActivities && (
        <div className="sticky top-0 z-10 bg-purple-600 text-white px-4 py-2 text-center cursor-pointer" onClick={handleShowNewActivities}>
          <span className="text-sm">New activities available - Click to refresh</span>
        </div>
      )}

      {/* Activity list */}
      {shouldVirtualize ? (
        <div className="flex-1 min-h-0">
          <AutoSizer>
            {({ height, width }) => (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={activities.length}
                itemSize={getItemHeight}
                onScroll={handleScroll}
                overscanCount={5}
              >
                {renderActivityItem}
              </List>
            )}
          </AutoSizer>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <ActivityItem
              key={activity.activityId}
              activity={activity}
              variant={variant}
              showActions={showActions}
            />
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="text-center p-4">
          <RefreshCw className="h-6 w-6 mx-auto animate-spin text-purple-400" />
          <p className="text-gray-400 mt-2">Loading activities...</p>
        </div>
      )}

      {/* End of feed indicator */}
      {!hasMore && activities.length > 0 && (
        <div className="text-center p-4">
          <p className="text-gray-500 text-sm">You've reached the end of the feed</p>
        </div>
      )}
    </div>
  );
};

// Individual activity item component
const ActivityItem: React.FC<{
  activity: Activity;
  variant: 'full' | 'compact' | 'profile';
  showActions?: boolean;
}> = ({ activity, variant }) => {
  const getActivityIcon = () => {
    switch (activity.activityType) {
      case 'rating':
        return <Star className="h-5 w-5 text-yellow-400" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-400" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-green-400" />;
      case 'like_rating':
      case 'like_comment':
        return <Heart className="h-5 w-5 text-red-400" />;
      case 'game_started':
        return <Play className="h-5 w-5 text-purple-400" />;
      case 'game_completed':
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      default:
        return <MessageCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getActivityText = () => {
    const userName = activity.userName || 'Unknown User';
    const gameName = activity.gameName || 'Unknown Game';
    const targetUserName = activity.targetUserName || 'Unknown User';

    switch (activity.activityType) {
      case 'rating':
        return `${userName} rated ${gameName}`;
      case 'comment':
        return `${userName} commented on ${targetUserName}'s review of ${gameName}`;
      case 'follow':
        return `${userName} started following ${targetUserName}`;
      case 'like_rating':
        return `${userName} liked ${targetUserName}'s review of ${gameName}`;
      case 'like_comment':
        return `${userName} liked a comment on ${gameName}`;
      case 'game_started':
        return `${userName} started playing ${gameName}`;
      case 'game_completed':
        return `${userName} completed ${gameName}`;
      default:
        return `${userName} had activity`;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const isCompact = variant === 'compact';
  const isProfile = variant === 'profile';

  return (
    <div className={`activity-item bg-gray-800 rounded-lg p-4 ${isCompact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start space-x-3">
        {/* Activity Icon */}
        <div className="flex-shrink-0">
          {getActivityIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Activity text and timestamp */}
          <div className="flex items-center justify-between mb-2">
            <p className={`text-gray-300 ${isCompact ? 'text-sm' : 'text-base'}`}>
              {getActivityText()}
            </p>
            <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
              {formatTimestamp(activity.activityTimestamp)}
            </span>
          </div>

          {/* Rating display */}
          {activity.ratingValue && (
            <div className="flex items-center space-x-1 mb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(activity.ratingValue!) 
                      ? 'text-yellow-400 fill-current' 
                      : 'text-gray-600'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-400 ml-2">
                {activity.ratingValue}/5
              </span>
            </div>
          )}

          {/* Review text */}
          {activity.reviewText && !isCompact && (
            <p className="text-gray-400 text-sm mt-2 line-clamp-3">
              {activity.reviewText}
            </p>
          )}

          {/* Game image and info */}
          {activity.gameId && !isProfile && (
            <div className="flex items-center space-x-2 mt-3">
              {(activity.gameCover || activity.gamePicUrl) && (
                <img
                  src={activity.gameCover || activity.gamePicUrl}
                  alt={activity.gameName}
                  className="w-12 h-12 rounded object-cover"
                  loading="lazy"
                />
              )}
              <div>
                <p className="text-white text-sm font-medium">
                  {activity.gameName}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UnifiedActivityFeed;