import { supabase } from './supabase';
import { 
  Activity, 
  ActivityType, 
  Notification, 
  NotificationType,
  NotificationPreference,
  UserFollow,
  ActivityWithUser,
  NotificationWithActivity
} from '../types/activity';
import { formatDistanceToNow } from 'date-fns';

// Activity service for handling activity feed and notifications
class ActivityService {
  // Create a new activity
  async createActivity(
    userId: number,
    activityType: ActivityType,
    objectId?: number,
    objectType?: string,
    targetId?: number,
    targetType?: string,
    metadata?: Record<string, any>
  ): Promise<Activity | null> {
    try {
      const { data, error } = await supabase
        .from('activity')
        .insert({
          user_id: userId,
          activity_type: activityType,
          object_id: objectId,
          object_type: objectType,
          target_id: targetId,
          target_type: targetType,
          metadata
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating activity:', error);
      return null;
    }
  }

  // Get activity feed for a user
  async getActivityFeed(
    userId: number,
    page = 1,
    limit = 20
  ): Promise<{ activities: ActivityWithUser[]; total: number }> {
    try {
      // Get user's following list
      const { data: followingData } = await supabase
        .from('user_follow')
        .select('following_id')
        .eq('follower_id', userId);

      const followingIds = followingData?.map(f => f.following_id) || [];
      
      // Include user's own activities and activities from followed users
      const userIds = [userId, ...followingIds];

      // Get total count
      const { count, error: countError } = await supabase
        .from('activity')
        .select('*', { count: 'exact', head: true })
        .in('user_id', userIds);

      if (countError) throw countError;

      // Get activities with user data
      const { data, error } = await supabase
        .from('activity')
        .select(`
          *,
          user:user_id(id, name, picurl),
          game:object_id(id, name, pic_url)
        `)
        .in('user_id', userIds)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit);

      if (error) throw error;

      // Format activities with relative time
      const formattedActivities = data.map(activity => ({
        ...activity,
        user: activity.user,
        game: activity.object_type === 'game' ? activity.game : undefined,
        relativeTime: formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })
      }));

      return {
        activities: formattedActivities,
        total: count || 0
      };
    } catch (error) {
      console.error('Error getting activity feed:', error);
      return { activities: [], total: 0 };
    }
  }

  // Get notifications for a user
  async getNotifications(
    userId: number,
    page = 1,
    limit = 20,
    unreadOnly = false
  ): Promise<{ notifications: NotificationWithActivity[]; total: number; unread: number }> {
    try {
      // Get unread count
      const { count: unreadCount, error: unreadError } = await supabase
        .from('notification')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (unreadError) throw unreadError;

      // Build query
      let query = supabase
        .from('notification')
        .select(`
          *,
          activity:activity_id(
            *,
            user:user_id(id, name, picurl),
            game:object_id(id, name, pic_url)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Add unread filter if needed
      if (unreadOnly) {
        query = query.eq('is_read', false);
      }

      // Get total count
      const { count, error: countError } = await query.select('*', { count: 'exact', head: true });

      if (countError) throw countError;

      // Get paginated notifications
      const { data, error } = await query.range((page - 1) * limit, page * limit);

      if (error) throw error;

      // Format notifications with relative time
      const formattedNotifications = data.map(notification => ({
        ...notification,
        activity: notification.activity ? {
          ...notification.activity,
          user: notification.activity.user,
          game: notification.activity.object_type === 'game' ? notification.activity.game : undefined,
          relativeTime: formatDistanceToNow(new Date(notification.activity.created_at), { addSuffix: true })
        } : undefined,
        relativeTime: formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })
      }));

      return {
        notifications: formattedNotifications,
        total: count || 0,
        unread: unreadCount || 0
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { notifications: [], total: 0, unread: 0 };
    }
  }

  // Mark notification as read
  async markNotificationAsRead(notificationId: number): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(): Promise<boolean> {
    try {
      const { error } = await supabase.rpc('mark_all_notifications_read');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
  }

  // Get notification preferences
  async getNotificationPreferences(userId: number): Promise<NotificationPreference[]> {
    try {
      const { data, error } = await supabase
        .from('notification_preference')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return [];
    }
  }

  // Update notification preference
  async updateNotificationPreference(
    userId: number,
    notificationType: NotificationType,
    emailEnabled: boolean,
    pushEnabled: boolean,
    inAppEnabled: boolean
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notification_preference')
        .upsert({
          user_id: userId,
          notification_type: notificationType,
          email_enabled: emailEnabled,
          push_enabled: pushEnabled,
          in_app_enabled: inAppEnabled
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating notification preference:', error);
      return false;
    }
  }

  // Follow a user
  async followUser(followerId: number, followingId: number): Promise<boolean> {
    try {
      // Create follow relationship
      const { error: followError } = await supabase
        .from('user_follow')
        .insert({
          follower_id: followerId,
          following_id: followingId
        });

      if (followError) throw followError;

      // Create activity
      await this.createActivity(
        followerId,
        'user_followed',
        undefined,
        undefined,
        followingId,
        'user'
      );

      return true;
    } catch (error) {
      console.error('Error following user:', error);
      return false;
    }
  }

  // Unfollow a user
  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_follow')
        .delete()
        .eq('follower_id', followerId)
        .eq('following_id', followingId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error unfollowing user:', error);
      return false;
    }
  }

  // Get user's followers
  async getUserFollowers(userId: number): Promise<UserFollow[]> {
    try {
      const { data, error } = await supabase
        .from('user_follow')
        .select(`
          *,
          follower:follower_id(id, name, picurl)
        `)
        .eq('following_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user followers:', error);
      return [];
    }
  }

  // Get users followed by a user
  async getUserFollowing(userId: number): Promise<UserFollow[]> {
    try {
      const { data, error } = await supabase
        .from('user_follow')
        .select(`
          *,
          following:following_id(id, name, picurl)
        `)
        .eq('follower_id', userId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting user following:', error);
      return [];
    }
  }

  // Check if a user is following another user
  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('user_follow')
        .select('id')
        .eq('follower_id', followerId)
        .eq('following_id', followingId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"
      return !!data;
    } catch (error) {
      console.error('Error checking follow status:', error);
      return false;
    }
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(userId: number, callback: (notification: Notification) => void) {
    return supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new as Notification);
        }
      )
      .subscribe();
  }

  // Subscribe to real-time activity feed
  subscribeToActivityFeed(userIds: number[], callback: (activity: Activity) => void) {
    return supabase
      .channel(`activity:${userIds.join(',')}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity',
          filter: `user_id=in.(${userIds.join(',')})`
        },
        (payload) => {
          callback(payload.new as Activity);
        }
      )
      .subscribe();
  }
}

export const activityService = new ActivityService();