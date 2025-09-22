/**
 * Telemetry Service for IGDB API
 * Tracks performance metrics and provides insights for optimization
 */

export interface IGDBCallMetrics {
  query: string;
  success: boolean;
  duration: number;
  timestamp: number;
  error?: string;
  resultCount?: number;
}

export interface IGDBAggregateMetrics {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  timeouts: number;
  avgResponseTime: number;
  p95ResponseTime: number;
  medianResponseTime: number;
  errorTypes: Map<string, number>;
  successRate: number;
  timeoutRate: number;
  lastHourCalls: number;
  lastHourSuccessRate: number;
}

export class IGDBTelemetry {
  private callHistory: IGDBCallMetrics[] = [];
  private readonly MAX_HISTORY = 1000; // Keep last 1000 calls
  private readonly HISTORY_DURATION = 3600000; // Keep 1 hour of history

  // Real-time counters
  private totalCalls = 0;
  private successfulCalls = 0;
  private failedCalls = 0;
  private timeouts = 0;
  private errorTypes = new Map<string, number>();

  /**
   * Record an IGDB API call
   */
  recordCall(metrics: IGDBCallMetrics): void {
    this.totalCalls++;

    if (metrics.success) {
      this.successfulCalls++;
    } else {
      this.failedCalls++;

      // Track error types
      const errorType = metrics.error || 'Unknown';
      this.errorTypes.set(errorType, (this.errorTypes.get(errorType) || 0) + 1);

      // Track timeouts specifically
      if (errorType.toLowerCase().includes('timeout') || errorType.toLowerCase().includes('abort')) {
        this.timeouts++;
      }
    }

    // Add to history
    this.callHistory.push({
      ...metrics,
      timestamp: Date.now()
    });

    // Enforce history limits
    this.cleanupHistory();

    // Log significant events
    if (!metrics.success) {
      console.log(`[Telemetry] IGDB call failed for "${metrics.query}": ${metrics.error} (${metrics.duration}ms)`);
    } else if (metrics.duration > 2000) {
      console.log(`[Telemetry] Slow IGDB call for "${metrics.query}": ${metrics.duration}ms`);
    }

    // Check if we should disable IGDB
    if (this.shouldDisableIGDB()) {
      console.warn('[Telemetry] High failure rate detected - recommend disabling IGDB');
    }
  }

