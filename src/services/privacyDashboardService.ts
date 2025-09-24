/**
 * Privacy Dashboard Service
 * Aggregates and analyzes privacy and tracking data for admin dashboard
 * Provides comprehensive insights into data collection and user privacy
 */

import { supabase } from './supabase';
import { privacyService } from './privacyService';
import { trackingService, ViewSource } from './trackingService';

// Types
export interface PrivacyMetrics {
  // User Consent Metrics
  totalUsers: number;
  consentedUsers: number;
  nonConsentedUsers: number;
  consentRate: number;
  trackingLevels: {
    none: number;
    anonymous: number;
    full: number;
  };

  // Tracking Activity Metrics
  totalEvents: number;
  uniqueSessions: number;
  eventsToday: number;
  eventsThisWeek: number;
  eventsThisMonth: number;
  eventsBySource: Record<ViewSource, number>;
  
  // Data Retention Metrics
  oldestDataPoint: string | null;
  dataPointsOverRetention: number;
  scheduledDeletions: number;
  averageDataAge: number; // in days

  // Top Tracked Content
  topGames: Array<{
    gameId: number;
    gameName?: string;
    views: number;
    uniqueSessions: number;
  }>;
  
  // Privacy Actions
  recentConsentChanges: Array<{
    userId: number;
    action: string;
    timestamp: string;
    details?: any;
  }>;
  
  // System Health
  apiRateLimit: {
    current: number;
    limit: number;
    percentage: number;
  };
  storageUsage: {
    gameViews: number;
    userPreferences: number;
    auditLogs: number;
    totalMB: number;
  };
  errorRate: {
    last24h: number;
    last7d: number;
    failedEvents: number;
  };
}

export interface RealTimeActivity {
  timestamp: string;
  type: 'view' | 'consent' | 'preference_change';
  userId?: number;
  sessionHash?: string;
  details: Record<string, any>;
}

export interface DataRetentionPolicy {
  retentionDays: number;
  anonymizationDays: number;
  cleanupSchedule: string;
  lastCleanup: string | null;
  nextCleanup: string;
}

class PrivacyDashboardService {
  private readonly RETENTION_DAYS = 90; // 90 days retention policy
  private readonly ANONYMIZATION_DAYS = 30; // Anonymize after 30 days
  private realTimeSubscription: any = null;

  /**
   * Get comprehensive privacy metrics
   */
  async getPrivacyMetrics(): Promise<PrivacyMetrics> {
    try {
      // Get user consent metrics
      const consentMetrics = await this.getConsentMetrics();
      
      // Get tracking activity metrics
      const trackingMetrics = await this.getTrackingMetrics();
      
      // Get data retention metrics
      const retentionMetrics = await this.getDataRetentionMetrics();
      
      // Get top tracked games
      const topGames = await this.getTopTrackedGames(10);
      
      // Get recent privacy actions
      const recentActions = await this.getRecentPrivacyActions(5);
      
      // Get system health metrics
      const systemHealth = await this.getSystemHealthMetrics();

      return {
        // Consent metrics
        totalUsers: consentMetrics.totalUsers,
        consentedUsers: consentMetrics.consentedUsers,
        nonConsentedUsers: consentMetrics.nonConsentedUsers,
        consentRate: consentMetrics.consentRate,
        trackingLevels: consentMetrics.trackingLevels,
        
        // Tracking metrics
        totalEvents: trackingMetrics.totalEvents,
        uniqueSessions: trackingMetrics.uniqueSessions,
        eventsToday: trackingMetrics.eventsToday,
        eventsThisWeek: trackingMetrics.eventsThisWeek,
        eventsThisMonth: trackingMetrics.eventsThisMonth,
        eventsBySource: trackingMetrics.eventsBySource,
        
        // Retention metrics
        oldestDataPoint: retentionMetrics.oldestDataPoint,
        dataPointsOverRetention: retentionMetrics.dataPointsOverRetention,
        scheduledDeletions: retentionMetrics.scheduledDeletions,
        averageDataAge: retentionMetrics.averageDataAge,
        
        // Content metrics
        topGames,
        
        // Privacy actions
        recentConsentChanges: recentActions,
        
        // System health
        apiRateLimit: systemHealth.apiRateLimit,
        storageUsage: systemHealth.storageUsage,
        errorRate: systemHealth.errorRate
      };
    } catch (error) {
      console.error('Error getting privacy metrics:', error);
      throw error;
    }
  }

  /**
   * Get user consent metrics
   */
  private async getConsentMetrics() {
    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('analytics_opted_in, tracking_level');

    if (error) {
      console.error('Error fetching consent metrics:', error);
      return {
        totalUsers: 0,
        consentedUsers: 0,
        nonConsentedUsers: 0,
        consentRate: 0,
        trackingLevels: { none: 0, anonymous: 0, full: 0 }
      };
    }

    const totalUsers = preferences?.length || 0;
    const consentedUsers = preferences?.filter(p => p.analytics_opted_in).length || 0;
    const trackingLevels = {
      none: preferences?.filter(p => p.tracking_level === 'none').length || 0,
      anonymous: preferences?.filter(p => p.tracking_level === 'anonymous').length || 0,
      full: preferences?.filter(p => p.tracking_level === 'full').length || 0
    };

    return {
      totalUsers,
      consentedUsers,
      nonConsentedUsers: totalUsers - consentedUsers,
      consentRate: totalUsers > 0 ? (consentedUsers / totalUsers) * 100 : 0,
      trackingLevels
    };
  }

