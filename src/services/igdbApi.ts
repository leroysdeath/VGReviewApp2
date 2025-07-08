const IGDB_BASE_URL = 'https://api.igdb.com/v4';

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

  async getPopularGames(limit: number = 20) {
    const query = `
      fields name, cover.url, rating, rating_count, first_release_date, summary, genres.name, platforms.name;
      where rating_count > 100 & rating > 75;
      sort rating desc;
      limit ${limit};
    `;
    
    try {
      const games = await this.makeRequest('games', query);
      return games.map((game: any) => ({
        id: game.id,
        name: game.name,
        coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null,
        rating: game.rating ? Math.round(game.rating) : null,
        ratingCount: game.rating_count || 0,
        releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null,
        summary: game.summary || '',
        genres: game.genres?.map((g: any) => g.name) || [],
        platforms: game.platforms?.map((p: any) => p.name) || [],
      }));
    } catch (error) {
      console.error('Failed to get popular games:', error);
      throw error;
    }
  }

  async searchGames(query: string, limit: number = 20) {
    const searchQuery = `
      fields name, cover.url, rating, rating_count, first_release_date, summary, genres.name, platforms.name;
      search "${query}";
      limit ${limit};
    `;
    
    try {
      const games = await this.makeRequest('games', searchQuery);
      return games.map((game: any) => ({
        id: game.id,
        name: game.name,
        coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null,
        rating: game.rating ? Math.round(game.rating) : null,
        ratingCount: game.rating_count || 0,
        releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null,
        summary: game.summary || '',
        genres: game.genres?.map((g: any) => g.name) || [],
        platforms: game.platforms?.map((p: any) => p.name) || [],
      }));
    } catch (error) {
      console.error('Failed to search games:', error);
      throw error;
    }
  }

  async getGameById(id: number) {
    const query = `
      fields name, cover.url, rating, rating_count, first_release_date, summary, genres.name, platforms.name, screenshots.url, videos.video_id;
      where id = ${id};
    `;
    
    try {
      const games = await this.makeRequest('games', query);
      if (games.length === 0) {
        throw new Error('Game not found');
      }
      
      const game = games[0];
      return {
        id: game.id,
        name: game.name,
        coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : null,
        rating: game.rating ? Math.round(game.rating) : null,
        ratingCount: game.rating_count || 0,
        releaseDate: game.first_release_date ? new Date(game.first_release_date * 1000).getFullYear() : null,
        summary: game.summary || '',
        genres: game.genres?.map((g: any) => g.name) || [],
        platforms: game.platforms?.map((p: any) => p.name) || [],
        screenshots: game.screenshots?.map((s: any) => `https:${s.url.replace('t_thumb', 't_screenshot_med')}`) || [],
        videos: game.videos?.map((v: any) => v.video_id) || [],
      };
    } catch (error) {
      console.error('Failed to get game by ID:', error);
      throw error;
    }
  }
}

export const igdbService = new IGDBService();