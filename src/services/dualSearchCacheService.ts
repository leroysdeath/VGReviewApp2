/**
 * Dual Search Cache Service
 * Separate caches for autocomplete and detailed searches with different TTLs
 */

import { GameSearchResult } from './gameSearchService';

interface CachedSearch {
  query: string;
  normalizedQuery: string;
  results: GameSearchResult[];
  timestamp: number;
  hitCount: number;
  resultCount: number;
  type: 'autocomplete' | 'detailed';
}

interface CacheConfig {
  maxSize: number;
  ttl: number;
  maxEntrySize: number;
  prefix: string;
}

interface CacheStats {
  totalHits: number;
  totalMisses: number;
  totalSearches: number;
  hitRate: number;
  cacheSize: number;
  cachedQueries: number;
}

const CACHE_CONFIGS: Record<'autocomplete' | 'detailed', CacheConfig> = {
  autocomplete: {
    maxSize: 100,
    ttl: 1 * 60 * 60 * 1000,  // 1 hour for autocomplete
    maxEntrySize: 5 * 1024,    // 5KB per entry
    prefix: 'ac_cache_'
  },
  detailed: {
    maxSize: 50,
    ttl: 24 * 60 * 60 * 1000,  // 24 hours for detailed
    maxEntrySize: 50 * 1024,   // 50KB per entry
    prefix: 'dt_cache_'
  }
};

const STATS_KEY = 'dual_cache_stats';
const POPULAR_AUTOCOMPLETE_KEY = 'popular_autocomplete';
const POPULAR_DETAILED_KEY = 'popular_detailed';

class DualSearchCacheService {
  private stats: Record<'autocomplete' | 'detailed', CacheStats>;

  constructor() {
    this.stats = this.loadStats();
    // Clean expired cache on initialization
    this.cleanupExpiredCache();
  }

  /**
   * Normalize query for consistent cache keys
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
   * Generate cache key from query and type
   */
  private getCacheKey(query: string, type: 'autocomplete' | 'detailed'): string {
    const normalized = this.normalizeQuery(query);
    const config = CACHE_CONFIGS[type];
    return `${config.prefix}${normalized}`;
  }

  /**
   * Compress data for storage
   */
  private compress(data: any): string {
    return JSON.stringify(data, null, 0);
  }

