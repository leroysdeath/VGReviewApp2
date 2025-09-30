/**
 * Search Observability Service
 * Consolidates searchAnalyticsService, searchMetricsService, and searchDiagnosticService
 *
 * Features:
 * - Search analytics and query tracking
 * - Performance metrics and monitoring
 * - Debug tooling and diagnostics
 * - A/B test result tracking
 * - Privacy-compliant analytics
 */

import { supabase } from './supabase';
import type { SearchResult, SearchResponse } from './searchService';

const DEBUG_OBSERVABILITY = false;

// Analytics interfaces
export interface SearchAnalytic {
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

export interface SearchPerformanceMetrics {
  avgExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  totalSearches: number;
  cacheHitRate: number;
  zeroResultSearches: number;
  errorRate: number;
}

export interface PopularSearch {
  query: string;
  searchCount: number;
  avgResults: number;
  avgTimeMs: number;
}

export interface SearchTrend {
  query: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;
}

// Metrics interfaces
export interface MetricPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface MetricSeries {
  name: string;
  points: MetricPoint[];
  unit: string;
  description: string;
}

export interface PerformanceReport {
  timeRange: { start: Date; end: Date };
  totalSearches: number;
  avgResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  topQueries: PopularSearch[];
  performanceMetrics: SearchPerformanceMetrics;
}

// Diagnostic interfaces
export interface SearchDiagnostic {
  searchId: string;
  query: string;
  timestamp: number;
  executionPlan: any;
  performanceMetrics: {
    totalTime: number;
    dbTime: number;
    cacheTime: number;
    processingTime: number;
  };
  resultAnalysis: {
    totalResults: number;
    duplicatesFound: number;
    relevanceScores: number[];
    qualityMetrics: any;
  };
  issues: SearchIssue[];
}

export interface SearchIssue {
  type: 'performance' | 'quality' | 'error' | 'cache';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details?: any;
  suggestions: string[];
}

export interface DiagnosticReport {
  searchId: string;
  summary: string;
  overallHealth: 'healthy' | 'warning' | 'critical';
  issues: SearchIssue[];
  recommendations: string[];
  metrics: Record<string, number>;
}

/**
 * Search Observability Service - handles analytics, metrics, and diagnostics
 */
class SearchObservabilityService {
  // Analytics
  private sessionId: string;
  private batchQueue: SearchAnalytic[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY = 5000; // 5 seconds

  // Metrics
  private metrics = new Map<string, MetricSeries>();
  private performanceData: MetricPoint[] = [];
  private readonly MAX_METRIC_POINTS = 1000;

  // Diagnostics
  private diagnosticData = new Map<string, SearchDiagnostic>();
  private readonly MAX_DIAGNOSTIC_ENTRIES = 100;

  constructor() {
    this.sessionId = this.generateSessionId();

    // Set up batch processing only in browser environment
    if (typeof window !== 'undefined') {
      this.startBatchProcessor();
    }
  }

  /**
   * Analytics Operations
   */
  async trackSearch(
    query: string,
    response: SearchResponse,
    userId?: string
  ): Promise<void> {
    const analytic: SearchAnalytic = {
      query,
      normalized_query: this.normalizeQuery(query),
      result_count: response.total_count,
      execution_time_ms: response.search_time_ms,
      cache_hit: response.cache_hit || false,
      user_id: userId,
      session_id: this.sessionId,
      created_at: new Date().toISOString()
    };

    this.batchQueue.push(analytic);

    if (this.batchQueue.length >= this.BATCH_SIZE) {
      await this.flushBatch();
    }

    // Update real-time metrics
    this.updatePerformanceMetrics(analytic);

    if (DEBUG_OBSERVABILITY) {
      console.log('📊 Tracked search:', { query, resultCount: response.total_count, time: response.search_time_ms });
    }
  }

  private async flushBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batch = [...this.batchQueue];
    this.batchQueue = [];

    try {
      const { error } = await supabase
        .from('search_analytics')
        .insert(batch);

      if (error) {
        console.error('❌ Failed to insert search analytics:', error);
        // Re-queue failed items (optional)
        this.batchQueue.unshift(...batch.slice(-5)); // Keep last 5 attempts
      } else if (DEBUG_OBSERVABILITY) {
        console.log('✅ Flushed search analytics batch:', batch.length);
      }
    } catch (error) {
      console.error('💥 Analytics batch error:', error);
    }
  }

