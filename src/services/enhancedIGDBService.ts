// src/services/enhancedIGDBService.ts

import { createClient } from '@supabase/supabase-js';
import { browserCache } from './browserCacheService';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

interface RequestOptions {
  useCache?: boolean;
  cacheTTL?: number;
  browserCacheTTL?: number;
  forceRefresh?: boolean;
  staleWhileRevalidate?: boolean;
}

interface CachedResponse {
  data: any;
  cached: boolean;
  timestamp: Date;
  expiresAt: Date;
  cacheKey?: string;
}

interface CacheStats {
  igdbCache: number;
  gamesCache: number;
  searchCache: number;
  totalSize: number;
  hitRate: number;
}

interface HealthStatus {
  browserCache: boolean;
  databaseCache: boolean;
  edgeFunction: boolean;
  overall: boolean;
}

interface PerformanceMetrics {
  browserCacheSize: number;
  browserCacheKeys: number;
  averageResponseTime: number;
}

class EnhancedIGDBService {
  private defaultOptions: RequestOptions = {
    useCache: true,
    cacheTTL: 3600, // 1 hour database cache
    browserCacheTTL: 300, // 5 minutes browser cache
    forceRefresh: false,
    staleWhileRevalidate: true,
  };

  private edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/igdb-cache`;

  /**
   * Get game with multi-level caching
   */
  async getGame(gameId: number, options: RequestOptions = {}): Promise<any> {
    const opts = { ...this.defaultOptions, ...options };
    const browserCacheKey = `game:${gameId}`;

    // Level 1: Check browser cache first (fastest)
    if (opts.useCache && !opts.forceRefresh) {
      const browserCached = browserCache.get(browserCacheKey);
      if (browserCached) {
        console.log('🚀 Cache hit: Browser cache (game)', gameId);
        
        // Optionally refresh in background if stale
        if (opts.staleWhileRevalidate) {
          this.refreshGameInBackground(gameId, opts);
        }
        
        return browserCached;
      }
    }

    // Level 2: Check database cache via edge function
    try {
      const response = await this.callEdgeFunction({
        endpoint: 'games',
        gameId,
        forceRefresh: opts.forceRefresh,
        ttl: opts.cacheTTL
      });

      if (response.data) {
        // Store in browser cache for faster subsequent access
        if (opts.useCache) {
          browserCache.set(browserCacheKey, response.data, opts.browserCacheTTL);
        }

        console.log(
          response.cached 
            ? '💾 Cache hit: Database cache (game)' 
            : '🌐 Fresh fetch: IGDB API (game)', 
          gameId
        );
        
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching game:', error);
      
      // Return stale browser cache if available on error
      const staleCache = browserCache.get(browserCacheKey);
      if (staleCache) {
        console.log('⚠️ Returning stale cache due to error');
        return staleCache;
      }
      
      throw error;
    }

    return null;
  }

  /**
   * Search games with multi-level caching
   */
  async searchGames(
    searchTerm: string, 
    filters: any = {}, 
    options: RequestOptions = {}
  ): Promise<any[]> {
    const opts = { ...this.defaultOptions, ...options };
    const browserCacheKey = `search:${searchTerm}:${JSON.stringify(filters)}`;

    // Level 1: Check browser cache first
    if (opts.useCache && !opts.forceRefresh) {
      const browserCached = browserCache.get(browserCacheKey);
      if (browserCached) {
        console.log('🚀 Cache hit: Browser cache (search)', searchTerm);
        
        // Optionally refresh in background if stale
        if (opts.staleWhileRevalidate) {
          this.refreshSearchInBackground(searchTerm, filters, opts);
        }
        
        return browserCached;
      }
    }

    // Level 2: Check database cache and fetch if needed
    try {
      const response = await this.callEdgeFunction({
        endpoint: 'games',
        searchTerm,
        filters,
        forceRefresh: opts.forceRefresh,
        ttl: opts.cacheTTL || 1800 // 30 minutes for search results
      });

      if (response.data) {
        // Store in browser cache
        if (opts.useCache) {
          browserCache.set(browserCacheKey, response.data, opts.browserCacheTTL);
        }

        console.log(
          response.cached 
            ? '💾 Cache hit: Database cache (search)' 
            : '🌐 Fresh fetch: IGDB API (search)', 
          searchTerm
        );
        
        return response.data;
      }
    } catch (error) {
      console.error('Error searching games:', error);
      
      // Return stale cache if available
      const staleCache = browserCache.get(browserCacheKey);
      if (staleCache) {
        console.log('⚠️ Returning stale search cache due to error');
        return staleCache;
      }
      
      throw error;
    }

    return [];
  }

  /**
   * Get popular games with caching
   */
  async getPopularGames(options: RequestOptions = {}): Promise<any[]> {
    const opts = { ...this.defaultOptions, ...options };
    const browserCacheKey = 'popular_games';

    // Check browser cache first
    if (opts.useCache && !opts.forceRefresh) {
      const browserCached = browserCache.get(browserCacheKey);
      if (browserCached) {
        console.log('🚀 Cache hit: Browser cache (popular)');
        
        if (opts.staleWhileRevalidate) {
          this.refreshPopularInBackground(opts);
        }
        
        return browserCached;
      }
    }

    try {
      const response = await this.callEdgeFunction({
        endpoint: 'popular',
        forceRefresh: opts.forceRefresh,
        ttl: opts.cacheTTL || 7200 // 2 hours for popular games
      });

      if (response.data) {
        if (opts.useCache) {
          browserCache.set(browserCacheKey, response.data, opts.browserCacheTTL);
        }

        console.log(
          response.cached 
            ? '💾 Cache hit: Database cache (popular)' 
            : '🌐 Fresh fetch: IGDB API (popular)'
        );
        
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching popular games:', error);
      
      const staleCache = browserCache.get(browserCacheKey);
      if (staleCache) {
        console.log('⚠️ Returning stale popular cache due to error');
        return staleCache;
      }
      
      throw error;
    }

    return [];
  }

  /**
   * Prefetch game data for faster navigation
   */
  async prefetchGame(gameId: number): Promise<void> {
    try {
      // Check if already in browser cache
      const browserCacheKey = `game:${gameId}`;
      if (browserCache.get(browserCacheKey)) {
        return; // Already cached
      }

      // Prefetch without blocking
      this.getGame(gameId, { 
        useCache: true, 
        cacheTTL: 3600,
        browserCacheTTL: 600 // 10 minutes for prefetched data
      }).catch(error => {
        console.warn('Prefetch failed for game:', gameId, error);
      });
    } catch (error) {
      console.warn('Prefetch error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const { data, error } = await supabase
        .rpc('get_cache_stats');

      if (error) {
        console.error('Error getting cache stats:', error);
        return this.getDefaultStats();
      }

      if (!data || !Array.isArray(data)) {
        console.warn('Invalid cache stats data:', data);
        return this.getDefaultStats();
      }

      // Process the returned data
      const stats = data.reduce((acc: any, row: any) => {
        acc[row.table_name] = {
          entries: row.total_entries,
          size: row.cache_size_mb,
          hitRate: row.hit_rate
        };
        return acc;
      }, {});

      return {
        igdbCache: stats.igdb_cache?.entries || 0,
        gamesCache: stats.games_cache?.entries || 0,
        searchCache: stats.search_cache?.entries || 0,
        totalSize: Object.values(stats).reduce((sum: number, stat: any) => sum + (stat.size || 0), 0),
        hitRate: this.calculateOverallHitRate(stats)
      };
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      return this.getDefaultStats();
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    try {
      // Clear browser cache
      browserCache.clear();

      // Clear database cache via direct Supabase calls
      const deletePromises = [
        supabase.from('igdb_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('games_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('search_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ];

      await Promise.all(deletePromises);

      console.log('🗑️ All caches cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Don't throw here - clearing cache failure shouldn't break the app
      console.warn('Cache clearing failed, but continuing...');
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const { data, error } = await supabase
        .rpc('cleanup_expired_cache');

      if (error) {
        console.error('Error clearing expired cache:', error);
        // Don't throw - this is maintenance, not critical
        return;
      }

      console.log('🧹 Expired cache cleared:', data);
    } catch (error) {
      console.error('Error in clearExpiredCache:', error);
      // Don't throw - this is maintenance, not critical
    }
  }

  /**
   * Health check for the caching system
   */
  async healthCheck(): Promise<HealthStatus> {
    const health: HealthStatus = {
      browserCache: false,
      databaseCache: false,
      edgeFunction: false,
      overall: false
    };

    try {
      // Test browser cache
      const testKey = 'health_check_test';
      const testData = { test: true, timestamp: Date.now() };
      browserCache.set(testKey, testData, 1);
      const retrieved = browserCache.get(testKey);
      health.browserCache = retrieved && retrieved.test === true;
      browserCache.delete(testKey);

      // Test database cache by trying to get stats
      try {
        await this.getCacheStats();
        health.databaseCache = true;
      } catch (error) {
        console.warn('Database cache health check failed:', error);
        health.databaseCache = false;
      }

      // Test edge function with a minimal request
      try {
        const response = await this.callEdgeFunction({
          endpoint: 'games',
          searchTerm: 'test',
          filters: { limit: 1 },
          ttl: 1
        });
        
        health.edgeFunction = true;
      } catch (error) {
        console.warn('Edge function health check failed:', error);
        health.edgeFunction = false;
      }

    } catch (error) {
      console.error('Health check error:', error);
    }

    health.overall = health.browserCache && health.databaseCache && health.edgeFunction;
    
    if (import.meta.env.DEV) {
      console.log('🏥 Cache health check:', health);
    }

    return health;
  }

  /**
   * Get cache performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    try {
      return {
        browserCacheSize: browserCache.size(),
        browserCacheKeys: browserCache.keys ? browserCache.keys().length : 0,
        averageResponseTime: 0 // Would need to implement timing tracking
      };
    } catch (error) {
      console.warn('Error getting performance metrics:', error);
      return {
        browserCacheSize: 0,
        browserCacheKeys: 0,
        averageResponseTime: 0
      };
    }
  }

  /**
   * Warm up cache with essential data
   */
  async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up cache...');
    
    try {
      // Prefetch popular games
      await this.getPopularGames({ forceRefresh: false });
      
      console.log('✅ Cache warmed up successfully');
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }

  /**
   * Get comprehensive cache statistics with browser cache info
   */
  async getCacheStatistics(): Promise<any> {
    try {
      const [dbStats, browserStats] = await Promise.all([
        this.getCacheStats(),
        Promise.resolve(this.getPerformanceMetrics())
      ]);

      return {
        database: dbStats,
        browser: browserStats,
        total: {
          items: dbStats.igdbCache + dbStats.gamesCache + dbStats.searchCache + browserStats.browserCacheKeys,
          size: dbStats.totalSize,
        }
      };
    } catch (error) {
      console.error('Error getting cache statistics:', error);
      return {
        database: this.getDefaultStats(),
        browser: this.getPerformanceMetrics(),
        total: { items: 0, size: 0 }
      };
    }
  }

  // Private helper methods

  private async callEdgeFunction(params: any): Promise<CachedResponse> {
    const response = await fetch(this.edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    return {
      data: result.data,
      cached: result.cached,
      timestamp: new Date(result.timestamp),
      expiresAt: new Date(Date.now() + (params.ttl || 3600) * 1000),
      cacheKey: result.cacheKey
    };
  }

  private async refreshGameInBackground(gameId: number, options: RequestOptions): Promise<void> {
    setTimeout(() => {
      this.getGame(gameId, { ...options, forceRefresh: true })
        .catch(error => console.warn('Background refresh failed:', error));
    }, 100);
  }

  private async refreshSearchInBackground(searchTerm: string, filters: any, options: RequestOptions): Promise<void> {
    setTimeout(() => {
      this.searchGames(searchTerm, filters, { ...options, forceRefresh: true })
        .catch(error => console.warn('Background refresh failed:', error));
    }, 100);
  }

  private async refreshPopularInBackground(options: RequestOptions): Promise<void> {
    setTimeout(() => {
      this.getPopularGames({ ...options, forceRefresh: true })
        .catch(error => console.warn('Background refresh failed:', error));
    }, 100);
  }

  private getDefaultStats(): CacheStats {
    return {
      igdbCache: 0,
      gamesCache: 0,
      searchCache: 0,
      totalSize: 0,
      hitRate: 0
    };
  }

  private calculateOverallHitRate(stats: any): number {
    const hitRates = Object.values(stats)
      .map((stat: any) => stat.hitRate || 0)
      .filter(rate => rate > 0);
    
    return hitRates.length > 0 
      ? hitRates.reduce((sum: number, rate: number) => sum + rate, 0) / hitRates.length 
      : 0;
  }
}

// Export singleton instance
export const enhancedIGDBService = new EnhancedIGDBService();
