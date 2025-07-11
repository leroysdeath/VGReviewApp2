// Activity and notification types

export type ActivityType = 
  | 'review_created' 
  | 'review_updated' 
  | 'rating_created' 
  | 'rating_updated'
  | 'comment_created' 
  | 'user_followed' 
  | 'game_added' 
  | 'game_completed'
  | 'wishlist_added' 
  | 'price_alert' 
  | 'release_alert' 
  | 'system_announcement';

export type NotificationType = 
  | 'review_mention' 
  | 'comment_reply' 
  | 'user_followed' 
  | 'game_release'
  | 'price_drop' 
  | 'community_milestone' 
  | 'friend_activity' 
  | 'system_announcement'
  | 'weekly_digest';

export interface Activity {
  id: number;
  user_id: number;
  activity_type: ActivityType;
  object_id?: number;
  object_type?: string;
  target_id?: number;
  target_type?: string;
  metadata?: Record<string, any>;
  created_at: string;
  user?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface Notification {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  link?: string;
  activity_id?: number;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  activity?: Activity;
}

export interface NotificationPreference {
  id: number;
  user_id: number;
  notification_type: NotificationType;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserFollow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: string;
  follower?: {
    id: number;
    name: string;
    picurl?: string;
  };
  following?: {
    id: number;
    name: string;
    picurl?: string;
  };
}

export interface NotificationReadStatus {
  id: number;
  user_id: number;
  notification_id: number;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

// Extended types for UI components
export interface ActivityWithUser extends Activity {
  user: {
    id: number;
    name: string;
    picurl?: string;
  };
  game?: {
    id: number;
    name: string;
    pic_url?: string;
  };
  relativeTime: string;
}

export interface NotificationWithActivity extends Notification {
  activity?: ActivityWithUser;
  relativeTime: string;
}

export interface NotificationGroup {
  date: string;
  notifications: NotificationWithActivity[];
}

export interface NotificationSummary {
  total: number;
  unread: number;
  groups: NotificationGroup[];
}

// Notification settings
export interface NotificationSettings {
  preferences: Record<NotificationType, {
    email: boolean;
    push: boolean;
    inApp: boolean;
  }>;
  digestFrequency: 'daily' | 'weekly' | 'never';
  muteAll: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}