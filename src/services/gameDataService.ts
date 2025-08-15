import { databaseGameService, Game, IGDBGame } from './databaseGameService'
import { sanitizeSearchTerm } from '../utils/sqlSecurity'

// Re-export types for backward compatibility
export { Game, IGDBGame } from './databaseGameService'

// Legacy interfaces for backward compatibility
interface SearchFilters {
  genreId?: number
  platformId?: number
  minRating?: number
  releaseYear?: number
}

/**
 * Legacy GameDataService - now acts as a wrapper around databaseGameService
 * Maintained for backward compatibility
 */
class GameDataService {
  /**
   * Search for games using the database service
   */
  async searchGames(searchTerm: string, filters?: SearchFilters): Promise<IGDBGame[]> {
    try {
      console.log('🔍 [Legacy] Searching games:', searchTerm);
      
      // Convert filters to the new format
      const dbFilters = filters ? {
        genreId: filters.genreId,
        platformId: filters.platformId,
        minRating: filters.minRating,
        releaseYear: filters.releaseYear
      } : undefined;
      
      // Use the new database service and convert to legacy IGDB format
      const igdbGames = await databaseGameService.searchGamesAsIGDB(searchTerm, 20);
      
      console.log(`✅ [Legacy] Found ${igdbGames.length} games`);
      return igdbGames;
    } catch (error) {
      console.error('Error in legacy searchGames:', error);
      return [];
    }
  }

  /**
   * Get game by ID using the database service
   */
  async getGameById(gameId: number): Promise<IGDBGame | null> {
    try {
      console.log('🔍 [Legacy] Fetching game by ID:', gameId);
      
      const game = await databaseGameService.getGameById(gameId);
      if (!game) {
        return null;
      }
      
      // Convert to legacy IGDB format
      const igdbGame: IGDBGame = {
        id: game.databaseId,
        name: game.title,
        summary: game.description,
        rating: game.rating * 10, // Convert back to 100-point scale
        first_release_date: game.releaseDate ? new Date(game.releaseDate).getTime() / 1000 : undefined,
        cover: game.coverImage ? {
          id: game.databaseId,
          image_id: '',
          url: game.coverImage
        } : undefined,
        genres: game.genre ? [{ id: 1, name: game.genre }] : [],
        platforms: game.platforms?.map((name, index) => ({ id: index + 1, name })) || [],
        screenshots: [],
        videos: []
      };
      
      console.log('✅ [Legacy] Found game:', game.title);
      return igdbGame;
    } catch (error) {
      console.error('Error in legacy getGameById:', error);
      return null;
    }
  }

  /**
   * Get popular games using the database service
   */
  async getPopularGames(limit: number = 20): Promise<IGDBGame[]> {
    try {
      console.log('🔍 [Legacy] Fetching popular games:', limit);
      
      const igdbGames = await databaseGameService.searchGamesAsIGDB('', limit);
      
      // Sort by rating (already in IGDB format)
      const sortedGames = igdbGames
        .filter(game => game.rating && game.rating > 70)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, limit);
      
      console.log(`✅ [Legacy] Found ${sortedGames.length} popular games`);
      return sortedGames;
    } catch (error) {
      console.error('Error in legacy getPopularGames:', error);
      return [];
    }
  }

  /**
   * Get games by genre using the database service
   */
  async getGamesByGenre(genreId: number, limit: number = 20): Promise<IGDBGame[]> {
    try {
      console.log('🔍 [Legacy] Fetching games by genre:', genreId);
      
      // For legacy compatibility, we'll need to map genre IDs to genre names
      // This is a simplified approach - in a real app you'd have a proper genre mapping
      const genreNames = ['Action', 'RPG', 'Strategy', 'Sports', 'Racing', 'Adventure'];
      const genreName = genreNames[genreId - 1] || 'Unknown';
      
      const games = await databaseGameService.getGamesByGenre(genreName, limit);
      
      // Convert to IGDB format
      const igdbGames = games.map(game => ({
        id: game.databaseId,
        name: game.title,
        summary: game.description,
        rating: game.rating * 10,
        first_release_date: game.releaseDate ? new Date(game.releaseDate).getTime() / 1000 : undefined,
        cover: game.coverImage ? {
          id: game.databaseId,
          image_id: '',
          url: game.coverImage
        } : undefined,
        genres: [{ id: genreId, name: genreName }],
        platforms: game.platforms?.map((name, index) => ({ id: index + 1, name })) || [],
        screenshots: [],
        videos: []
      }));
      
      console.log(`✅ [Legacy] Found ${igdbGames.length} games in genre`);
      return igdbGames;
    } catch (error) {
      console.error('Error in legacy getGamesByGenre:', error);
      return [];
    }
  }

  /**
   * Legacy method for getting cover image URLs
   * Now returns the direct URL since we store full URLs in the database
   */
  getCoverImageUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'cover_large' = 'cover_big'): string {
    if (!imageId) {
      return 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400';
    }
    
    // If it's already a full URL, return it
    if (imageId.startsWith('http')) {
      return imageId;
    }
    
    // Legacy IGDB image URL format (for backward compatibility)
    return `https://images.igdb.com/igdb/image/upload/t_${size}/${imageId}.jpg`;
  }
}

export const gameDataService = new GameDataService()