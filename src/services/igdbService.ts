// Mock IGDB API service for development
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

class IGDBService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  private getMockGames(searchTerm: string, limit: number): Game[] {
    const mockGames: Game[] = [
      {
        id: '1',
        title: `${searchTerm} - The Witcher 3: Wild Hunt`,
        coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2015-05-19',
        genre: 'RPG',
        rating: 9.3,
        description: 'You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will.',
        developer: 'CD Projekt Red',
        publisher: 'CD Projekt',
        platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
        screenshots: [
          'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=800',
          'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800'
        ],
        videos: [],
        igdbId: 1942
      },
      {
        id: '2',
        title: `${searchTerm} - Cyberpunk 2077`,
        coverImage: 'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2020-12-10',
        genre: 'RPG',
        rating: 7.8,
        description: 'Cyberpunk 2077 is an open-world, action-adventure story set in Night City, a megalopolis obsessed with power, glamour and body modification.',
        developer: 'CD Projekt Red',
        publisher: 'CD Projekt',
        platforms: ['PC', 'PlayStation 4', 'PlayStation 5', 'Xbox One', 'Xbox Series X/S'],
        screenshots: [
          'https://images.pexels.com/photos/2047905/pexels-photo-2047905.jpeg?auto=compress&cs=tinysrgb&w=800'
        ],
        videos: [],
        igdbId: 1877
      },
      {
        id: '3',
        title: `${searchTerm} - Red Dead Redemption 2`,
        coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2018-10-26',
        genre: 'Action',
        rating: 9.7,
        description: 'America, 1899. Arthur Morgan and the Van der Linde gang are outlaws on the run. With federal agents and the best bounty hunters in the nation massing on their heels.',
        developer: 'Rockstar Games',
        publisher: 'Rockstar Games',
        platforms: ['PC', 'PlayStation 4', 'Xbox One'],
        screenshots: [
          'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=800'
        ],
        videos: [],
        igdbId: 25076
      },
      {
        id: '4',
        title: `${searchTerm} - The Legend of Zelda: Breath of the Wild`,
        coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2017-03-03',
        genre: 'Action-Adventure',
        rating: 9.7,
        description: 'Step into a world of discovery, exploration, and adventure in The Legend of Zelda: Breath of the Wild.',
        developer: 'Nintendo EPD',
        publisher: 'Nintendo',
        platforms: ['Nintendo Switch', 'Wii U'],
        screenshots: [
          'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=800'
        ],
        videos: [],
        igdbId: 7346
      },
      {
        id: '5',
        title: `${searchTerm} - God of War`,
        coverImage: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2018-04-20',
        genre: 'Action',
        rating: 9.5,
        description: 'His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man in the realm of Norse Gods and monsters.',
        developer: 'Santa Monica Studio',
        publisher: 'Sony Interactive Entertainment',
        platforms: ['PlayStation 4', 'PC'],
        screenshots: [
          'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=800'
        ],
        videos: [],
        igdbId: 1009
      },
      {
        id: '6',
        title: `${searchTerm} - Elden Ring`,
        coverImage: 'https://images.pexels.com/photos/7862492/pexels-photo-7862492.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2022-02-25',
        genre: 'Action RPG',
        rating: 9.6,
        description: 'Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.',
        developer: 'FromSoftware',
        publisher: 'Bandai Namco Entertainment',
        platforms: ['PC', 'PlayStation 4', 'PlayStation 5', 'Xbox One', 'Xbox Series X/S'],
        screenshots: [
          'https://images.pexels.com/photos/7862492/pexels-photo-7862492.jpeg?auto=compress&cs=tinysrgb&w=800'
        ],
        videos: [],
        igdbId: 119171
      }
    ];

    // Filter games based on search term if it's not a generic search
    if (searchTerm && !['popular', 'recent', 'test'].includes(searchTerm.toLowerCase())) {
      const filtered = mockGames.filter(game => 
        game.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.genre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.developer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      if (filtered.length > 0) {
        return filtered.slice(0, limit);
      }
    }
    
    return mockGames.slice(0, limit);
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
    
    console.log('🎮 IGDB Service (Mock): Searching games:', { 
      query: trimmedQuery, 
      limit,
      cacheSize: this.cache.size
    });

    // Check cache first
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      const games = this.getMockGames(trimmedQuery, limit);
      
      console.log('🎯 IGDB Service (Mock): Search completed:', {
        query: trimmedQuery,
        found: games.length
      });
      
      // Cache the results
      this.setCache(cacheKey, games);
      
      return games;
    } catch (error) {
      console.error('❌ IGDB Service (Mock): Search games failed:', {
        query: trimmedQuery,
        error: error.message
      });
      
      throw new Error(`Failed to search for "${trimmedQuery}": ${error.message}`);
    }
  }

  /**
   * Get popular games
   */
  async getPopularGames(limit = 20): Promise<Game[]> {
    console.log('🔥 IGDB Service (Mock): Getting popular games:', { limit });
    
    try {
      return await this.searchGames('popular', limit);
    } catch (error) {
      console.error('❌ IGDB Service (Mock): Get popular games failed:', error);
      throw new Error('Failed to load popular games. Please try again later.');
    }
  }

  /**
   * Get recent games
   */
  async getRecentGames(limit = 20): Promise<Game[]> {
    console.log('📅 IGDB Service (Mock): Getting recent games:', { limit });
    
    try {
      const currentYear = new Date().getFullYear();
      return await this.searchGames(`recent ${currentYear}`, limit);
    } catch (error) {
      console.error('❌ IGDB Service (Mock): Get recent games failed:', error);
      throw new Error('Failed to load recent games. Please try again later.');
    }
  }

  /**
   * Get game by ID
   */
  async getGameById(id: string): Promise<Game | null> {
    console.log('🔍 IGDB Service (Mock): Getting game by ID:', id);
    
    try {
      const games = await this.searchGames(`game ${id}`, 1);
      return games.length > 0 ? games[0] : null;
    } catch (error) {
      console.error('❌ IGDB Service (Mock): Get game by ID failed:', error);
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
    console.log('🗑️ IGDB Service (Mock): Clearing cache');
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
    console.log('🔧 Testing mock IGDB service connection...');
    
    try {
      const testGames = await this.searchGames('test', 1);
      return {
        success: true,
        message: 'Mock service connection successful',
        details: {
          gamesFound: testGames.length,
          cacheSize: this.cache.size
        }
      };
    } catch (error) {
      return {
        success: false,
        message: `Mock service test failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }
}

export const igdbService = new IGDBService();
export default igdbService;