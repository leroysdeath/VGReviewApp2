// Enhanced IGDB API service using Netlify functions
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

interface NetlifyFunctionResponse {
  games: Array<{
    id: string;
    name: string;
    summary: string;
    coverImage: string;
    platforms: string[];
    releaseDate: string;
    rating: number;
    genres: string[];
  }>;
  total: number;
  searchTerm: string;
  limit: number;
}

interface ErrorResponse {
  error: string;
  message: string;
  status?: number;
}

class IGDBService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_DELAY = 250; // 250ms between requests
  private lastRequestTime = 0;
  private readonly NETLIFY_FUNCTION_URL = '/.netlify/functions/igdb-search';

  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

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

  /**
   * Format IGDB cover URL to use cover_big size
   */
  private formatCoverUrl(url: string): string {
    if (!url) return '';
    
    // If it's already a full URL, convert thumb to cover_big
    if (url.startsWith('https:') || url.startsWith('http:')) {
      return url.replace('t_thumb', 't_cover_big');
    }
    
    // If it's a protocol-relative URL, add https and convert
    if (url.startsWith('//')) {
      return `https:${url.replace('t_thumb', 't_cover_big')}`;
    }
    
    return url;
  }

  /**
   * Format Unix timestamp to YYYY-MM-DD date string
   */
  private formatReleaseDate(timestamp?: number): string {
    if (!timestamp) return '';
    
    try {
      return new Date(timestamp * 1000).toISOString().split('T')[0];
    } catch (error) {
      console.warn('Failed to format release date:', timestamp, error);
      return '';
    }
  }

  /**
   * Extract platform names from platforms array
   */
  private getPlatformNames(platforms?: Array<{ name: string }>): string[] {
    return platforms?.map(p => p.name) || [];
  }

  /**
   * Extract genre names from genres array
   */
  private getGenreNames(genres?: Array<{ name: string }>): string[] {
    return genres?.map(g => g.name) || [];
  }

  /**
   * Transform Netlify function response to Game format
   */
  private transformNetlifyResponseToGame(gameData: NetlifyFunctionResponse['games'][0]): Game {
    return {
      id: gameData.id,
      title: gameData.name,
      coverImage: this.formatCoverUrl(gameData.coverImage),
      releaseDate: gameData.releaseDate,
      genre: gameData.genres?.[0] || 'Unknown',
      rating: gameData.rating || 0,
      description: gameData.summary || '',
      developer: 'Unknown', // Not provided by current function
      publisher: 'Unknown', // Not provided by current function
      platforms: gameData.platforms || [],
      screenshots: [], // Not provided by current function
      videos: [], // Not provided by current function
      igdbId: parseInt(gameData.id)
    };
  }

  /**
   * Make request to Netlify function with comprehensive error handling
   */
  private async makeNetlifyRequest(searchTerm: string, limit: number = 20): Promise<NetlifyFunctionResponse> {
    const cacheKey = this.getCacheKey(searchTerm, limit);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimit();

    console.log('🔍 Making IGDB search request:', { searchTerm, limit });

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

      console.log('📡 Netlify function response status:', response.status);

      if (!response.ok) {
        let errorData: ErrorResponse;
        
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          throw new Error(`Request failed with status ${response.status}`);
        }

        console.error('❌ Netlify function error:', errorData);

        // Handle specific error types with user-friendly messages
        switch (response.status) {
          case 401:
            throw new Error('Authentication failed. Please check API credentials.');
          case 429:
            throw new Error('Too many requests. Please wait a moment and try again.');
          case 403:
            throw new Error('Access denied. Please check API permissions.');
          case 500:
            throw new Error('Server configuration error. Please contact support.');
          case 503:
            throw new Error('Game database is temporarily unavailable. Please try again later.');
          default:
            throw new Error(errorData.message || `Request failed: ${errorData.error}`);
        }
      }

      const data: NetlifyFunctionResponse = await response.json();
      console.log('✅ Successfully received', data.games.length, 'games');

      this.setCache(cacheKey, data);
      return data;

    } catch (error) {
      console.error('🚨 Network error in IGDB request:', error);
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('An unexpected error occurred while searching for games.');
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
    console.log('🎮 Searching games:', { query: trimmedQuery, limit });

    try {
      const response = await this.makeNetlifyRequest(trimmedQuery, limit);
      const games = response.games.map(game => this.transformNetlifyResponseToGame(game));
      
      console.log('🎯 Search completed:', {
        query: trimmedQuery,
        found: games.length,
        total: response.total
      });
      
      return games;
    } catch (error) {
      console.error('❌ Search games failed:', error);
      
      // Return fallback data for development/demo purposes
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Returning fallback data for development');
        return this.getFallbackGames(trimmedQuery, limit);
      }
      
      throw error;
    }
  }

  /**
   * Get popular games (uses a generic search for popular titles)
   */
  async getPopularGames(limit = 20): Promise<Game[]> {
    console.log('🔥 Getting popular games:', { limit });
    
    try {
      // Search for popular game titles to get diverse results
      const popularSearchTerms = ['zelda', 'mario', 'witcher', 'cyberpunk', 'god of war'];
      const randomTerm = popularSearchTerms[Math.floor(Math.random() * popularSearchTerms.length)];
      
      return await this.searchGames(randomTerm, limit);
    } catch (error) {
      console.error('❌ Get popular games failed:', error);
      
      if (process.env.NODE_ENV === 'development') {
        return this.getFallbackGames('popular', limit);
      }
      
      throw new Error('Failed to load popular games. Please try again later.');
    }
  }

  /**
   * Get recent games (uses current year search)
   */
  async getRecentGames(limit = 20): Promise<Game[]> {
    console.log('📅 Getting recent games:', { limit });
    
    try {
      const currentYear = new Date().getFullYear();
      return await this.searchGames(`${currentYear}`, limit);
    } catch (error) {
      console.error('❌ Get recent games failed:', error);
      
      if (process.env.NODE_ENV === 'development') {
        return this.getFallbackGames('recent', limit);
      }
      
      throw new Error('Failed to load recent games. Please try again later.');
    }
  }

  /**
   * Get game by ID (searches by name since we don't have direct ID lookup)
   */
  async getGameById(id: string): Promise<Game | null> {
    console.log('🔍 Getting game by ID:', id);
    
    try {
      // Try to search by the ID first, then fallback to cached data
      const games = await this.searchGames(id, 1);
      return games.length > 0 ? games[0] : null;
    } catch (error) {
      console.error('❌ Get game by ID failed:', error);
      return null;
    }
  }

  async getGameByStringId(id: string): Promise<Game | null> {
    return this.getGameById(id);
  }

  /**
   * Fallback games for development/demo purposes
   */
  private getFallbackGames(query: string, limit: number): Game[] {
    const fallbackGames: Game[] = [
      {
        id: '1',
        title: 'The Witcher 3: Wild Hunt',
        coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2015-05-19',
        genre: 'RPG',
        rating: 9.3,
        description: 'You are Geralt of Rivia, mercenary monster slayer.',
        developer: 'CD Projekt Red',
        publisher: 'CD Projekt'
      },
      {
        id: '2',
        title: 'Cyberpunk 2077',
        coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2020-12-10',
        genre: 'RPG',
        rating: 7.8,
        description: 'Cyberpunk 2077 is an open-world, action-adventure story set in Night City.',
        developer: 'CD Projekt Red',
        publisher: 'CD Projekt'
      },
      {
        id: '3',
        title: 'Red Dead Redemption 2',
        coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2018-10-26',
        genre: 'Action',
        rating: 9.7,
        description: 'America, 1899. Arthur Morgan and the Van der Linde gang are outlaws on the run.',
        developer: 'Rockstar Games',
        publisher: 'Rockstar Games'
      }
    ];

    console.log('🔄 Using fallback games for query:', query);
    return fallbackGames.slice(0, limit);
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    console.log('🗑️ Clearing IGDB cache');
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
}

export const igdbService = new IGDBService();