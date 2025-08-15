import { supabase } from './supabase';
import { sanitizeSearchTerm, sanitizePagination, sanitizeId } from '../utils/sqlSecurity';

// Database Game interface matching the actual database schema
export interface DatabaseGame {
  id: number; // Primary key from database
  game_id: string; // Legacy field
  name: string;
  release_date: string | null;
  description: string | null;
  pic_url: string | null;
  dev: string | null;
  publisher: string | null;
  igdb_link: string | null;
  genre: string | null;
  igdb_id: number | null;
  metacritic_score: number | null;
  created_at: string;
  updated_at: string;
  platforms?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

// Standardized Game interface for app compatibility
export interface Game {
  id: string; // Database ID as string for compatibility
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
  databaseId: number; // Original database ID
}

// Legacy IGDBGame interface for backward compatibility
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

interface SearchFilters {
  genreId?: number;
  platformId?: number;
  minRating?: number;
  releaseYear?: number;
}

class DatabaseGameService {
  private readonly DEFAULT_COVER_IMAGE = 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400';

  /**
   * Convert database game to standardized Game interface
   */
  private mapDatabaseToGame(dbGame: DatabaseGame): Game {
    return {
      id: dbGame.id.toString(),
      title: dbGame.name,
      coverImage: dbGame.pic_url || this.DEFAULT_COVER_IMAGE,
      releaseDate: dbGame.release_date || '',
      genre: dbGame.genre || 'Unknown',
      rating: Math.round((dbGame.metacritic_score || 0) / 10), // Convert to 1-10 scale
      description: dbGame.description || '',
      developer: dbGame.dev || 'Unknown',
      publisher: dbGame.publisher || 'Unknown',
      platforms: dbGame.platforms?.map(p => p.name) || [],
      screenshots: [], // Not stored in current schema
      videos: [], // Not stored in current schema
      databaseId: dbGame.id
    };
  }

  /**
   * Convert database game to legacy IGDBGame interface for backward compatibility
   */
  private mapDatabaseToIGDB(dbGame: DatabaseGame): IGDBGame {
    return {
      id: dbGame.id,
      name: dbGame.name,
      summary: dbGame.description || undefined,
      cover: dbGame.pic_url ? {
        id: dbGame.id,
        url: dbGame.pic_url
      } : undefined,
      platforms: dbGame.platforms?.map(p => ({ id: p.id, name: p.name })) || [],
      genres: dbGame.genre ? [{ id: 1, name: dbGame.genre }] : [],
      first_release_date: dbGame.release_date ? new Date(dbGame.release_date).getTime() / 1000 : undefined,
      rating: dbGame.metacritic_score || undefined,
      screenshots: []
    };
  }

  /**
   * Search for games in the database
   */
  async searchGames(searchTerm: string, filters?: SearchFilters, limit: number = 20): Promise<Game[]> {
    try {
      const sanitizedTerm = sanitizeSearchTerm(searchTerm);
      const { limit: safeLimit } = sanitizePagination(1, limit);
      
      let query = supabase
        .from('game')
        .select(`
          *,
          platform_games(
            platform(id, name, slug)
          )
        `);

      // Apply search filter if provided
      if (sanitizedTerm) {
        query = query.or(`name.ilike.*${sanitizedTerm}*,description.ilike.*${sanitizedTerm}*,dev.ilike.*${sanitizedTerm}*,publisher.ilike.*${sanitizedTerm}*`);
      }

      // Apply filters
      if (filters?.genreId) {
        query = query.eq('genre', filters.genreId.toString());
      }

      if (filters?.minRating && filters.minRating > 0) {
        query = query.gte('metacritic_score', filters.minRating * 10);
      }

      if (filters?.releaseYear) {
        query = query.gte('release_date', `${filters.releaseYear}-01-01`)
                    .lt('release_date', `${filters.releaseYear + 1}-01-01`);
      }

      // Apply platform filter if specified
      if (filters?.platformId) {
        query = query.eq('platform_games.platform.id', filters.platformId);
      }

      const { data, error } = await query
        .limit(safeLimit)
        .order('metacritic_score', { ascending: false, nullsLast: true });

      if (error) {
        console.error('Database search error:', error);
        return [];
      }

      if (!data) {
        return [];
      }

      // Transform the data to include platforms properly
      const gamesWithPlatforms: DatabaseGame[] = data.map(game => ({
        ...game,
        platforms: (game as any).platform_games?.map((pg: any) => pg.platform) || []
      }));

      return gamesWithPlatforms.map(game => this.mapDatabaseToGame(game));
    } catch (error) {
      console.error('Error searching games:', error);
      return [];
    }
  }

  /**
   * Get a game by its database ID
   */
  async getGameById(id: number): Promise<Game | null> {
    try {
      const sanitizedId = sanitizeId(id);
      if (!sanitizedId) {
        return null;
      }

      const { data, error } = await supabase
        .from('game')
        .select(`
          *,
          platform_games(
            platform(id, name, slug)
          )
        `)
        .eq('id', sanitizedId)
        .single();

      if (error || !data) {
        console.error('Error fetching game by ID:', error);
        return null;
      }

      const gameWithPlatforms: DatabaseGame = {
        ...data,
        platforms: (data as any).platform_games?.map((pg: any) => pg.platform) || []
      };

      return this.mapDatabaseToGame(gameWithPlatforms);
    } catch (error) {
      console.error('Error in getGameById:', error);
      return null;
    }
  }

