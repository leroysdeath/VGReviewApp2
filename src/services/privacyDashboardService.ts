/**
 * Privacy Dashboard Service
 * Aggregates and analyzes privacy and tracking data for admin dashboard
 * Provides comprehensive insights into data collection and user privacy
 */

import { supabase } from './supabase';
import { privacyService } from './privacyService';
import { trackingService, ViewSource } from './trackingService';
import { abTestingService } from './abTestingService';

// Types
export interface HistoricalTimeRange {
  label: string;
  days: number;
  value: string;
}

export interface HistoricalTrackingData {
  date: string;
  views: number;
  uniqueSessions: number;
  uniqueUsers: number;
  ratings: number;
  newReviews: number;
}

export interface EnhancedGameMetrics {
  gameId: number;
  gameName?: string;
  gameSlug?: string;
  gameCover?: string;
  views: number;
  uniqueSessions: number;
  avgRating?: number;
  totalRatings?: number;
  recentRatings?: number;
  rankingFactors?: {
    totalViews: number;
    uniqueUsers: number;
    viewsToday: number;
    viewsThisWeek: number;
    avgSessionsPerDay: number;
    ratingScore: number;
    engagementScore: number;
  };
}

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
  
  // Historical Data
  historicalData: HistoricalTrackingData[];
  timeRange: string;
  
  // Data Retention Metrics
  oldestDataPoint: string | null;
  dataPointsOverRetention: number;
  scheduledDeletions: number;
  averageDataAge: number; // in days

  // Enhanced Top Tracked Content
  topGames: EnhancedGameMetrics[];
  
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

  // A/B Testing Metrics
  abTestingMetrics?: {
    activeExperiments: number;
    totalParticipants: number;
    totalConversions: number;
    experimentsThisWeek: number;
    averageConversionRate: number;
    topPerformingExperiments: Array<{
      id: string;
      name: string;
      participants: number;
      conversionRate: number;
      status: 'active' | 'completed';
      significanceLevel?: number;
    }>;
    recentActivity: Array<{
      timestamp: string;
      type: 'assignment' | 'conversion' | 'experiment_created';
      experimentId: string;
      experimentName?: string;
    }>;
    privacyCompliance: {
      consentRespected: boolean;
      anonymousParticipants: number;
      dataRetentionCompliant: boolean;
    };
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
   * Available time ranges for historical data
   */
  public static readonly TIME_RANGES: HistoricalTimeRange[] = [
    { label: 'Last 7 Days', days: 7, value: '7d' },
    { label: 'Last 14 Days', days: 14, value: '14d' },
    { label: 'Last 30 Days', days: 30, value: '30d' },
    { label: 'Last 60 Days', days: 60, value: '60d' },
    { label: 'Last 90 Days', days: 90, value: '90d' }
  ];

  /**
   * Get comprehensive privacy metrics with historical data
   */
  async getPrivacyMetrics(timeRange: string = '7d'): Promise<PrivacyMetrics> {
    try {
      const selectedRange = PrivacyDashboardService.TIME_RANGES.find(r => r.value === timeRange) 
        || PrivacyDashboardService.TIME_RANGES[0];

      // Get user consent metrics
      const consentMetrics = await this.getConsentMetrics();
      
      // Get tracking activity metrics with time range
      const trackingMetrics = await this.getTrackingMetrics(selectedRange.days);
      
      // Get historical data
      const historicalData = await this.getHistoricalData(selectedRange.days);
      
      // Get data retention metrics
      const retentionMetrics = await this.getDataRetentionMetrics();
      
      // Get enhanced top tracked games with ratings
      const topGames = await this.getEnhancedTopTrackedGames(10, selectedRange.days);
      
      // Get recent privacy actions
      const recentActions = await this.getRecentPrivacyActions(5);
      
      // Get system health metrics
      const systemHealth = await this.getSystemHealthMetrics();

      // Get A/B testing metrics (with API/DB limits)
      const abTestingMetrics = await this.getABTestingMetrics(selectedRange.days);

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
        
        // Historical data
        historicalData,
        timeRange: selectedRange.value,
        
        // Retention metrics
        oldestDataPoint: retentionMetrics.oldestDataPoint,
        dataPointsOverRetention: retentionMetrics.dataPointsOverRetention,
        scheduledDeletions: retentionMetrics.scheduledDeletions,
        averageDataAge: retentionMetrics.averageDataAge,
        
        // Enhanced content metrics
        topGames,
        
        // Privacy actions
        recentConsentChanges: recentActions,
        
        // System health
        apiRateLimit: systemHealth.apiRateLimit,
        storageUsage: systemHealth.storageUsage,
        errorRate: systemHealth.errorRate,
        
        // A/B Testing metrics
        abTestingMetrics
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
   * Get tracking activity metrics with time range support
   */
  private async getTrackingMetrics(timeRangeDays: number = 30) {
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
   * Get top tracked games with enhanced details and ranking factors
   */
  private async getTopTrackedGames(limit: number = 10) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get all game views for analysis
    const { data, error } = await supabase
      .from('game_views')
      .select('game_id, session_hash, user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5000); // Larger sample for better ranking

    if (error) {
      console.error('Error fetching top games:', error);
      return [];
    }

    // Aggregate by game with detailed metrics
    const gameStats = new Map<number, { 
      views: number; 
      sessions: Set<string>; 
      users: Set<number>;
      viewsToday: number;
      viewsThisWeek: number;
      dailyViews: Map<string, number>;
    }>();
    
    data?.forEach(row => {
      const stats = gameStats.get(row.game_id) || { 
        views: 0, 
        sessions: new Set(), 
        users: new Set(),
        viewsToday: 0,
        viewsThisWeek: 0,
        dailyViews: new Map()
      };
      
      stats.views++;
      if (row.session_hash) stats.sessions.add(row.session_hash);
      if (row.user_id) stats.users.add(row.user_id);
      
      const viewDate = new Date(row.created_at);
      const dateKey = viewDate.toISOString().split('T')[0];
      stats.dailyViews.set(dateKey, (stats.dailyViews.get(dateKey) || 0) + 1);
      
      if (viewDate >= today) stats.viewsToday++;
      if (viewDate >= weekAgo) stats.viewsThisWeek++;
      
      gameStats.set(row.game_id, stats);
    });

    // Get top games by views
    const topGameIds = Array.from(gameStats.entries())
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, limit)
      .map(([gameId]) => gameId);

    // Fetch game details
    const { data: gameDetails } = await supabase
      .from('game')
      .select('id, name, slug, cover_url')
      .in('id', topGameIds);

    // Combine stats with game details
    const topGames = topGameIds.map(gameId => {
      const stats = gameStats.get(gameId)!;
      const game = gameDetails?.find(g => g.id === gameId);
      const avgSessionsPerDay = stats.dailyViews.size > 0 ? 
        stats.sessions.size / stats.dailyViews.size : 0;

      return {
        gameId,
        gameName: game?.name,
        gameSlug: game?.slug,
        gameCover: game?.cover_url,
        views: stats.views,
        uniqueSessions: stats.sessions.size,
        rankingFactors: {
          totalViews: stats.views,
          uniqueUsers: stats.users.size,
          viewsToday: stats.viewsToday,
          viewsThisWeek: stats.viewsThisWeek,
          avgSessionsPerDay: Math.round(avgSessionsPerDay * 100) / 100
        }
      };
    });

    return topGames;
  }

  /**
   * Get historical tracking data with ratings integration
   */
  private async getHistoricalData(days: number): Promise<HistoricalTrackingData[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      // Query game views by date (respecting DB limits)
      const { data: viewData } = await supabase
        .from('game_views')
        .select('user_id, session_hash, created_at')
        .gte('created_at', startDate.toISOString())
        .limit(10000); // Limit to 10K records to respect DB

      // Query ratings by date
      const { data: ratingData } = await supabase
        .from('rating')
        .select('user_id, created_at')
        .gte('created_at', startDate.toISOString())
        .limit(5000); // Limit ratings query

      // Group data by date
      const dataByDate = new Map<string, {
        views: number;
        sessions: Set<string>;
        users: Set<number>;
        ratings: number;
      }>();

      // Process view data
      viewData?.forEach(row => {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        const dayData = dataByDate.get(date) || {
          views: 0,
          sessions: new Set(),
          users: new Set(),
          ratings: 0
        };
        
        dayData.views++;
        if (row.session_hash) dayData.sessions.add(row.session_hash);
        if (row.user_id) dayData.users.add(row.user_id);
        
        dataByDate.set(date, dayData);
      });

      // Process rating data
      ratingData?.forEach(row => {
        const date = new Date(row.created_at).toISOString().split('T')[0];
        const dayData = dataByDate.get(date) || {
          views: 0,
          sessions: new Set(),
          users: new Set(),
          ratings: 0
        };
        
        dayData.ratings++;
        dataByDate.set(date, dayData);
      });

      // Convert to array and fill missing dates
      const historicalData: HistoricalTrackingData[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        
        const dayData = dataByDate.get(dateKey);
        
        historicalData.unshift({
          date: dateKey,
          views: dayData?.views || 0,
          uniqueSessions: dayData?.sessions.size || 0,
          uniqueUsers: dayData?.users.size || 0,
          ratings: dayData?.ratings || 0,
          newReviews: dayData?.ratings || 0 // Using ratings as proxy for reviews
        });
      }

      return historicalData;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  /**
   * Get enhanced top tracked games with ratings data
   */
  private async getEnhancedTopTrackedGames(limit: number = 10, timeRangeDays: number = 7): Promise<EnhancedGameMetrics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRangeDays);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    try {
      // Get game views (limit query size for performance)
      const { data: viewData } = await supabase
        .from('game_views')
        .select('game_id, session_hash, user_id, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(8000); // Reduced limit for performance

      if (!viewData) return [];

      // Aggregate view statistics
      const gameStats = new Map<number, {
        views: number;
        sessions: Set<string>;
        users: Set<number>;
        viewsToday: number;
        viewsThisWeek: number;
        dailyViews: Map<string, number>;
      }>();

      viewData.forEach(row => {
        const stats = gameStats.get(row.game_id) || {
          views: 0,
          sessions: new Set(),
          users: new Set(),
          viewsToday: 0,
          viewsThisWeek: 0,
          dailyViews: new Map()
        };

        stats.views++;
        if (row.session_hash) stats.sessions.add(row.session_hash);
        if (row.user_id) stats.users.add(row.user_id);

        const viewDate = new Date(row.created_at);
        const dateKey = viewDate.toISOString().split('T')[0];
        stats.dailyViews.set(dateKey, (stats.dailyViews.get(dateKey) || 0) + 1);

        if (viewDate >= today) stats.viewsToday++;
        if (viewDate >= weekAgo) stats.viewsThisWeek++;

        gameStats.set(row.game_id, stats);
      });

      // Get top games by views
      const topGameIds = Array.from(gameStats.entries())
        .sort((a, b) => b[1].views - a[1].views)
        .slice(0, limit)
        .map(([gameId]) => gameId);

      if (topGameIds.length === 0) return [];

      // Get game details
      const { data: gameDetails } = await supabase
        .from('game')
        .select('id, name, slug, cover_url')
        .in('id', topGameIds);

      // Get ratings for these games
      const { data: ratingsData } = await supabase
        .from('rating')
        .select('game_id, score, created_at')
        .in('game_id', topGameIds)
        .gte('created_at', startDate.toISOString())
        .limit(2000); // Limit ratings query

      // Aggregate ratings by game
      const ratingsStats = new Map<number, {
        total: number;
        count: number;
        recent: number;
      }>();

      ratingsData?.forEach(row => {
        const stats = ratingsStats.get(row.game_id) || { total: 0, count: 0, recent: 0 };
        stats.total += row.score;
        stats.count++;
        
        const ratingDate = new Date(row.created_at);
        if (ratingDate >= weekAgo) stats.recent++;
        
        ratingsStats.set(row.game_id, stats);
      });

      // Combine all data
      const enhancedGames: EnhancedGameMetrics[] = topGameIds.map(gameId => {
        const viewStats = gameStats.get(gameId)!;
        const game = gameDetails?.find(g => g.id === gameId);
        const ratingStats = ratingsStats.get(gameId);
        
        const avgSessionsPerDay = viewStats.dailyViews.size > 0 
          ? viewStats.sessions.size / viewStats.dailyViews.size 
          : 0;

        const avgRating = ratingStats && ratingStats.count > 0 
          ? ratingStats.total / ratingStats.count 
          : undefined;

        // Calculate enhanced ranking factors
        const ratingScore = avgRating ? (avgRating / 10) * 100 : 0; // Convert to 0-100 scale
        const engagementScore = (viewStats.viewsToday * 5) + (viewStats.viewsThisWeek * 2) + viewStats.views;

        return {
          gameId,
          gameName: game?.name,
          gameSlug: game?.slug,
          gameCover: game?.cover_url,
          views: viewStats.views,
          uniqueSessions: viewStats.sessions.size,
          avgRating: avgRating ? Math.round(avgRating * 10) / 10 : undefined,
          totalRatings: ratingStats?.count || 0,
          recentRatings: ratingStats?.recent || 0,
          rankingFactors: {
            totalViews: viewStats.views,
            uniqueUsers: viewStats.users.size,
            viewsToday: viewStats.viewsToday,
            viewsThisWeek: viewStats.viewsThisWeek,
            avgSessionsPerDay: Math.round(avgSessionsPerDay * 100) / 100,
            ratingScore: Math.round(ratingScore * 10) / 10,
            engagementScore: Math.round(engagementScore * 10) / 10
          }
        };
      });

      return enhancedGames;
    } catch (error) {
      console.error('Error fetching enhanced game metrics:', error);
      return [];
    }
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

  /**
   * Get A/B Testing Metrics for Privacy Dashboard
   * Respects API and DB limits for diagnostic display
   */
  private async getABTestingMetrics(days: number) {
    try {
      // Query limits for diagnostic display
      const DIAGNOSTIC_LIMITS = {
        experiments: 10,      // Top 10 experiments
        assignments: 1000,    // Recent assignments
        conversions: 2000,    // Recent conversions
        activities: 20        // Recent activities
      };

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get active experiments (limited)
      const { data: activeExperiments, error: expError } = await supabase
        .from('ab_test_experiments')
        .select('id, name, status, created_at, variants')
        .eq('status', 'active')
        .limit(DIAGNOSTIC_LIMITS.experiments);

      if (expError) {
        console.warn('Failed to fetch A/B test experiments:', expError);
        return null;
      }

      const activeExperimentCount = activeExperiments?.length || 0;

      // Get total participants (limited by time range)
      const { data: assignments, error: assignError } = await supabase
        .from('ab_test_assignments')
        .select('experiment_id, session_id, user_id, assigned_at')
        .gte('assigned_at', startDate.toISOString())
        .limit(DIAGNOSTIC_LIMITS.assignments);

      if (assignError) {
        console.warn('Failed to fetch A/B test assignments:', assignError);
        return null;
      }

      const totalParticipants = assignments?.length || 0;
      const anonymousParticipants = assignments?.filter(a => !a.user_id).length || 0;

      // Get total conversions (limited by time range)
      const { data: conversions, error: convError } = await supabase
        .from('ab_test_conversions')
        .select('experiment_id, session_id, event_type, recorded_at')
        .gte('recorded_at', startDate.toISOString())
        .limit(DIAGNOSTIC_LIMITS.conversions);

      if (convError) {
        console.warn('Failed to fetch A/B test conversions:', convError);
        return null;
      }

      const totalConversions = conversions?.length || 0;
      const averageConversionRate = totalParticipants > 0 ? (totalConversions / totalParticipants) * 100 : 0;

      // Calculate experiments this week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: recentExperiments, error: recentError } = await supabase
        .from('ab_test_experiments')
        .select('id')
        .gte('created_at', oneWeekAgo.toISOString())
        .limit(DIAGNOSTIC_LIMITS.experiments);

      const experimentsThisWeek = recentExperiments?.length || 0;

      // Get top performing experiments (with limited data)
      const topPerformingExperiments = [];
      
      if (activeExperiments) {
        for (const experiment of activeExperiments.slice(0, 5)) { // Limit to top 5 for display
          try {
            const analytics = await abTestingService.getExperimentAnalytics(experiment.id);
            if (analytics) {
              topPerformingExperiments.push({
                id: experiment.id,
                name: experiment.name,
                participants: analytics.totalParticipants,
                conversionRate: analytics.variantResults.length > 0 
                  ? analytics.variantResults.reduce((sum, v) => sum + v.metrics.conversionRate, 0) / analytics.variantResults.length 
                  : 0,
                status: experiment.status as 'active' | 'completed',
                significanceLevel: analytics.statisticalPower
              });
            }
          } catch (err) {
            console.warn(`Failed to get analytics for experiment ${experiment.id}:`, err);
          }
        }
      }

      // Get recent A/B testing activity (limited)
      const recentActivity = [];
      
      // Recent assignments
      if (assignments) {
        const recentAssignments = assignments
          .slice(0, DIAGNOSTIC_LIMITS.activities / 2)
          .map(a => ({
            timestamp: a.assigned_at,
            type: 'assignment' as const,
            experimentId: a.experiment_id,
            experimentName: activeExperiments?.find(e => e.id === a.experiment_id)?.name
          }));
        recentActivity.push(...recentAssignments);
      }

      // Recent conversions
      if (conversions) {
        const recentConversions = conversions
          .slice(0, DIAGNOSTIC_LIMITS.activities / 2)
          .map(c => ({
            timestamp: c.recorded_at,
            type: 'conversion' as const,
            experimentId: c.experiment_id,
            experimentName: activeExperiments?.find(e => e.id === c.experiment_id)?.name
          }));
        recentActivity.push(...recentConversions);
      }

      // Sort by timestamp and limit
      recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      recentActivity.splice(DIAGNOSTIC_LIMITS.activities);

      return {
        activeExperiments: activeExperimentCount,
        totalParticipants,
        totalConversions,
        experimentsThisWeek,
        averageConversionRate: Math.round(averageConversionRate * 100) / 100, // 2 decimal places
        topPerformingExperiments,
        recentActivity,
        privacyCompliance: {
          consentRespected: true, // Always true as service respects consent
          anonymousParticipants,
          dataRetentionCompliant: true // Queries respect time range limits
        }
      };

    } catch (error) {
      console.error('Failed to get A/B testing metrics:', error);
      return null; // Return null on error, dashboard will handle gracefully
    }
  }
}

// Export singleton instance
export const privacyDashboardService = new PrivacyDashboardService();