  /**
   * Decompress stored data
   */
  private decompress(data: string): any {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to decompress cache data:', error);
      return null;
    }
  }

  /**
   * Get cached search results
   */
  getCachedSearch(query: string, type: 'autocomplete' | 'detailed'): GameSearchResult[] | null {
    try {
      const key = this.getCacheKey(query, type);
      const cached = localStorage.getItem(key);

      if (!cached) {
        this.recordMiss(type);
        return null;
      }

      const data: CachedSearch = this.decompress(cached);
      const config = CACHE_CONFIGS[type];

      // Check if cache is expired
      if (Date.now() - data.timestamp > config.ttl) {
        localStorage.removeItem(key);
        this.recordMiss(type);
        console.log(`⏰ CACHE EXPIRED: "${query}" (${type})`);
        return null;
      }

      // Update hit count
      data.hitCount++;
      localStorage.setItem(key, this.compress(data));

      this.recordHit(type);
      console.log(`📦 ${type.toUpperCase()} CACHE HIT: "${query}" (${data.results.length} results, hit #${data.hitCount})`);

      return data.results;
    } catch (error) {
      console.error(`Cache retrieval error (${type}):`, error);
      this.recordMiss(type);
      return null;
    }
  }

  /**
   * Cache search results
   */
  setCachedSearch(query: string, results: GameSearchResult[], type: 'autocomplete' | 'detailed'): void {
    try {
      const config = CACHE_CONFIGS[type];
      const dataSize = JSON.stringify(results).length;

      // Skip if data is too large
      if (dataSize > config.maxEntrySize) {
        console.warn(`📏 CACHE SKIP: Data too large (${dataSize} bytes) for ${type} cache`);
        return;
      }

      // Check cache size and evict if necessary
      if (this.getCacheSize(type) > config.maxSize * 10 * 1024) { // 10KB per entry average
        this.evictOldestCache(type);
      }

      const key = this.getCacheKey(query, type);
      const data: CachedSearch = {
        query,
        normalizedQuery: this.normalizeQuery(query),
        results,
        timestamp: Date.now(),
        hitCount: 0,
        resultCount: results.length,
        type
      };

      localStorage.setItem(key, this.compress(data));

      // Update popular searches for this type
      this.updatePopularSearches(query, type);

      console.log(`💾 ${type.toUpperCase()} CACHE SET: "${query}" (${results.length} results)`);
    } catch (error) {
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn(`Cache storage quota exceeded for ${type}, clearing old entries`);
        this.clearOldestCaches(type, 5);
        // Try again
        try {
          const key = this.getCacheKey(query, type);
          localStorage.setItem(key, this.compress({
            query,
            normalizedQuery: this.normalizeQuery(query),
            results,
            timestamp: Date.now(),
            hitCount: 0,
            resultCount: results.length,
            type
          }));
        } catch (retryError) {
          console.error(`Failed to cache ${type} after clearing:`, retryError);
        }
      } else {
        console.error(`Cache storage error (${type}):`, error);
      }
    }
  }

  /**
   * Get cache size for a specific type
   */
  private getCacheSize(type: 'autocomplete' | 'detailed'): number {
    const config = CACHE_CONFIGS[type];
    let size = 0;
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(config.prefix)) {
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length * 2; // UTF-16 encoding
        }
      }
    }

    return size;
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): void {
    let cleanedCount = 0;
    const now = Date.now();
    const keys = Object.keys(localStorage);

    for (const type of ['autocomplete', 'detailed'] as const) {
      const config = CACHE_CONFIGS[type];

      for (const key of keys) {
        if (key.startsWith(config.prefix)) {
          try {
            const data = this.decompress(localStorage.getItem(key) || '');
            if (data && (now - data.timestamp > config.ttl)) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          } catch (error) {
            // Remove corrupted entries
            localStorage.removeItem(key);
            cleanedCount++;
          }
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Evict oldest cache entry for a type
   */
  private evictOldestCache(type: 'autocomplete' | 'detailed'): void {
    const config = CACHE_CONFIGS[type];
    let oldestKey = '';
    let oldestTime = Date.now();

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(config.prefix)) {
        try {
          const data = this.decompress(localStorage.getItem(key) || '');
          if (data && data.timestamp < oldestTime) {
            oldestTime = data.timestamp;
            oldestKey = key;
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    }

    if (oldestKey) {
      localStorage.removeItem(oldestKey);
      console.log(`♻️ Evicted oldest ${type} cache entry`);
    }
  }

  /**
   * Clear N oldest cache entries for a type
   */
  private clearOldestCaches(type: 'autocomplete' | 'detailed', count: number): void {
    const config = CACHE_CONFIGS[type];
    const caches: Array<{ key: string; timestamp: number }> = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(config.prefix)) {
        try {
          const data = this.decompress(localStorage.getItem(key) || '');
          if (data) {
            caches.push({ key, timestamp: data.timestamp });
          }
        } catch (error) {
          localStorage.removeItem(key);
        }
      }
    }

    // Sort by timestamp and remove oldest
    caches.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = caches.slice(0, count);

    for (const cache of toRemove) {
      localStorage.removeItem(cache.key);
    }

    console.log(`♻️ Cleared ${toRemove.length} oldest ${type} cache entries`);
  }

  /**
   * Update popular searches tracking
   */
  private updatePopularSearches(query: string, type: 'autocomplete' | 'detailed'): void {
    try {
      const key = type === 'autocomplete' ? POPULAR_AUTOCOMPLETE_KEY : POPULAR_DETAILED_KEY;
      const normalized = this.normalizeQuery(query);
      const popular = localStorage.getItem(key);
      const searches = popular ? this.decompress(popular) : {};

      searches[normalized] = (searches[normalized] || 0) + 1;

      // Keep only top 20 searches
      const sorted = Object.entries(searches)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 20);

      localStorage.setItem(key, this.compress(Object.fromEntries(sorted)));
    } catch (error) {
      console.error(`Failed to update popular ${type} searches:`, error);
    }
  }

  /**
   * Get popular searches for a type
   */
  getPopularSearches(type: 'autocomplete' | 'detailed', limit: number = 10): string[] {
    try {
      const key = type === 'autocomplete' ? POPULAR_AUTOCOMPLETE_KEY : POPULAR_DETAILED_KEY;
      const popular = localStorage.getItem(key);
      if (!popular) return [];

      const searches = this.decompress(popular);
      return Object.entries(searches)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, limit)
        .map(([query]) => query);
    } catch (error) {
      console.error(`Failed to get popular ${type} searches:`, error);
      return [];
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(type?: 'autocomplete' | 'detailed'): CacheStats | Record<'autocomplete' | 'detailed', CacheStats> {
    if (type) {
      const config = CACHE_CONFIGS[type];
      let cacheSize = 0;
      let cachedQueries = 0;

      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.startsWith(config.prefix)) {
          const item = localStorage.getItem(key);
          if (item) {
            cacheSize += item.length * 2;
            cachedQueries++;
          }
        }
      }

      this.stats[type].cacheSize = cacheSize;
      this.stats[type].cachedQueries = cachedQueries;
      this.stats[type].hitRate = this.stats[type].totalSearches > 0
        ? (this.stats[type].totalHits / this.stats[type].totalSearches) * 100
        : 0;

      return this.stats[type];
    }

    // Return stats for both types
    for (const t of ['autocomplete', 'detailed'] as const) {
      this.getCacheStats(t);
    }
    return this.stats;
  }

  /**
   * Clear all cache for a specific type
   */
  clearCache(type?: 'autocomplete' | 'detailed'): void {
    const types = type ? [type] : ['autocomplete', 'detailed'] as const;
    let cleared = 0;

    for (const t of types) {
      const config = CACHE_CONFIGS[t];
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (key.startsWith(config.prefix)) {
          localStorage.removeItem(key);
          cleared++;
        }
      }

      // Reset stats for this type
      this.stats[t] = {
        totalHits: 0,
        totalMisses: 0,
        totalSearches: 0,
        hitRate: 0,
        cacheSize: 0,
        cachedQueries: 0
      };
    }

    this.saveStats();
    console.log(`🗑️ Cleared ${cleared} cache entries`);
  }

  /**
   * Warm cache with popular searches
   */
  async warmCache(
    type: 'autocomplete' | 'detailed',
    searchFunction: (query: string) => Promise<GameSearchResult[]>
  ): Promise<void> {
    const popularSearches = this.getPopularSearches(type, 10);

    console.log(`🔥 Warming ${type} cache with ${popularSearches.length} popular searches...`);

    for (const query of popularSearches) {
      // Check if already cached
      const cached = this.getCachedSearch(query, type);
      if (!cached) {
        try {
          const results = await searchFunction(query);
          this.setCachedSearch(query, results, type);
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to warm ${type} cache for "${query}":`, error);
        }
      }
    }

    console.log(`✅ ${type} cache warming complete`);
  }

  /**
   * Record cache hit
   */
  private recordHit(type: 'autocomplete' | 'detailed'): void {
    this.stats[type].totalHits++;
    this.stats[type].totalSearches++;
    this.saveStats();
  }

  /**
   * Record cache miss
   */
  private recordMiss(type: 'autocomplete' | 'detailed'): void {
    this.stats[type].totalMisses++;
    this.stats[type].totalSearches++;
    this.saveStats();
  }

  /**
   * Load stats from localStorage
   */
  private loadStats(): Record<'autocomplete' | 'detailed', CacheStats> {
    try {
      const stats = localStorage.getItem(STATS_KEY);
      if (stats) {
        return this.decompress(stats);
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }

    // Return default stats
    return {
      autocomplete: {
        totalHits: 0,
        totalMisses: 0,
        totalSearches: 0,
        hitRate: 0,
        cacheSize: 0,
        cachedQueries: 0
      },
      detailed: {
        totalHits: 0,
        totalMisses: 0,
        totalSearches: 0,
        hitRate: 0,
        cacheSize: 0,
        cachedQueries: 0
      }
    };
  }

  /**
   * Save stats to localStorage
   */
  private saveStats(): void {
    try {
      localStorage.setItem(STATS_KEY, this.compress(this.stats));
    } catch (error) {
      console.error('Failed to save cache stats:', error);
    }
  }
}

// Export singleton instance
export const dualSearchCacheService = new DualSearchCacheService();

// Clean expired cache periodically
if (typeof window !== 'undefined') {
  // Clean expired cache on page load
  dualSearchCacheService.cleanupExpiredCache();

  // Clean expired cache every hour
  setInterval(() => {
    dualSearchCacheService.cleanupExpiredCache();
  }, 60 * 60 * 1000);
}