// IGDB API service using fallback to mock data when API is not available
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

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

// Empty mock data array for fallback when API is not available
const mockGamesData: Game[] = [
  // Will be populated with real data from API
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
      // Return empty array - API should be used instead
      return [];
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