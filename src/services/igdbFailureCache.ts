/**
 * Failed Query Cache for IGDB API
 * Prevents retrying queries that have recently failed
 */

export interface FailureCacheEntry {
  query: string;
  failedAt: number;
  failureCount: number;
  lastError?: string;
}

export class IGDBFailureCache {
  private failedQueries = new Map<string, FailureCacheEntry>();
  private readonly CACHE_DURATION = 3600000; // 1 hour
  private readonly MAX_CACHE_SIZE = 100; // Prevent memory bloat

  /**
   * Check if a query should be skipped due to recent failure
   */
  shouldSkipQuery(query: string): boolean {
    const normalizedQuery = this.normalizeQuery(query);
    const entry = this.failedQueries.get(normalizedQuery);

    if (!entry) return false;

    const timeSinceFailure = Date.now() - entry.failedAt;

    // Check if cache entry has expired
    if (timeSinceFailure > this.CACHE_DURATION) {
      this.failedQueries.delete(normalizedQuery);
      return false;
    }

    console.log(`[FailureCache] Skipping query "${query}" - failed ${entry.failureCount} time(s), last ${Math.round(timeSinceFailure / 1000)}s ago`);
    return true;
  }

  /**
   * Mark a query as failed
   */
  markAsFailed(query: string, error?: Error): void {
    const normalizedQuery = this.normalizeQuery(query);
    const existingEntry = this.failedQueries.get(normalizedQuery);

    if (existingEntry) {
      // Update existing entry
      existingEntry.failureCount++;
      existingEntry.failedAt = Date.now();
      existingEntry.lastError = error?.message;
    } else {
      // Create new entry
      this.failedQueries.set(normalizedQuery, {
        query: normalizedQuery,
        failedAt: Date.now(),
        failureCount: 1,
        lastError: error?.message
      });

      // Enforce cache size limit (LRU eviction)
      if (this.failedQueries.size > this.MAX_CACHE_SIZE) {
        const firstKey = this.failedQueries.keys().next().value;
        this.failedQueries.delete(firstKey);
      }
    }

    console.log(`[FailureCache] Marked query "${query}" as failed: ${error?.message || 'Unknown error'}`);
  }

  /**
   * Mark a query as successful (remove from failure cache)
   */
  markAsSuccessful(query: string): void {
    const normalizedQuery = this.normalizeQuery(query);
    if (this.failedQueries.delete(normalizedQuery)) {
      console.log(`[FailureCache] Removed query "${query}" from failure cache after success`);
    }
  }

  /**
   * Clear all cached failures
   */
  clear(): void {
    const size = this.failedQueries.size;
    this.failedQueries.clear();
    console.log(`[FailureCache] Cleared ${size} cached failures`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    const entries = Array.from(this.failedQueries.values());

    return {
      totalCached: this.failedQueries.size,
      oldestEntry: entries.reduce((oldest, entry) =>
        entry.failedAt < oldest ? entry.failedAt : oldest,
        now
      ),
      newestEntry: entries.reduce((newest, entry) =>
        entry.failedAt > newest ? entry.failedAt : newest,
        0
      ),
      mostFailed: entries.reduce((most, entry) =>
        entry.failureCount > (most?.failureCount || 0) ? entry : most,
        null as FailureCacheEntry | null
      )
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.failedQueries.entries()) {
      if (now - entry.failedAt > this.CACHE_DURATION) {
        this.failedQueries.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[FailureCache] Cleaned up ${removed} expired entries`);
    }
  }

  /**
   * Normalize query for consistent caching
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim();
  }
}

// Singleton instance
export const igdbFailureCache = new IGDBFailureCache();

// Set up periodic cleanup
setInterval(() => {
  igdbFailureCache.cleanup();
}, 600000); // Cleanup every 10 minutes