  /**
   * Get tracking activity metrics
   */
  private async getTrackingMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Get total events and unique sessions
    const { data: totalData } = await supabase
      .from('game_views')
      .select('id, session_hash', { count: 'exact' });

    const totalEvents = totalData?.length || 0;
    const uniqueSessions = new Set(totalData?.map(d => d.session_hash)).size;

    // Get events by time period
    const { data: todayData } = await supabase
      .from('game_views')
      .select('id')
      .gte('created_at', today.toISOString());

    const { data: weekData } = await supabase
      .from('game_views')
      .select('id')
      .gte('created_at', weekAgo.toISOString());

    const { data: monthData } = await supabase
      .from('game_views')
      .select('id')
      .gte('created_at', monthAgo.toISOString());

    // Get events by source
    const { data: sourceData } = await supabase
      .from('game_views')
      .select('view_source');

    const eventsBySource: Record<ViewSource, number> = {
      search: 0,
      direct: 0,
      recommendation: 0,
      list: 0,
      review: 0,
      profile: 0
    };

    sourceData?.forEach(row => {
      if (row.view_source && eventsBySource.hasOwnProperty(row.view_source)) {
        eventsBySource[row.view_source as ViewSource]++;
      }
    });

    return {
      totalEvents,
      uniqueSessions,
      eventsToday: todayData?.length || 0,
      eventsThisWeek: weekData?.length || 0,
      eventsThisMonth: monthData?.length || 0,
      eventsBySource
    };
  }

  /**
   * Get data retention metrics
   */
  private async getDataRetentionMetrics() {
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - this.RETENTION_DAYS);

    // Get oldest data point
    const { data: oldestData } = await supabase
      .from('game_views')
      .select('created_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    // Count data points over retention period
    const { data: overRetentionData, count } = await supabase
      .from('game_views')
      .select('id', { count: 'exact', head: true })
      .lt('created_at', retentionDate.toISOString());

    // Calculate average data age
    const { data: allDates } = await supabase
      .from('game_views')
      .select('created_at');

    let averageAge = 0;
    if (allDates && allDates.length > 0) {
      const now = Date.now();
      const totalAge = allDates.reduce((sum, row) => {
        const age = now - new Date(row.created_at).getTime();
        return sum + age;
      }, 0);
      averageAge = Math.floor(totalAge / allDates.length / (1000 * 60 * 60 * 24)); // Convert to days
    }

    return {
      oldestDataPoint: oldestData?.created_at || null,
      dataPointsOverRetention: count || 0,
      scheduledDeletions: count || 0,
      averageDataAge: averageAge
    };
  }

  /**
   * Get top tracked games
   */
  private async getTopTrackedGames(limit: number = 10) {
    const { data, error } = await supabase
      .from('game_views')
      .select('game_id, session_hash')
      .order('created_at', { ascending: false })
      .limit(1000); // Sample recent views

    if (error) {
      console.error('Error fetching top games:', error);
      return [];
    }

    // Aggregate by game
    const gameStats = new Map<number, { views: number; sessions: Set<string> }>();
    
    data?.forEach(row => {
      const stats = gameStats.get(row.game_id) || { views: 0, sessions: new Set() };
      stats.views++;
      if (row.session_hash) {
        stats.sessions.add(row.session_hash);
      }
      gameStats.set(row.game_id, stats);
    });

    // Convert to array and sort by views
    const topGames = Array.from(gameStats.entries())
      .map(([gameId, stats]) => ({
        gameId,
        views: stats.views,
        uniqueSessions: stats.sessions.size
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);

    return topGames;
  }

  /**
   * Get recent privacy actions
   */
  private async getRecentPrivacyActions(limit: number = 5) {
    const { data, error } = await supabase
      .from('privacy_audit_log')
      .select('user_id, action, details, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching privacy actions:', error);
      return [];
    }

    return data?.map(row => ({
      userId: row.user_id,
      action: row.action,
      timestamp: row.created_at,
      details: row.details
    })) || [];
  }

  /**
   * Get system health metrics
   */
  private async getSystemHealthMetrics() {
    // Estimate storage usage
    const { data: viewCount } = await supabase
      .from('game_views')
      .select('id', { count: 'exact', head: true });

    const { data: prefCount } = await supabase
      .from('user_preferences')
      .select('user_id', { count: 'exact', head: true });

    const { data: auditCount } = await supabase
      .from('privacy_audit_log')
      .select('id', { count: 'exact', head: true });

    // Estimate storage (rough estimates)
    const avgRowSizes = {
      gameViews: 0.1, // KB per row
      userPreferences: 0.05,
      auditLogs: 0.2
    };

    const storageUsage = {
      gameViews: (viewCount || 0) * avgRowSizes.gameViews,
      userPreferences: (prefCount || 0) * avgRowSizes.userPreferences,
      auditLogs: (auditCount || 0) * avgRowSizes.auditLogs,
      totalMB: 0
    };
    
    storageUsage.totalMB = (storageUsage.gameViews + storageUsage.userPreferences + storageUsage.auditLogs) / 1024;

    // API rate limit (mock data - replace with actual if available)
    const apiRateLimit = {
      current: Math.floor(Math.random() * 800) + 200, // Random between 200-1000
      limit: 1000,
      percentage: 0
    };
    apiRateLimit.percentage = (apiRateLimit.current / apiRateLimit.limit) * 100;

    // Error rate (would need error logging table)
    const errorRate = {
      last24h: 0,
      last7d: 0,
      failedEvents: 0
    };

    return {
      apiRateLimit,
      storageUsage,
      errorRate
    };
  }

  /**
   * Get real-time activity stream
   */
  async subscribeToRealTimeActivity(
    callback: (activity: RealTimeActivity) => void
  ): Promise<() => void> {
    // Subscribe to game_views inserts
    const viewsChannel = supabase
      .channel('privacy-dashboard-views')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_views' },
        (payload) => {
          callback({
            timestamp: new Date().toISOString(),
            type: 'view',
            userId: payload.new.user_id,
            sessionHash: payload.new.session_hash,
            details: {
              gameId: payload.new.game_id,
              source: payload.new.view_source
            }
          });
        }
      )
      .subscribe();

    // Subscribe to user_preferences changes
    const prefsChannel = supabase
      .channel('privacy-dashboard-prefs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_preferences' },
        (payload) => {
          callback({
            timestamp: new Date().toISOString(),
            type: payload.eventType === 'INSERT' ? 'consent' : 'preference_change',
            userId: payload.new?.user_id || payload.old?.user_id,
            details: {
              trackingLevel: payload.new?.tracking_level,
              analyticsOptedIn: payload.new?.analytics_opted_in
            }
          });
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      viewsChannel.unsubscribe();
      prefsChannel.unsubscribe();
    };
  }

  /**
   * Get data retention policy details
   */
  async getDataRetentionPolicy(): Promise<DataRetentionPolicy> {
    // Get last cleanup run (would need cleanup_runs table)
    const lastCleanup = null; // Placeholder

    const nextCleanup = new Date();
    nextCleanup.setDate(nextCleanup.getDate() + 1); // Daily cleanup

    return {
      retentionDays: this.RETENTION_DAYS,
      anonymizationDays: this.ANONYMIZATION_DAYS,
      cleanupSchedule: 'Daily at 2:00 AM UTC',
      lastCleanup,
      nextCleanup: nextCleanup.toISOString()
    };
  }

  /**
   * Get user-specific privacy data (for transparency)
   */
  async getUserPrivacyData(userId: number) {
    const [preferences, viewCount, auditLogs] = await Promise.all([
      supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single(),
      
      supabase
        .from('game_views')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      
      supabase
        .from('privacy_audit_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10)
    ]);

    return {
      preferences: preferences.data,
      totalDataPoints: viewCount.count || 0,
      recentActions: auditLogs.data || []
    };
  }

  /**
   * Delete old data according to retention policy
   */
  async performDataCleanup(): Promise<{
    deleted: number;
    anonymized: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deleted = 0;
    let anonymized = 0;

    try {
      // Delete data older than retention period
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - this.RETENTION_DAYS);

      const { count: deleteCount, error: deleteError } = await supabase
        .from('game_views')
        .delete({ count: 'exact' })
        .lt('created_at', retentionDate.toISOString());

      if (deleteError) {
        errors.push(`Delete error: ${deleteError.message}`);
      } else {
        deleted = deleteCount || 0;
      }

      // Anonymize data older than anonymization period
      const anonymizeDate = new Date();
      anonymizeDate.setDate(anonymizeDate.getDate() - this.ANONYMIZATION_DAYS);

      const { count: anonCount, error: anonError } = await supabase
        .from('game_views')
        .update({ user_id: null }, { count: 'exact' })
        .lt('created_at', anonymizeDate.toISOString())
        .not('user_id', 'is', null);

      if (anonError) {
        errors.push(`Anonymize error: ${anonError.message}`);
      } else {
        anonymized = anonCount || 0;
      }

    } catch (error) {
      errors.push(`Cleanup error: ${error}`);
    }

    return { deleted, anonymized, errors };
  }

  /**
   * Export privacy report
   */
  async exportPrivacyReport(): Promise<{
    metrics: PrivacyMetrics;
    policy: DataRetentionPolicy;
    timestamp: string;
  }> {
    const metrics = await this.getPrivacyMetrics();
    const policy = await this.getDataRetentionPolicy();

    return {
      metrics,
      policy,
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton instance
export const privacyDashboardService = new PrivacyDashboardService();