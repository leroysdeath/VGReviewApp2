import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { 
  Notification, 
  NotificationStore 
} from '../types/notification';
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../services/notificationService';

export const useNotificationStore = create<NotificationStore>()(
  immer((set, get) => ({
    // State
    notifications: [],
    unreadCount: 0,
    totalCount: 0,
    isLoading: false,
    error: null,
    hasMore: true,
    nextCursor: undefined,
    
    // Actions
    fetchNotifications: async (userId: string, limit = 20) => {
      set(state => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        const response = await fetchNotifications(userId, undefined, limit);
        
        set(state => {
          state.notifications = response.notifications;
          state.unreadCount = response.unreadCount;
          state.totalCount = response.totalCount;
          state.hasMore = !!response.nextCursor;
          state.nextCursor = response.nextCursor;
          state.isLoading = false;
        });
      } catch (error) {
        set(state => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch notifications';
          state.isLoading = false;
        });
      }
    },
    
    fetchMoreNotifications: async () => {
      const { isLoading, hasMore, nextCursor } = get();
      
      if (isLoading || !hasMore || !nextCursor) return;
      
      set(state => {
        state.isLoading = true;
        state.error = null;
      });
      
      try {
        // We need to get userId from the existing notifications
        const userId = get().notifications[0]?.userId;
        if (!userId) throw new Error('User ID not found');
        
        const response = await fetchNotifications(userId, nextCursor);
        
        set(state => {
          state.notifications = [...state.notifications, ...response.notifications];
          state.unreadCount = response.unreadCount;
          state.totalCount = response.totalCount;
          state.hasMore = !!response.nextCursor;
          state.nextCursor = response.nextCursor;
          state.isLoading = false;
        });
      } catch (error) {
        set(state => {
          state.error = error instanceof Error ? error.message : 'Failed to fetch more notifications';
          state.isLoading = false;
        });
      }
    },
    
    markAsRead: async (notificationId: string) => {
      try {
        // Optimistic update
        set(state => {
          const notification = state.notifications.find(n => n.id === notificationId);
          if (notification && !notification.isRead) {
            notification.isRead = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        });
        
        // Make API call
        await markNotificationAsRead(notificationId);
      } catch (error) {
        // Revert optimistic update on failure
        set(state => {
          const notification = state.notifications.find(n => n.id === notificationId);
          if (notification && notification.isRead) {
            notification.isRead = false;
            state.unreadCount += 1;
          }
          state.error = error instanceof Error ? error.message : 'Failed to mark notification as read';
        });
      }
    },
    
    markAllAsRead: async () => {
      // Get user ID from the first notification
      const userId = get().notifications[0]?.userId;
      if (!userId) return;
      
      // Count currently unread notifications
      const unreadCount = get().unreadCount;
      if (unreadCount === 0) return;
      
      try {
        // Optimistic update
        set(state => {
          state.notifications.forEach(notification => {
            notification.isRead = true;
          });
          state.unreadCount = 0;
        });
        
        // Make API call
        await markAllNotificationsAsRead(userId);
      } catch (error) {
        // Revert optimistic update on failure
        set(state => {
          // Refetch to get accurate state
          state.error = error instanceof Error ? error.message : 'Failed to mark all notifications as read';
          // We'll need to refetch to restore the correct state
          state.isLoading = true;
        });
        
        // Refetch to restore correct state
        try {
          const response = await fetchNotifications(userId);
          set(state => {
            state.notifications = response.notifications;
            state.unreadCount = response.unreadCount;
            state.isLoading = false;
          });
        } catch (refetchError) {
          set(state => {
            state.error = refetchError instanceof Error 
              ? refetchError.message 
              : 'Failed to restore notification state';
            state.isLoading = false;
          });
        }
      }
    },
    
    clearError: () => {
      set(state => {
        state.error = null;
      });
    }
  }))
);