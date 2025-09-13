/**
 * GDPR Compliance Service
 * Handles data export, deletion, and compliance requirements
 */

import { supabase } from './supabase';
import { privacyService } from './privacyService';

export interface UserDataExport {
  exportDate: string;
  userId: number;
  profile: any;
  preferences: any;
  gameViews: Array<{
    game_id: number;
    view_date: string;
    view_source: string;
  }>;
  reviews: any[];
  comments: any[];
  activities: any[];
  auditLog: Array<{
    action: string;
    details: any;
    created_at: string;
  }>;
}

export interface DataDeletionResult {
  success: boolean;
  deletedItems: {
    gameViews: number;
    activities: number;
    notifications: number;
  };
  anonymizedItems: {
    reviews: number;
    comments: number;
  };
  error?: string;
}

export interface DataRetentionInfo {
  gameViews: {
    retentionDays: number;
    oldestData?: string;
    scheduledDeletion?: string;
  };
  aggregatedMetrics: {
    retentionDays: number;
    oldestData?: string;
  };
  auditLogs: {
    retentionDays: number;
    purpose: string;
  };
}

class GDPRService {
  /**
   * Export all user data (GDPR Article 20 - Right to data portability)
   */
  async exportUserData(userId: number): Promise<UserDataExport | null> {
    try {
      console.log(`Starting data export for user ${userId}`);

      // Call the database function for tracking data
      const { data: trackingData, error: trackingError } = await supabase
        .rpc('export_user_tracking_data', { p_user_id: userId });

      if (trackingError) {
        console.error('Error exporting tracking data:', trackingError);
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('user')
        .select('*')
        .eq('id', userId)
        .single();

      // Get user reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('user_id', userId);

      // Get user comments
      const { data: comments } = await supabase
        .from('comments')
        .select('*')
        .eq('user_id', userId);

      // Get user activities
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', userId);

      // Get user's game progress
      const { data: gameProgress } = await supabase
        .from('game_progress')
        .select('*')
        .eq('user_id', userId);

      // Get user's follows
      const { data: following } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', userId);

      const { data: followers } = await supabase
        .from('follows')
        .select('*')
        .eq('following_id', userId);

      // Get user's notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId);

      // Compile the export
      const exportData: UserDataExport = {
        exportDate: new Date().toISOString(),
        userId,
        profile: profile || {},
        preferences: trackingData?.preferences || {},
        gameViews: trackingData?.game_views || [],
        reviews: reviews || [],
        comments: comments || [],
        activities: activities || [],
        auditLog: trackingData?.audit_log || [],
        gameProgress: gameProgress || [],
        socialConnections: {
          following: following || [],
          followers: followers || []
        },
        notifications: notifications || []
      } as any;

      // Log the export in audit trail
      await privacyService.logPrivacyAction(
        userId,
        'data_exported',
        { exported_at: new Date().toISOString() }
      );

      return exportData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      return null;
    }
  }

  /**
   * Delete user data (GDPR Article 17 - Right to erasure)
   */
  async deleteUserData(
    userId: number,
    options: {
      deleteReviews?: boolean;
      deleteComments?: boolean;
      anonymizeInstead?: boolean;
    } = {}
  ): Promise<DataDeletionResult> {
    const {
      deleteReviews = false,
      deleteComments = false,
      anonymizeInstead = true
    } = options;

    try {
      console.log(`Starting data deletion for user ${userId}`);
      
      const result: DataDeletionResult = {
        success: false,
        deletedItems: {
          gameViews: 0,
          activities: 0,
          notifications: 0
        },
        anonymizedItems: {
          reviews: 0,
          comments: 0
        }
      };

      // Call the database function to delete tracking data
      const { data: deletionResult, error: deletionError } = await supabase
        .rpc('delete_user_tracking_data', { p_user_id: userId });

      if (deletionError) {
        console.error('Error deleting tracking data:', deletionError);
        result.error = deletionError.message;
        return result;
      }

      result.deletedItems.gameViews = deletionResult?.deleted_views || 0;

      // Delete activities
      const { data: deletedActivities } = await supabase
        .from('activities')
        .delete()
        .eq('user_id', userId)
        .select();

      result.deletedItems.activities = deletedActivities?.length || 0;

      // Delete notifications
      const { data: deletedNotifications } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .select();

      result.deletedItems.notifications = deletedNotifications?.length || 0;

      // Handle reviews and comments
      if (anonymizeInstead && !deleteReviews) {
        // Anonymize reviews instead of deleting
        const { data: anonymizedReviews } = await supabase
          .from('reviews')
          .update({ 
            user_id: null,
            username: 'Anonymous User'
          })
          .eq('user_id', userId)
          .select();

        result.anonymizedItems.reviews = anonymizedReviews?.length || 0;
      } else if (deleteReviews) {
        // Delete reviews completely
        const { data: deletedReviews } = await supabase
          .from('reviews')
          .delete()
          .eq('user_id', userId)
          .select();

        result.deletedItems.reviews = deletedReviews?.length || 0;
      }

      if (anonymizeInstead && !deleteComments) {
        // Anonymize comments instead of deleting
        const { data: anonymizedComments } = await supabase
          .from('comments')
          .update({ 
            user_id: null,
            username: 'Anonymous User'
          })
          .eq('user_id', userId)
          .select();

        result.anonymizedItems.comments = anonymizedComments?.length || 0;
      } else if (deleteComments) {
        // Delete comments completely
        const { data: deletedComments } = await supabase
          .from('comments')
          .delete()
          .eq('user_id', userId)
          .select();

        result.deletedItems.comments = deletedComments?.length || 0;
      }

      // Delete social connections
      await supabase
        .from('follows')
        .delete()
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

      // Delete game progress
      await supabase
        .from('game_progress')
        .delete()
        .eq('user_id', userId);

      result.success = true;

      // Log the deletion in audit trail
      await privacyService.logPrivacyAction(
        userId,
        'data_deleted',
        {
          deleted_at: new Date().toISOString(),
          items_deleted: result.deletedItems,
          items_anonymized: result.anonymizedItems
        }
      );

      return result;
    } catch (error) {
      console.error('Error deleting user data:', error);
      return {
        success: false,
        deletedItems: { gameViews: 0, activities: 0, notifications: 0 },
        anonymizedItems: { reviews: 0, comments: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get data retention information
   */
  async getDataRetentionInfo(): Promise<DataRetentionInfo> {
    try {
      // Get oldest game view
      const { data: oldestView } = await supabase
        .from('game_views')
        .select('view_date')
        .order('view_date', { ascending: true })
        .limit(1)
        .single();

      // Get oldest metric
      const { data: oldestMetric } = await supabase
        .from('game_metrics_daily')
        .select('metric_date')
        .order('metric_date', { ascending: true })
        .limit(1)
        .single();

      const info: DataRetentionInfo = {
        gameViews: {
          retentionDays: 90,
          oldestData: oldestView?.view_date,
          scheduledDeletion: oldestView ? this.getScheduledDeletionDate(oldestView.view_date, 90) : undefined
        },
        aggregatedMetrics: {
          retentionDays: 180,
          oldestData: oldestMetric?.metric_date
        },
        auditLogs: {
          retentionDays: 730, // 2 years
          purpose: 'Legal compliance and security auditing'
        }
      };

      return info;
    } catch (error) {
      console.error('Error getting retention info:', error);
      return {
        gameViews: { retentionDays: 90 },
        aggregatedMetrics: { retentionDays: 180 },
        auditLogs: { retentionDays: 730, purpose: 'Legal compliance' }
      };
    }
  }

  /**
   * Calculate scheduled deletion date
   */
  private getScheduledDeletionDate(dataDate: string, retentionDays: number): string {
    const date = new Date(dataDate);
    date.setDate(date.getDate() + retentionDays);
    return date.toISOString().split('T')[0];
  }

  /**
   * Request data deletion (creates a deletion request)
   */
  async requestDataDeletion(
    userId: number,
    reason?: string
  ): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
      // Create deletion request
      const { data, error } = await supabase
        .from('privacy_audit_log')
        .insert({
          user_id: userId,
          action: 'deletion_requested',
          details: {
            reason,
            requested_at: new Date().toISOString(),
            scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          }
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        requestId: data.id
      };
    } catch (error) {
      console.error('Error requesting deletion:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Anonymize old data (for scheduled cleanup)
   */
  async anonymizeOldData(): Promise<{
    success: boolean;
    anonymized: number;
    deleted: number;
  }> {
    try {
      // Call the cleanup function
      const { data, error } = await supabase
        .rpc('cleanup_old_tracking_data');

      if (error) {
        console.error('Error cleaning up old data:', error);
        return { success: false, anonymized: 0, deleted: data || 0 };
      }

      return {
        success: true,
        anonymized: 0,
        deleted: data || 0
      };
    } catch (error) {
      console.error('Error anonymizing old data:', error);
      return { success: false, anonymized: 0, deleted: 0 };
    }
  }

  /**
   * Get user's consent history
   */
  async getConsentHistory(userId: number): Promise<Array<{
    action: string;
    date: string;
    details: any;
  }>> {
    try {
      const { data, error } = await supabase
        .from('privacy_audit_log')
        .select('action, created_at, details')
        .eq('user_id', userId)
        .in('action', ['consent_given', 'consent_withdrawn', 'preferences_updated'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching consent history:', error);
        return [];
      }

      return data?.map(item => ({
        action: item.action,
        date: item.created_at,
        details: item.details
      })) || [];
    } catch (error) {
      console.error('Error getting consent history:', error);
      return [];
    }
  }

  /**
   * Generate privacy report for transparency
   */
  async generatePrivacyReport(): Promise<{
    totalUsers: number;
    consentStats: {
      optedIn: number;
      optedOut: number;
      percentage: number;
    };
    dataStats: {
      totalViews: number;
      anonymousViews: number;
      averageRetention: number;
    };
    complianceStats: {
      dataExports: number;
      dataDeletions: number;
      averageResponseTime: string;
    };
  } | null> {
    try {
      // Get consent statistics
      const privacyStats = await privacyService.getPrivacyStats();

      // Get data statistics
      const { data: viewStats } = await supabase
        .from('game_views')
        .select('user_id')
        .limit(1000);

      const anonymousViews = viewStats?.filter(v => !v.user_id).length || 0;
      const totalViews = viewStats?.length || 0;

      // Get compliance statistics
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: complianceData } = await supabase
        .from('privacy_audit_log')
        .select('action')
        .in('action', ['data_exported', 'data_deleted'])
        .gte('created_at', thirtyDaysAgo.toISOString());

      const dataExports = complianceData?.filter(d => d.action === 'data_exported').length || 0;
      const dataDeletions = complianceData?.filter(d => d.action === 'data_deleted').length || 0;

      return {
        totalUsers: privacyStats.totalUsers,
        consentStats: {
          optedIn: privacyStats.optedIn,
          optedOut: privacyStats.optedOut,
          percentage: privacyStats.totalUsers > 0 
            ? Math.round((privacyStats.optedIn / privacyStats.totalUsers) * 100)
            : 0
        },
        dataStats: {
          totalViews,
          anonymousViews,
          averageRetention: 90 // days
        },
        complianceStats: {
          dataExports,
          dataDeletions,
          averageResponseTime: '< 24 hours'
        }
      };
    } catch (error) {
      console.error('Error generating privacy report:', error);
      return null;
    }
  }
}

// Export singleton instance
export const gdprService = new GDPRService();