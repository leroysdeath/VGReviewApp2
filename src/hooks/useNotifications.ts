import { useState, useEffect, useCallback } from 'react';
import { activityService } from '../services/activityService';
import { NotificationWithActivity, NotificationGroup, NotificationType } from '../types/activity';
import { useAuth } from './useAuth';
import { format } from 'date-fns';

interface UseNotificationsOptions {
  initialPage?: number;
  pageSize?: number;
  unreadOnly?: boolean;
  groupByDate?: boolean;
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const {
    initialPage = 1,
    pageSize = 20,
    unreadOnly = false,
    groupByDate = true
  } = options;

  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationWithActivity[]>([]);
  const [groupedNotifications, setGroupedNotifications] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [subscription, setSubscription] = useState<{ unsubscribe: () => void } | null>(null);

  // Group notifications by date
  const groupNotifications = useCallback((notifs: NotificationWithActivity[]) => {
    if (!groupByDate) return [];

    const groups: Record<string, NotificationWithActivity[]> = {};
    
    notifs.forEach(notification => {
      const date = format(new Date(notification.created_at), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
    });
    
    return Object.entries(groups).map(([date, notifications]) => ({
      date,
      notifications
    }));
  }, [groupByDate]);

  // Load notifications
  const loadNotifications = useCallback(async (pageNum = 1, append = false) => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const userId = parseInt(user.id);
      const result = await activityService.getNotifications(userId, pageNum, pageSize, unreadOnly);
      
      setTotal(result.total);
      setUnreadCount(result.unread);
      setHasMore(pageNum * pageSize < result.total);
      
      if (append) {
        setNotifications(prev => [...prev, ...result.notifications]);
      } else {
        setNotifications(result.notifications);
      }
      
      // Group notifications if needed
      if (groupByDate) {
        const newNotifications = append 
          ? [...notifications, ...result.notifications]
          : result.notifications;
        setGroupedNotifications(groupNotifications(newNotifications));
      }
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Notifications error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, pageSize, unreadOnly, groupByDate, groupNotifications, notifications]);

  // Load more notifications
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadNotifications(nextPage, true);
  }, [loading, hasMore, page, loadNotifications]);

  // Refresh notifications
  const refresh = useCallback(() => {
    setPage(1);
    loadNotifications(1, false);
  }, [loadNotifications]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: number) => {
    if (!user) return false;

    try {
      const success = await activityService.markNotificationAsRead(notificationId);
      
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === notificationId
              ? { ...notification, is_read: true }
              : notification
          )
        );
        
        // Update unread count
        setUnreadCount(prev => Math.max(0, prev - 1));
        
        // Update grouped notifications if needed
        if (groupByDate) {
          setGroupedNotifications(prev => 
            prev.map(group => ({
              ...group,
              notifications: group.notifications.map(notification => 
                notification.id === notificationId
                  ? { ...notification, is_read: true }
                  : notification
              )
            }))
          );
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, [user, groupByDate]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user) return false;

    try {
      const success = await activityService.markAllNotificationsAsRead();
      
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        );
        
        // Update unread count
        setUnreadCount(0);
        
        // Update grouped notifications if needed
        if (groupByDate) {
          setGroupedNotifications(prev => 
            prev.map(group => ({
              ...group,
              notifications: group.notifications.map(notification => 
                ({ ...notification, is_read: true })
              )
            }))
          );
        }
        
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      return false;
    }
  }, [user, groupByDate]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user) return;

    const userId = parseInt(user.id);
    
    // Subscribe to notifications
    const sub = activityService.subscribeToNotifications(userId, (newNotification) => {
      // Add to the beginning of the list
      const notificationWithActivity: NotificationWithActivity = {
        ...newNotification,
        activity: undefined,
        relativeTime: 'just now'
      };
      
      setNotifications(prev => [notificationWithActivity, ...prev]);
      
      // Increment unread count
      setUnreadCount(prev => prev + 1);
      
      // Update grouped notifications if needed
      if (groupByDate) {
        const today = format(new Date(), 'yyyy-MM-dd');
        
        setGroupedNotifications(prev => {
          // Check if today's group exists
          const todayGroup = prev.find(group => group.date === today);
          
          if (todayGroup) {
            // Add to today's group
            return prev.map(group => 
              group.date === today
                ? { ...group, notifications: [notificationWithActivity, ...group.notifications] }
                : group
            );
          } else {
            // Create today's group
            return [
              { date: today, notifications: [notificationWithActivity] },
              ...prev
            ];
          }
        });
      }
      
      // Refresh to get complete data
      setTimeout(refresh, 1000);
    });
    
    setSubscription(sub);
    
    return () => {
      sub.unsubscribe();
    };
  }, [user, groupByDate, refresh]);

  // Initial load
  useEffect(() => {
    if (user) {
      loadNotifications(page, false);
    }
  }, [user, page, loadNotifications]);

  // Update notification preferences
  const updatePreference = useCallback(async (
    notificationType: NotificationType,
    emailEnabled: boolean,
    pushEnabled: boolean,
    inAppEnabled: boolean
  ) => {
    if (!user) return false;

    try {
      const userId = parseInt(user.id);
      return await activityService.updateNotificationPreference(
        userId,
        notificationType,
        emailEnabled,
        pushEnabled,
        inAppEnabled
      );
    } catch (err) {
      console.error('Error updating notification preference:', err);
      return false;
    }
  }, [user]);

  return {
    notifications,
    groupedNotifications,
    loading,
    error,
    hasMore,
    total,
    unreadCount,
    loadMore,
    refresh,
    markAsRead,
    markAllAsRead,
    updatePreference,
    page
  };
};