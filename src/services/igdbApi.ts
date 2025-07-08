// IGDB API service using Supabase Edge Function proxy
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL is not defined in environment variables');
}

const IGDB_PROXY_URL = `${SUPABASE_URL}/functions/v1/igdb-proxy`;

export interface IGDBGame {
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
  videos?: Array<{
    id: number;
    video_id: string;
  }>;
  involved_companies?: Array<{
    company: {
      id: number;
      name: string;
    };
    developer: boolean;
    publisher: boolean;
  }>;
}

class IGDBApiService {
  private async makeRequest(endpoint: string, body: string): Promise<any> {
    try {
      console.log(`Making IGDB request to: ${endpoint}`);
      console.log(`Request body: ${body}`);

      const response = await fetch(`${IGDB_PROXY_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: body,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('IGDB API error:', response.status, errorData);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`IGDB response:`, data);
      return data;
    } catch (error) {
      console.error('IGDB API request failed:', error);
      throw error;
    }
  }

  async searchGames(query: string, limit: number = 10): Promise<IGDBGame[]> {
    const body = `
      search "${query}";
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, rating, rating_count;
      limit ${limit};
      where version_parent = null;
    `;

    return this.makeRequest('games', body);
  }

  async getGameById(id: number): Promise<IGDBGame> {
    const body = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, 
             rating, rating_count, screenshots.url, videos.video_id,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher;
      where id = ${id};
    `;

    const games = await this.makeRequest('games', body);
    if (!games || games.length === 0) {
      throw new Error(`Game with ID ${id} not found`);
    }
    return games[0];
  }

  async getPopularGames(limit: number = 20): Promise<IGDBGame[]> {
    const body = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, rating, rating_count;
      where rating_count > 100 & rating > 70;
      sort rating desc;
      limit ${limit};
    `;

    return this.makeRequest('games', body);
  }

  async getGamesByGenre(genreId: number, limit: number = 20): Promise<IGDBGame[]> {
    const body = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, rating, rating_count;
      where genres = ${genreId} & rating_count > 10;
      sort rating desc;
      limit ${limit};
    `;

    return this.makeRequest('games', body);
  }

  async getRecentGames(limit: number = 20): Promise<IGDBGame[]> {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const oneYearAgo = currentTimestamp - (365 * 24 * 60 * 60);

    const body = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, rating, rating_count;
      where first_release_date > ${oneYearAgo} & first_release_date < ${currentTimestamp};
      sort first_release_date desc;
      limit ${limit};
    `;

    return this.makeRequest('games', body);
  }

  // Helper method to format image URLs
  formatImageUrl(url: string, size: string = 'cover_big'): string {
    if (!url) return '';
    
    // IGDB returns URLs like "//images.igdb.com/igdb/image/upload/t_thumb/co1uog.jpg"
    // We need to add https: and potentially change the size
    const cleanUrl = url.replace('//', 'https://');
    
    // Replace the size parameter if needed
    if (size !== 'thumb') {
      return cleanUrl.replace('/t_thumb/', `/t_${size}/`);
    }
    
    return cleanUrl;
  }
}

export const igdbApi = new IGDBApiService();