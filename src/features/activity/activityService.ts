// Consolidated Activity Service
// Purpose: Single service to handle all activity data from the unified views
// Replaces: activityService.ts, activityFeedService.ts

import { supabase } from '../../services/supabase';

export interface Activity {
  activityId: string; // Composite ID like 'rating_123', 'comment_456'
  activityType: 'rating' | 'comment' | 'follow' | 'like_rating' | 'like_comment' | 'game_started' | 'game_completed';
  userId: number;
  userName?: string;
  userAvatar?: string;
  targetUserId?: number;
  targetUserName?: string;
  targetUserAvatar?: string;
  gameId?: number;
  gameName?: string;
  gameCover?: string;
  gamePicUrl?: string; // Handle both cover_url and pic_url
  ratingId?: number;
  commentId?: number;
  followId?: number;
  ratingValue?: number;
  reviewText?: string;
  activityTimestamp: string;
  isPublished: boolean;
}

export interface ActivityFeedOptions {
  userId?: number;
  type?: Activity['activityType'];
  limit?: number;
  offset?: number;
  includeFollowing?: boolean;
}

export interface ActivityResponse {
  activities: Activity[];
  totalCount: number;
  hasMore: boolean;
}

export class ActivityService {
  /**
   * Fetch activities from the materialized view
   */
  async getActivities(options: ActivityFeedOptions = {}): Promise<ActivityResponse> {
    try {
      const {
        userId,
        type,
        limit = 20,
        offset = 0,
        includeFollowing = true
      } = options;

      let query = supabase
        .from('activity_feed_materialized')
        .select('*', { count: 'exact' });

      // If userId is provided, use the specialized function for better performance
      if (userId) {
        // Use the database function for user-specific feeds
        const { data, error, count } = await supabase
          .rpc('get_user_activity_feed', {
            p_user_id: userId,
            p_limit: limit,
            p_offset: offset,
            p_include_following: includeFollowing
          });

        if (error) throw error;

        const activities = this.transformToActivities(data || []);
        
        return {
          activities,
          totalCount: count || 0,
          hasMore: activities.length === limit
        };
      }

      // General activity feed query
      if (type) {
        query = query.eq('activity_type', type);
      }

      const { data, error, count } = await query
        .order('activity_timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const activities = this.transformToActivities(data || []);

      return {
        activities,
        totalCount: count || 0,
        hasMore: activities.length === limit
      };

    } catch (error) {
      console.error('Error fetching activities:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch activities');
    }
  }

  /**
   * Get activities for a specific user (their own activities)
   */
  async getUserActivities(userId: number, limit = 20, offset = 0): Promise<ActivityResponse> {
    try {
      const { data, error, count } = await supabase
        .from('activity_feed_materialized')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('activity_timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      const activities = this.transformToActivities(data || []);

      return {
        activities,
        totalCount: count || 0,
        hasMore: activities.length === limit
      };

    } catch (error) {
      console.error('Error fetching user activities:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to fetch user activities');
    }
  }

  /**
   * Get recent activities (general feed)
   */
  async getRecentActivities(limit = 20, offset = 0): Promise<ActivityResponse> {
    return this.getActivities({ limit, offset });
  }

  /**
   * Subscribe to real-time activity updates
   * Note: This will listen to changes in the source tables since we can't listen to materialized views directly
   */
  subscribeToActivities(callback: (activity: Activity) => void) {
    // Subscribe to rating changes
    const ratingSubscription = supabase
      .channel('ratings')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rating',
        filter: 'is_published=eq.true'
      }, (payload) => {
        this.handleRealTimeUpdate('rating', payload, callback);
      })
      .subscribe();

    // Subscribe to comment changes
    const commentSubscription = supabase
      .channel('comments')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comment',
        filter: 'is_published=eq.true'
      }, (payload) => {
        this.handleRealTimeUpdate('comment', payload, callback);
      })
      .subscribe();

    // Subscribe to follow changes
    const followSubscription = supabase
      .channel('follows')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_follow'
      }, (payload) => {
        this.handleRealTimeUpdate('follow', payload, callback);
      })
      .subscribe();

    // Subscribe to like changes
    const likeSubscription = supabase
      .channel('likes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'content_like',
        filter: 'is_like=eq.true'
      }, (payload) => {
        this.handleRealTimeUpdate('like', payload, callback);
      })
      .subscribe();

    // Return cleanup function
    return () => {
      ratingSubscription.unsubscribe();
      commentSubscription.unsubscribe();
      followSubscription.unsubscribe();
      likeSubscription.unsubscribe();
    };
  }

  /**
   * Refresh the materialized view manually
   */
  async refreshActivityFeed(): Promise<void> {
    try {
      const { error } = await supabase.rpc('refresh_activity_feed');
      if (error) throw error;
    } catch (error) {
      console.error('Error refreshing activity feed:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to refresh activity feed');
    }
  }

  /**
   * Transform database rows to Activity interface
   */
  private transformToActivities(data: Record<string, unknown>[]): Activity[] {
    return data.map(row => ({
      activityId: row.activity_id,
      activityType: row.activity_type,
      userId: row.user_id,
      userName: row.user_name,
      userAvatar: row.user_avatar,
      targetUserId: row.target_user_id,
      targetUserName: row.target_user_name,
      targetUserAvatar: row.target_user_avatar,
      gameId: row.game_id,
      gameName: row.game_name,
      gameCover: row.game_cover || row.game_pic_url, // Handle both column names
      gamePicUrl: row.game_pic_url,
      ratingId: row.rating_id,
      commentId: row.comment_id,
      followId: row.follow_id,
      ratingValue: row.rating_value,
      reviewText: row.review_text,
      activityTimestamp: row.activity_timestamp,
      isPublished: row.is_published
    }));
  }

  /**
   * Handle real-time updates from source tables
   */
  private async handleRealTimeUpdate(
    type: string,
    payload: Record<string, unknown>,
    callback: (activity: Activity) => void
  ) {
    try {
      // For real-time updates, we need to fetch the enriched data
      // since the raw payload doesn't include joined data
      const { eventType, new: newRecord } = payload;
      
      if (eventType === 'INSERT' && newRecord) {
        // Fetch the enriched activity data
        let activityId: string;
        
        switch (type) {
          case 'rating':
            activityId = `rating_${newRecord.id}`;
            break;
          case 'comment':
            activityId = `comment_${newRecord.id}`;
            break;
          case 'follow':
            activityId = `follow_${newRecord.id}`;
            break;
          case 'like':
            activityId = `like_${newRecord.id}`;
            break;
          default:
            return;
        }

        // Fetch the complete activity data
        const { data, error } = await supabase
          .from('activity_feed_materialized')
          .select('*')
          .eq('activity_id', activityId)
          .single();

        if (!error && data) {
          const activity = this.transformToActivities([data])[0];
          callback(activity);
        }
      }
    } catch (error) {
      console.error('Error handling real-time update:', error);
    }
  }
}

// Export singleton instance
export const activityService = new ActivityService();