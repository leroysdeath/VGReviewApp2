const IGDB_CLIENT_ID = '4hooxi4jnd1na6pbslynp0bo8desfp';
const IGDB_ACCESS_TOKEN = 'r7x5fuhcfvkhub70xd2asdwrgjrcw2';
const IGDB_BASE_URL = '/api/igdb';
  id: number;
  name: string;
  summary?: string;
  cover?: {
    id: number;
    url: string;
  };
  first_release_date?: number;
  genres?: Array<{
    id: number;
    name: string;
  }>;
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  rating?: number;
  rating_count?: number;
  screenshots?: Array<{
    id: number;
    url: string;
  }>;
  involved_companies?: Array<{
    company: {
      name: string;
    };
    developer: boolean;
    publisher: boolean;
  }>;
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
}

class IGDBService {
  private async makeRequest(endpoint: string, body: string): Promise<any> {
    try {
      const response = await fetch(`${IGDB_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
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

  private formatImageUrl(url: string, size: string = 'cover_big'): string {
    if (!url) return 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400';
    return url.replace('t_thumb', `t_${size}`);
  }

  private formatDate(timestamp?: number): string {
    if (!timestamp) return 'TBA';
    return new Date(timestamp * 1000).getFullYear().toString();
  }

  private transformGame(igdbGame: IGDBGame): Game {
    const developer = igdbGame.involved_companies?.find(c => c.developer)?.company.name || 'Unknown Developer';
    const publisher = igdbGame.involved_companies?.find(c => c.publisher)?.company.name || 'Unknown Publisher';
    
    return {
      id: igdbGame.id.toString(),
      title: igdbGame.name,
      coverImage: igdbGame.cover ? this.formatImageUrl(igdbGame.cover.url) : 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: this.formatDate(igdbGame.first_release_date),
      genre: igdbGame.genres?.[0]?.name || 'Unknown',
      rating: igdbGame.rating ? Math.round(igdbGame.rating / 10) : 0,
      description: igdbGame.summary || 'No description available.',
      developer,
      publisher,
    };
  }

  async searchGames(query: string, limit: number = 20): Promise<Game[]> {
    const body = `
      search "${query}";
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, rating, rating_count, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      limit ${limit};
      where rating != null & rating_count > 5;
    `;

    try {
      const igdbGames: IGDBGame[] = await this.makeRequest('games', body);
      return igdbGames.map(game => this.transformGame(game));
    } catch (error) {
      console.error('Failed to search games:', error);
      return [];
    }
  }

  async getPopularGames(limit: number = 20): Promise<Game[]> {
    const body = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, rating, rating_count, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where rating >= 80 & rating_count >= 100;
      sort rating desc;
      limit ${limit};
    `;

    try {
      const igdbGames: IGDBGame[] = await this.makeRequest('games', body);
      return igdbGames.map(game => this.transformGame(game));
    } catch (error) {
      console.error('Failed to get popular games:', error);
      return [];
    }
  }

  async getGameById(id: string): Promise<Game | null> {
    const body = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, rating, rating_count, screenshots.url, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where id = ${id};
    `;

    try {
      const igdbGames: IGDBGame[] = await this.makeRequest('games', body);
      if (igdbGames.length === 0) return null;
      return this.transformGame(igdbGames[0]);
    } catch (error) {
      console.error('Failed to get game by ID:', error);
      return null;
    }
  }

  async getRecentGames(limit: number = 20): Promise<Game[]> {
    const oneYearAgo = Math.floor((Date.now() - 365 * 24 * 60 * 60 * 1000) / 1000);
    
    const body = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, rating, rating_count, involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where first_release_date >= ${oneYearAgo} & rating != null;
      sort first_release_date desc;
      limit ${limit};
    `;

    try {
      const igdbGames: IGDBGame[] = await this.makeRequest('games', body);
      return igdbGames.map(game => this.transformGame(game));
    } catch (error) {
      console.error('Failed to get recent games:', error);
      return [];
    }
  }
}

export const igdbService = new IGDBService();