import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { VariableSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useSWRInfinite } from 'swr';
import { debounce } from 'lodash';
import ActivityItem from './ActivityItem';
import { 
  MessageSquare, 
  AlertCircle,
  RefreshCw,
  Search
} from 'lucide-react';
import { ActivityType } from '../utils/activityFormatters';

// Activity interface
export interface Activity {
  id: string;
  type: ActivityType;
  timestamp: string;
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  targetUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  game?: {
    id: string;
    name: string;
    coverImage?: string;
  };
  content?: string;
}

interface OptimizedActivityFeedProps {
  fetchActivities: (key: { userId: string; cursor?: string; limit: number }) => Promise<{
    activities: Activity[];
    nextCursor?: string;
    totalCount: number;
  }>;
  userId: string;
  pageSize?: number;
  className?: string;
  emptyStateMessage?: string;
  currentUserId?: string;
}

// Skeleton loader component
const ActivitySkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading activities">
      {Array.from({ length: count }).map((_, index) => (
        <div 
          key={index}
          className="bg-gray-800 rounded-lg p-4 animate-pulse"
        >
          <div className="flex gap-3">
            {/* Avatar skeleton */}
            <div className="w-10 h-10 bg-gray-700 rounded-full flex-shrink-0"></div>
            
            {/* Content skeleton */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="h-4 bg-gray-700 rounded w-32"></div>
                <div className="h-4 bg-gray-700 rounded w-16"></div>
              </div>
              <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-3/4"></div>
              <div className="h-16 bg-gray-700 rounded w-full mt-2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 text-center">
      <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">No Activities</h3>
      <p className="text-gray-400">{message}</p>
    </div>
  );
};

// Error state component
const ErrorState: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => {
  return (
    <div className="bg-red-900/30 border border-red-800/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertCircle className="h-5 w-5 text-red-400" />
        <p className="text-red-300">{error}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-red-800/50 text-white rounded-lg hover:bg-red-700/50 transition-colors text-sm"
        >
          Try Again
        </button>
      )}
    </div>
  );
};

