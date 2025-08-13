import { supabase } from '../utils/supabaseClient';
import crypto from 'crypto';

export interface CacheConfig {
  ttl: number;
  staleWhileRevalidate?: boolean;
}

export interface CachedResponse<T = any> {
  data: T;
  cached: boolean;
  timestamp: Date;
  expiresAt: Date;
}

class IGDBCacheService {
  private defaultTTL = 3600;
  private gameTTL = 604800;
  private searchTTL = 1800;

  private generateCacheKey(endpoint: string, params: any): string {
    const paramString = JSON.stringify(params);
    return crypto.createHash('md5').update(`${endpoint}:${paramString}`).digest('hex');
  }

  private async getCachedData(cacheKey: string): Promise<any | null> {
    try {
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('response_data, expires_at, hit_count, id')
        .eq('cache_key', cacheKey)
        .gte('expires_at', new Date().toISOString())
        .single();

      if (error || !data) return null;

      await supabase
        .from('igdb_cache')
        .update({
          hit_count: (data.hit_count || 0) + 1,
          last_accessed: new Date().toISOString()
        })
        .eq('id', data.id);

      return data.response_data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  }

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
        hit_count: 0,
        last_accessed: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error setting cached data:', error);
    }
  }

  private async deleteCachedData(cacheKey: string): Promise<void> {
    try {
      await supabase.from('igdb_cache').delete().eq('cache_key', cacheKey);
    } catch (error) {
      console.error('Error deleting cached data:', error);
    }
  }

  async getGame(gameId: number, forceRefresh = false): Promise<CachedResponse> {
    try {
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('*')
        .contains('query_params', { gameId: gameId })
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const cacheRecord = data[0];
        
        await supabase
          .from('igdb_cache')
          .update({
            hit_count: (cacheRecord.hit_count || 0) + 1,
            last_accessed: new Date().toISOString()
          })
          .eq('id', cacheRecord.id);

        const games = Array.isArray(cacheRecord.response_data) 
          ? cacheRecord.response_data 
          : [cacheRecord.response_data];
        
        const game = games.find((g: any) => g.id === gameId);
        
        if (game) {
          return {
            data: game,
            cached: true,
            timestamp: new Date(cacheRecord.updated_at),
            expiresAt: new Date(cacheRecord.expires_at),
          };
        }
      }

      const { data: allCacheData } = await supabase
        .from('igdb_cache')
        .select('*')
        .gte('expires_at', new Date().toISOString())
        .limit(100);

      if (allCacheData) {
        for (const record of allCacheData) {
          const games = Array.isArray(record.response_data) 
            ? record.response_data 
            : [record.response_data];
          
          const game = games.find((g: any) => g.id === gameId);
          
          if (game) {
            await supabase
              .from('igdb_cache')
              .update({
                hit_count: (record.hit_count || 0) + 1,
                last_accessed: new Date().toISOString()
              })
              .eq('id', record.id);

            return {
              data: game,
              cached: true,
              timestamp: new Date(record.updated_at),
              expiresAt: new Date(record.expires_at),
            };
          }
        }
      }

      return {
        data: null,
        cached: false,
        timestamp: new Date(),
        expiresAt: new Date(),
      };
    } catch (error) {
      console.error('Error in getGame:', error);
      throw error;
    }
  }

  async searchGames(
    searchTerm: string,
    filters: any = {},
    config: CacheConfig = { ttl: this.searchTTL }
  ): Promise<CachedResponse> {
    try {
      const searchPattern = `%${searchTerm.toLowerCase()}%`;
      
      const { data, error } = await supabase
        .from('igdb_cache')
        .select('*')
        .ilike('cache_key', `%search%${searchTerm}%`)
        .gte('expires_at', new Date().toISOString())
        .order('last_accessed', { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        const allGames: any[] = [];
        const processedIds = new Set<string>();

        for (const record of data) {
          if (!processedIds.has(record.id)) {
            processedIds.add(record.id);
            
            await supabase
              .from('igdb_cache')
              .update({
                hit_count: (record.hit_count || 0) + 1,
                last_accessed: new Date().toISOString()
              })
              .eq('id', record.id);

            const games = Array.isArray(record.response_data) 
              ? record.response_data 
              : [record.response_data];
            
            const filteredGames = games.filter((game: any) => 
              game.name && game.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
            
            allGames.push(...filteredGames);
          }
        }

        const uniqueGames = allGames.filter((game, index, self) =>
          index === self.findIndex((g) => g.id === game.id)
        );

        let filteredResults = uniqueGames;
        
        if (filters.genreId) {
          filteredResults = filteredResults.filter((game: any) => 
            game.genres?.some((g: any) => g.id === filters.genreId)
          );
        }
        
        if (filters.platformId) {
          filteredResults = filteredResults.filter((game: any) => 
            game.platforms?.some((p: any) => p.id === filters.platformId)
          );
        }
        
        if (filters.minRating) {
          filteredResults = filteredResults.filter((game: any) => 
            game.rating && game.rating >= filters.minRating
          );
        }

        return {
          data: filteredResults.slice(0, 20),
          cached: true,
          timestamp: new Date(),
          expiresAt: new Date(Date.now() + config.ttl * 1000),
        };
      }

      return {
        data: [],
        cached: false,
        timestamp: new Date(),
        expiresAt: new Date(),
      };
    } catch (error) {
      console.error('Error in searchGames:', error);
      return { data: [], cached: false, timestamp: new Date(), expiresAt: new Date() };
    }
  }

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

    return {
      data: null,
      cached: false,
      timestamp: new Date(),
      expiresAt: new Date(),
    };
  }

  async clearCache(): Promise<void> {
    try {
      await supabase.from('igdb_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  async clearExpiredCache(): Promise<void> {
    try {
      const now = new Date().toISOString();
      await supabase.from('igdb_cache').delete().lt('expires_at', now);
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }

  async getCacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    activeEntries: number;
    totalHits: number;
  }> {
    try {
      const now = new Date().toISOString();
      
      const { count: totalCount } = await supabase
        .from('igdb_cache')
        .select('id', { count: 'exact', head: true });

      const { count: activeCount } = await supabase
        .from('igdb_cache')
        .select('id', { count: 'exact', head: true })
        .gte('expires_at', now);

      const { data: hitData } = await supabase
        .from('igdb_cache')
        .select('hit_count');

      const totalHits = hitData?.reduce((sum, record) => sum + (record.hit_count || 0), 0) || 0;

      return {
        totalEntries: totalCount || 0,
        activeEntries: activeCount || 0,
        expiredEntries: (totalCount || 0) - (activeCount || 0),
        totalHits: totalHits
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { 
        totalEntries: 0, 
        activeEntries: 0, 
        expiredEntries: 0, 
        totalHits: 0 
      };
    }
  }
}

export const igdbCache = new IGDBCacheService();