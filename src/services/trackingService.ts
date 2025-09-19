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