export const OptimizedActivityFeed: React.FC<OptimizedActivityFeedProps> = ({
  fetchActivities,
  userId,
  pageSize = 20,
  className = '',
  emptyStateMessage = 'No activities to display',
  currentUserId
}) => {
  const listRef = useRef<List>(null);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [itemHeights, setItemHeights] = useState<Record<string, number>>({});
  const [measurementCache, setMeasurementCache] = useState<Record<string, number>>({});
  
  // SWR configuration for infinite loading with cursor-based pagination
  const getKey = useCallback((pageIndex: number, previousPageData: any) => {
    // First page, no cursor
    if (pageIndex === 0) return { userId, limit: pageSize };
    
    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;
    
    // Next page with cursor
    return { 
      userId, 
      cursor: previousPageData.nextCursor,
      limit: pageSize 
    };
  }, [userId, pageSize]);
  
  // Use SWR for data fetching with caching
  const { 
    data: paginatedData,
    error,
    size,
    setSize,
    isValidating,
    mutate
  } = useSWRInfinite(
    getKey,
    fetchActivities,
    {
      revalidateIfStale: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      persistSize: true,
      dedupingInterval: 5000, // 5 seconds
      focusThrottleInterval: 10000, // 10 seconds
      loadingTimeout: 5000, // 5 seconds
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Only retry up to 3 times
        if (retryCount >= 3) return;
        
        // Retry after 5 seconds
        setTimeout(() => revalidate({ retryCount }), 5000);
      }
    }
  );
  
  // Combine all pages of activities
  const activities = useMemo(() => {
    if (!paginatedData) return [];
    return paginatedData.flatMap(page => page.activities || []);
  }, [paginatedData]);
  
  // Calculate if there are more activities to load
  const hasMore = useMemo(() => {
    if (!paginatedData || paginatedData.length === 0) return true;
    return !!paginatedData[paginatedData.length - 1]?.nextCursor;
  }, [paginatedData]);
  
  // Calculate total count
  const totalCount = useMemo(() => {
    if (!paginatedData || paginatedData.length === 0) return 0;
    return paginatedData[0]?.totalCount || 0;
  }, [paginatedData]);
  
  // Function to load more activities
  const loadMore = useCallback(() => {
    if (!isValidating && hasMore) {
      setSize(size + 1);
    }
  }, [isValidating, hasMore, setSize, size]);
  
  // Debounced load more function
  const debouncedLoadMore = useMemo(() => debounce(loadMore, 150), [loadMore]);
  
  // Function to retry failed fetch
  const retry = useCallback(() => {
    return mutate();
  }, [mutate]);
  
  // Handle scroll events
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    setScrollPosition(scrollOffset);
    
    // Check if we need to load more items
    if (hasMore && !isValidating) {
      const listElement = listRef.current;
      if (listElement) {
        const { outerRef } = listElement;
        const containerElement = outerRef.current as HTMLDivElement;
        if (containerElement) {
          const { scrollHeight, scrollTop, clientHeight } = containerElement;
          const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
          
          if (scrollPercentage > 0.8) {
            debouncedLoadMore();
          }
        }
      }
    }
  }, [hasMore, isValidating, debouncedLoadMore]);
  
  // Calculate dynamic item height
  const getItemHeight = useCallback((index: number) => {
    // Use cached height if available
    const activityId = activities[index]?.id;
    if (activityId && itemHeights[activityId]) {
      return itemHeights[activityId];
    }
    
    // Default heights based on content
    const activity = activities[index];
    if (!activity) return 100; // Loading/error indicator
    
    let height = 100; // Base height
    
    // Add height for content
    if (activity.content) height += 60;
    
    // Add height for game image
    if (activity.game?.coverImage) height += 80;
    
    // Add height for user avatar
    if (!currentUserId || activity.user.id !== currentUserId) height += 30;
    
    return height;
  }, [activities, itemHeights, currentUserId]);
  
  // Measure and cache item heights
  const measureItem = useCallback((activityId: string, height: number) => {
    if (measurementCache[activityId] !== height) {
      setMeasurementCache(prev => ({
        ...prev,
        [activityId]: height
      }));
      
      setItemHeights(prev => ({
        ...prev,
        [activityId]: height
      }));
      
      // Reset list to recalculate sizes
      if (listRef.current) {
        listRef.current.resetAfterIndex(0);
      }
    }
  }, [measurementCache]);
  
  // Render activity item
  const renderActivityItem = useCallback((activity: Activity, index: number) => {
    return (
      <div 
        ref={(el) => {
          if (el) {
            const height = el.getBoundingClientRect().height;
            measureItem(activity.id, height);
          }
        }}
      >
        <ActivityItem
          id={activity.id}
          type={activity.type}
          timestamp={activity.timestamp}
          actor={activity.user}
          target={activity.targetUser ? {
            id: activity.targetUser.id,
            type: 'comment',
            name: activity.targetUser.name
          } : undefined}
          game={activity.game}
          content={activity.content}
          currentUserId={currentUserId}
        />
      </div>
    );
  }, [measureItem, currentUserId]);
  
  // Loading state
  if (isValidating && !activities.length) {
    return <ActivitySkeleton count={3} />;
  }
  
  // Error state (only if no activities loaded yet)
  if (error && !activities.length) {
    return <ErrorState error={error.message || 'Failed to load activities'} onRetry={retry} />;
  }
  
  // Empty state
  if (!isValidating && !error && activities.length === 0) {
    return <EmptyState message={emptyStateMessage} />;
  }
  
  return (
    <div className={`h-[600px] ${className}`}>
      <AutoSizer>
        {({ height, width }) => (
          <List
            ref={listRef}
            height={height}
            width={width}
            itemCount={activities.length}
            itemSize={getItemHeight}
            onScroll={handleScroll}
            overscanCount={3} // Number of items to render above/below the visible area
            initialScrollOffset={scrollPosition}
          >
            {({ index, style }) => (
              <div style={style}>
                {renderActivityItem(activities[index], index)}
              </div>
            )}
          </List>
        )}
      </AutoSizer>
      
      {/* Loading indicator */}
      {isValidating && activities.length > 0 && (
        <div className="flex justify-center items-center py-4" aria-live="polite" role="status">
          <RefreshCw className="h-5 w-5 text-blue-400 animate-spin mr-2" />
          <span className="text-gray-400">Loading more activities...</span>
        </div>
      )}
      
      {/* Error indicator (when we have some activities) */}
      {error && activities.length > 0 && (
        <div className="mt-4">
          <ErrorState 
            error={error.message || 'Failed to load more activities'} 
            onRetry={retry} 
          />
        </div>
      )}
      
      {/* End of feed indicator */}
      {!hasMore && !isValidating && activities.length > 0 && (
        <div className="text-center py-4 text-gray-500" aria-live="polite">
          You've reached the end of the feed
        </div>
      )}
    </div>
  );
};