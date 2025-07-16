import { useEffect, useCallback, useRef, useMemo } from 'react';
import { useActivityFeedStore } from '../store/activityFeedStore';
import { ActivityFeedOptions } from '../types/activity';
import { useSWRInfinite } from 'swr/infinite';
import { fetchActivities } from '../services/activityFeedService';

/**
 * Custom hook for fetching and managing activity feed data
 */
export const useActivityFeed = ({ 
  userId, 
  isActive, 
  initialPageSize = 20 
}: ActivityFeedOptions) => {  
  // SWR configuration for infinite loading with cursor-based pagination
  const getKey = useCallback((pageIndex: number, previousPageData: any) => {
    // If not active, don't fetch
    if (!isActive) return null;
    
    // First page, no cursor
    if (pageIndex === 0) return { userId, limit: initialPageSize };
    
    // Reached the end
    if (previousPageData && !previousPageData.nextCursor) return null;
    
    // Next page with cursor
    return { 
      userId, 
      cursor: previousPageData.nextCursor,
      limit: initialPageSize 
    };
  }, [userId, isActive, initialPageSize]);
  
  // Use SWR for data fetching with caching
  const { 
    data: paginatedData,
    error: swrError,
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
  
  const {
    fetchActivities,
    fetchNextPage,
    retryFetch,
    clearActivities
  } = useActivityFeedStore();
  
  const initialFetchRef = useRef(false);
  
  // Initial fetch when component mounts and tab becomes active
  useEffect(() => {
    if (isActive && !initialFetchRef.current) {
      // Initial fetch is handled by SWR
      initialFetchRef.current = true;
    }
    
    // Clear activities when component unmounts
    return () => {
      if (!isActive) {
        initialFetchRef.current = false;
      }
    };
  }, [userId, isActive, initialPageSize]);
  
  // Function to load more activities
  const loadMore = useCallback(() => {
    if (!isValidating && hasMore) {
      setSize(size + 1);
    }
  }, [isValidating, hasMore, setSize, size]);
  
  // Function to retry failed fetch
  const retry = useCallback(() => {
    return mutate();
  }, [mutate]);
  
  // Function to refresh the feed
  const refresh = useCallback(() => {
    // Reset to first page and revalidate
    initialFetchRef.current = false;
    return mutate();
  }, [mutate]);
  
  return {
    activities,
    isLoading: isValidating,
    error: swrError,
    hasMore,
    totalCount,
    loadMore,
    retry,
    refresh
  };
};
