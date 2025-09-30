/**
 * Tracking Service
 * Handles privacy-compliant game view tracking
 * Respects user consent and implements data minimization
 */

import { supabase } from './supabase';
import { privacyService } from './privacyService';

// Types
export type ViewSource = 'search' | 'direct' | 'recommendation' | 'list' | 'review' | 'profile';

export interface GameViewEvent {
  gameId: number;
  source: ViewSource;
  userId?: number;
  metadata?: Record<string, any>;
}

export interface TrackingResult {
  success: boolean;
  tracked: boolean;
  reason?: string;
}

export interface CohortAnalysis {
  cohortDate: string;
  totalUsers: number;
  returningUsers: number;
  retentionRate: number;
  avgViewsPerUser: number;
}

export interface GamePerformanceTrend {
  gameId: number;
  gameName?: string;
  weeklyData: Array<{
    week: string;
    views: number;
    uniqueSessions: number;
    changePercent: number;
  }>;
  overallTrend: 'rising' | 'falling' | 'stable';
  totalViews: number;
}

export interface SourceAttribution {
  source: ViewSource;
  count: number;
  percentage: number;
  conversionRate?: number;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueSessions: number;
  avgViewsPerSession: number;
  topGames: Array<{ gameId: number; gameName?: string; views: number }>;
  sourceBreakdown: SourceAttribution[];
  periodComparison: {
    current: number;
    previous: number;
    changePercent: number;
  };
}

// Throttling cache to prevent duplicate tracking
interface ThrottleEntry {
  gameId: number;
  sessionHash: string;
  timestamp: number;
}

class TrackingService {
  private throttleCache: Map<string, ThrottleEntry> = new Map();
  private batchQueue: GameViewEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 5000; // 5 seconds
  private readonly THROTTLE_DURATION = 300000; // 5 minutes

