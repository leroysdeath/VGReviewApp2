// IGDB API service with Netlify function integration
import { sortGamesByPlatformPriority } from '../utils/platformPriority';

export interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: {
    id: number;
    url: string;
  };
  platforms?: Array<{ id: number; name: string }>;
  genres?: Array<{ id: number; name: string }>;
  first_release_date?: number;
  rating?: number;
  screenshots?: Array<{ id: number; url: string }>;
}

export interface Game {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  rating: number;
  description: string;
  developer: string;
  publisher: string;
  platforms?: string[];
  screenshots?: string[];
  videos?: string[];
  igdbId?: number;
}

class IGDBService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly NETLIFY_FUNCTION_URL = '/.netlify/functions/igdb-search';

  private getCacheKey(searchTerm: string, limit: number): string {
    return `search:${searchTerm}:${limit}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('🎯 Cache hit for:', key);
      return cached.data;
    }
    if (cached) {
      console.log('⏰ Cache expired for:', key);
      this.cache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    console.log('💾 Caching data for:', key);
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private mapIGDBToGame(igdbGame: IGDBGame): Game {
    return {
      id: igdbGame.id.toString(),
      title: igdbGame.name,
      coverImage: igdbGame.cover?.url || 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : '',
      genre: igdbGame.genres?.[0]?.name || 'Unknown',
      rating: igdbGame.rating ? Math.round(igdbGame.rating / 10) : 0,
      description: igdbGame.summary || '',
      developer: (igdbGame as any).developer || 'Unknown', // The Netlify function now provides this
      publisher: (igdbGame as any).publisher || 'Unknown', // The Netlify function now provides this
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      screenshots: igdbGame.screenshots?.map(s => s.url) || [],
      videos: [],
      igdbId: igdbGame.id
    };
  }

  private async makeNetlifyRequest(searchTerm: string, limit: number): Promise<IGDBGame[]> {
    const requestStartTime = Date.now();
    
    console.log('🌐 Making Netlify function request:', {
      url: this.NETLIFY_FUNCTION_URL,
      searchTerm,
      limit,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await fetch(this.NETLIFY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm,
          limit
        })
      });

      const requestDuration = Date.now() - requestStartTime;
      
      console.log('📡 Netlify function response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${requestDuration}ms`,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        let errorData;
        try {
          const errorText = await response.text();
          console.log('📄 Error response text:', errorText);
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorData = { error: 'Unknown error', details: 'Failed to parse error response' };
        }
        
        throw new Error(`HTTP ${response.status}: ${errorData.error || errorData.message || 'Unknown error'}`);
      }

      let data;
      try {
        const responseText = await response.text();
        console.log('📄 Response text length:', responseText.length);
        
        if (!responseText) {
          console.warn('⚠️ Empty response from Netlify function');
          return [];
        }
        
        data = JSON.parse(responseText);
        console.log('✅ Successfully parsed response:', {
          type: Array.isArray(data) ? 'array' : typeof data,
          length: Array.isArray(data) ? data.length : 'N/A'
        });
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error('Invalid JSON response from function');
      }

      return Array.isArray(data) ? data : [];

    } catch (error) {
      const requestDuration = Date.now() - requestStartTime;
      
      console.error('💥 Netlify function request failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${requestDuration}ms`,
        searchTerm,
        limit
      });
      
      throw error;
    }
  }

  /**
   * Search for games using the search term
   */
  async searchGames(query: string, limit = 20): Promise<Game[]> {
    if (!query || query.trim().length === 0) {
      console.warn('Empty search query provided');
      return [];
    }

    const trimmedQuery = query.trim();
    const cacheKey = this.getCacheKey(trimmedQuery, limit);
    
    console.log('🎮 IGDB Service: Searching games:', { 
      query: trimmedQuery, 
      limit,
      cacheSize: this.cache.size
    });

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      // Ensure cached results are sorted consistently
      return Array.isArray(cached) ? sortGamesByPlatformPriority(cached) : cached;
    }

    try {
      const igdbGames = await this.makeNetlifyRequest(trimmedQuery, limit);
      const games = igdbGames.map(game => this.mapIGDBToGame(game));
      
      // Apply platform-based sorting to prioritize PC/console games
      const sortedGames = sortGamesByPlatformPriority(games);
      
      console.log('🎯 IGDB Service: Search completed:', {
        query: trimmedQuery,
        found: sortedGames.length,
        firstGame: sortedGames[0]?.title || 'None'
      });
      
      // Cache the sorted results
      this.setCache(cacheKey, sortedGames);
      
      return sortedGames;
    } catch (error) {
      console.error('❌ IGDB Service: Search games failed:', {
        query: trimmedQuery,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw new Error(`Failed to search for "${trimmedQuery}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get popular games
   */
  async getPopularGames(limit = 20): Promise<Game[]> {
    console.log('🔥 IGDB Service: Getting popular games:', { limit });
    
    try {
      // Use a popular search term to get good results
      return await this.searchGames('zelda mario witcher', limit);
    } catch (error) {
      console.error('❌ IGDB Service: Get popular games failed:', error);
      throw new Error('Failed to load popular games. Please try again later.');
    }
  }

  /**
   * Get recent games
   */
  async getRecentGames(limit = 20): Promise<Game[]> {
    console.log('📅 IGDB Service: Getting recent games:', { limit });
    
    try {
      const currentYear = new Date().getFullYear();
      return await this.searchGames(`cyberpunk elden ring`, limit);
    } catch (error) {
      console.error('❌ IGDB Service: Get recent games failed:', error);
      throw new Error('Failed to load recent games. Please try again later.');
    }
  }

  /**
   * Get game by ID - Updated to use proper IGDB ID lookup
   */
  async getGameById(id: string): Promise<Game | null> {
    console.log('🔍 IGDB Service: Getting game by ID:', id);
    
    const cacheKey = `game:${id}`;
    
    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }
    
    try {
      const requestStartTime = Date.now();
      
      console.log('🌐 Making Netlify function request for game ID:', {
        url: this.NETLIFY_FUNCTION_URL,
        gameId: id,
        timestamp: new Date().toISOString()
      });

      const response = await fetch(this.NETLIFY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gameId: id,
          type: 'getById'
        })
      });

      const requestDuration = Date.now() - requestStartTime;
      
      console.log('📡 Netlify function response for game ID:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        duration: `${requestDuration}ms`
      });

      if (!response.ok) {
        console.error('❌ Failed to fetch game by ID:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      console.log('📄 Game data received:', data ? 'Found' : 'Not found');
      
      if (data) {
        const game = this.mapIGDBToGame(data);
        this.setCache(cacheKey, game);
        console.log('✅ Successfully loaded game:', game.title);
        return game;
      }
      
      console.log('❌ No game data returned for ID:', id);
      return null;
    } catch (error) {
      console.error('❌ IGDB Service: Get game by ID failed:', error);
      return null;
    }
  }

  async getGameByStringId(id: string): Promise<Game | null> {
    return this.getGameById(id);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    console.log('🗑️ IGDB Service: Clearing cache');
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Test the service connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('🔧 Testing IGDB service connection...');
    
    try {
      const testGames = await this.searchGames('test', 1);
      return {
        success: true,
        message: 'IGDB service connection successful',
        details: {
          gamesFound: testGames.length,
          cacheSize: this.cache.size,
          functionUrl: this.NETLIFY_FUNCTION_URL
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `IGDB service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          functionUrl: this.NETLIFY_FUNCTION_URL
        }
      };
    }
  }
}

export const igdbService = new IGDBService();
export default igdbService;
