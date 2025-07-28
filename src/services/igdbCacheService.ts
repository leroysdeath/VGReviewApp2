// src/services/igdbCacheService.ts
import { supabase } from '../services/supabase';
import crypto from 'crypto';

export interface CacheConfig {
  ttl: number; // Time to live in seconds
  staleWhileRevalidate?: boolean; // Serve stale data while fetching fresh data
}

export interface CachedResponse<T = any> {
  data: T;
  cached: boolean;
  timestamp: Date;
  expiresAt: Date;
}

class IGDBCacheService {
  private defaultTTL = 3600; // 1 hour default
  private gameTTL = 604800; // 7 days for game data
  private searchTTL = 1800; // 30 minutes for search results

  /**
   * Generate a cache key from endpoint and parameters
   */
  private generateCacheKey(endpoint: string, params: any): string {
    const paramString = JSON.stringify(params);
    return crypto.createHash('md5').update(`${endpoint}:${paramString}`).digest('hex');
  }

  /**
   * Get cached data from Supabase
   */
  private async getCachedData(cacheKey: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('response_data, expires_at')
        .eq('cache_key', cacheKey)
        .single();

      if (error || !data) return null;

      // Check if cache is expired
      if (new Date(data.expires_at) < new Date()) {
        // Clean up expired entry
        await this.deleteCachedData(cacheKey);
        return null;
      }

      return data.response_data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

  /**
   * Store data in cache
   */
  private async setCachedData(
    cacheKey: string,
    endpoint: string,
    params: any,
    data: any,
    ttl: number
  ): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl * 1000);

      await supabase.from('igdb_cache').upsert({
        cache_key: cacheKey,
        endpoint,
        query_params: params,
        response_data: data,
        expires_at: expiresAt.toISOString(),
      });
    } catch (error) {
      console.error('Error setting cached data:', error);
    }
  }

  /**
   * Delete cached data
   */
  private async deleteCachedData(cacheKey: string): Promise<void> {
    try {
      await supabase.from('igdb_cache').delete().eq('cache_key', cacheKey);
    } catch (error) {
      console.error('Error deleting cached data:', error);
    }
  }

  /**
   * Get or fetch game data with caching
   */
  async getGame(gameId: number, forceRefresh = false): Promise<CachedResponse> {
    const cacheKey = this.generateCacheKey('games', { id: gameId });
    
    if (!forceRefresh) {
      // Try to get from games_cache table first (more structured)
      const { data: gameData, error } = await supabase
        .from('games_cache')
        .select('*')
        .eq('igdb_id', gameId)
        .single();

      if (!error && gameData && new Date(gameData.expires_at) > new Date()) {
        return {
          data: gameData.raw_data,
          cached: true,
          timestamp: new Date(gameData.last_updated),
          expiresAt: new Date(gameData.expires_at),
        };
      }
    }

    // Fetch from IGDB API
    const freshData = await this.fetchFromIGDB('games', {
      fields: 'name,slug,summary,cover.url,screenshots.url,genres.name,platforms.name,first_release_date,rating,rating_count',
      where: `id = ${gameId}`
    });

    if (freshData && freshData.length > 0) {
      const game = freshData[0];
      
      // Store in structured games_cache
      await supabase.from('games_cache').upsert({
        igdb_id: gameId,
        name: game.name,
        slug: game.slug,
        summary: game.summary,
        cover: game.cover,
        screenshots: game.screenshots,
        genres: game.genres,
        platforms: game.platforms,
        release_dates: game.first_release_date,
        rating: game.rating,
        rating_count: game.rating_count,
        raw_data: game,
        expires_at: new Date(Date.now() + this.gameTTL * 1000).toISOString(),
      });

      return {
        data: game,
        cached: false,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + this.gameTTL * 1000),
      };
    }

    throw new Error(`Game with ID ${gameId} not found`);
  }

  /**
   * Search games with caching
   */
  async searchGames(
    searchTerm: string,
    filters: any = {},
    config: CacheConfig = { ttl: this.searchTTL }
  ): Promise<CachedResponse> {
    const cacheKey = this.generateCacheKey('search', { term: searchTerm, ...filters });

    if (!config.staleWhileRevalidate) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          cached: true,
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + config.ttl * 1000),
        };
      }
    }

    // Build IGDB query
    const query = {
      fields: 'name,slug,summary,cover.url,first_release_date,rating,platforms.name',
      search: searchTerm,
      limit: 20,
      ...filters
    };

    const freshData = await this.fetchFromIGDB('games', query);

    if (freshData) {
      // Store in search cache
      await supabase.from('search_cache').insert({
        search_term: searchTerm,
        search_filters: filters,
        results: freshData,
        result_count: freshData.length,
        expires_at: new Date(Date.now() + config.ttl * 1000).toISOString(),
      });

      // Also cache in general cache
      await this.setCachedData(cacheKey, 'search', { term: searchTerm, ...filters }, freshData, config.ttl);

      return {
        data: freshData,
        cached: false,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + config.ttl * 1000),
      };
    }

    return { data: [], cached: false, timestamp: new Date(), expiresAt: new Date() };
  }

  /**
   * Generic method to get any IGDB endpoint with caching
   */
  async getCachedEndpoint(
    endpoint: string,
    params: any,
    config: CacheConfig = { ttl: this.defaultTTL }
  ): Promise<CachedResponse> {
    const cacheKey = this.generateCacheKey(endpoint, params);

    if (!config.staleWhileRevalidate) {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          cached: true,
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + config.ttl * 1000),
        };
      }
    }

    const freshData = await this.fetchFromIGDB(endpoint, params);

    if (freshData) {
      await this.setCachedData(cacheKey, endpoint, params, freshData, config.ttl);
    }

    return {
      data: freshData,
      cached: false,
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + config.ttl * 1000),
    };
  }

  /**
   * Fetch data from IGDB API (your existing implementation)
   */
  private async fetchFromIGDB(endpoint: string, params: any): Promise<any> {
    // Use your existing IGDB API implementation here
    // This should call your Supabase Edge Function or direct IGDB API
    try {
      const response = await fetch('/api/igdb-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          ...params,
        }),
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching from IGDB:', error);
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    try {
      await Promise.all([
        supabase.from('igdb_cache').delete().neq('id', ''),
        supabase.from('games_cache').delete().neq('id', ''),
        supabase.from('search_cache').delete().neq('id', ''),
      ]);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from('igdb_cache').delete().lt('expires_at', now),
        supabase.from('games_cache').delete().lt('expires_at', now),
        supabase.from('search_cache').delete().lt('expires_at', now),
      ]);
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    igdbCache: number;
    gamesCache: number;
    searchCache: number;
    totalSize: number;
  }> {
    try {
      const [igdbCount, gamesCount, searchCount] = await Promise.all([
        supabase.from('igdb_cache').select('id', { count: 'exact', head: true }),
        supabase.from('games_cache').select('id', { count: 'exact', head: true }),
        supabase.from('search_cache').select('id', { count: 'exact', head: true }),
      ]);

      return {
        igdbCache: igdbCount.count || 0,
        gamesCache: gamesCount.count || 0,
        searchCache: searchCount.count || 0,
        totalSize: (igdbCount.count || 0) + (gamesCount.count || 0) + (searchCount.count || 0),
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { igdbCache: 0, gamesCache: 0, searchCache: 0, totalSize: 0 };
    }
  }
}

export const igdbCache = new IGDBCacheService();
