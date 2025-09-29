/**
 * Search Analytics Service
 * Tracks search queries, performance metrics, and user behavior
 */

import { supabase } from './supabase';
import { GameSearchResult } from '../types/search';

interface SearchAnalytic {
  id?: number;
  query: string;
  normalized_query: string;
  result_count: number;
  execution_time_ms: number;
  cache_hit: boolean;
  user_id?: string;
  session_id: string;
  created_at?: string;
}

interface SearchPerformanceMetrics {
  avgExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  totalSearches: number;
  cacheHitRate: number;
  zeroResultSearches: number;
  errorRate: number;
}

interface PopularSearch {
  query: string;
  searchCount: number;
  avgResults: number;
  avgTimeMs: number;
}

interface SearchTrend {
  query: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;
}

class SearchAnalyticsService {
  private sessionId: string;
  private batchQueue: SearchAnalytic[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 5000; // 5 seconds
  private privacyMode: boolean = false;

  constructor() {
    // Generate session ID for this browser session
    this.sessionId = this.generateSessionId();
    // Load privacy settings
    this.loadPrivacySettings();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load privacy settings from localStorage
   */
  private loadPrivacySettings(): void {
    const settings = localStorage.getItem('analytics_privacy_settings');
    if (settings) {
      try {
        const parsed = JSON.parse(settings);
        this.privacyMode = parsed.anonymousMode || false;
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      }
    }
  }

  /**
   * Set privacy mode (anonymous analytics)
   */
  setPrivacyMode(anonymous: boolean): void {
    this.privacyMode = anonymous;
    localStorage.setItem('analytics_privacy_settings', JSON.stringify({
      anonymousMode: anonymous
    }));
  }

  /**
   * Normalize query for consistent tracking
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Remove accents
  }

  /**
   * Track a search query
   */
  async trackSearch(
    query: string,
    results: GameSearchResult[],
    executionTime: number,
    cacheHit: boolean,
    error?: Error
  ): Promise<void> {
    // Skip tracking if analytics are disabled
    const analyticsEnabled = localStorage.getItem('analytics_enabled') !== 'false';
    if (!analyticsEnabled) {
      return;
    }

    try {
      // Get current user if not in privacy mode
      let userId: string | undefined;
      if (!this.privacyMode) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id;
      }

      const analytic: SearchAnalytic = {
        query,
        normalized_query: this.normalizeQuery(query),
        result_count: error ? -1 : results.length,
        execution_time_ms: Math.round(executionTime),
        cache_hit: cacheHit,
        user_id: userId,
        session_id: this.sessionId
      };

      // Add to batch queue
      this.batchQueue.push(analytic);

      // Process batch if size reached
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        this.processBatch();
      } else {
        // Schedule batch processing
        this.scheduleBatch();
      }

      // Log performance for development
      console.log(`📊 SEARCH TRACKED: "${query}" - ${results.length} results in ${executionTime}ms (cache: ${cacheHit})`);
    } catch (error) {
      console.error('Failed to track search:', error);
    }
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatch(): void {
    if (this.batchTimer) {
      return; // Already scheduled
    }

    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Process batch of analytics
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) {
      return;
    }

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Get batch to process
    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Insert batch into database
      const { error } = await supabase
        .from('search_analytics')
        .insert(batch);

      if (error) {
        console.error('Failed to insert analytics batch:', error);
        // Re-add to queue for retry (but limit to prevent infinite growth)
        if (this.batchQueue.length < this.BATCH_SIZE * 2) {
          this.batchQueue.unshift(...batch);
        }
      } else {
        console.log(`📊 Analytics batch processed: ${batch.length} searches`);
      }
    } catch (error) {
      console.error('Analytics batch processing error:', error);
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(
    timeRange: 'day' | 'week' | 'month' = 'week',
    limit: number = 20
  ): Promise<PopularSearch[]> {
    try {
      // Calculate time range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      // Query popular searches
      const { data, error } = await supabase
        .from('popular_searches')
        .select('*')
        .gte('last_searched', startDate.toISOString())
        .order('search_count', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get popular searches:', error);
        return [];
      }

      return data?.map(item => ({
        query: item.normalized_query,
        searchCount: item.search_count,
        avgResults: Math.round(item.avg_results),
        avgTimeMs: Math.round(item.avg_time_ms)
      })) || [];
    } catch (error) {
      console.error('Error fetching popular searches:', error);
      return [];
    }
  }

  /**
   * Get trending searches (comparing current period to previous)
   */
  async getTrendingSearches(limit: number = 10): Promise<SearchTrend[]> {
    try {
      // Get current week's popular searches
      const currentWeek = await this.getPopularSearches('week', 50);

      // Get last week's data
      const { data: lastWeekData, error } = await supabase
        .rpc('get_trending_searches', {
          limit_count: limit
        });

      if (error) {
        console.error('Failed to get trending searches:', error);
        return currentWeek.slice(0, limit).map(search => ({
          query: search.query,
          currentCount: search.searchCount,
          previousCount: 0,
          growthRate: 100
        }));
      }

      return lastWeekData || [];
    } catch (error) {
      console.error('Error fetching trending searches:', error);
      return [];
    }
  }

  /**
   * Get user's search history
   */
  async getUserSearchHistory(
    userId: string,
    limit: number = 50
  ): Promise<SearchAnalytic[]> {
    try {
      // Check privacy mode
      if (this.privacyMode) {
        return [];
      }

      const { data, error } = await supabase
        .from('search_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get user search history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching user search history:', error);
      return [];
    }
  }

  /**
   * Get search performance metrics
   */
  async getSearchPerformanceMetrics(
    timeRange: 'hour' | 'day' | 'week' = 'day'
  ): Promise<SearchPerformanceMetrics> {
    try {
      // Calculate time range
      const now = new Date();
      let startDate: Date;

      switch (timeRange) {
        case 'hour':
          startDate = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
      }

      // Get metrics from database
      const { data: metrics, error } = await supabase
        .rpc('get_search_performance_metrics', {
          start_date: startDate.toISOString()
        });

      if (error) {
        console.error('Failed to get performance metrics:', error);
        return {
          avgExecutionTime: 0,
          medianExecutionTime: 0,
          p95ExecutionTime: 0,
          totalSearches: 0,
          cacheHitRate: 0,
          zeroResultSearches: 0,
          errorRate: 0
        };
      }

      return metrics?.[0] || {
        avgExecutionTime: 0,
        medianExecutionTime: 0,
        p95ExecutionTime: 0,
        totalSearches: 0,
        cacheHitRate: 0,
        zeroResultSearches: 0,
        errorRate: 0
      };
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return {
        avgExecutionTime: 0,
        medianExecutionTime: 0,
        p95ExecutionTime: 0,
        totalSearches: 0,
        cacheHitRate: 0,
        zeroResultSearches: 0,
        errorRate: 0
      };
    }
  }

  /**
   * Get searches with zero results
   */
  async getZeroResultSearches(limit: number = 20): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('normalized_query')
        .eq('result_count', 0)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get zero result searches:', error);
        return [];
      }

