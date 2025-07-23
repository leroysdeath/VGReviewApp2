// src/store/notificationStore.ts
import { create } from 'zustand';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  fetchNotifications: (userId: string) => Promise<void>;
  fetchMoreNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  hasMore: true,

  fetchNotifications: async (userId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Mock notifications
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'New Review',
          message: 'John Doe reviewed Cyberpunk 2077',
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          isRead: false
        },
        {
          id: '2',
          title: 'New Follower',
          message: 'Jane Smith is now following you',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          isRead: false
        }
      ];

      set({
        notifications: mockNotifications,
        unreadCount: mockNotifications.filter(n => !n.isRead).length,
        isLoading: false,
        hasMore: false
      });
    } catch (error) {
      set({
        error: 'Failed to fetch notifications',
        isLoading: false
      });
    }
  },

  fetchMoreNotifications: async () => {
    // Mock implementation
    set({ isLoading: false });
  },

  markAsRead: async (id: string) => {
    const notifications = get().notifications.map(n =>
      n.id === id ? { ...n, isRead: true } : n
    );
    
    set({
      notifications,
      unreadCount: notifications.filter(n => !n.isRead).length
    });
  },

  markAllAsRead: async () => {
    const notifications = get().notifications.map(n => ({ ...n, isRead: true }));
    
    set({
      notifications,
      unreadCount: 0
    });
  },

  clearError: () => {
    set({ error: null });
  }
}));
