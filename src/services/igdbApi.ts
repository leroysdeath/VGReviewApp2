const IGDB_BASE_URL = '/api/igdb';

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
  platforms: string[];
  screenshots?: string[];
  videos?: string[];
}

class IGDBService {
  private clientId: string;
  private accessToken: string;

  constructor() {
    this.clientId = import.meta.env.VITE_IGDB_CLIENT_ID;
    this.accessToken = import.meta.env.VITE_IGDB_ACCESS_TOKEN;
    
    if (!this.clientId || !this.accessToken) {
      throw new Error('IGDB API credentials not found in environment variables');
    }
  }

  private async makeRequest(endpoint: string, body: string) {
    try {
      const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Client-ID': this.clientId,
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('IGDB API request failed:', error);
      throw error;
    }
  }

  private mapGameData(game: any): Game {
    // Extract developer and publisher from involved_companies
    let developer = '';
    let publisher = '';
    
    if (game.involved_companies) {
      const devCompany = game.involved_companies.find((ic: any) => ic.developer);
      const pubCompany = game.involved_companies.find((ic: any) => ic.publisher);
      
      developer = devCompany?.company?.name || '';
      publisher = pubCompany?.company?.name || '';
    }

    return {
      id: game.id.toString(),
      title: game.name || '',
      coverImage: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : '',
      releaseDate: game.first_release_date 
        ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
        : '',
      genre: game.genres?.[0]?.name || '',
      rating: game.rating ? Math.round(game.rating / 10) : 0, // Scale from 0-100 to 0-10
      description: game.summary || '',
      developer,
      publisher,
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
      throw error;
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
      throw error;
    }
  }

  async getGameById(id: number): Promise<Game> {
    const query = `
      fields name, cover.url, rating, rating_count, first_release_date, summary, genres.name, platforms.name, screenshots.url, videos.video_id, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where id = ${id};
    `;
    
    try {
      const games = await this.makeRequest('games', query);
      if (games.length === 0) {
        throw new Error('Game not found');
      }
      
      return this.mapGameData(games[0]);
    } catch (error) {
      console.error('Failed to get game by ID:', error);
      throw error;
    }
  }
}

export const igdbService = new IGDBService();