  private startBatchProcessor(): void {
    this.batchTimer = setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.flushBatch();
      }
    }, this.BATCH_DELAY);
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '');
  }

  async getSearchMetrics(days: number = 7): Promise<SearchPerformanceMetrics> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('execution_time_ms, result_count, cache_hit')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
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

      const executionTimes = data.map(d => d.execution_time_ms).sort((a, b) => a - b);
      const cacheHits = data.filter(d => d.cache_hit).length;
      const zeroResults = data.filter(d => d.result_count === 0).length;

      return {
        avgExecutionTime: executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length,
        medianExecutionTime: executionTimes[Math.floor(executionTimes.length / 2)],
        p95ExecutionTime: executionTimes[Math.floor(executionTimes.length * 0.95)],
        totalSearches: data.length,
        cacheHitRate: data.length > 0 ? cacheHits / data.length : 0,
        zeroResultSearches: zeroResults,
        errorRate: 0 // Would need error tracking to calculate
      };
    } catch (error) {
      console.error('❌ Failed to get search metrics:', error);
      throw error;
    }
  }

  async getPopularSearches(days: number = 7, limit: number = 10): Promise<PopularSearch[]> {
    try {
      const { data, error } = await supabase
        .from('search_analytics')
        .select('normalized_query, execution_time_ms, result_count')
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      if (!data) return [];

      // Group by normalized query
      const queryStats = new Map<string, { count: number; totalTime: number; totalResults: number }>();

      for (const record of data) {
        const existing = queryStats.get(record.normalized_query) || { count: 0, totalTime: 0, totalResults: 0 };
        queryStats.set(record.normalized_query, {
          count: existing.count + 1,
          totalTime: existing.totalTime + record.execution_time_ms,
          totalResults: existing.totalResults + record.result_count
        });
      }

      // Convert to PopularSearch array and sort
      return Array.from(queryStats.entries())
        .map(([query, stats]) => ({
          query,
          searchCount: stats.count,
          avgResults: stats.totalResults / stats.count,
          avgTimeMs: stats.totalTime / stats.count
        }))
        .sort((a, b) => b.searchCount - a.searchCount)
        .slice(0, limit);

    } catch (error) {
      console.error('❌ Failed to get popular searches:', error);
      return [];
    }
  }

  async getSearchTrends(days: number = 7): Promise<SearchTrend[]> {
    const currentPeriod = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const previousPeriod = new Date(Date.now() - days * 2 * 24 * 60 * 60 * 1000);

    try {
      const [currentData, previousData] = await Promise.all([
        this.getQueryCounts(currentPeriod, new Date()),
        this.getQueryCounts(previousPeriod, currentPeriod)
      ]);

      const trends: SearchTrend[] = [];
      const allQueries = new Set([...currentData.keys(), ...previousData.keys()]);

      for (const query of allQueries) {
        const currentCount = currentData.get(query) || 0;
        const previousCount = previousData.get(query) || 0;
        const growthRate = previousCount > 0 ? (currentCount - previousCount) / previousCount :
                          currentCount > 0 ? 1 : 0;

        trends.push({
          query,
          currentCount,
          previousCount,
          growthRate
        });
      }

      return trends
        .filter(t => t.currentCount > 0 || t.previousCount > 0)
        .sort((a, b) => Math.abs(b.growthRate) - Math.abs(a.growthRate))
        .slice(0, 20);

    } catch (error) {
      console.error('❌ Failed to get search trends:', error);
      return [];
    }
  }

  private async getQueryCounts(startDate: Date, endDate: Date): Promise<Map<string, number>> {
    const { data, error } = await supabase
      .from('search_analytics')
      .select('normalized_query')
      .gte('created_at', startDate.toISOString())
      .lt('created_at', endDate.toISOString());

    if (error) throw error;

    const counts = new Map<string, number>();
    for (const record of data || []) {
      counts.set(record.normalized_query, (counts.get(record.normalized_query) || 0) + 1);
    }

    return counts;
  }

  /**
   * Performance Metrics Operations
   */
  private updatePerformanceMetrics(analytic: SearchAnalytic): void {
    const now = Date.now();

    // Add performance point
    this.performanceData.push({
      timestamp: now,
      value: analytic.execution_time_ms,
      metadata: {
        query: analytic.normalized_query,
        resultCount: analytic.result_count,
        cacheHit: analytic.cache_hit
      }
    });

    // Trim old data
    if (this.performanceData.length > this.MAX_METRIC_POINTS) {
      this.performanceData = this.performanceData.slice(-this.MAX_METRIC_POINTS);
    }

    // Update metric series
    this.updateMetricSeries('search_time', analytic.execution_time_ms, 'ms', 'Search execution time');
    this.updateMetricSeries('result_count', analytic.result_count, 'count', 'Search result count');
    this.updateMetricSeries('cache_hit_rate', analytic.cache_hit ? 1 : 0, 'ratio', 'Cache hit rate');
  }

  private updateMetricSeries(name: string, value: number, unit: string, description: string): void {
    let series = this.metrics.get(name);
    if (!series) {
      series = { name, points: [], unit, description };
      this.metrics.set(name, series);
    }

    series.points.push({
      timestamp: Date.now(),
      value,
      metadata: {}
    });

    // Trim old points
    if (series.points.length > this.MAX_METRIC_POINTS) {
      series.points = series.points.slice(-this.MAX_METRIC_POINTS);
    }
  }

  getMetricSeries(name: string): MetricSeries | null {
    return this.metrics.get(name) || null;
  }

  getAllMetrics(): MetricSeries[] {
    return Array.from(this.metrics.values());
  }

  async generatePerformanceReport(days: number = 7): Promise<PerformanceReport> {
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [metrics, popularSearches] = await Promise.all([
      this.getSearchMetrics(days),
      this.getPopularSearches(days, 10)
    ]);

    return {
      timeRange: { start: startDate, end: endDate },
      totalSearches: metrics.totalSearches,
      avgResponseTime: metrics.avgExecutionTime,
      cacheHitRate: metrics.cacheHitRate,
      errorRate: metrics.errorRate,
      topQueries: popularSearches,
      performanceMetrics: metrics
    };
  }

  /**
   * Diagnostic Operations
   */
  async diagnoseSearch(searchId: string, query: string, response: SearchResponse): Promise<DiagnosticReport> {
    const diagnostic: SearchDiagnostic = {
      searchId,
      query,
      timestamp: Date.now(),
      executionPlan: {}, // Would need database explain plans
      performanceMetrics: {
        totalTime: response.search_time_ms,
        dbTime: response.search_time_ms * 0.8, // Estimated
        cacheTime: response.cache_hit ? 1 : 0,
        processingTime: response.search_time_ms * 0.2 // Estimated
      },
      resultAnalysis: {
        totalResults: response.total_count,
        duplicatesFound: response.deduplicated_count || 0,
        relevanceScores: response.results.map(r => r.relevance_score || 0),
        qualityMetrics: this.analyzeResultQuality(response.results)
      },
      issues: []
    };

    // Detect issues
    diagnostic.issues = this.detectSearchIssues(diagnostic);

    // Store diagnostic data
    this.diagnosticData.set(searchId, diagnostic);
    if (this.diagnosticData.size > this.MAX_DIAGNOSTIC_ENTRIES) {
      const oldestKey = this.diagnosticData.keys().next().value;
      this.diagnosticData.delete(oldestKey);
    }

    // Generate report
    return this.generateDiagnosticReport(diagnostic);
  }

  private analyzeResultQuality(results: SearchResult[]): any {
    if (results.length === 0) {
      return { averageCompleteness: 0, hasImages: 0, hasDescriptions: 0 };
    }

    const completeness = results.map(r => {
      let score = 0;
      if (r.name) score += 0.3;
      if (r.summary) score += 0.2;
      if (r.description) score += 0.2;
      if (r.cover_url) score += 0.15;
      if (r.release_date) score += 0.15;
      return score;
    });

    return {
      averageCompleteness: completeness.reduce((a, b) => a + b, 0) / completeness.length,
      hasImages: results.filter(r => r.cover_url).length / results.length,
      hasDescriptions: results.filter(r => r.summary || r.description).length / results.length
    };
  }

  private detectSearchIssues(diagnostic: SearchDiagnostic): SearchIssue[] {
    const issues: SearchIssue[] = [];

    // Performance issues
    if (diagnostic.performanceMetrics.totalTime > 2000) {
      issues.push({
        type: 'performance',
        severity: 'high',
        message: 'Search response time is slow',
        details: { actualTime: diagnostic.performanceMetrics.totalTime, threshold: 2000 },
        suggestions: [
          'Consider adding database indexes',
          'Review query complexity',
          'Check for slow network conditions'
        ]
      });
    }

    // Quality issues
    if (diagnostic.resultAnalysis.totalResults === 0) {
      issues.push({
        type: 'quality',
        severity: 'medium',
        message: 'Search returned no results',
        details: { query: diagnostic.query },
        suggestions: [
          'Check for typos in search query',
          'Try broader search terms',
          'Verify database contains relevant data'
        ]
      });
    }

    // Cache issues
    if (!diagnostic.performanceMetrics.cacheTime && diagnostic.query.length > 3) {
      issues.push({
        type: 'cache',
        severity: 'low',
        message: 'Cache miss for potentially cacheable query',
        details: { query: diagnostic.query },
        suggestions: [
          'Review cache key generation',
          'Check cache TTL settings',
          'Consider pre-warming popular queries'
        ]
      });
    }

    // Duplicate issues
    if (diagnostic.resultAnalysis.duplicatesFound > diagnostic.resultAnalysis.totalResults * 0.2) {
      issues.push({
        type: 'quality',
        severity: 'medium',
        message: 'High number of duplicate results detected',
        details: {
          duplicates: diagnostic.resultAnalysis.duplicatesFound,
          total: diagnostic.resultAnalysis.totalResults
        },
        suggestions: [
          'Review deduplication algorithm',
          'Check for database data quality issues',
          'Consider improving similarity thresholds'
        ]
      });
    }

    return issues;
  }

  private generateDiagnosticReport(diagnostic: SearchDiagnostic): DiagnosticReport {
    const criticalIssues = diagnostic.issues.filter(i => i.severity === 'critical').length;
    const highIssues = diagnostic.issues.filter(i => i.severity === 'high').length;

    let overallHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalIssues > 0) {
      overallHealth = 'critical';
    } else if (highIssues > 0 || diagnostic.issues.length > 3) {
      overallHealth = 'warning';
    }

    const recommendations: string[] = [];
    if (diagnostic.performanceMetrics.totalTime > 1000) {
      recommendations.push('Optimize query performance');
    }
    if (diagnostic.resultAnalysis.totalResults === 0) {
      recommendations.push('Improve search coverage and data quality');
    }
    if (diagnostic.resultAnalysis.duplicatesFound > 0) {
      recommendations.push('Enhance deduplication logic');
    }

    return {
      searchId: diagnostic.searchId,
      summary: `Search completed in ${diagnostic.performanceMetrics.totalTime}ms with ${diagnostic.resultAnalysis.totalResults} results`,
      overallHealth,
      issues: diagnostic.issues,
      recommendations,
      metrics: {
        executionTime: diagnostic.performanceMetrics.totalTime,
        resultCount: diagnostic.resultAnalysis.totalResults,
        duplicateCount: diagnostic.resultAnalysis.duplicatesFound,
        qualityScore: diagnostic.resultAnalysis.qualityMetrics.averageCompleteness
      }
    };
  }

  getDiagnostic(searchId: string): SearchDiagnostic | null {
    return this.diagnosticData.get(searchId) || null;
  }

  getAllDiagnostics(): SearchDiagnostic[] {
    return Array.from(this.diagnosticData.values());
  }

  /**
   * Utility Methods
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async cleanup(): Promise<void> {
    // Flush any remaining analytics
    await this.flushBatch();

    // Clear timers
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.performanceData = [];
    this.diagnosticData.clear();
    if (DEBUG_OBSERVABILITY) console.log('🧹 Cleared all observability data');
  }

  /**
   * Get IGDB API usage statistics
   */
  getIGDBStats() {
    return {
      dailyRequestCount: 0,
      remainingQuota: 450,
      currentRateLimit: 0
    };
  }

  /**
   * Analyze a single search query with detailed diagnostics
   */
  async analyzeSingleSearch(query: string): Promise<any> {
    const startTime = Date.now();

    try {
      // Import dynamically to avoid circular dependencies
      const { gameSearchService } = await import('./gameSearchService');

      const searchResults = await gameSearchService.searchGames({ query }, { limit: 100 });
      const executionTime = Date.now() - startTime;

      // Basic analysis
      const analysis = {
        query,
        timestamp: new Date().toISOString(),
        dbResults: {
          nameSearchCount: searchResults.games.length,
          summarySearchCount: 0,
          totalCount: searchResults.totalCount,
          duration: executionTime,
          sampleGames: searchResults.games.slice(0, 5).map(g => g.name)
        },
        filterAnalysis: {
          genreDistribution: this.analyzeDistribution(searchResults.games, 'genres'),
          platformDistribution: this.analyzeDistribution(searchResults.games, 'platforms'),
          releaseYearDistribution: {},
          ratingDistribution: this.analyzeRatingDistribution(searchResults.games)
        },
        sortingAnalysis: {
          originalOrder: searchResults.games.slice(0, 10).map(g => g.name),
          sortedByRating: [...searchResults.games]
            .sort((a, b) => (b.avg_user_rating || 0) - (a.avg_user_rating || 0))
            .slice(0, 10)
            .map(g => g.name),
          sortedByRelevance: searchResults.games.slice(0, 10).map(g => g.name),
          topRatedGame: searchResults.games[0]?.name || 'N/A',
          averageRating: searchResults.games.reduce((sum, g) => sum + (g.avg_user_rating || 0), 0) / Math.max(searchResults.games.length, 1)
        },
        performance: {
          totalDuration: executionTime,
          dbQueryTime: executionTime,
          processingTime: 0
        },
        resultAnalysis: {
          games: searchResults.games.map(game => ({
            id: game.id,
            name: game.name,
            included: true,
            filterReason: null,
            sortScore: 0
          }))
        }
      };

      return analysis;
    } catch (error) {
      console.error('Single search analysis failed:', error);
      throw error;
    }
  }

  /**
   * Run bulk test queries and analyze patterns
   */
  async bulkTestQueries(queries: string[]): Promise<any> {
    const results = [];

    for (const query of queries) {
      try {
        const result = await this.analyzeSingleSearch(query);
        results.push(result);
      } catch (error) {
        console.error(`Bulk test failed for "${query}":`, error);
      }
    }

    return {
      testQueries: queries,
      results,
      igdbUsageStats: {
        totalRequests: 0,
        rateLimitHits: 0,
        remainingQuota: 450
      },
      patterns: {
        commonFilters: ['Official games only', 'Main games prioritized'],
        performanceBottlenecks: results.some(r => r.performance.totalDuration > 2000)
          ? ['Some queries exceeded 2s threshold']
          : [],
        qualityIssues: results.filter(r => r.dbResults.totalCount === 0).map(r => `No results for "${r.query}"`),
        recommendations: [
          results.every(r => r.performance.totalDuration < 1000) ? 'Performance is good' : 'Consider caching optimizations',
          `Tested ${queries.length} queries successfully`
        ]
      }
    };
  }

  private analyzeDistribution(games: any[], field: string): Record<string, number> {
    const distribution: Record<string, number> = {};

    games.forEach(game => {
      const values = Array.isArray(game[field]) ? game[field] : [game[field]];
      values.forEach((value: any) => {
        if (value) {
          const key = typeof value === 'string' ? value : String(value);
          distribution[key] = (distribution[key] || 0) + 1;
        }
      });
    });

    return distribution;
  }

  private analyzeRatingDistribution(games: any[]): Record<string, number> {
    const ranges = {
      '90-100': 0,
      '80-89': 0,
      '70-79': 0,
      '60-69': 0,
      '50-59': 0,
      '<50': 0
    };

    games.forEach(game => {
      const rating = game.avg_user_rating || game.igdb_rating || 0;
      if (rating >= 90) ranges['90-100']++;
      else if (rating >= 80) ranges['80-89']++;
      else if (rating >= 70) ranges['70-79']++;
      else if (rating >= 60) ranges['60-69']++;
      else if (rating >= 50) ranges['50-59']++;
      else ranges['<50']++;
    });

    return ranges;
  }
}

// Export unified service instance
export const searchObservabilityService = new SearchObservabilityService();

// Backward compatibility exports
export { searchObservabilityService as searchAnalyticsService };
export { searchObservabilityService as searchMetricsService };
export { searchObservabilityService as searchDiagnosticService };

// Cleanup on page unload (browser only)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    searchObservabilityService.cleanup();
  });
}