// Netlify Functions IGDB API service
import { getEnvVar } from '../utils/envValidation';

export interface NetlifyIGDBGame {
  id: number;
  name: string;
  summary?: string;
  cover?: {
    id: number;
    url: string;
  };
  first_release_date?: number;
  genres?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string }>;
  involved_companies?: Array<{
    id: number;
    company: { id: number; name: string };
    developer: boolean;
    publisher: boolean;
  }>;
  rating?: number;
  rating_count?: number;
  screenshots?: Array<{ id: number; url: string }>;
  videos?: Array<{ id: number; video_id: string }>;
  websites?: Array<{ id: number; url: string; category: number }>;
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

class NetlifyIGDBService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private baseUrl: string;
  private clientId: string;
  private accessToken: string;

  constructor() {
    this.clientId = getEnvVar('VITE_IGDB_CLIENT_ID');
    this.accessToken = getEnvVar('VITE_IGDB_ACCESS_TOKEN');
    
    // Determine base URL for Netlify functions
    const appUrl = getEnvVar('VITE_APP_URL') || window.location.origin;
    this.baseUrl = `${appUrl}/.netlify/functions`;
  }

  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private async makeRequest(endpoint: string, body: any): Promise<any> {
    const cacheKey = this.getCacheKey(endpoint, body);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Netlify IGDB API error (${endpoint}):`, error);
      throw error;
    }
  }

  private mapIGDBToGame(igdbGame: NetlifyIGDBGame): Game {
    return {
      id: igdbGame.id.toString(),
      title: igdbGame.name,
      coverImage: igdbGame.cover?.url 
        ? `https:${igdbGame.cover.url.replace('t_thumb', 't_cover_big')}`
        : 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
      releaseDate: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : '',
      genre: igdbGame.genres?.[0]?.name || 'Unknown',
      rating: igdbGame.rating ? Math.round(igdbGame.rating / 10) : 0,
      description: igdbGame.summary || '',
      developer: igdbGame.involved_companies?.find(ic => ic.developer)?.company?.name || 'Unknown',
      publisher: igdbGame.involved_companies?.find(ic => ic.publisher)?.company?.name || 'Unknown',
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      screenshots: igdbGame.screenshots?.map(s => `https:${s.url.replace('t_thumb', 't_screenshot_med')}`) || [],
      videos: igdbGame.videos?.map(v => v.video_id) || [],
      igdbId: igdbGame.id
    };
  }

  async searchGames(query: string, limit = 20): Promise<Game[]> {
    try {
      const igdbGames = await this.makeRequest('igdb-search', {
        searchTerm: query,
        limit
      });

      if (Array.isArray(igdbGames)) {
        return igdbGames.map(game => this.mapIGDBToGame(game));
      }
      
      return [];
    } catch (error) {
      console.error('Search games error:', error);
      return [];
    }
  }

  async getPopularGames(limit = 20): Promise<Game[]> {
    try {
      const igdbGames = await this.makeRequest('igdb-popular', {
        limit
      });

      if (Array.isArray(igdbGames)) {
        return igdbGames.map(game => this.mapIGDBToGame(game));
      }
      
      return [];
    } catch (error) {
      console.error('Popular games error:', error);
      return [];
    }
  }

  async getRecentGames(limit = 20): Promise<Game[]> {
    // For recent games, we'll use the search with a date filter
    // This is a simplified implementation - you might want to create a separate function
    try {
      const currentYear = new Date().getFullYear();
      const searchTerm = `first_release_date >= ${Math.floor(new Date(`${currentYear - 1}-01-01`).getTime() / 1000)}`;
      
      // Note: This would require a separate Netlify function for recent games
      // For now, we'll return popular games as a fallback
      return this.getPopularGames(limit);
    } catch (error) {
      console.error('Recent games error:', error);
      return [];
    }
  }

  async getGameById(id: string): Promise<Game | null> {
    try {
      const igdbGame = await this.makeRequest('igdb-game', {
        gameId: id
      });

      if (igdbGame) {
        return this.mapIGDBToGame(igdbGame);
      }
      
      return null;
    } catch (error) {
      console.error('Get game by ID error:', error);
      return null;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Check if Netlify functions are available
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/igdb-search`, {
        method: 'OPTIONS'
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const netlifyIgdbService = new NetlifyIGDBService();