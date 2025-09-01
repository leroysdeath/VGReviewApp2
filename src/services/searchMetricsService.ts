import { 
  SLOW_SEARCH_THRESHOLD_MS, 
  CRITICAL_SEARCH_THRESHOLD_MS,
  SearchQuality,
  SearchMode,
  SEARCH_HISTORY_MAX_SIZE,
  SEARCH_ANALYTICS_BATCH_SIZE
} from '../constants/search';

interface SearchMetric {
  query: string;
  timestamp: Date;
  duration: number;
  resultCount: number;
  dbResultCount: number;
  igdbResultCount: number;
  mode: SearchMode;
  quality: SearchQuality;
  cached: boolean;
  error?: string;
}

interface AggregatedMetrics {
  totalSearches: number;
  averageDuration: number;
  medianDuration: number;
  p95Duration: number;
  p99Duration: number;
  dbHitRate: number;
  cacheHitRate: number;
  errorRate: number;
  qualityBreakdown: Record<SearchQuality, number>;
  modeBreakdown: Record<SearchMode, number>;
  slowestQueries: Array<{ query: string; duration: number }>;
  mostFrequentQueries: Array<{ query: string; count: number }>;
}

/**
 * Service for tracking and analyzing search performance metrics
 */
class SearchMetricsService {
  private metrics: SearchMetric[] = [];
  private searchStartTimes = new Map<string, number>();
  private searchCounts = new Map<string, number>();
  private isEnabled = true;

  constructor() {
    // Load historical metrics from localStorage
    this.loadMetrics();
    
    // Set up periodic persistence
    setInterval(() => this.persistMetrics(), 30000); // Save every 30 seconds
    
    // Set up periodic cleanup
    setInterval(() => this.cleanupOldMetrics(), 3600000); // Clean up hourly
  }

  /**
   * Start tracking a search
   */
  startSearch(query: string): string {
    const searchId = `${query}-${Date.now()}`;
    this.searchStartTimes.set(searchId, Date.now());
    
    // Track query frequency
    const normalizedQuery = query.toLowerCase().trim();
    this.searchCounts.set(normalizedQuery, (this.searchCounts.get(normalizedQuery) || 0) + 1);
    
    return searchId;
  }

  /**
   * Complete tracking a search
   */
  endSearch(
    searchId: string,
    results: {
      total: number;
      dbCount: number;
      igdbCount: number;
      cached: boolean;
      mode: SearchMode;
      error?: string;
    }
  ): void {
    if (!this.isEnabled) return;

    const startTime = this.searchStartTimes.get(searchId);
    if (!startTime) {
      console.warn(`No start time found for search ${searchId}`);
      return;
    }

    const duration = Date.now() - startTime;
    const query = searchId.split('-')[0];
    
    // Determine quality based on duration and source
    const quality = this.determineQuality(duration, results.mode, results.cached);

    const metric: SearchMetric = {
      query,
      timestamp: new Date(),
      duration,
      resultCount: results.total,
      dbResultCount: results.dbCount,
      igdbResultCount: results.igdbCount,
      mode: results.mode,
      quality,
      cached: results.cached,
      error: results.error,
    };

    this.metrics.push(metric);
    this.searchStartTimes.delete(searchId);

    // Log slow searches
    if (duration > SLOW_SEARCH_THRESHOLD_MS) {
      console.warn(`🐌 Slow search detected: "${query}" took ${duration}ms`, {
        quality,
        mode: results.mode,
        cached: results.cached,
        results: results.total
      });
    }

    // Emit custom event for monitoring tools
    this.emitMetricEvent(metric);
  }

  /**
   * Determine search quality based on performance
   */
  private determineQuality(duration: number, mode: SearchMode, cached: boolean): SearchQuality {
    if (cached && duration < 100) return SearchQuality.EXCELLENT;
    if (duration < 500 && mode === SearchMode.DATABASE_ONLY) return SearchQuality.EXCELLENT;
    if (duration < 1000) return SearchQuality.GOOD;
    if (duration < 2000) return SearchQuality.ACCEPTABLE;
    if (duration < CRITICAL_SEARCH_THRESHOLD_MS) return SearchQuality.SLOW;
    return SearchQuality.CRITICAL;
  }

  /**
   * Get aggregated metrics for a time period
   */
  getAggregatedMetrics(since?: Date): AggregatedMetrics {
    const relevantMetrics = since 
      ? this.metrics.filter(m => m.timestamp > since)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return this.getEmptyMetrics();
    }

