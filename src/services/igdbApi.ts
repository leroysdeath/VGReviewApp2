import { sortGamesByPlatformPriority } from '../utils/platformPriority';
import { gameDataService, IGDBGame as DataServiceGame } from './gameDataService';

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
  private mapDataServiceToIGDB(game: DataServiceGame): IGDBGame {
    return {
      id: game.id,
      name: game.name,
      summary: game.summary,
      cover: game.cover ? {
        id: game.cover.id,
        url: game.cover.url || gameDataService.getCoverImageUrl(game.cover.image_id || '', 'cover_big')
      } : undefined,
      platforms: game.platforms,
      genres: game.genres,
      first_release_date: game.first_release_date,
      rating: game.rating,
      screenshots: game.screenshots?.map(s => ({
        id: s.id,
        url: gameDataService.getCoverImageUrl(s.image_id, 'cover_big')
      }))
    };
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
      developer: (igdbGame as any).developer || 'Unknown',
      publisher: (igdbGame as any).publisher || 'Unknown',
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      screenshots: igdbGame.screenshots?.map(s => s.url) || [],
      videos: [],
      igdbId: igdbGame.id
    };
  }

  async searchGames(searchTerm: string, options?: { limit?: number; fields?: string } | number): Promise<Game[]> {
    try {
      // Handle both old number parameter and new options object
      const limit = typeof options === 'number' ? options : (options?.limit || 20);
      
      const dataServiceGames = await gameDataService.searchGames(searchTerm);
      
      // If cache returns no results, use fallback games
      if (!dataServiceGames || dataServiceGames.length === 0) {
        console.log('📦 Cache returned no results, using fallback for:', searchTerm);
        return this.getFallbackGames(searchTerm);
      }
      
      const igdbGames = dataServiceGames.slice(0, limit).map(g => this.mapDataServiceToIGDB(g));
      
      const sortedGames = sortGamesByPlatformPriority(igdbGames);
      return sortedGames.map(game => this.mapIGDBToGame(game));
    } catch (error) {
      console.error('❌ Search error:', error);
      return this.getFallbackGames(searchTerm);
    }
  }

  async getGameById(id: number): Promise<Game | null> {
    try {
      const game = await gameDataService.getGameById(id);
      if (!game) return null;
      
      const igdbGame = this.mapDataServiceToIGDB(game);
      return this.mapIGDBToGame(igdbGame);
    } catch (error) {
      console.error('❌ Error fetching game by ID:', error);
      return null;
    }
  }

  async getPopularGames(limit: number = 20): Promise<Game[]> {
    try {
      const games = await gameDataService.getPopularGames(limit);
      const igdbGames = games.map(g => this.mapDataServiceToIGDB(g));
      return igdbGames.map(game => this.mapIGDBToGame(game));
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
}

export const igdbService = new IGDBService();