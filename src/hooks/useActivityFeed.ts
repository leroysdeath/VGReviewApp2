import { useState, useEffect, useCallback } from 'react';
import { activityService } from '../services/activityService';
import { ActivityWithUser } from '../types/activity';
import { useAuth } from './useAuth';

interface UseActivityFeedOptions {
  initialPage?: number;
  pageSize?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useActivityFeed = (options: UseActivityFeedOptions = {}) => {
  const {
    initialPage = 1,
    pageSize = 20,
    autoRefresh = true,
    refreshInterval = 60000 // 1 minute
  } = options;

  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [subscription, setSubscription] = useState<{ unsubscribe: () => void } | null>(null);

  // Load activities
  const loadActivities = useCallback(async (pageNum = 1, append = false) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const userId = parseInt(user.id);
      const result = await activityService.getActivityFeed(userId, pageNum, pageSize);
      
      setTotal(result.total);
      setHasMore(pageNum * pageSize < result.total);
      
      if (append) {
        setActivities(prev => [...prev, ...result.activities]);
      } else {
        setActivities(result.activities);
      }
    } catch (err) {
      setError('Failed to load activity feed');
      console.error('Activity feed error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, pageSize]);

  // Load more activities
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadActivities(nextPage, true);
  }, [loading, hasMore, page, loadActivities]);

  // Refresh activities
  const refresh = useCallback(() => {
    setPage(1);
    loadActivities(1, false);
  }, [loadActivities]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user || !autoRefresh) return;

    const userId = parseInt(user.id);
    
    // Get following IDs
    const setupSubscription = async () => {
      try {
        const following = await activityService.getUserFollowing(userId);
        const followingIds = following.map(f => f.following_id);
        const userIds = [userId, ...followingIds];
        
        // Subscribe to activities
        const sub = activityService.subscribeToActivityFeed(userIds, (newActivity) => {
          // Add user data to the activity
          const activityWithUser: ActivityWithUser = {
            ...newActivity,
            user: {
              id: newActivity.user_id,
              name: 'User', // This will be replaced when we fetch the full activity
              picurl: undefined
            },
            relativeTime: 'just now'
          };
          
          // Add to the beginning of the list
          setActivities(prev => [activityWithUser, ...prev]);
          
          // Increment total
          setTotal(prev => prev + 1);
          
          // Refresh to get complete data
          setTimeout(refresh, 1000);
        });
        
        setSubscription(sub);
        
        return () => {
          sub.unsubscribe();
        };
      } catch (error) {
        console.error('Error setting up activity subscription:', error);
      }
    };
    
    setupSubscription();
    
    // Auto-refresh timer
    const timer = setInterval(refresh, refreshInterval);
    
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      clearInterval(timer);
    };
  }, [user, autoRefresh, refreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadActivities(page, false);
    }
  }, [user, page, loadActivities]);

  return {
    activities,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    refresh,
    page
  };
};