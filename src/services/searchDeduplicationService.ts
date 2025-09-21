/**
 * Search Request Deduplication Service
 * Prevents duplicate concurrent requests to the same endpoint
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  abortController?: AbortController;
}

class SearchDeduplicationService {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestHistory = new Map<string, number>();
  private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
  private readonly HISTORY_TTL = 5000; // 5 seconds for rate limiting

  /**
   * Generate a unique key for the request
   */
  private generateKey(
    endpoint: string,
    query: string,
    type: 'autocomplete' | 'detailed' | 'general'
  ): string {
    const normalizedQuery = query.toLowerCase().trim();
    return `${type}-${endpoint}-${normalizedQuery}`;
  }

  /**
   * Check if a request is already in progress
   */
  isRequestPending(
    endpoint: string,
    query: string,
    type: 'autocomplete' | 'detailed' | 'general' = 'general'
  ): boolean {
    const key = this.generateKey(endpoint, query, type);
    const pending = this.pendingRequests.get(key);

    if (pending) {
      // Check if request has timed out
      if (Date.now() - pending.timestamp > this.REQUEST_TIMEOUT) {
        // Clean up stale request
        this.cleanupRequest(key);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Get existing pending request
   */
  getPendingRequest<T>(
    endpoint: string,
    query: string,
    type: 'autocomplete' | 'detailed' | 'general' = 'general'
  ): Promise<T> | null {
    const key = this.generateKey(endpoint, query, type);
    const pending = this.pendingRequests.get(key);

    if (pending && Date.now() - pending.timestamp <= this.REQUEST_TIMEOUT) {
      console.log(`♻️ DEDUPE: Reusing pending request for "${query}" (${type})`);
      return pending.promise;
    }

    return null;
  }

  /**
   * Deduplicate a search request
   */
  async deduplicateRequest<T>(
    endpoint: string,
    query: string,
    type: 'autocomplete' | 'detailed' | 'general',
    requestFunction: (abortSignal?: AbortSignal) => Promise<T>
  ): Promise<T> {
    const key = this.generateKey(endpoint, query, type);

    // Check for existing pending request
    const existing = this.getPendingRequest<T>(endpoint, query, type);
    if (existing) {
      return existing;
    }

    // Check rate limiting
    if (this.isRateLimited(key)) {
      console.warn(`⚠️ RATE LIMITED: Too many requests for "${query}" (${type})`);
      throw new Error('Too many requests. Please wait a moment.');
    }

    // Create abort controller for this request
    const abortController = new AbortController();

    // Create and store new request
    const promise = requestFunction(abortController.signal)
      .then(result => {
        // Clean up on success
        this.cleanupRequest(key);
        this.recordRequestHistory(key);
        return result;
      })
      .catch(error => {
        // Clean up on error
        this.cleanupRequest(key);

        // Don't record history for aborted requests
        if (error.name !== 'AbortError') {
          this.recordRequestHistory(key);
        }

        throw error;
      });

    // Store pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      abortController
    });

    console.log(`🔄 DEDUPE: New request initiated for "${query}" (${type})`);

    return promise;
  }

  /**
   * Cancel a pending request
   */
  cancelRequest(
    endpoint: string,
    query: string,
    type: 'autocomplete' | 'detailed' | 'general' = 'general'
  ): boolean {
    const key = this.generateKey(endpoint, query, type);
    const pending = this.pendingRequests.get(key);

    if (pending && pending.abortController) {
      pending.abortController.abort();
      this.cleanupRequest(key);
      console.log(`❌ DEDUPE: Cancelled request for "${query}" (${type})`);
      return true;
    }

    return false;
  }

  /**
   * Cancel all pending requests of a specific type
   */
  cancelAllRequests(type?: 'autocomplete' | 'detailed' | 'general'): number {
    let cancelledCount = 0;

    for (const [key, pending] of this.pendingRequests.entries()) {
      if (!type || key.startsWith(type)) {
        if (pending.abortController) {
          pending.abortController.abort();
        }
        this.pendingRequests.delete(key);
        cancelledCount++;
      }
    }

    if (cancelledCount > 0) {
      console.log(`❌ DEDUPE: Cancelled ${cancelledCount} pending requests${type ? ` (${type})` : ''}`);
    }

    return cancelledCount;
  }

  /**
   * Check if a request is rate limited
   */
  private isRateLimited(key: string): boolean {
    const lastRequest = this.requestHistory.get(key);
    if (lastRequest && Date.now() - lastRequest < 500) { // 500ms rate limit
      return true;
    }
    return false;
  }

  /**
   * Record request history for rate limiting
   */
  private recordRequestHistory(key: string): void {
    this.requestHistory.set(key, Date.now());

    // Clean up old history entries
    setTimeout(() => {
      this.requestHistory.delete(key);
    }, this.HISTORY_TTL);
  }

  /**
   * Clean up a completed or failed request
   */
  private cleanupRequest(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Clean up stale requests
   */
  cleanupStaleRequests(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > this.REQUEST_TIMEOUT) {
        // Abort if possible
        if (pending.abortController) {
          pending.abortController.abort();
        }
        this.pendingRequests.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 DEDUPE: Cleaned up ${cleanedCount} stale requests`);
    }

    return cleanedCount;
  }

  /**
   * Get statistics about pending requests
   */
  getStats(): {
    pendingRequests: number;
    pendingByType: Record<string, number>;
    oldestRequestAge: number;
  } {
    const now = Date.now();
    const byType: Record<string, number> = {
      autocomplete: 0,
      detailed: 0,
      general: 0
    };

    let oldestAge = 0;

    for (const [key, pending] of this.pendingRequests.entries()) {
      const age = now - pending.timestamp;
      if (age > oldestAge) {
        oldestAge = age;
      }

      if (key.startsWith('autocomplete-')) {
        byType.autocomplete++;
      } else if (key.startsWith('detailed-')) {
        byType.detailed++;
      } else {
        byType.general++;
      }
    }

    return {
      pendingRequests: this.pendingRequests.size,
      pendingByType: byType,
      oldestRequestAge: oldestAge
    };
  }

  /**
   * Clear all pending requests and history
   */
  clear(): void {
    // Cancel all pending requests
    this.cancelAllRequests();

    // Clear history
    this.requestHistory.clear();

    console.log('🗑️ DEDUPE: Cleared all pending requests and history');
  }
}

// Export singleton instance
export const searchDeduplicationService = new SearchDeduplicationService();

// Clean up stale requests periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    searchDeduplicationService.cleanupStaleRequests();
  }, 60000); // Every minute

  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    searchDeduplicationService.clear();
  });
}