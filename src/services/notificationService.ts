// src/services/notificationService.ts

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface NotificationResponse {
  notifications: Notification[];
  unreadCount: number;
  totalCount: number;
  nextCursor?: string;
}

/**
 * Fetch notifications for a user
 */
export const fetchNotifications = async (
  userId: string,
  cursor?: string,
  limit = 20
): Promise<NotificationResponse> => {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
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
      },
      {
        id: '3',
        title: 'Comment Reply',
        message: 'Someone replied to your comment on The Witcher 3',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        isRead: true
      }
    ];

    const unreadCount = mockNotifications.filter(n => !n.isRead).length;
    
    return {
      notifications: mockNotifications,
      unreadCount,
      totalCount: mockNotifications.length,
      nextCursor: undefined
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error('Failed to fetch notifications');
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log(`Notification ${notificationId} marked as read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error('Failed to mark notification as read');
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log(`All notifications marked as read for user ${userId}`);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error('Failed to mark all notifications as read');
  }
};
