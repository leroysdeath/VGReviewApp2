/**
 * Simple cache manager for review interactions to reduce unnecessary API calls
 * and improve performance
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class ReviewCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached data if still valid
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache data with optional TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear specific cache entry
   */
  clear(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Generate cache key for review likes
   */
  getLikeKey(userId: number, reviewId: number): string {
    return `like_${userId}_${reviewId}`;
  }

  /**
   * Generate cache key for review comments
   */
  getCommentsKey(reviewId: number): string {
    return `comments_${reviewId}`;
  }

  /**
   * Generate cache key for review data
   */
  getReviewKey(reviewId: number): string {
    return `review_${reviewId}`;
  }
}

// Export singleton instance
export const reviewCacheManager = new ReviewCacheManager();

// Clear expired entries periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    reviewCacheManager.clearExpired();
  }, 60 * 1000); // Every minute
}