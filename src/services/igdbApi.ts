import { sortGamesByPlatformPriority } from '../utils/platformPriority';
import { databaseGameService, Game, IGDBGame } from './databaseGameService';

class IGDBService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000;

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

  async searchGames(searchTerm: string, limit: number = 20): Promise<Game[]> {
    const cacheKey = this.getCacheKey(searchTerm, limit);
    
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      console.log('🔍 Searching games from database:', { searchTerm, limit });
      
      const games = await databaseGameService.searchGames(searchTerm, undefined, limit);
      
      console.log(`✅ Found ${games.length} games`);
      
      // Apply platform priority sorting on the IGDBGame format for compatibility
      const igdbGames = await databaseGameService.searchGamesAsIGDB(searchTerm, limit);
      const sortedIGDBGames = sortGamesByPlatformPriority(igdbGames);
      
      // Convert back to Game format maintaining the sorted order
      const sortedGames = sortedIGDBGames.map(igdbGame => {
        const game = games.find(g => g.databaseId === igdbGame.id);
        return game || games[0]; // Fallback to first game if not found
      }).filter(Boolean);
      
      this.setCache(cacheKey, sortedGames);
      return sortedGames;
    } catch (error) {
      console.error('❌ Database search error:', error);
      
      return this.getFallbackGames(searchTerm);
    }
  }

  async getGameById(id: number): Promise<Game | null> {
    try {
      console.log('🔍 Fetching game by database ID:', id);
      const game = await databaseGameService.getGameById(id);
      
      if (!game) {
        console.log('❌ Game not found in database:', id);
        return null;
      }
      
      console.log('✅ Found game:', game.title);
      return game;
    } catch (error) {
      console.error('❌ Error fetching game by ID:', error);
      return null;
    }
  }

  async getPopularGames(limit: number = 20): Promise<Game[]> {
    try {
      console.log('🔍 Fetching popular games from database:', limit);
      const games = await databaseGameService.getPopularGames(limit);
      
      console.log(`✅ Found ${games.length} popular games`);
      return games;
    } catch (error) {
      console.error('❌ Error fetching popular games:', error);
      return this.getFallbackGames('');
    }
  }

  private getFallbackGames(searchTerm: string): Game[] {
    console.log('📦 Using fallback games');
    
    const fallbackGames: Game[] = [
      {
        id: '1',
        title: 'The Witcher 3: Wild Hunt',
        coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2015-05-19',
        genre: 'RPG',
        rating: 9,
        description: 'An epic open-world RPG set in a dark fantasy universe.',
        developer: 'CD Projekt Red',
        publisher: 'CD Projekt',
        platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Nintendo Switch'],
        screenshots: [],
        videos: []
      },
      {
        id: '2',
        title: 'Hades',
        coverImage: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2020-09-17',
        genre: 'Roguelike',
        rating: 9,
        description: 'A rogue-like dungeon crawler from the creators of Bastion and Transistor.',
        developer: 'Supergiant Games',
        publisher: 'Supergiant Games',
        platforms: ['PC', 'Nintendo Switch', 'PlayStation 4', 'Xbox One'],
        screenshots: [],
        videos: []
      },
      {
        id: '3',
        title: 'Red Dead Redemption 2',
        coverImage: 'https://images.pexels.com/photos/1545505/pexels-photo-1545505.jpeg?auto=compress&cs=tinysrgb&w=400',
        releaseDate: '2018-10-26',
        genre: 'Action',
        rating: 9,
        description: 'An epic tale of life in America at the dawn of the modern age.',
        developer: 'Rockstar Games',
        publisher: 'Rockstar Games',
        platforms: ['PC', 'PlayStation 4', 'Xbox One', 'Google Stadia'],
        screenshots: [],
        videos: []
      }
    ];

    if (!searchTerm) {
      return fallbackGames;
    }

    return fallbackGames.filter(game => 
      game.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  async getGamesByGenre(genre: string, limit: number = 20): Promise<Game[]> {
    try {
      console.log('🔍 Fetching games by genre from database:', genre);
      const games = await databaseGameService.getGamesByGenre(genre, limit);
      
      console.log(`✅ Found ${games.length} games in genre ${genre}`);
      return games;
    } catch (error) {
      console.error('❌ Error fetching games by genre:', error);
      return [];
    }
  }

  async getRecentGames(limit: number = 20): Promise<Game[]> {
    try {
      console.log('🔍 Fetching recent games from database:', limit);
      const games = await databaseGameService.getRecentGames(limit);
      
      console.log(`✅ Found ${games.length} recent games`);
      return games;
    } catch (error) {
      console.error('❌ Error fetching recent games:', error);
      return [];
    }
  }

  async getGenres(): Promise<string[]> {
    try {
      console.log('🔍 Fetching genres from database');
      const genres = await databaseGameService.getGenres();
      
      console.log(`✅ Found ${genres.length} genres`);
      return genres;
    } catch (error) {
      console.error('❌ Error fetching genres:', error);
      return [];
    }
  }

  async getPlatforms(): Promise<Array<{ id: number; name: string; slug: string }>> {
    try {
      console.log('🔍 Fetching platforms from database');
      const platforms = await databaseGameService.getPlatforms();
      
      console.log(`✅ Found ${platforms.length} platforms`);
      return platforms;
    } catch (error) {
      console.error('❌ Error fetching platforms:', error);
      return [];
    }
  }

  clearCache(): void {
    console.log('🧹 Clearing service cache');
    this.cache.clear();
  }
}

export const igdbService = new IGDBService();