    // Calculate durations
    const durations = relevantMetrics.map(m => m.duration).sort((a, b) => a - b);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);

    // Calculate percentiles
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    const medianIndex = Math.floor(durations.length / 2);

    // Calculate hit rates
    const dbHits = relevantMetrics.filter(m => m.dbResultCount > 0).length;
    const cacheHits = relevantMetrics.filter(m => m.cached).length;
    const errors = relevantMetrics.filter(m => m.error).length;

    // Quality breakdown
    const qualityBreakdown = relevantMetrics.reduce((acc, m) => {
      acc[m.quality] = (acc[m.quality] || 0) + 1;
      return acc;
    }, {} as Record<SearchQuality, number>);

    // Mode breakdown
    const modeBreakdown = relevantMetrics.reduce((acc, m) => {
      acc[m.mode] = (acc[m.mode] || 0) + 1;
      return acc;
    }, {} as Record<SearchMode, number>);

    // Slowest queries
    const slowestQueries = relevantMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(m => ({ query: m.query, duration: m.duration }));

    // Most frequent queries
    const mostFrequentQueries = Array.from(this.searchCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    return {
      totalSearches: relevantMetrics.length,
      averageDuration: totalDuration / relevantMetrics.length,
      medianDuration: durations[medianIndex],
      p95Duration: durations[p95Index],
      p99Duration: durations[p99Index],
      dbHitRate: (dbHits / relevantMetrics.length) * 100,
      cacheHitRate: (cacheHits / relevantMetrics.length) * 100,
      errorRate: (errors / relevantMetrics.length) * 100,
      qualityBreakdown,
      modeBreakdown,
      slowestQueries,
      mostFrequentQueries,
    };
  }

  /**
   * Get recent search metrics
   */
  getRecentMetrics(limit = 50): SearchMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get metrics for a specific query
   */
  getQueryMetrics(query: string): SearchMetric[] {
    const normalizedQuery = query.toLowerCase().trim();
    return this.metrics.filter(m => 
      m.query.toLowerCase().trim() === normalizedQuery
    );
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.searchStartTimes.clear();
    this.searchCounts.clear();
    this.persistMetrics();
  }

  /**
   * Enable/disable metrics collection
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetrics(): void {
    try {
      const stored = localStorage.getItem('searchMetrics');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.metrics = parsed.metrics.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));
        this.searchCounts = new Map(parsed.searchCounts);
      }
    } catch (error) {
      console.error('Failed to load search metrics:', error);
    }
  }

  /**
   * Persist metrics to localStorage
   */
  private persistMetrics(): void {
    try {
      // Keep only recent metrics to avoid storage bloat
      const recentMetrics = this.metrics.slice(-SEARCH_HISTORY_MAX_SIZE);
      
      // Keep only top search counts
      const topSearches = Array.from(this.searchCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, SEARCH_ANALYTICS_BATCH_SIZE);

      localStorage.setItem('searchMetrics', JSON.stringify({
        metrics: recentMetrics,
        searchCounts: topSearches,
      }));
    } catch (error) {
      console.error('Failed to persist search metrics:', error);
    }
  }

  /**
   * Clean up old metrics
   */
  private cleanupOldMetrics(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneDayAgo);
  }

  /**
   * Emit custom event for external monitoring
   */
  private emitMetricEvent(metric: SearchMetric): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('searchMetric', { 
        detail: metric 
      }));
    }
  }

  /**
   * Get empty metrics object
   */
  private getEmptyMetrics(): AggregatedMetrics {
    return {
      totalSearches: 0,
      averageDuration: 0,
      medianDuration: 0,
      p95Duration: 0,
      p99Duration: 0,
      dbHitRate: 0,
      cacheHitRate: 0,
      errorRate: 0,
      qualityBreakdown: {} as Record<SearchQuality, number>,
      modeBreakdown: {} as Record<SearchMode, number>,
      slowestQueries: [],
      mostFrequentQueries: [],
    };
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): string {
    return JSON.stringify({
      metrics: this.metrics,
      aggregated: this.getAggregatedMetrics(),
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const stats = this.getAggregatedMetrics();
    
    return `
Search Performance Report
========================
Total Searches: ${stats.totalSearches}
Average Duration: ${stats.averageDuration.toFixed(0)}ms
Median Duration: ${stats.medianDuration.toFixed(0)}ms
95th Percentile: ${stats.p95Duration.toFixed(0)}ms
99th Percentile: ${stats.p99Duration.toFixed(0)}ms

Hit Rates:
- Database: ${stats.dbHitRate.toFixed(1)}%
- Cache: ${stats.cacheHitRate.toFixed(1)}%
- Error Rate: ${stats.errorRate.toFixed(1)}%

Quality Breakdown:
${Object.entries(stats.qualityBreakdown)
  .map(([quality, count]) => `- ${quality}: ${count}`)
  .join('\n')}

Slowest Queries:
${stats.slowestQueries
  .map(q => `- "${q.query}": ${q.duration}ms`)
  .join('\n')}

Most Frequent Queries:
${stats.mostFrequentQueries
  .map(q => `- "${q.query}": ${q.count} times`)
  .join('\n')}
    `.trim();
  }
}

// Export singleton instance
export const searchMetricsService = new SearchMetricsService();

// Make available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).searchMetrics = searchMetricsService;
}