/**
 * Request Deduplication Utility
 *
 * Prevents duplicate API/DB calls when multiple components request
 * the same data simultaneously (e.g., multiple GameCards for same game)
 *
 * Example:
 * - User opens page with 10 game cards
 * - All 10 cards call gameService.getGame(123) at once
 * - Without deduplication: 10 API calls
 * - With deduplication: 1 API call, 9 reuse result
 *
 * Expected impact: 30-40% reduction in duplicate API calls
 */

/**
 * Map of pending requests by cache key
 * Key format: "service:method:param1:param2"
 * Value: Promise that resolves to the result
 */
const pendingRequests = new Map<string, Promise<any>>();

/**
 * Statistics for monitoring deduplication effectiveness
 */
interface DeduplicationStats {
  totalRequests: number;
  deduplicatedRequests: number;
  uniqueRequests: number;
  savingsRate: number; // Percentage of requests saved
  cacheHits: Record<string, number>; // Hits per cache key
}

const stats: DeduplicationStats = {
  totalRequests: 0,
  deduplicatedRequests: 0,
  uniqueRequests: 0,
  savingsRate: 0,
  cacheHits: {}
};

/**
 * Deduplicate concurrent requests
 *
 * If multiple calls with same key happen simultaneously, only one
 * actual request is made and all callers receive the same promise.
 *
 * @param key - Unique cache key for this request
 * @param requestFn - Function that performs the actual request
 * @returns Promise that resolves to the request result
 *
 * @example
 * ```typescript
 * async getGame(id: number) {
 *   return deduplicateRequest(
 *     `game-${id}`,
 *     () => this.supabase.from('game').select('*').eq('id', id).single()
 *   );
 * }
 * ```
 */
export function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  stats.totalRequests++;

  // Check if request is already pending
  if (pendingRequests.has(key)) {
    stats.deduplicatedRequests++;
    stats.cacheHits[key] = (stats.cacheHits[key] || 0) + 1;

    // Return existing promise
    return pendingRequests.get(key)! as Promise<T>;
  }

  // No pending request - execute new one
  stats.uniqueRequests++;

  const promise = requestFn().finally(() => {
    // Clean up after request completes (success or error)
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Generate cache key from multiple parameters
 *
 * @param parts - Array of values to combine into key
 * @returns Normalized cache key string
 *
 * @example
 * ```typescript
 * const key = generateCacheKey('game', 'getById', 123);
 * // Returns: "game:getById:123"
 * ```
 */
export function generateCacheKey(...parts: (string | number | boolean | undefined)[]): string {
  return parts
    .filter(part => part !== undefined && part !== null)
    .map(part => String(part))
    .join(':');
}

/**
 * Clear all pending requests (useful for testing or forced refresh)
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}

/**
 * Get current deduplication statistics
 */
export function getDeduplicationStats(): DeduplicationStats {
  // Calculate savings rate
  if (stats.totalRequests > 0) {
    stats.savingsRate = (stats.deduplicatedRequests / stats.totalRequests) * 100;
  }

  return { ...stats };
}

/**
 * Reset deduplication statistics
 */
export function resetDeduplicationStats(): void {
  stats.totalRequests = 0;
  stats.deduplicatedRequests = 0;
  stats.uniqueRequests = 0;
  stats.savingsRate = 0;
  stats.cacheHits = {};
}

/**
 * Get count of currently pending requests
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

/**
 * Check if a specific request is currently pending
 */
export function isRequestPending(key: string): boolean {
  return pendingRequests.has(key);
}

/**
 * Invalidate cache for specific key or pattern
 *
 * Use this after mutations (create/update/delete) to ensure fresh data
 * on next request.
 *
 * @param keyOrPattern - Exact key or pattern to match (supports wildcards)
 *
 * @example
 * ```typescript
 * // After adding to collection, invalidate all collection checks
 * invalidateCache('collectionWishlistService:*');
 *
 * // After updating a specific game
 * invalidateCache(`gameService:getGameById:${gameId}`);
 * ```
 */
export function invalidateCache(keyOrPattern: string): number {
  let invalidatedCount = 0;

  if (keyOrPattern.includes('*')) {
    // Pattern matching - convert to regex
    const pattern = keyOrPattern
      .replace(/\*/g, '.*')
      .replace(/:/g, '\\:');
    const regex = new RegExp(`^${pattern}$`);

    // Delete all matching keys
    for (const key of pendingRequests.keys()) {
      if (regex.test(key)) {
        pendingRequests.delete(key);
        invalidatedCount++;
      }
    }
  } else {
    // Exact match
    if (pendingRequests.delete(keyOrPattern)) {
      invalidatedCount = 1;
    }
  }

  return invalidatedCount;
}

/**
 * Invalidate multiple cache patterns at once
 *
 * @example
 * ```typescript
 * // After user reviews a game
 * invalidateCacheMultiple([
 *   'reviewService:getUserReviews:*',
 *   'reviewService:getUserReviewForGame:*',
 *   'gameService:getGameWithFullReviews:*'
 * ]);
 * ```
 */
export function invalidateCacheMultiple(patterns: string[]): number {
  let totalInvalidated = 0;

  for (const pattern of patterns) {
    totalInvalidated += invalidateCache(pattern);
  }

  return totalInvalidated;
}

/**
 * Advanced: Create a deduplication wrapper for a service class
 *
 * @example
 * ```typescript
 * class GameService {
 *   private dedupe = createDeduplicationWrapper('GameService');
 *
 *   async getGame(id: number) {
 *     return this.dedupe('getGame', id, () =>
 *       this.supabase.from('game').select('*').eq('id', id).single()
 *     );
 *   }
 * }
 * ```
 */
export function createDeduplicationWrapper(serviceName: string) {
  return function <T>(
    methodName: string,
    params: any,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const key = generateCacheKey(serviceName, methodName, JSON.stringify(params));
    return deduplicateRequest(key, requestFn);
  };
}

/**
 * Decorator for automatic deduplication (TypeScript experimental decorators)
 *
 * NOTE: Requires TypeScript experimentalDecorators: true
 *
 * @example
 * ```typescript
 * class GameService {
 *   @deduplicate('GameService')
 *   async getGame(id: number) {
 *     return this.supabase.from('game').select('*').eq('id', id).single();
 *   }
 * }
 * ```
 */
export function deduplicate(serviceName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const key = generateCacheKey(serviceName, propertyKey, JSON.stringify(args));
      return deduplicateRequest(key, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Log deduplication stats to console (dev mode)
 */
export function logDeduplicationStats(): void {
  const currentStats = getDeduplicationStats();

  console.log('📊 Request Deduplication Stats:', {
    total: currentStats.totalRequests,
    unique: currentStats.uniqueRequests,
    deduplicated: currentStats.deduplicatedRequests,
    savingsRate: `${currentStats.savingsRate.toFixed(1)}%`,
    topKeys: Object.entries(currentStats.cacheHits)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([key, hits]) => ({ key, hits }))
  });
}

/**
 * Enable auto-logging of stats every 30 seconds (for debugging)
 * Call this manually if you want periodic stats logging
 */
export function enableAutoLogging(intervalMs: number = 30000): NodeJS.Timeout {
  return setInterval(() => {
    if (stats.totalRequests > 0) {
      logDeduplicationStats();
    }
  }, intervalMs);
}