      // Deduplicate
      const unique = [...new Set(data?.map(item => item.normalized_query) || [])];
      return unique;
    } catch (error) {
      console.error('Error fetching zero result searches:', error);
      return [];
    }
  }

  /**
   * Clear old analytics data (GDPR compliance)
   */
  async clearOldAnalytics(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await supabase
        .from('search_analytics')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

      if (error) {
        console.error('Failed to clear old analytics:', error);
        return 0;
      }

      const deletedCount = data?.length || 0;
      console.log(`🗑️ Cleared ${deletedCount} old analytics records`);
      return deletedCount;
    } catch (error) {
      console.error('Error clearing old analytics:', error);
      return 0;
    }
  }

  /**
   * Export user's search data (GDPR compliance)
   */
  async exportUserData(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to export user data:', error);
        return null;
      }

      return {
        userId,
        exportDate: new Date().toISOString(),
        searchHistory: data || [],
        totalSearches: data?.length || 0
      };
    } catch (error) {
      console.error('Error exporting user data:', error);
      return null;
    }
  }

  /**
   * Delete user's search data (GDPR compliance)
   */
  async deleteUserData(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('search_analytics')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete user data:', error);
        return false;
      }

      console.log(`🗑️ Deleted search data for user: ${userId}`);
      return true;
    } catch (error) {
      console.error('Error deleting user data:', error);
      return false;
    }
  }

  /**
   * Flush any pending analytics before page unload
   */
  flush(): void {
    if (this.batchQueue.length > 0) {
      // Use sendBeacon for reliability during page unload
      const data = JSON.stringify({
        analytics: this.batchQueue
      });

      if (navigator.sendBeacon) {
        // This would need an endpoint to receive the data
        // For now, we'll try to process synchronously
        this.processBatch();
      }
    }
  }
}

// Export singleton instance
export const searchAnalyticsService = new SearchAnalyticsService();

// Ensure analytics are flushed on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    searchAnalyticsService.flush();
  });
}