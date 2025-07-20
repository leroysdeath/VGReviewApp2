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
