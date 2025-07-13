import { useEffect, useCallback, useRef } from 'react';
import { useActivityFeedStore } from '../store/activityFeedStore';
import { ActivityFeedOptions } from '../types/activity';

/**
 * Custom hook for fetching and managing activity feed data
 */
export const useActivityFeed = ({ 
  userId, 
  isActive, 
  initialPageSize = 20 
}: ActivityFeedOptions) => {
  const {
    activities,
    isLoading,
    error,
    hasMore,
    totalCount,
    fetchActivities,
    fetchNextPage,
    retryFetch,
    clearActivities
  } = useActivityFeedStore();
  
  const initialFetchRef = useRef(false);
  
  // Initial fetch when component mounts and tab becomes active
  useEffect(() => {
    if (isActive && !initialFetchRef.current) {
      fetchActivities({ userId, limit: initialPageSize });
      initialFetchRef.current = true;
    }
    
    // Clear activities when component unmounts
    return () => {
      if (!isActive) {
        initialFetchRef.current = false;
      }
    };
  }, [userId, isActive, initialPageSize, fetchActivities]);
  
  // Function to load more activities
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchNextPage(userId);
    }
  }, [userId, isLoading, hasMore, fetchNextPage]);
  
  // Function to retry failed fetch
  const retry = useCallback(() => {
    retryFetch();
  }, [retryFetch]);
  
  // Function to refresh the feed
  const refresh = useCallback(() => {
    clearActivities();
    initialFetchRef.current = false;
    fetchActivities({ userId, limit: initialPageSize });
  }, [userId, initialPageSize, clearActivities, fetchActivities]);
  
  return {
    activities,
    isLoading,
    error,
    hasMore,
    totalCount,
    loadMore,
    retry,
    refresh
  };
};