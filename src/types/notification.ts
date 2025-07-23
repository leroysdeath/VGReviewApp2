// src/types/notification.ts
export interface Notification {
  id: string;
  type: 'review_mention' | 'comment_reply' | 'user_followed' | 'game_release' | 'price_drop' | 'system_announcement';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  link?: string;
  userId: string;
  sourceId?: string;
  sourceType?: 'review' | 'comment' | 'user' | 'game';
}

export interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  nextCursor?: string;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor?: string;
}

export interface NotificationActions {
  fetchNotifications: (userId: string, limit?: number) => Promise<void>;
  fetchMoreNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearError: () => void;
}

export type NotificationStore = NotificationState & NotificationActions;
