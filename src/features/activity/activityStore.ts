// Updated Activity Store
// Purpose: Zustand store for unified activity feed state management
// Replaces: Previous activityFeedStore.ts with real data integration

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Activity, ActivityFeedOptions, activityService } from './activityService';

interface ActivityStore {
  // State
  activities: Activity[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  
  // Last fetch params for retry
  lastFetchParams?: ActivityFeedOptions;
  
  // Real-time subscription
  unsubscribeRealTime?: () => void;
  
  // Actions
  fetchActivities: (options?: ActivityFeedOptions) => Promise<void>;
  fetchMoreActivities: () => Promise<void>;
  retryFetch: () => Promise<void>;
  clearActivities: () => void;
  refreshFeed: () => Promise<void>;
  
  // Real-time actions
  subscribeToRealTime: (onNewActivity?: (activity: Activity) => void) => () => void;
  unsubscribeFromRealTime: () => void;
  
  // Optimistic updates
  addActivity: (activity: Activity) => void;
  removeActivity: (activityId: string) => void;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;
}

export const useActivityStore = create<ActivityStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activities: [],
        isLoading: false,
        error: null,
        hasMore: true,
        totalCount: 0,
        
        // Fetch activities (replaces or appends based on offset)
        fetchActivities: async (options = {}) => {
          const { activities: currentActivities } = get();
          const isLoadingMore = (options.offset || 0) > 0;
          
          set({ 
            isLoading: true, 
            error: null,
            lastFetchParams: options
          });

          try {
            const response = await activityService.getActivities(options);
            
            set({
              activities: isLoadingMore 
                ? [...currentActivities, ...response.activities]
                : response.activities,
              hasMore: response.hasMore,
              totalCount: response.totalCount,
              isLoading: false
            });
            
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch activities',
              isLoading: false
            });
          }
        },

        // Fetch more activities (pagination)
        fetchMoreActivities: async () => {
          const { activities, hasMore, isLoading, lastFetchParams } = get();
          
          if (!hasMore || isLoading || !lastFetchParams) return;
          
          const moreOptions = {
            ...lastFetchParams,
            offset: activities.length
          };
          
          await get().fetchActivities(moreOptions);
        },

        // Retry last fetch
        retryFetch: async () => {
          const { lastFetchParams } = get();
          
          if (lastFetchParams) {
            await get().fetchActivities(lastFetchParams);
          } else {
            await get().fetchActivities();
          }
        },

        // Clear all activities
        clearActivities: () => {
          set({
            activities: [],
            hasMore: true,
            totalCount: 0,
            error: null
          });
        },

        // Refresh the entire feed
        refreshFeed: async () => {
          const { lastFetchParams } = get();
          
          // Refresh the materialized view first
          try {
            await activityService.refreshActivityFeed();
          } catch (error) {
            console.warn('Failed to refresh materialized view:', error);
          }
          
          // Then fetch fresh data
          const refreshOptions = lastFetchParams ? { ...lastFetchParams, offset: 0 } : {};
          await get().fetchActivities(refreshOptions);
        },

        // Subscribe to real-time updates
        subscribeToRealTime: (onNewActivity) => {
          // Unsubscribe from existing subscription
          get().unsubscribeFromRealTime();
          
          const unsubscribe = activityService.subscribeToActivities((newActivity) => {
            // Add to beginning of activities list
            set((state) => ({
              activities: [newActivity, ...state.activities],
              totalCount: state.totalCount + 1
            }));
            
            // Call optional callback
            if (onNewActivity) {
              onNewActivity(newActivity);
            }
          });
          
          set({ unsubscribeRealTime: unsubscribe });
          
          return unsubscribe;
        },

        // Unsubscribe from real-time updates
        unsubscribeFromRealTime: () => {
          const { unsubscribeRealTime } = get();
          if (unsubscribeRealTime) {
            unsubscribeRealTime();
            set({ unsubscribeRealTime: undefined });
          }
        },

        // Optimistic updates
        addActivity: (activity) => {
          set((state) => ({
            activities: [activity, ...state.activities],
            totalCount: state.totalCount + 1
          }));
        },

        removeActivity: (activityId) => {
          set((state) => ({
            activities: state.activities.filter(a => a.activityId !== activityId),
            totalCount: Math.max(0, state.totalCount - 1)
          }));
        },

        updateActivity: (activityId, updates) => {
          set((state) => ({
            activities: state.activities.map(activity =>
              activity.activityId === activityId
                ? { ...activity, ...updates }
                : activity
            )
          }));
        }
      }),
      {
        name: 'unified-activity-feed-storage',
        partialize: (state) => ({
          // Only persist a limited number of activities to avoid large storage
          activities: state.activities.slice(0, 100),
          totalCount: state.totalCount
        })
      }
    ),
    {
      name: 'unified-activity-store'
    }
  )
);

// Helper hooks for common use cases
export const useUserActivities = (userId?: number) => {
  const store = useActivityStore();
  
  React.useEffect(() => {
    if (userId) {
      store.fetchActivities({ userId, limit: 20, offset: 0 });
    }
  }, [userId, store]);
  
  return store;
};

export const useRecentActivities = (limit = 20) => {
  const store = useActivityStore();
  
  React.useEffect(() => {
    store.fetchActivities({ limit, offset: 0 });
  }, [limit, store]);
  
  return store;
};

// Add React import for the helper hooks
import React from 'react';