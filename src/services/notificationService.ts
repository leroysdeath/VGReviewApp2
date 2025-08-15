import { Notification, NotificationResponse } from '../types/notification';

// API endpoints
const API_BASE_URL = '/api/notifications';

/**
 * Fetch notifications for a user
 */
export const fetchNotifications = async (
  userId: string,
  cursor?: string,
  limit: number = 20
): Promise<NotificationResponse> => {
  try {
    // In a real app, this would be a fetch call to your API
    // For now, we'll simulate the API response with a delay
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate API call
    const url = new URL(API_BASE_URL, window.location.origin);
    url.searchParams.append('userId', userId);
    if (cursor) url.searchParams.append('cursor', cursor);
    url.searchParams.append('limit', limit.toString());
    
    console.log(`Fetching notifications: ${url.toString()}`);
    
    // For demo purposes, generate mock data
    const mockNotifications: Notification[] = Array.from({ length: limit }, (_, i) => ({
      id: `${cursor || 'page1'}-${i}`,
      type: ['review_mention', 'comment_reply', 'user_followed', 'game_release', 'system_announcement'][Math.floor(Math.random() * 5)] as any,
      title: `Notification ${i + 1}`,
      message: `This is a sample notification message for notification ${i + 1}`,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      isRead: Math.random() > 0.7, // 30% chance of being read
      userId,
      link: Math.random() > 0.5 ? `/game/${Math.floor(Math.random() * 100)}` : undefined,
      sourceId: `source-${Math.floor(Math.random() * 100)}`,
      sourceType: ['review', 'comment', 'user', 'game'][Math.floor(Math.random() * 4)] as any
    }));
    
    // Count unread notifications
    const unreadCount = mockNotifications.filter(n => !n.isRead).length;
    
    // Simulate pagination
    const hasMore = mockNotifications.length === limit;
    const nextCursor = hasMore ? `cursor-${Date.now()}` : undefined;
    
    return {
      notifications: mockNotifications,
      unreadCount,
      totalCount: 100, // Mock total count
      nextCursor
    };
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to fetch notifications');
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simulate API call
    const url = `${API_BASE_URL}/${notificationId}/read`;
    console.log(`Marking notification as read: ${url}`);
    
    // In a real app, this would be:
    // const response = await fetch(url, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' }
    // });
    // if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    
    // Simulate 5% chance of failure for testing error handling
    if (Math.random() < 0.05) {
      throw new Error('Simulated API error');
    }
    
    // Success
    console.log(`Notification ${notificationId} marked as read`);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to mark notification as read');
  }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Simulate API call
    const url = `${API_BASE_URL}/mark-all-read`;
    console.log(`Marking all notifications as read for user ${userId}: ${url}`);
    
    // In a real app, this would be:
    // const response = await fetch(url, {
    //   method: 'PATCH',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId })
    // });
    // if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    
    // Simulate 5% chance of failure for testing error handling
    if (Math.random() < 0.05) {
      throw new Error('Simulated API error');
    }
    
    // Success
    console.log(`All notifications marked as read for user ${userId}`);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to mark all notifications as read');
  }
};