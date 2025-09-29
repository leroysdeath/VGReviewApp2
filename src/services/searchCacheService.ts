/**
 * Search Cache Service
 * Implements localStorage caching for search results with TTL and compression
 */

import { GameSearchResult } from '../types/search';

interface CachedSearch {
  query: string;
  normalizedQuery: string;
  results: GameSearchResult[];
  timestamp: number;
  hitCount: number;
  resultCount: number;
}

interface CacheStats {
  totalHits: number;
  totalMisses: number;
  totalSearches: number;
  hitRate: number;
  cacheSize: number;
  cachedQueries: number;
}

const CACHE_PREFIX = 'search_cache_';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB limit for localStorage
const POPULAR_SEARCHES_KEY = 'popular_searches';
const CACHE_STATS_KEY = 'cache_stats';
const MAX_CACHED_SEARCHES = 100; // Maximum number of searches to cache

class SearchCacheService {
  private stats: CacheStats;

  constructor() {
    this.stats = this.loadStats();
    // Clean expired cache on initialization
    this.clearExpiredCache();
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
   * Generate cache key from query
   */
  private getCacheKey(query: string): string {
    const normalized = this.normalizeQuery(query);
    return `${CACHE_PREFIX}${normalized}`;
  }

  /**
   * Compress data for storage efficiency
   */
  private compress(data: any): string {
    // Simple JSON stringify with minimal format
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
  getCachedSearch(query: string): GameSearchResult[] | null {
    try {
      const key = this.getCacheKey(query);
      const cached = localStorage.getItem(key);

      if (!cached) {
        this.recordMiss();
        return null;
      }

      const data: CachedSearch = this.decompress(cached);

      // Check if cache is expired
      if (Date.now() - data.timestamp > CACHE_TTL) {
        localStorage.removeItem(key);
        this.recordMiss();
        return null;
      }

      // Update hit count
      data.hitCount++;
      localStorage.setItem(key, this.compress(data));

      this.recordHit();
      console.log(`📦 CACHE HIT: "${query}" (${data.results.length} results, hit #${data.hitCount})`);

      return data.results;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      this.recordMiss();
      return null;
    }
  }

  /**
   * Cache search results
   */
  setCachedSearch(query: string, results: GameSearchResult[]): void {
    try {
      // Check cache size before adding
      if (this.getCacheSize() > MAX_CACHE_SIZE) {
        this.evictOldestCache();
      }

      const key = this.getCacheKey(query);
      const data: CachedSearch = {
        query,
        normalizedQuery: this.normalizeQuery(query),
        results,
        timestamp: Date.now(),
        hitCount: 0,
        resultCount: results.length
      };

      localStorage.setItem(key, this.compress(data));

      // Update popular searches
      this.updatePopularSearches(query);

      console.log(`💾 CACHE SET: "${query}" (${results.length} results cached)`);
    } catch (error) {
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('Cache storage quota exceeded, clearing old entries');
        this.clearOldestCaches(5); // Clear 5 oldest entries
        // Try again
        try {
          const key = this.getCacheKey(query);
          localStorage.setItem(key, this.compress({
            query,
            normalizedQuery: this.normalizeQuery(query),
            results,
            timestamp: Date.now(),
            hitCount: 0,
            resultCount: results.length
          }));
        } catch (retryError) {
          console.error('Failed to cache after clearing old entries:', retryError);
        }
      } else {
        console.error('Cache storage error:', error);
      }
    }
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    let cleared = 0;
    const now = Date.now();
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const data = this.decompress(localStorage.getItem(key) || '');
          if (data && (now - data.timestamp > CACHE_TTL)) {
            localStorage.removeItem(key);
            cleared++;
          }
        } catch (error) {
          // Remove corrupted entries
          localStorage.removeItem(key);
          cleared++;
        }
      }
    }

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} expired cache entries`);
    }

    return cleared;
  }

  /**
   * Clear all search cache
   */
  clearAllCache(): void {
    const keys = Object.keys(localStorage);
    let cleared = 0;

    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        localStorage.removeItem(key);
        cleared++;
      }
    }

    // Reset stats
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      totalSearches: 0,
      hitRate: 0,
      cacheSize: 0,
      cachedQueries: 0
    };
    this.saveStats();

    console.log(`🗑️ Cleared all cache (${cleared} entries)`);
  }

  /**
   * Get popular searches
   */
  getPopularSearches(limit: number = 10): string[] {
    try {
      const popular = localStorage.getItem(POPULAR_SEARCHES_KEY);
      if (!popular) return [];

      const searches = this.decompress(popular);
      return Object.entries(searches)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, limit)
        .map(([query]) => query);
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Update popular searches tracking
   */
  private updatePopularSearches(query: string): void {
    try {
      const normalized = this.normalizeQuery(query);
      const popular = localStorage.getItem(POPULAR_SEARCHES_KEY);
      const searches = popular ? this.decompress(popular) : {};

      searches[normalized] = (searches[normalized] || 0) + 1;

      // Keep only top 50 searches to save space
      const sorted = Object.entries(searches)
        .sort(([, a]: any, [, b]: any) => b - a)
        .slice(0, 50);

      localStorage.setItem(POPULAR_SEARCHES_KEY, this.compress(Object.fromEntries(sorted)));
    } catch (error) {
      console.error('Failed to update popular searches:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const keys = Object.keys(localStorage);
    let cacheSize = 0;
    let cachedQueries = 0;

    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          cacheSize += item.length * 2; // UTF-16 encoding
          cachedQueries++;
        }
      }
    }

    this.stats.cacheSize = cacheSize;
    this.stats.cachedQueries = cachedQueries;
    this.stats.hitRate = this.stats.totalSearches > 0
      ? (this.stats.totalHits / this.stats.totalSearches) * 100
      : 0;

    return this.stats;
  }

  /**
   * Get cache size in bytes
   */
  private getCacheSize(): number {
    let size = 0;
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          size += item.length * 2; // UTF-16 encoding
        }
      }
    }

    return size;
  }

  /**
   * Evict oldest cache entry
   */
  private evictOldestCache(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
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
      console.log(`♻️ Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  /**
   * Clear N oldest cache entries
   */
  private clearOldestCaches(count: number): void {
    const caches: Array<{ key: string; timestamp: number }> = [];
    const keys = Object.keys(localStorage);

    for (const key of keys) {
      if (key.startsWith(CACHE_PREFIX)) {
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

    console.log(`♻️ Cleared ${toRemove.length} oldest cache entries`);
  }

  /**
   * Record cache hit
   */
  private recordHit(): void {
    this.stats.totalHits++;
    this.stats.totalSearches++;
    this.saveStats();
  }

  /**
   * Record cache miss
   */
  private recordMiss(): void {
    this.stats.totalMisses++;
    this.stats.totalSearches++;
    this.saveStats();
  }

  /**
   * Load stats from localStorage
   */
  private loadStats(): CacheStats {
    try {
      const stats = localStorage.getItem(CACHE_STATS_KEY);
      if (stats) {
        return this.decompress(stats);
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }

    return {
      totalHits: 0,
      totalMisses: 0,
      totalSearches: 0,
      hitRate: 0,
      cacheSize: 0,
      cachedQueries: 0
    };
  }

  /**
   * Save stats to localStorage
   */
  private saveStats(): void {
    try {
      localStorage.setItem(CACHE_STATS_KEY, this.compress(this.stats));
    } catch (error) {
      console.error('Failed to save cache stats:', error);
    }
  }

  /**
   * Warm cache with popular searches
   */
  async warmCache(searchFunction: (query: string) => Promise<GameSearchResult[]>): Promise<void> {
    const popularSearches = this.getPopularSearches(20);

    console.log(`🔥 Warming cache with ${popularSearches.length} popular searches...`);

    for (const query of popularSearches) {
      // Check if already cached
      const cached = this.getCachedSearch(query);
      if (!cached) {
        try {
          const results = await searchFunction(query);
          this.setCachedSearch(query, results);
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Failed to warm cache for "${query}":`, error);
        }
      }
    }

    console.log('✅ Cache warming complete');
  }
}

// Export singleton instance
export const searchCacheService = new SearchCacheService();