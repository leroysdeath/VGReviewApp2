// Enhanced IGDB API service with caching and error handling
import { supabase } from './supabase';
import { getEnvVar } from '../utils/envValidation';

export interface IGDBGame {
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
  aggregated_rating?: number;
  aggregated_rating_count?: number;
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
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly RATE_LIMIT_DELAY = 250; // 250ms between requests
  private lastRequestTime = 0;

  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.RATE_LIMIT_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }

  private getCacheKey(endpoint: string, query: string): string {
    return `${endpoint}:${btoa(query)}`;
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

  private async makeRequest(endpoint: string, body: string): Promise<IGDBGame[]> {
    const cacheKey = this.getCacheKey(endpoint, body);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    await this.rateLimit();

    try {
      const { data, error } = await supabase.functions.invoke('igdb-proxy', {
        body: { endpoint, query: body }
      });

      if (error) {
        console.error('IGDB API error:', error);
        throw new Error(`IGDB API error: ${error.message}`);
      }

      this.setCache(cacheKey, data);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch from IGDB:', error);
      // Return fallback data or empty array
      return this.getFallbackData(endpoint, body);
    }
  }

  private getFallbackData(endpoint: string, body: string): IGDBGame[] {
    // Return mock data as fallback
    if (endpoint === 'games') {
      return [
        {
          id: 1,
          name: 'The Witcher 3: Wild Hunt',
          summary: 'You are Geralt of Rivia, mercenary monster slayer.',
          cover: { id: 1, url: '//images.igdb.com/igdb/image/upload/t_cover_big/co1rfi.jpg' },
          first_release_date: 1431993600,
          genres: [{ id: 12, name: 'Role-playing (RPG)' }],
          platforms: [{ id: 6, name: 'PC (Microsoft Windows)' }],
          rating: 93.5,
          rating_count: 1000
        }
      ];
    }
    return [];
  }

  private mapIGDBToGame(igdbGame: IGDBGame): Game {
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
    const igdbQuery = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name, 
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             rating, rating_count, screenshots.url, videos.video_id;
      search "${query}";
      where rating_count > 10;
      limit ${limit};
    `;

    try {
      const igdbGames = await this.makeRequest('games', igdbQuery);
      return igdbGames.map(game => this.mapIGDBToGame(game));
    } catch (error) {
      console.error('Search games error:', error);
      return [];
    }
  }

  async getPopularGames(limit = 20): Promise<Game[]> {
    const igdbQuery = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             rating, rating_count, screenshots.url, videos.video_id;
      where rating_count > 100 & rating > 75;
      sort rating desc;
      limit ${limit};
    `;

    try {
      const igdbGames = await this.makeRequest('games', igdbQuery);
      return igdbGames.map(game => this.mapIGDBToGame(game));
    } catch (error) {
      console.error('Popular games error:', error);
      return [];
    }
  }

  async getRecentGames(limit = 20): Promise<Game[]> {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const oneYearAgo = currentTimestamp - (365 * 24 * 60 * 60);

    const igdbQuery = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             rating, rating_count, screenshots.url, videos.video_id;
      where first_release_date > ${oneYearAgo} & first_release_date < ${currentTimestamp} & rating_count > 10;
      sort first_release_date desc;
      limit ${limit};
    `;

    try {
      const igdbGames = await this.makeRequest('games', igdbQuery);
      return igdbGames.map(game => this.mapIGDBToGame(game));
    } catch (error) {
      console.error('Recent games error:', error);
      return [];
    }
  }

  async getGameById(id: string): Promise<Game | null> {
    const numericId = parseInt(id);
    if (isNaN(numericId)) return null;

    const igdbQuery = `
      fields name, summary, cover.url, first_release_date, genres.name, platforms.name,
             involved_companies.company.name, involved_companies.developer, involved_companies.publisher,
             rating, rating_count, screenshots.url, videos.video_id, websites.url, websites.category;
      where id = ${numericId};
    `;

    try {
      const igdbGames = await this.makeRequest('games', igdbQuery);
      if (igdbGames.length === 0) return null;
      return this.mapIGDBToGame(igdbGames[0]);
    } catch (error) {
      console.error('Get game by ID error:', error);
      return null;
    }
  }

  async syncGameToDatabase(game: Game): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('game')
        .upsert({
          game_id: game.id,
          name: game.title,
          description: game.description,
          pic_url: game.coverImage,
          dev: game.developer,
          publisher: game.publisher,
          genre: game.genre,
          release_date: game.releaseDate,
          igdb_link: `https://www.igdb.com/games/${game.id}`
        }, {
          onConflict: 'game_id'
        });

      if (error) {
        console.error('Database sync error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to sync game to database:', error);
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const igdbService = new IGDBService();