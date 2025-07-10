// IGDB API service using fallback to mock data when API is not available
import { getEnvVar } from '../utils/envValidation';

// Get validated environment variables
const SUPABASE_URL = getEnvVar('VITE_SUPABASE_URL');
const IGDB_CLIENT_ID = getEnvVar('VITE_IGDB_CLIENT_ID');
const IGDB_ACCESS_TOKEN = getEnvVar('VITE_IGDB_ACCESS_TOKEN');

// Define the Game interface to match what components expect
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
}

// Mock data for fallback when API is not available
const mockGamesData: Game[] = [
  {
    id: '1',
    title: 'The Witcher 3: Wild Hunt',
    coverImage: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2015-05-19',
    genre: 'RPG',
    rating: 9.3,
    description: 'You are Geralt of Rivia, mercenary monster slayer. Before you lies a war-torn, monster-infested continent you can explore at will.',
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
    title: 'The Last of Us Part II',
    coverImage: 'https://images.pexels.com/photos/3945667/pexels-photo-3945667.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-06-19',
    genre: 'Action',
    rating: 8.9,
    description: 'Five years after their dangerous journey across the post-pandemic United States.',
    developer: 'Naughty Dog',
    publisher: 'Sony Interactive Entertainment'
  },
  {
    id: '5',
    title: 'God of War',
    coverImage: 'https://images.pexels.com/photos/3945670/pexels-photo-3945670.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2018-04-20',
    genre: 'Action',
    rating: 9.5,
    description: 'His vengeance against the Gods of Olympus years behind him, Kratos now lives as a man.',
    developer: 'Santa Monica Studio',
    publisher: 'Sony Interactive Entertainment'
  },
  {
    id: '6',
    title: 'Horizon Zero Dawn',
    coverImage: 'https://images.pexels.com/photos/3945672/pexels-photo-3945672.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2017-02-28',
    genre: 'Action',
    rating: 8.7,
    description: 'Experience Aloy\'s entire legendary quest to unravel the mysteries of a world ruled by deadly Machines.',
    developer: 'Guerrilla Games',
    publisher: 'Sony Interactive Entertainment'
  },
  {
    id: '7',
    title: 'Elden Ring',
    coverImage: 'https://images.pexels.com/photos/3945654/pexels-photo-3945654.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2022-02-25',
    genre: 'RPG',
    rating: 9.6,
    description: 'THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace.',
    developer: 'FromSoftware',
    publisher: 'Bandai Namco Entertainment'
  },
  {
    id: '8',
    title: 'Ghost of Tsushima',
    coverImage: 'https://images.pexels.com/photos/3945656/pexels-photo-3945656.jpeg?auto=compress&cs=tinysrgb&w=400',
    releaseDate: '2020-07-17',
    genre: 'Action',
    rating: 8.8,
    description: 'In the late 13th century, the Mongol empire has laid waste to entire nations.',
    developer: 'Sucker Punch Productions',
    publisher: 'Sony Interactive Entertainment'
  }
];

class IGDBService {
  private async makeRequest(endpoint: string, body: string): Promise<any> {
    // Check if Supabase URL is available
    if (!SUPABASE_URL) {
      console.warn('Supabase URL not configured, using mock data');
      return this.getMockData(endpoint, body);
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/igdb-proxy/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: body,
      });

      if (!response.ok) {
        console.warn('IGDB API request failed, falling back to mock data');
        return this.getMockData(endpoint, body);
      }