  /**
   * Get popular games based on metacritic score
   */
  async getPopularGames(limit: number = 20): Promise<Game[]> {
    try {
      const { limit: safeLimit } = sanitizePagination(1, limit);

      const { data, error } = await supabase
        .from('game')
        .select(`
          *,
          platform_games(
            platform(id, name, slug)
          )
        `)
        .not('metacritic_score', 'is', null)
        .gte('metacritic_score', 70) // Only games with good scores
        .order('metacritic_score', { ascending: false })
        .limit(safeLimit);

      if (error || !data) {
        console.error('Error fetching popular games:', error);
        return [];
      }

      const gamesWithPlatforms: DatabaseGame[] = data.map(game => ({
        ...game,
        platforms: (game as any).platform_games?.map((pg: any) => pg.platform) || []
      }));

      return gamesWithPlatforms.map(game => this.mapDatabaseToGame(game));
    } catch (error) {
      console.error('Error in getPopularGames:', error);
      return [];
    }
  }

  /**
   * Get games by genre
   */
  async getGamesByGenre(genre: string, limit: number = 20): Promise<Game[]> {
    try {
      const sanitizedGenre = sanitizeSearchTerm(genre);
      const { limit: safeLimit } = sanitizePagination(1, limit);

      if (!sanitizedGenre) {
        return [];
      }

      const { data, error } = await supabase
        .from('game')
        .select(`
          *,
          platform_games(
            platform(id, name, slug)
          )
        `)
        .ilike('genre', `*${sanitizedGenre}*`)
        .order('metacritic_score', { ascending: false, nullsLast: true })
        .limit(safeLimit);

      if (error || !data) {
        console.error('Error fetching games by genre:', error);
        return [];
      }

      const gamesWithPlatforms: DatabaseGame[] = data.map(game => ({
        ...game,
        platforms: (game as any).platform_games?.map((pg: any) => pg.platform) || []
      }));

      return gamesWithPlatforms.map(game => this.mapDatabaseToGame(game));
    } catch (error) {
      console.error('Error in getGamesByGenre:', error);
      return [];
    }
  }

  /**
   * Get recent games (by release date)
   */
  async getRecentGames(limit: number = 20): Promise<Game[]> {
    try {
      const { limit: safeLimit } = sanitizePagination(1, limit);

      const { data, error } = await supabase
        .from('game')
        .select(`
          *,
          platform_games(
            platform(id, name, slug)
          )
        `)
        .not('release_date', 'is', null)
        .order('release_date', { ascending: false })
        .limit(safeLimit);

      if (error || !data) {
        console.error('Error fetching recent games:', error);
        return [];
      }

      const gamesWithPlatforms: DatabaseGame[] = data.map(game => ({
        ...game,
        platforms: (game as any).platform_games?.map((pg: any) => pg.platform) || []
      }));

      return gamesWithPlatforms.map(game => this.mapDatabaseToGame(game));
    } catch (error) {
      console.error('Error in getRecentGames:', error);
      return [];
    }
  }

  /**
   * Get all available genres
   */
  async getGenres(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('game')
        .select('genre')
        .not('genre', 'is', null);

      if (error || !data) {
        console.error('Error fetching genres:', error);
        return [];
      }

      // Get unique genres
      const genres = [...new Set(data.map(item => item.genre).filter(Boolean))];
      return genres.sort();
    } catch (error) {
      console.error('Error in getGenres:', error);
      return [];
    }
  }

  /**
   * Get all available platforms
   */
  async getPlatforms(): Promise<Array<{ id: number; name: string; slug: string }>> {
    try {
      const { data, error } = await supabase
        .from('platform')
        .select('id, name, slug')
        .order('name');

      if (error || !data) {
        console.error('Error fetching platforms:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error in getPlatforms:', error);
      return [];
    }
  }

  /**
   * Legacy method for backward compatibility
   * Converts Game to IGDBGame format
   */
  async searchGamesAsIGDB(searchTerm: string, limit: number = 20): Promise<IGDBGame[]> {
    const games = await this.searchGames(searchTerm, undefined, limit);
    return games.map(game => ({
      id: game.databaseId,
      name: game.title,
      summary: game.description,
      cover: game.coverImage ? {
        id: game.databaseId,
        url: game.coverImage
      } : undefined,
      platforms: game.platforms?.map((name, index) => ({ id: index + 1, name })) || [],
      genres: game.genre ? [{ id: 1, name: game.genre }] : [],
      first_release_date: game.releaseDate ? new Date(game.releaseDate).getTime() / 1000 : undefined,
      rating: game.rating * 10, // Convert back to 100-point scale
      screenshots: []
    }));
  }

  /**
   * Get game statistics
   */
  async getGameStats(): Promise<{
    totalGames: number;
    gamesWithRatings: number;
    averageRating: number;
    totalPlatforms: number;
  }> {
    try {
      const [gameCount, ratedGames, platforms] = await Promise.all([
        supabase.from('game').select('id', { count: 'exact', head: true }),
        supabase.from('game').select('metacritic_score').not('metacritic_score', 'is', null),
        supabase.from('platform').select('id', { count: 'exact', head: true })
      ]);

      const totalGames = gameCount.count || 0;
      const totalPlatforms = platforms.count || 0;
      const gamesWithRatings = ratedGames.data?.length || 0;
      const averageRating = gamesWithRatings > 0 
        ? (ratedGames.data?.reduce((sum, game) => sum + (game.metacritic_score || 0), 0) || 0) / gamesWithRatings
        : 0;

      return {
        totalGames,
        gamesWithRatings,
        averageRating: Math.round(averageRating),
        totalPlatforms
      };
    } catch (error) {
      console.error('Error fetching game stats:', error);
      return {
        totalGames: 0,
        gamesWithRatings: 0,
        averageRating: 0,
        totalPlatforms: 0
      };
    }
  }
}

export const databaseGameService = new DatabaseGameService();