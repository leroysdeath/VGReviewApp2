// IGDB API Service
import { filterProtectedContent, getFilterStats } from '../utils/contentProtectionFilter';

interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  rating?: number;
  category?: number;
  cover?: {
    id: number;
    url: string;
  };
  genres?: Array<{
    id: number;
    name: string;
  }>;
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  involved_companies?: Array<{
    company: {
      name: string;
    };
  }>;
}

interface IGDBSearchResponse {
  games: IGDBGame[];
  success: boolean;
  error?: string;
}

class IGDBService {
  private readonly endpoint = '/.netlify/functions/igdb-search';

  async searchGames(query: string, limit: number = 20): Promise<IGDBGame[]> {
    try {
      if (!query.trim()) {
        return [];
      }

      console.log('🔍 Searching IGDB for:', query);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: query.trim(),
          limit: limit
        })
      });

      if (!response.ok) {
        console.error('IGDB API response not ok:', response.status, response.statusText);
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const data: IGDBSearchResponse = await response.json();
      
      if (!data.success) {
        console.error('IGDB API returned error:', data.error);
        throw new Error(data.error || 'IGDB API error');
      }

      console.log('✅ IGDB search results:', data.games?.length || 0, 'games found');
      
      // Apply content protection filter
      const rawGames = data.games || [];
      const transformedGames = rawGames.map(game => this.transformGameForFilter(game));
      
      // Debug: Log some raw games to see what we're getting from IGDB
      if (query.toLowerCase().includes('final fantasy')) {
        console.log('🔍 Final Fantasy search - Raw IGDB results:', rawGames.slice(0, 3));
        console.log('🔍 Final Fantasy search - Transformed games:', transformedGames.slice(0, 3));
      }
      
      if (query.toLowerCase().includes('mega man') || query.toLowerCase().includes('megaman')) {
        console.log('🔍 Mega Man search - Raw IGDB results:', rawGames.slice(0, 3));
        console.log('🔍 Mega Man search - Transformed games:', transformedGames.slice(0, 3));
      }
      
      const filteredGames = filterProtectedContent(transformedGames);
      
      // Log filter statistics for debugging
      const filterStats = getFilterStats(transformedGames);
      if (filterStats.filtered > 0) {
        console.log('🛡️ Content protection filter:', filterStats);
        
        // Extra debug for Final Fantasy
        if (query.toLowerCase().includes('final fantasy')) {
          console.log('🔍 Final Fantasy search - Filter stats:', filterStats);
          console.log('🔍 Final Fantasy search - Examples filtered:', filterStats.examples);
        }
        
        // Extra debug for Mega Man
        if (query.toLowerCase().includes('mega man') || query.toLowerCase().includes('megaman')) {
          console.log('🔍 Mega Man search - Filter stats:', filterStats);
          console.log('🔍 Mega Man search - Examples filtered:', filterStats.examples);
        }
      }
      
      // Convert back to IGDB format
      const filteredIGDBGames = filteredGames.map(game => rawGames.find(raw => raw.id === game.id)!);
      
      return filteredIGDBGames;

    } catch (error) {
      console.error('IGDB search failed:', error);
      throw error;
    }
  }

  async getGameById(gameId: number): Promise<IGDBGame | null> {
    try {
      console.log('🎮 Fetching IGDB game by ID:', gameId);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'getById',
          gameId: gameId
        })
      });

      if (!response.ok) {
        console.error('IGDB API response not ok:', response.status, response.statusText);
        throw new Error(`IGDB API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        console.error('IGDB API returned error:', data.error);
        throw new Error(data.error || 'IGDB API error');
      }

      console.log('✅ IGDB game fetched:', data.games?.[0]?.name || 'Unknown');
      return data.games?.[0] || null;

    } catch (error) {
      console.error('IGDB game fetch failed:', error);
      throw error;
    }
  }

  // Transform IGDB game for content filter (simplified format)
  private transformGameForFilter(igdbGame: IGDBGame): any {
    return {
      id: igdbGame.id,
      name: igdbGame.name,
      developer: igdbGame.involved_companies?.[0]?.company?.name,
      publisher: igdbGame.involved_companies?.[0]?.company?.name,
      summary: igdbGame.summary,
      description: igdbGame.summary,
      category: igdbGame.category,
      genres: igdbGame.genres?.map(g => g.name) || [],
    };
  }

  // Transform IGDB game to our app's format
  transformGame(igdbGame: IGDBGame): any {
    return {
      id: igdbGame.id,
      igdb_id: igdbGame.id,
      name: igdbGame.name,
      summary: igdbGame.summary,
      description: igdbGame.summary,
      first_release_date: igdbGame.first_release_date,
      release_date: igdbGame.first_release_date ? new Date(igdbGame.first_release_date * 1000).toISOString() : undefined,
      rating: igdbGame.rating,
      igdb_rating: igdbGame.rating,
      category: igdbGame.category,
      cover: igdbGame.cover,
      cover_url: igdbGame.cover?.url ? this.transformImageUrl(igdbGame.cover.url) : undefined,
      pic_url: igdbGame.cover?.url ? this.transformImageUrl(igdbGame.cover.url) : undefined,
      genres: igdbGame.genres?.map(g => g.name) || [],
      genre: igdbGame.genres?.[0]?.name,
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      developer: igdbGame.involved_companies?.[0]?.company?.name,
      publisher: igdbGame.involved_companies?.[0]?.company?.name,
    };
  }

  // Transform IGDB image URL to higher quality
  private transformImageUrl(url: string): string {
    if (!url) return '';
    
    // IGDB URLs come as //images.igdb.com/igdb/image/upload/t_thumb/imageid.jpg
    // We want to change t_thumb to a higher quality size
    return url.replace('t_thumb', 't_cover_big').replace('//', 'https://');
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Testing IGDB API connection...');
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: 'test',
          limit: 1
        })
      });

      const data = await response.json();
      console.log('🔗 IGDB API test response:', data);
      
      return response.ok && data.success;
    } catch (error) {
      console.error('❌ IGDB API test failed:', error);
      return false;
    }
  }
}

export const igdbService = new IGDBService();
export type { IGDBGame };