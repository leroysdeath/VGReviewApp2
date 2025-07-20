// src/services/enhancedIGDBService.ts
import { igdbCache } from './igdbCacheService';
import { browserCache } from './browserCacheService';

interface RequestOptions {
  useCache?: boolean;
  cacheTTL?: number;
  browserCacheTTL?: number;
  forceRefresh?: boolean;
}

class EnhancedIGDBService {
  private defaultOptions: RequestOptions = {
    useCache: true,
    cacheTTL: 3600, // 1 hour database cache
    browserCacheTTL: 300, // 5 minutes browser cache
    forceRefresh: false,
  };

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
        return browserCached;
      }
    }

    // Level 2: Check database cache
    try {
      const result = await igdbCache.getGame(gameId, opts.forceRefresh);
      
      if (result.data) {
        // Store in browser cache for faster subsequent access
        if (opts.useCache) {
          browserCache.set(browserCacheKey, result.data, opts.browserCacheTTL);
        }

        console.log(
          result.cached 
            ? '💾 Cache hit: Database cache (game)' 
            : '🌐 Fresh fetch: IGDB API (game)', 
          gameId
        );
        
        return result.data;
      }
    } catch (error) {
      console.error('Error fetching game:', error);
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
        return browserCached;
      }
    }

    // Level 2: Check database cache and fetch if needed
    try {
      const result = await igdbCache.searchGames(searchTerm, filters, {
        ttl: opts.cacheTTL || 1800, // 30 minutes for search results
        staleWhileRevalidate: false,
      });

      if (result.data) {
        // Store in browser cache
        if (opts.useCache) {
          browserCache.set(browserCacheKey, result.data, opts.browserCacheTTL);
        }

        console.log(
          result.cached 
            ? '💾 Cache hit: Database cache (search)' 
            : '🌐 Fresh fetch: IGDB API (search)', 
          searchTerm
        );

        return result.data;
      }
    } catch (error) {
      console.error('Error searching games:', error);
      throw error;
    }

    return [];
  }

  /**
   * Get popular games with caching
   */
  async getPopularGames(options: RequestOptions = {}): Promise<any[]> {
    const opts = { ...this.defaultOptions, ...options };
    const browserCacheKey = 'popular-games';

    // Check browser cache
    if (opts.useCache && !opts.forceRefresh) {
      const browserCached = browserCache.get(browserCacheKey);
      if (browserCached) {
        console.log('🚀 Cache hit: Browser cache (popular games)');
        return browserCached;
      }
    }

    // Check database cache
    try {
      const result = await igdbCache.getCachedEndpoint('games', {
        fields: 'name,slug,cover.url,rating,first_release_date,platforms.name',
        sort: 'rating desc',
        limit: 20,
        where: 'rating > 80 & rating_count > 100'
      }, {
        ttl: opts.cacheTTL || 7200, // 2 hours for popular games
      });

      if (result.data) {
        // Store in browser cache
        if (opts.useCache) {
          browserCache.set(browserCacheKey, result.data, opts.browserCacheTTL);
        }

        console.log(
          result.cached 
            ? '💾 Cache hit: Database cache (popular)' 
            : '🌐 Fresh fetch: IGDB API (popular)'
        );

        return result.data;
      }
    } catch (error) {
      console.error('Error fetching popular games:', error);
      throw error;
    }

    return [];
  }

  /**
   * Get games by genre with caching
   */
  async getGamesByGenre(genreId: number, options: RequestOptions = {}): Promise<any[]> {
    const opts = { ...this.defaultOptions, ...options };
    const browserCacheKey = `genre-games:${genreId}`;

    // Check browser cache
    if (opts.useCache && !opts.forceRefresh) {
      const browserCached = browserCache.get(browserCacheKey);
      if (browserCached) {
        console.log('🚀 Cache hit: Browser cache (genre games)', genreId);
        return browserCached;
      }
    }

    // Check database cache
    try {
      const result = await igdbCache.getCachedEndpoint('games', {
        fields: 'name,slug,cover.url,rating,first_release_date,genres.name',
        where: `genres = [${genreId}]`,
        sort: 'rating desc',
        limit: 50
      }, {
        ttl: opts.cacheTTL || 3600, // 1 hour for genre games
      });

      if (result.data) {
        // Store in browser cache
        if (opts.useCache) {
          browserCache.set(browserCacheKey, result.data, opts.browserCacheTTL);
        }

        console.log(
          result.cached 
            ? '💾 Cache hit: Database cache (genre)' 
            : '🌐 Fresh fetch: IGDB API (genre)', 
          genreId
        );

        return result.data;
      }
    } catch (error) {
      console.error('Error fetching games by genre:', error);
      throw error;
    }

    return [];
  }

  /**
   * Get game screenshots with caching
   */
  async getGameScreenshots(gameId: number, options: RequestOptions = {}): Promise<any[]> {
    const opts = { ...this.defaultOptions, ...options };
    const browserCacheKey = `screenshots:${gameId}`;

    // Check browser cache
    if (opts.useCache && !opts.forceRefresh) {
      const browserCached = browserCache.get(browserCacheKey);
      if (browserCached) {
        console.log('🚀 Cache hit: Browser cache (screenshots)', gameId);
        return browserCached;
      }
    }

    // Check database cache
    try {
      const result = await igdbCache.getCachedEndpoint('screenshots', {
        fields: 'url,width,height',
        where: `game = ${gameId}`,
        limit: 10
      }, {
        ttl: opts.cacheTTL || 86400, // 24 hours for screenshots
      });

      if (result.data) {
        // Store in browser cache
        if (opts.useCache) {
          browserCache.set(browserCacheKey, result.data, opts.browserCacheTTL);
        }

        console.log(
          result.cached 
            ? '💾 Cache hit: Database cache (screenshots)' 
            : '🌐 Fresh fetch: IGDB API (screenshots)', 
          gameId
        );

        return result.data;
      }
    } catch (error) {
      console.error('Error fetching game screenshots:', error);
      throw error;
    }

    return [];
  }

  /**
   * Prefetch popular games for better UX
   */
  async prefetchPopularGames(): Promise<void> {
    try {
      console.log('🔄 Prefetching popular games...');
      await this.getPopularGames({ forceRefresh: false });
      console.log('✅ Popular games prefetched');
    } catch (error) {
      console.error('Error prefetching popular games:', error);
    }
  }

  /**
   * Prefetch game details when user hovers over a game card
   */
  async prefetchGame(gameId: number): Promise<void> {
    try {
      // Don't wait for the result, just trigger the cache
      this.getGame(gameId, { forceRefresh: false });
    } catch (error) {
      console.error('Error prefetching game:', error);
    }
  }

  /**
   * Warm up cache with essential data
   */
  async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up cache...');
    
    try {
      // Prefetch popular games
      await this.prefetchPopularGames();
      
      // Prefetch common genres
      const popularGenres = [4, 5, 10, 12, 15]; // Action, Shooter, Racing, RPG, Strategy
      await Promise.all(
        popularGenres.map(genreId => 
          this.getGamesByGenre(genreId, { forceRefresh: false })
        )
      );
      
      console.log('✅ Cache warmed up successfully');
    } catch (error) {
      console.error('Error warming up cache:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      await igdbCache.clearCache();
      browserCache.clear();
      console.log('✅ All caches cleared');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStatistics(): Promise<any> {
    try {
      const [dbStats, browserStats] = await Promise.all([
        igdbCache.getCacheStats(),
        Promise.resolve(browserCache.getStats())
      ]);

      return {
        database: dbStats,
        browser: browserStats,
        total: {
          items: dbStats.totalSize + browserStats.totalItems,
          validItems: dbStats.totalSize + browserStats.validItems,
        }
      };
    } catch (error) {
      console.error('Error getting cache statistics:', error);
      return null;
    }
  }
}

export const enhancedIGDBService = new EnhancedIGDBService();
