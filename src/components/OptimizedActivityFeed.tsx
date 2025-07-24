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
    <div className="bg-gray-800 rounded-lg p-6 text-center">
      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-white mb-2">Error Loading Activities</h3>
      <p className="text-gray-400 mb-4">{error}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors mx-auto"
        >
          <RefreshCw className="h-4 w-4" />
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
  emptyStateMessage = 'No activities to show',
  currentUserId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const listRef = useRef<any>(null);
  const [virtualized, setVirtualized] = useState(true);

  // SWR infinite hook for pagination
  const {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    size,
    setSize
  } = useSWRInfinite(
    (index) => ({
      userId,
      cursor: data?.[index - 1]?.nextCursor,
      limit: pageSize
    }),
    fetchActivities,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
    }
  );

  // Flatten activities from all pages
  const activities = useMemo(() => {
    if (!data) return [];
    return data.flatMap(page => page.activities);
  }, [data]);

  // Filter activities based on search and filter
  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      const matchesSearch = !searchQuery || 
        activity.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.game?.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = filter === 'all' || activity.type === filter;

      return matchesSearch && matchesFilter;
    });
  }, [activities, searchQuery, filter]);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      setSearchQuery(query);
    }, 300),
    []
  );

  // Check if we can load more
  const canLoadMore = data && data[data.length - 1]?.nextCursor;
  const isLoadingMore = isLoading && size > 0;

  // Load more activities
  const loadMore = useCallback(() => {
    if (canLoadMore && !isLoadingMore) {
      setSize(size + 1);
    }
  }, [canLoadMore, isLoadingMore, setSize, size]);

  // Retry function
  const retry = useCallback(() => {
    mutate();
  }, [mutate]);

  // Item height calculation for virtualization
  const getItemHeight = useCallback((index: number) => {
    // Estimate height based on activity type and content
    const activity = filteredActivities[index];
    if (!activity) return 120;

    let baseHeight = 80; // Base height for avatar and basic info
    
    // Add height for content
    if (activity.content) {
      baseHeight += Math.min(60, activity.content.length * 0.5);
    }
    
    // Add height for game info
    if (activity.game) {
      baseHeight += 40;
    }

    return Math.max(baseHeight, 120);
  }, [filteredActivities]);

  // Render activity item
  const renderActivityItem = useCallback(({ index, style }: any) => {
    const activity = filteredActivities[index];
    if (!activity) return null;

    // Check if we should load more when approaching the end
    if (index === filteredActivities.length - 5 && canLoadMore) {
      loadMore();
    }

    return (
      <div style={style}>
        <ActivityItem
          activity={activity}
          currentUserId={currentUserId}
          className="mx-4 mb-4"
        />
      </div>
    );
  }, [filteredActivities, canLoadMore, loadMore, currentUserId]);

  // Handle scroll to load more (for non-virtualized mode)
  const handleScroll = useCallback(
    debounce((event: React.UIEvent<HTMLDivElement>) => {
      if (virtualized) return;
      
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - 500;
      
      if (isNearBottom && canLoadMore && !isLoadingMore) {
        loadMore();
      }
    }, 100),
    [virtualized, canLoadMore, isLoadingMore, loadMore]
  );

  // Loading state
  if (isLoading && !data) {
    return (
      <div className={className}>
        <ActivitySkeleton count={5} />
      </div>
    );
  }

  // Error state
  if (error && !data) {
    return (
      <div className={className}>
        <ErrorState error={error.message || 'Failed to load activities'} onRetry={retry} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header with search and filters */}
      <div className="flex-shrink-0 p-4 border-b border-gray-700 bg-gray-800">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search activities..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as ActivityType | 'all')}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="all">All Activities</option>
            <option value="review">Reviews</option>
            <option value="rating">Ratings</option>
            <option value="follow">Follows</option>
            <option value="comment">Comments</option>
          </select>

          {/* Virtualization toggle */}
          <button
            onClick={() => setVirtualized(!virtualized)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              virtualized
                ? 'bg-purple-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title={`${virtualized ? 'Disable' : 'Enable'} virtualization`}
          >
            Virtual: {virtualized ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Activity count */}
        <div className="mt-2 text-sm text-gray-400">
          {filteredActivities.length} activities
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
      </div>

      {/* Activity feed */}
      <div className="flex-1 overflow-hidden" onScroll={handleScroll}>
        {filteredActivities.length === 0 ? (
          <EmptyState message={emptyStateMessage} />
        ) : virtualized ? (
          // Virtualized list for better performance with large datasets
          <AutoSizer>
            {({ height, width }) => (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={filteredActivities.length}
                itemSize={getItemHeight}
                overscanCount={5}
                itemData={filteredActivities}
              >
                {renderActivityItem}
              </List>
            )}
          </AutoSizer>
        ) : (
          // Simple scrollable list
          <div className="p-4 space-y-4 overflow-y-auto h-full">
            {filteredActivities.map((activity, index) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Loading indicator for infinite scroll */}
      {isLoadingMore && (
        <div className="flex-shrink-0 p-4 text-center">
          <div className="inline-flex items-center gap-2 text-gray-400">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading more activities...
          </div>
        </div>
      )}

      {/* Validation indicator */}
      {isValidating && !isLoadingMore && (
        <div className="absolute top-4 right-4 text-purple-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  );
};