  constructor() {
    // Clean up throttle cache periodically
    setInterval(() => this.cleanThrottleCache(), 60000); // Every minute

    // Process batch queue when page unloads
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushBatch();
      });
    }
  }

  /**
   * Track a game view event
   */
  async trackGameView(
    gameId: number,
    source: ViewSource,
    userId?: number
  ): Promise<TrackingResult> {
    try {
      // Check if tracking is allowed
      const trackingStatus = await privacyService.shouldTrack(userId);
      
      if (!trackingStatus.allowed) {
        return {
          success: true,
          tracked: false,
          reason: 'User has not consented to tracking'
        };
      }

      // Check throttling to prevent duplicate tracking
      const throttleKey = `${gameId}-${trackingStatus.sessionHash}`;
      if (this.isThrottled(throttleKey)) {
        return {
          success: true,
          tracked: false,
          reason: 'View already tracked in this session recently'
        };
      }

      // Determine what to track based on tracking level
      let trackUserId: number | null = null;
      if (trackingStatus.level === 'full' && userId) {
        trackUserId = userId;
      }

      // Add to batch queue
      this.addToBatch({
        gameId,
        source,
        userId: trackUserId || undefined
      });

      // Update throttle cache
      this.throttleCache.set(throttleKey, {
        gameId,
        sessionHash: trackingStatus.sessionHash,
        timestamp: Date.now()
      });

      return {
        success: true,
        tracked: true
      };
    } catch (error) {
      console.error('Error tracking game view:', error);
      return {
        success: false,
        tracked: false,
        reason: 'Tracking error occurred'
      };
    }
  }

  /**
   * Add event to batch queue
   */
  private addToBatch(event: GameViewEvent): void {
    this.batchQueue.push(event);

    // Process batch if it reaches the size limit
    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.processBatch();
    } else {
      // Schedule batch processing
      this.scheduleBatch();
    }
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process the batch queue
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get events to process
    const events = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Get session hash for all events
      const sessionHash = await privacyService.getCurrentSessionHash();

      // Prepare batch insert data
      const insertData = await Promise.all(
        events.map(async (event) => ({
          game_id: event.gameId,
          user_id: event.userId || null,
          session_hash: sessionHash,
          view_source: event.source,
          view_date: new Date().toISOString().split('T')[0] // Date only
        }))
      );

      // Batch insert
      const { error } = await supabase
        .from('game_views')
        .insert(insertData);

      if (error) {
        console.error('Error batch inserting game views:', error);
        // Re-add failed events to queue for retry
        this.batchQueue.push(...events);
        this.scheduleBatch();
      }
    } catch (error) {
      console.error('Error processing batch:', error);
      // Re-add failed events to queue for retry
      this.batchQueue.push(...events);
      this.scheduleBatch();
    }
  }

  /**
   * Flush batch immediately (used on page unload)
   */
  private flushBatch(): void {
    if (this.batchQueue.length > 0) {
      // Use sendBeacon for reliability on page unload
      this.sendBeacon(this.batchQueue);
      this.batchQueue = [];
    }
  }

  /**
   * Send tracking data using sendBeacon API
   */
  private async sendBeacon(events: GameViewEvent[]): Promise<void> {
    try {
      const sessionHash = await privacyService.getCurrentSessionHash();
      const data = {
        events: events.map(event => ({
          game_id: event.gameId,
          user_id: event.userId || null,
          session_hash: sessionHash,
          view_source: event.source,
          view_date: new Date().toISOString().split('T')[0]
        }))
      };

      // Get Supabase URL and anon key from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (navigator.sendBeacon && supabaseUrl && supabaseAnonKey) {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        navigator.sendBeacon(
          `${supabaseUrl}/rest/v1/game_views?on_conflict=id`,
          blob
        );
      }
    } catch (error) {
      console.error('Error sending beacon:', error);
    }
  }

  /**
   * Check if a view is throttled
   */
  private isThrottled(key: string): boolean {
    const entry = this.throttleCache.get(key);
    if (!entry) return false;

    const now = Date.now();
    const elapsed = now - entry.timestamp;

    return elapsed < this.THROTTLE_DURATION;
  }

  /**
   * Clean expired entries from throttle cache
   */
  private cleanThrottleCache(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.throttleCache.forEach((entry, key) => {
      if (now - entry.timestamp > this.THROTTLE_DURATION) {
        expired.push(key);
      }
    });

    expired.forEach(key => this.throttleCache.delete(key));
  }

  /**
   * Track search result click
   */
  async trackSearchResultClick(gameId: number, userId?: number): Promise<TrackingResult> {
    return this.trackGameView(gameId, 'search', userId);
  }

  /**
   * Track recommendation click
   */
  async trackRecommendationClick(gameId: number, userId?: number): Promise<TrackingResult> {
    return this.trackGameView(gameId, 'recommendation', userId);
  }

  /**
   * Track list item click
   */
  async trackListItemClick(gameId: number, userId?: number): Promise<TrackingResult> {
    return this.trackGameView(gameId, 'list', userId);
  }

  /**
   * Track review page view
   */
  async trackReviewView(gameId: number, userId?: number): Promise<TrackingResult> {
    return this.trackGameView(gameId, 'review', userId);
  }

  /**
   * Track profile game view
   */
  async trackProfileGameView(gameId: number, userId?: number): Promise<TrackingResult> {
    return this.trackGameView(gameId, 'profile', userId);
  }

  /**
   * Get game view statistics (aggregated, privacy-safe)
   */
  async getGameStats(gameId: number): Promise<{
    totalViews: number;
    uniqueSessions: number;
    viewsBySource: Record<ViewSource, number>;
  } | null> {
    try {
      // Get aggregated stats from the daily metrics table
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('game_metrics_daily')
        .select('total_views, unique_sessions, view_sources')
        .eq('game_id', gameId)
        .gte('metric_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching game stats:', error);
        return null;
      }

      // Aggregate the daily metrics
      const stats = data?.reduce(
        (acc, day) => ({
          totalViews: acc.totalViews + (day.total_views || 0),
          uniqueSessions: acc.uniqueSessions + (day.unique_sessions || 0),
          viewsBySource: Object.entries(day.view_sources || {}).reduce(
            (sources, [source, count]) => ({
              ...sources,
              [source]: (sources[source as ViewSource] || 0) + (count as number)
            }),
            acc.viewsBySource
          )
        }),
        {
          totalViews: 0,
          uniqueSessions: 0,
          viewsBySource: {
            search: 0,
            direct: 0,
            recommendation: 0,
            list: 0,
            review: 0,
            profile: 0
          } as Record<ViewSource, number>
        }
      );

      return stats || null;
    } catch (error) {
      console.error('Error getting game stats:', error);
      return null;
    }
  }

  /**
   * Get cohort analysis for user retention
   * Groups users by first view date and tracks return behavior
   */
  async getCohortAnalysis(startDate: Date, endDate: Date): Promise<CohortAnalysis[]> {
    try {
      const { data, error } = await supabase
        .from('game_views')
        .select('user_id, view_date, session_hash')
        .gte('view_date', startDate.toISOString().split('T')[0])
        .lte('view_date', endDate.toISOString().split('T')[0])
        .not('user_id', 'is', null);

      if (error) {
        console.error('Error fetching cohort data:', error);
        return [];
      }

      const cohorts = new Map<string, Set<number>>();
      const allViews = new Map<string, Map<number, number>>();

      data?.forEach(row => {
        const date = row.view_date;
        const userId = row.user_id;

        if (!cohorts.has(date)) {
          cohorts.set(date, new Set());
          allViews.set(date, new Map());
        }

        cohorts.get(date)!.add(userId);
        const userViews = allViews.get(date)!;
        userViews.set(userId, (userViews.get(userId) || 0) + 1);
      });

      const laterViews = new Map<string, Set<number>>();
      data?.forEach(row => {
        const date = row.view_date;
        const userId = row.user_id;

        cohorts.forEach((cohortUsers, cohortDate) => {
          if (cohortDate < date && cohortUsers.has(userId)) {
            if (!laterViews.has(cohortDate)) {
              laterViews.set(cohortDate, new Set());
            }
            laterViews.get(cohortDate)!.add(userId);
          }
        });
      });

      const analysis: CohortAnalysis[] = [];
      cohorts.forEach((users, date) => {
        const returning = laterViews.get(date)?.size || 0;
        const totalUsers = users.size;
        const totalViews = Array.from(allViews.get(date)!.values()).reduce((a, b) => a + b, 0);

        analysis.push({
          cohortDate: date,
          totalUsers,
          returningUsers: returning,
          retentionRate: totalUsers > 0 ? (returning / totalUsers) * 100 : 0,
          avgViewsPerUser: totalUsers > 0 ? totalViews / totalUsers : 0
        });
      });

      return analysis.sort((a, b) => a.cohortDate.localeCompare(b.cohortDate));
    } catch (error) {
      console.error('Error getting cohort analysis:', error);
      return [];
    }
  }

  /**
   * Get game performance trends over time
   */
  async getGamePerformanceTrends(
    gameIds: number[],
    weeks: number = 8
  ): Promise<GamePerformanceTrend[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - (weeks * 7));

      const { data, error } = await supabase
        .from('game_metrics_daily')
        .select('game_id, metric_date, total_views, unique_sessions')
        .in('game_id', gameIds)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: true });

      if (error) {
        console.error('Error fetching performance trends:', error);
        return [];
      }

      const gameData = new Map<number, Array<{
        week: string;
        views: number;
        uniqueSessions: number;
      }>>();

      data?.forEach(row => {
        const weekStart = this.getWeekStart(new Date(row.metric_date));
        const weekKey = weekStart.toISOString().split('T')[0];

        if (!gameData.has(row.game_id)) {
          gameData.set(row.game_id, []);
        }

        const gameWeeks = gameData.get(row.game_id)!;
        const existingWeek = gameWeeks.find(w => w.week === weekKey);

        if (existingWeek) {
          existingWeek.views += row.total_views;
          existingWeek.uniqueSessions += row.unique_sessions;
        } else {
          gameWeeks.push({
            week: weekKey,
            views: row.total_views,
            uniqueSessions: row.unique_sessions
          });
        }
      });

      const trends: GamePerformanceTrend[] = [];
      gameData.forEach((weeklyData, gameId) => {
        weeklyData.sort((a, b) => a.week.localeCompare(b.week));

        const dataWithChange = weeklyData.map((week, index) => {
          const prevWeek = index > 0 ? weeklyData[index - 1] : null;
          const changePercent = prevWeek
            ? ((week.views - prevWeek.views) / prevWeek.views) * 100
            : 0;

          return { ...week, changePercent };
        });

        const totalViews = weeklyData.reduce((sum, w) => sum + w.views, 0);
        const avgChange = dataWithChange.length > 1
          ? dataWithChange.slice(1).reduce((sum, w) => sum + w.changePercent, 0) / (dataWithChange.length - 1)
          : 0;

        let overallTrend: 'rising' | 'falling' | 'stable' = 'stable';
        if (avgChange > 10) overallTrend = 'rising';
        else if (avgChange < -10) overallTrend = 'falling';

        trends.push({
          gameId,
          weeklyData: dataWithChange,
          overallTrend,
          totalViews
        });
      });

      return trends;
    } catch (error) {
      console.error('Error getting game performance trends:', error);
      return [];
    }
  }

  /**
   * Get source attribution report
   */
  async getSourceAttribution(startDate: Date, endDate: Date): Promise<SourceAttribution[]> {
    try {
      const { data, error } = await supabase
        .from('game_metrics_daily')
        .select('view_sources')
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .lte('metric_date', endDate.toISOString().split('T')[0]);

      if (error) {
        console.error('Error fetching source attribution:', error);
        return [];
      }

      const sourceTotals = new Map<ViewSource, number>();
      let totalViews = 0;

      data?.forEach(row => {
        const sources = row.view_sources as Record<string, number>;
        Object.entries(sources).forEach(([source, count]) => {
          const currentCount = sourceTotals.get(source as ViewSource) || 0;
          sourceTotals.set(source as ViewSource, currentCount + count);
          totalViews += count;
        });
      });

      const attribution: SourceAttribution[] = [];
      sourceTotals.forEach((count, source) => {
        attribution.push({
          source,
          count,
          percentage: totalViews > 0 ? (count / totalViews) * 100 : 0
        });
      });

      return attribution.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('Error getting source attribution:', error);
      return [];
    }
  }

  /**
   * Get comprehensive analytics summary
   */
  async getAnalyticsSummary(days: number = 30): Promise<AnalyticsSummary | null> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const previousStart = new Date(startDate);
      previousStart.setDate(previousStart.getDate() - days);

      const [currentData, previousData] = await Promise.all([
        this.getPeriodStats(startDate, endDate),
        this.getPeriodStats(previousStart, startDate)
      ]);

      if (!currentData) return null;

      const topGames = await this.getTopGames(startDate, endDate, 10);
      const sourceBreakdown = await this.getSourceAttribution(startDate, endDate);

      return {
        totalViews: currentData.totalViews,
        uniqueSessions: currentData.uniqueSessions,
        avgViewsPerSession: currentData.uniqueSessions > 0
          ? currentData.totalViews / currentData.uniqueSessions
          : 0,
        topGames,
        sourceBreakdown,
        periodComparison: {
          current: currentData.totalViews,
          previous: previousData?.totalViews || 0,
          changePercent: previousData && previousData.totalViews > 0
            ? ((currentData.totalViews - previousData.totalViews) / previousData.totalViews) * 100
            : 0
        }
      };
    } catch (error) {
      console.error('Error getting analytics summary:', error);
      return null;
    }
  }

  private async getPeriodStats(startDate: Date, endDate: Date): Promise<{
    totalViews: number;
    uniqueSessions: number;
  } | null> {
    const { data, error } = await supabase
      .from('game_metrics_daily')
      .select('total_views, unique_sessions')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0]);

    if (error) return null;

    const totals = data?.reduce(
      (acc, row) => ({
        totalViews: acc.totalViews + row.total_views,
        uniqueSessions: acc.uniqueSessions + row.unique_sessions
      }),
      { totalViews: 0, uniqueSessions: 0 }
    );

    return totals || null;
  }

  private async getTopGames(
    startDate: Date,
    endDate: Date,
    limit: number
  ): Promise<Array<{ gameId: number; views: number }>> {
    const { data, error } = await supabase
      .from('game_metrics_daily')
      .select('game_id, total_views')
      .gte('metric_date', startDate.toISOString().split('T')[0])
      .lte('metric_date', endDate.toISOString().split('T')[0]);

    if (error) return [];

    const gameTotals = new Map<number, number>();
    data?.forEach(row => {
      const current = gameTotals.get(row.game_id) || 0;
      gameTotals.set(row.game_id, current + row.total_views);
    });

    return Array.from(gameTotals.entries())
      .map(([gameId, views]) => ({ gameId, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  /**
   * Get trending games (privacy-safe, aggregated data only)
   */
  async getTrendingGames(limit: number = 10): Promise<Array<{
    gameId: number;
    views: number;
    trend: 'up' | 'down' | 'stable';
  }>> {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);

      // Get this week's data
      const { data: thisWeek, error: thisWeekError } = await supabase
        .from('game_metrics_daily')
        .select('game_id, total_views')
        .gte('metric_date', weekAgo.toISOString().split('T')[0])
        .lte('metric_date', yesterday.toISOString().split('T')[0]);

      if (thisWeekError) {
        console.error('Error fetching trending games:', thisWeekError);
        return [];
      }

      // Get last week's data for comparison
      const twoWeeksAgo = new Date(weekAgo);
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

      const { data: lastWeek } = await supabase
        .from('game_metrics_daily')
        .select('game_id, total_views')
        .gte('metric_date', twoWeeksAgo.toISOString().split('T')[0])
        .lt('metric_date', weekAgo.toISOString().split('T')[0]);

      // Aggregate by game
      const thisWeekTotals = new Map<number, number>();
      const lastWeekTotals = new Map<number, number>();

      thisWeek?.forEach(row => {
        const current = thisWeekTotals.get(row.game_id) || 0;
        thisWeekTotals.set(row.game_id, current + row.total_views);
      });

      lastWeek?.forEach(row => {
        const current = lastWeekTotals.get(row.game_id) || 0;
        lastWeekTotals.set(row.game_id, current + row.total_views);
      });

      // Calculate trends
      const trending: Array<{
        gameId: number;
        views: number;
        trend: 'up' | 'down' | 'stable';
      }> = [];

      thisWeekTotals.forEach((views, gameId) => {
        const lastWeekViews = lastWeekTotals.get(gameId) || 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';

        if (views > lastWeekViews * 1.1) {
          trend = 'up';
        } else if (views < lastWeekViews * 0.9) {
          trend = 'down';
        }

        trending.push({ gameId, views, trend });
      });

      // Sort by views and return top N
      return trending
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting trending games:', error);
      return [];
    }
  }
}

// Export singleton instance
export const trackingService = new TrackingService();