      return await response.json();
    } catch (error) {
      console.warn('IGDB API request failed, falling back to mock data:', error);
      return this.getMockData(endpoint, body);
    }
  }

  private getMockData(endpoint: string, body: string): any {
    // Simple mock data based on endpoint and query
    if (endpoint === 'games') {
      if (body.includes('search')) {
        // Extract search term from body
        const searchMatch = body.match(/search "([^"]+)"/);
        const searchTerm = searchMatch ? searchMatch[1].toLowerCase() : '';
        
        if (searchTerm) {
          return mockGamesData.filter(game => 
            game.title.toLowerCase().includes(searchTerm) ||
            game.genre.toLowerCase().includes(searchTerm)
          );
        }
      }
      
      // Return all mock games for other queries
      return mockGamesData;
    }
    
    return [];
  }

  private mapGameData(game: any): Game {
    // If it's already in our format, return as is
    if (game.title) {
      return game;
    }

    // Map IGDB format to our format
    return {
      id: game.id?.toString() || '',
      title: game.name || '',
      coverImage: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : '',
      releaseDate: game.first_release_date 
        ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
        : '',
      genre: game.genres?.[0]?.name || '',
      rating: game.rating ? Math.round(game.rating / 10) : 0,
      description: game.summary || '',
      developer: game.involved_companies?.find((ic: any) => ic.developer)?.company?.name || '',
      publisher: game.involved_companies?.find((ic: any) => ic.publisher)?.company?.name || '',
      platforms: game.platforms?.map((p: any) => p.name) || [],
      screenshots: game.screenshots?.map((s: any) => `https:${s.url.replace('t_thumb', 't_screenshot_med')}`) || [],
      videos: game.videos?.map((v: any) => v.video_id) || [],
    };
  }

  async getPopularGames(limit: number = 20): Promise<Game[]> {
    const query = `
      fields name, cover.url, rating, rating_count, first_release_date, summary, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where rating_count > 100 & rating > 75;
      sort rating desc;
      limit ${limit};
    `;
    
    try {
      const games = await this.makeRequest('games', query);
      return games.map((game: any) => this.mapGameData(game));
    } catch (error) {
      console.error('Failed to get popular games:', error);
      return mockGamesData.slice(0, limit);
    }
  }

  async searchGames(query: string, limit: number = 20): Promise<Game[]> {
    const searchQuery = `
      fields name, cover.url, rating, rating_count, first_release_date, summary, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      search "${query}";
      limit ${limit};
    `;
    
    try {
      const games = await this.makeRequest('games', searchQuery);
      return games.map((game: any) => this.mapGameData(game));
    } catch (error) {
      console.error('Failed to search games:', error);
      // Return filtered mock data for search
      return mockGamesData.filter(game => 
        game.title.toLowerCase().includes(query.toLowerCase()) ||
        game.genre.toLowerCase().includes(query.toLowerCase())
      ).slice(0, limit);
    }
  }

  async getGameById(id: string): Promise<Game | null> {
    // Try to find in mock data first
    const mockGame = mockGamesData.find(game => game.id === id);
    if (mockGame) {
      return mockGame;
    }

    const numericId = parseInt(id);
    if (isNaN(numericId)) {
      return null;
    }

    const query = `
      fields name, cover.url, rating, rating_count, first_release_date, summary, genres.name, platforms.name, screenshots.url, videos.video_id, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where id = ${numericId};
    `;
    
    try {
      const games = await this.makeRequest('games', query);
      if (games.length === 0) {
        return null;
      }
      
      return this.mapGameData(games[0]);
    } catch (error) {
      console.error('Failed to get game by ID:', error);
      return null;
    }
  }

  async getGameByStringId(id: string): Promise<Game | null> {
    return this.getGameById(id);
  }

  async getRecentGames(limit: number = 20): Promise<Game[]> {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const oneYearAgo = currentTimestamp - (365 * 24 * 60 * 60);

    const query = `
      fields name, cover.url, rating, rating_count, first_release_date, summary, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where first_release_date > ${oneYearAgo} & first_release_date < ${currentTimestamp};
      sort first_release_date desc;
      limit ${limit};
    `;
    
    try {
      const games = await this.makeRequest('games', query);
      return games.map((game: any) => this.mapGameData(game));
    } catch (error) {
      console.error('Failed to get recent games:', error);
      return mockGamesData.slice(0, limit);
    }
  }
}

export const igdbService = new IGDBService();