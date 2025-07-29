import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Activity, ActivityFeedState, FetchActivitiesParams } from '../types/activity';
import { fetchActivities, retryFetch } from '../services/activityFeedService';

interface ActivityFeedStore extends ActivityFeedState {
  // Actions
  fetchActivities: (params: FetchActivitiesParams) => Promise<void>;
  fetchNextPage: (userId: string) => Promise<void>;
  retryFetch: () => Promise<void>;
  clearActivities: () => void;
  
  // Optimistic updates
  addActivity: (activity: Activity) => void;
  removeActivity: (activityId: string) => void;
  updateActivity: (activityId: string, updates: Partial<Activity>) => void;
}

export const useActivityFeedStore = create<ActivityFeedStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        activities: [],
        isLoading: false,
        error: null,
        nextCursor: undefined,
        totalCount: 0,
        hasMore: true,
        
        // Last fetch params for retry
        lastFetchParams: undefined as FetchActivitiesParams | undefined,
        
        // Actions
        fetchActivities: async (params: FetchActivitiesParams) => {
          set({ isLoading: true, error: null, lastFetchParams: params });
          
          try {
            const response = await fetchActivities(params);
            
            set(state => ({
              activities: params.cursor 
                ? [...state.activities, ...response.activities]
                : response.activities,
              nextCursor: response.nextCursor,
              totalCount: response.totalCount,
              hasMore: !!response.nextCursor,
              isLoading: false
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch activities',
              isLoading: false
            });
          }
        },
        
        fetchNextPage: async (userId: string) => {
          const { nextCursor, isLoading, hasMore } = get();
          
          if (isLoading || !hasMore) return;
          
          await get().fetchActivities({
            userId,
            cursor: nextCursor,
            limit: 20
          });
        },
        
        retryFetch: async () => {
          const { lastFetchParams } = get();
          
          if (!lastFetchParams) return;
          
          set({ isLoading: true, error: null });
          
          try {
            const response = await retryFetch(lastFetchParams);
            
            set(state => ({
              activities: lastFetchParams.cursor 
                ? [...state.activities, ...response.activities]
                : response.activities,
              nextCursor: response.nextCursor,
              totalCount: response.totalCount,
              hasMore: !!response.nextCursor,
              isLoading: false
            }));
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to fetch activities',
              isLoading: false
            });
          }
        },
        
        clearActivities: () => {
          set({
            activities: [],
            nextCursor: undefined,
            hasMore: true,
            error: null
          });
        },
        
        // Optimistic updates
        addActivity: (activity: Activity) => {
          set(state => ({
            activities: [activity, ...state.activities],
            totalCount: state.totalCount + 1
          }));
        },
        
        removeActivity: (activityId: string) => {
          set(state => ({
            activities: state.activities.filter(a => a.id !== activityId),
            totalCount: Math.max(0, state.totalCount - 1)
          }));
        },
        
        updateActivity: (activityId: string, updates: Partial<Activity>) => {
          set(state => ({
            activities: state.activities.map(activity => 
              activity.id === activityId 
                ? { ...activity, ...updates }
                : activity
            )
          }));
        }
      }),
      {
        name: 'activity-feed-storage',
        partialize: (state) => ({ 
          activities: state.activities.slice(0, 50), // Only cache the first 50 activities
          totalCount: state.totalCount
        })
      }
    )
  )
);