  /**
   * Get aggregate metrics
   */
  getMetrics(): IGDBAggregateMetrics {
    const responseTimes = this.callHistory
      .filter(call => call.success)
      .map(call => call.duration)
      .sort((a, b) => a - b);

    const oneHourAgo = Date.now() - 3600000;
    const lastHourCalls = this.callHistory.filter(call => call.timestamp > oneHourAgo);
    const lastHourSuccessful = lastHourCalls.filter(call => call.success).length;

    return {
      totalCalls: this.totalCalls,
      successfulCalls: this.successfulCalls,
      failedCalls: this.failedCalls,
      timeouts: this.timeouts,
      avgResponseTime: this.calculateAverage(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      medianResponseTime: this.calculatePercentile(responseTimes, 50),
      errorTypes: new Map(this.errorTypes),
      successRate: this.totalCalls > 0 ? (this.successfulCalls / this.totalCalls) * 100 : 0,
      timeoutRate: this.totalCalls > 0 ? (this.timeouts / this.totalCalls) * 100 : 0,
      lastHourCalls: lastHourCalls.length,
      lastHourSuccessRate: lastHourCalls.length > 0
        ? (lastHourSuccessful / lastHourCalls.length) * 100
        : 0
    };
  }

  /**
   * Get recent call history
   */
  getRecentCalls(limit = 10): IGDBCallMetrics[] {
    return this.callHistory
      .slice(-limit)
      .reverse();
  }

  /**
   * Get performance by query pattern
   */
  getPerformanceByQuery(): Map<string, { count: number; avgTime: number; successRate: number }> {
    const queryStats = new Map<string, { calls: IGDBCallMetrics[] }>();

    // Group by query
    for (const call of this.callHistory) {
      const normalizedQuery = call.query.toLowerCase().trim();
      if (!queryStats.has(normalizedQuery)) {
        queryStats.set(normalizedQuery, { calls: [] });
      }
      queryStats.get(normalizedQuery)!.calls.push(call);
    }

    // Calculate stats per query
    const results = new Map<string, { count: number; avgTime: number; successRate: number }>();

    for (const [query, data] of queryStats.entries()) {
      const successful = data.calls.filter(c => c.success);
      const avgTime = successful.length > 0
        ? successful.reduce((sum, c) => sum + c.duration, 0) / successful.length
        : 0;

      results.set(query, {
        count: data.calls.length,
        avgTime,
        successRate: (successful.length / data.calls.length) * 100
      });
    }

    return results;
  }

  /**
   * Check if IGDB should be disabled based on metrics
   */
  shouldDisableIGDB(): boolean {
    // Check overall failure rate
    if (this.totalCalls >= 10) {
      const failureRate = this.failedCalls / this.totalCalls;
      if (failureRate > 0.5) {
        return true;
      }
    }

    // Check recent failure rate (last hour)
    const oneHourAgo = Date.now() - 3600000;
    const recentCalls = this.callHistory.filter(call => call.timestamp > oneHourAgo);

    if (recentCalls.length >= 5) {
      const recentFailures = recentCalls.filter(call => !call.success).length;
      const recentFailureRate = recentFailures / recentCalls.length;
      if (recentFailureRate > 0.7) {
        return true;
      }
    }

    // Check timeout rate
    if (this.totalCalls >= 10) {
      const timeoutRate = this.timeouts / this.totalCalls;
      if (timeoutRate > 0.3) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get health summary
   */
  getHealthSummary(): {
    status: 'GOOD' | 'DEGRADED' | 'POOR';
    recommendation: string;
    details: string[];
  } {
    const metrics = this.getMetrics();
    const details: string[] = [];
    let status: 'GOOD' | 'DEGRADED' | 'POOR' = 'GOOD';
    let recommendation = 'IGDB integration is working well';

    // Check success rate
    if (metrics.successRate < 50) {
      status = 'POOR';
      details.push(`Low success rate: ${metrics.successRate.toFixed(1)}%`);
    } else if (metrics.successRate < 80) {
      status = 'DEGRADED';
      details.push(`Moderate success rate: ${metrics.successRate.toFixed(1)}%`);
    }

    // Check response times
    if (metrics.p95ResponseTime > 3000) {
      status = status === 'GOOD' ? 'DEGRADED' : status;
      details.push(`Slow response times: P95 = ${metrics.p95ResponseTime}ms`);
    }

    // Check timeout rate
    if (metrics.timeoutRate > 20) {
      status = 'POOR';
      details.push(`High timeout rate: ${metrics.timeoutRate.toFixed(1)}%`);
    }

    // Generate recommendation
    if (status === 'POOR') {
      recommendation = 'Consider disabling IGDB integration temporarily';
    } else if (status === 'DEGRADED') {
      recommendation = 'Monitor IGDB performance closely';
    }

    // Add error type details
    if (metrics.errorTypes.size > 0) {
      const topErrors = Array.from(metrics.errorTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      for (const [error, count] of topErrors) {
        details.push(`${error}: ${count} occurrences`);
      }
    }

    return { status, recommendation, details };
  }

  /**
   * Reset all telemetry data
   */
  reset(): void {
    this.callHistory = [];
    this.totalCalls = 0;
    this.successfulCalls = 0;
    this.failedCalls = 0;
    this.timeouts = 0;
    this.errorTypes.clear();
    console.log('[Telemetry] All metrics reset');
  }

  /**
   * Export telemetry data for analysis
   */
  exportData(): {
    metrics: IGDBAggregateMetrics;
    recentCalls: IGDBCallMetrics[];
    performanceByQuery: Record<string, any>;
    healthSummary: any;
  } {
    return {
      metrics: this.getMetrics(),
      recentCalls: this.getRecentCalls(100),
      performanceByQuery: Object.fromEntries(this.getPerformanceByQuery()),
      healthSummary: this.getHealthSummary()
    };
  }

  /**
   * Clean up old history entries
   */
  private cleanupHistory(): void {
    const now = Date.now();

    // Remove old entries
    this.callHistory = this.callHistory.filter(
      call => now - call.timestamp < this.HISTORY_DURATION
    );

    // Enforce max size
    if (this.callHistory.length > this.MAX_HISTORY) {
      this.callHistory = this.callHistory.slice(-this.MAX_HISTORY);
    }
  }

  /**
   * Calculate average of numbers
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Calculate percentile of sorted numbers
   */
  private calculatePercentile(sortedNumbers: number[], percentile: number): number {
    if (sortedNumbers.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedNumbers.length) - 1;
    return sortedNumbers[Math.max(0, index)];
  }
}

// Singleton instance
export const igdbTelemetry = new IGDBTelemetry();