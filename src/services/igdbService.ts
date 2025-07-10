// Enhanced IGDB API service using Netlify functions with comprehensive debugging and error handling
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
  timestamp: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  status?: number;
  timestamp?: string;
  details?: any;
}

class IGDBService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_DELAY = 250; // 250ms between requests
  private lastRequestTime = 0;
  private readonly DEBUG_MODE = import.meta.env.DEV;
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
    console.log('🔑 Generated cache key:', key);
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('🎯 IGDB Cache hit for:', key);
      return cached.data;
    }
    if (cached) {
      console.log('⏰ IGDB Cache expired for:', key);
      this.cache.delete(key);
    }
    return null;
  }

  private setCache(key: string, data: any): void {
    console.log('💾 IGDB Caching data for:', key);
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
   * Parse response text safely with detailed logging
   */
  private logDebugInfo(message: string, data: any) {
    if (this.DEBUG_MODE) {
      console.log(`🐛 [DEBUG] ${message}:`, data);
    }
  }

  /**
   * Parse response text safely with detailed logging
   */
  private async parseResponseSafely(response: Response): Promise<any> {
    const responseUrl = response.url;
    const responseStatus = response.status;
    const responseStatusText = response.statusText;
    
    console.log('📄 Parsing response:', {
      url: responseUrl,
      status: responseStatus,
      statusText: responseStatusText,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

    this.logDebugInfo('Response headers', Object.fromEntries(response.headers.entries()));

    let responseText: string;
    
    try {
      responseText = await response.text();
      console.log('📝 Raw response text:', {
        length: responseText.length,
        preview: responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''),
        isEmpty: responseText.trim().length === 0
      });
      this.logDebugInfo('Full response text', responseText);
    } catch (textError) {
      console.error('❌ Failed to read response text:', textError);
      throw new Error('Failed to read response from server');
    }

    // Handle empty responses
    if (!responseText || responseText.trim().length === 0) {
      this.logDebugInfo('Empty response detected', { url: responseUrl, status: responseStatus });
      console.warn('⚠️ Received empty response');
      return { games: [], total: 0, searchTerm: '', limit: 0 };
    }

    // Try to parse JSON
    try {
      const parsedData = JSON.parse(responseText);
      console.log('✅ Successfully parsed JSON:', {
        type: typeof parsedData,
        hasGames: Array.isArray(parsedData?.games),
        gamesCount: parsedData?.games?.length || 0
      });
      this.logDebugInfo('Parsed JSON data', parsedData);
      return parsedData;
    } catch (jsonError) {
      console.error('❌ JSON parse error:', {
        error: jsonError.message,
        responseText: responseText.substring(0, 500)
      });
      
      // If it looks like HTML (404 page), provide specific error
      if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
        this.logDebugInfo('HTML response detected (likely 404)', { responseText: responseText.substring(0, 500) });
        throw new Error('Netlify function not found. The function may not be deployed or the URL is incorrect.');
      }
      
      throw new Error(`Invalid JSON response from server: ${jsonError.message}`);
    }
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

    console.log('🔍 IGDB Service: Making search request:', { 
      searchTerm, 
      limit,
      functionUrl: this.NETLIFY_FUNCTION_URL,
      timestamp: new Date().toISOString(),
      currentUrl: window.location.href,
      searchTerm, 
      limit,
      functionUrl: this.NETLIFY_FUNCTION_URL,
      timestamp: new Date().toISOString()
    });

    let response: Response;
    const requestStart = Date.now();

    // Log the exact request being made
    const requestPayload = {
      searchTerm,
      limit
    };
    
    this.logDebugInfo('Request payload', requestPayload);
    this.logDebugInfo('Function URL being called', this.NETLIFY_FUNCTION_URL);

    try {
      response = await fetch(this.NETLIFY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm, 
          limit
        })
      });
    } catch (fetchError) {
      const requestDuration = Date.now() - requestStart;
      console.error('❌ Network fetch failed:', {
        error: fetchError.message,
        duration: `${requestDuration}ms`,
        functionUrl: this.NETLIFY_FUNCTION_URL
        functionUrl: this.NETLIFY_FUNCTION_URL,
      });
      
      if (fetchError instanceof TypeError) {
        throw new Error('Network connection failed. Please check your internet connection and try again.');
      }
      
      throw new Error(`Request failed: ${fetchError.message}`);
    }

    const requestDuration = Date.now() - requestStart;
    console.log('📡 IGDB Service: Received response:', {
      status: response.status,
      statusText: response.statusText,
      duration: `${requestDuration}ms`,
      ok: response.ok,
      headers: {
        'content-type': response.headers.get('content-type'),
        'content-length': response.headers.get('content-length')
      }
    });

    this.logDebugInfo('Response object', { url: response.url, type: response.type, redirected: response.redirected });

    // Check response.ok before parsing
    if (!response.ok) {
      console.error('❌ HTTP Error Response:', {
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });

      this.logDebugInfo('Error response details', { status: response.status, statusText: response.statusText });

      let errorData: ErrorResponse;
      
      try {
        errorData = await this.parseResponseSafely(response);
        console.error('❌ Error response data:', errorData);
      } catch (parseError) {
        console.error('❌ Failed to parse error response:', parseError.message);
        
        // Handle specific HTTP status codes with user-friendly messages
        this.logDebugInfo('Failed to parse error response', { parseError: parseError.message, status: response.status });
        switch (response.status) {
          case 404:
            throw new Error('Netlify function not found. Please ensure the function is deployed and the URL is correct.');
          case 500:
            throw new Error('Server error occurred. Please try again later.');
          case 502:
            throw new Error('Bad gateway error. The Netlify function may be misconfigured.');
          case 503:
            throw new Error('Service temporarily unavailable. Please try again in a few moments.');
          default:
            throw new Error(`Request failed with status ${response.status}: ${response.statusText}`);
        }
      }

      // Handle specific error types with user-friendly messages
      switch (response.status) {
        case 401:
          throw new Error('Authentication failed. Please check IGDB API credentials.');
        case 429:
          throw new Error('Too many requests. Please wait a moment and try again.');
        case 403:
          throw new Error('Access denied. Please check API permissions.');
        case 404:
          throw new Error('Netlify function not found. Please ensure the IGDB search function is deployed.');
        case 500:
          throw new Error('Server configuration error. Please contact support.');
        case 502:
          throw new Error('Bad gateway. The Netlify function may be misconfigured.');
        case 503:
          throw new Error('Game database is temporarily unavailable. Please try again later.');
        default:
          throw new Error(errorData.message || `Request failed: ${errorData.error || 'Unknown error'}`);
      }
    }

    // Parse successful response
    let data: NetlifyFunctionResponse;
    
    try {
      data = await this.parseResponseSafely(response);
    } catch (parseError) {
      console.error('❌ Failed to parse successful response:', parseError.message);
      throw parseError;
    }

    // Validate response structure
    if (!data || typeof data !== 'object') {
      console.error('❌ Invalid response structure:', typeof data);
      this.logDebugInfo('Invalid response structure', { data, type: typeof data });
      throw new Error('Received invalid response structure from server');
    }

    if (!Array.isArray(data.games)) {
      console.warn('⚠️ Response missing games array, using empty array');
      data.games = [];
    }

    this.logDebugInfo('Final processed response', data);
    console.log('✅ IGDB Service: Successfully received response:', {
      gamesCount: data.games.length,
      total: data.total,
      searchTerm: data.searchTerm,
      limit: data.limit
    });

    this.setCache(cacheKey, data);
    return data;
  }

  /**
   * Search for games using the search term
   */
  async searchGames(query: string, limit = 20): Promise<Game[]> {
    if (!query || query.trim().length === 0) {
      console.warn('Empty search query provided');
      this.logDebugInfo('Empty search query', { query, limit });
      return [];
    }

    const trimmedQuery = query.trim();
    console.log('🎮 IGDB Service: Searching games:', { 
      query: trimmedQuery, 
      limit,
      cacheSize: this.cache.size
    });
    this.logDebugInfo('Search initiated', { query: trimmedQuery, limit, cacheSize: this.cache.size });

    try {
      const response = await this.makeNetlifyRequest(trimmedQuery, limit);
      
      // Handle empty or invalid response
      if (!response || !Array.isArray(response.games)) {
        console.warn('⚠️ Invalid or empty response, returning empty array');
        this.logDebugInfo('Invalid response structure in searchGames', response);
        return [];
      }

      const games = response.games.map(game => this.transformNetlifyResponseToGame(game));
      
      console.log('🎯 IGDB Service: Search completed:', {
        query: trimmedQuery,
        found: games.length,
        total: response.total,
        cached: this.getFromCache(this.getCacheKey(trimmedQuery, limit)) !== null
      });
      this.logDebugInfo('Search completed successfully', { games: games.length, query: trimmedQuery });
      
      return games;
    } catch (error) {
      console.error('❌ IGDB Service: Search games failed:', {
        query: trimmedQuery,
        error: error.message,
        stack: error.stack
      });
      this.logDebugInfo('Search failed', { query: trimmedQuery, error: error.message, stack: error.stack });
      
      // Return fallback data for development/demo purposes
      if (import.meta.env.DEV) {
        console.log('🔄 IGDB Service: Returning fallback data for development');
        return this.getFallbackGames(trimmedQuery, limit);
      }
      
      // Re-throw the error with context
      throw new Error(`Failed to search for "${trimmedQuery}": ${error.message}`);
    }
  }

  /**
   * Get popular games (uses a generic search for popular titles)
   */
  async getPopularGames(limit = 20): Promise<Game[]> {
    console.log('🔥 IGDB Service: Getting popular games:', { limit });
    
    this.logDebugInfo('Getting popular games', { limit });
    try {
      // Search for popular game titles to get diverse results
      const popularSearchTerms = ['zelda', 'mario', 'witcher', 'cyberpunk', 'god of war'];
      const randomTerm = popularSearchTerms[Math.floor(Math.random() * popularSearchTerms.length)];
      
      return await this.searchGames(randomTerm, limit);
    } catch (error) {
      console.error('❌ IGDB Service: Get popular games failed:', error);
      this.logDebugInfo('Get popular games failed', { error: error.message });
      
      if (import.meta.env.DEV) {
        return this.getFallbackGames('popular', limit);
      }
      
      throw new Error('Failed to load popular games. Please try again later.');
    }
  }

  /**
   * Get recent games (uses current year search)
   */
  async getRecentGames(limit = 20): Promise<Game[]> {
    console.log('📅 IGDB Service: Getting recent games:', { limit });
    
    this.logDebugInfo('Getting recent games', { limit });
    try {
      const currentYear = new Date().getFullYear();
      return await this.searchGames(`${currentYear}`, limit);
    } catch (error) {
      console.error('❌ IGDB Service: Get recent games failed:', error);
      this.logDebugInfo('Get recent games failed', { error: error.message });
      
      if (import.meta.env.DEV) {
        return this.getFallbackGames('recent', limit);
      }
      
      throw new Error('Failed to load recent games. Please try again later.');
    }
  }

  /**
   * Get game by ID (searches by name since we don't have direct ID lookup)
   */
  async getGameById(id: string): Promise<Game | null> {
    console.log('🔍 IGDB Service: Getting game by ID:', id);
    
    this.logDebugInfo('Getting game by ID', { id });
    try {
      // Try to search by the ID first, then fallback to cached data
      const games = await this.searchGames(id, 1);
      return games.length > 0 ? games[0] : null;
    } catch (error) {
      this.logDebugInfo('Get game by ID failed', { id, error: error.message });
      console.error('❌ IGDB Service: Get game by ID failed:', error);
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
      },
      {
        id: '4',
        title: 'The Legend of Zelda: Breath of the Wild',
        coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2017-03-03',
        genre: 'Action-Adventure',
        rating: 9.7,
        description: 'Step into a world of discovery, exploration, and adventure.',
        developer: 'Nintendo EPD',
        publisher: 'Nintendo'
      },
      {
        id: '5',
        title: 'God of War',
        coverImage: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2018-04-20',
        genre: 'Action',
        rating: 9.5,
        description: 'His vengeance against the Gods of Olympus years behind him.',
        developer: 'Santa Monica Studio',
        publisher: 'Sony Interactive Entertainment'
      }
    ];

    console.log('🔄 IGDB Service: Using fallback games for query:', query);
    
    // Filter games based on query if provided
    if (query && query !== 'popular' && query !== 'recent') {
      const filtered = fallbackGames.filter(game => 
        game.title.toLowerCase().includes(query.toLowerCase()) ||
        game.genre.toLowerCase().includes(query.toLowerCase()) ||
        game.developer.toLowerCase().includes(query.toLowerCase())
      );
      
      if (filtered.length > 0) {
        return filtered.slice(0, limit);
      }
    }
    
    return fallbackGames.slice(0, limit);
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
   * Test the Netlify function connection
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    console.log('🔧 Testing Netlify function connection...');
    
    try {
      const response = await fetch(this.NETLIFY_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: 'test',
          limit: 1
        })
      });

      this.logDebugInfo('Test connection response', { status: response.status, ok: response.ok });
      if (response.ok) {
        const data = await this.parseResponseSafely(response);
        return {
          success: true,
          message: 'Connection successful',
          details: {
            status: response.status,
            gamesFound: data.games?.length || 0
          }
        };
        };
      } else {
        const errorData = await this.parseResponseSafely(response);
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
          details: errorData
        };
      }
    } catch (error) {
      this.logDebugInfo('Test connection failed', { error: error.message });
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
}

export const igdbService = new IGDBService();