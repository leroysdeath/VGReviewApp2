import { gameDataService } from './gameDataService'
import type { IGDBGame } from './gameDataService'

export type { IGDBGame }

class IGDBService {
  async searchGames(searchTerm: string, limit: number = 20): Promise<IGDBGame[]> {
    try {
      const games = await gameDataService.searchGames(searchTerm)
      return games.slice(0, limit)
    } catch (error) {
      console.error('Error searching games:', error)
      return []
    }
  }

  async getGameById(id: number): Promise<IGDBGame | null> {
    try {
      const game = await gameDataService.getGameById(id)
      return game
    } catch (error) {
      console.error('Error getting game by ID:', error)
      return null
    }
  }

  async getPopularGames(limit: number = 20): Promise<IGDBGame[]> {
    try {
      return await gameDataService.getPopularGames(limit)
    } catch (error) {
      console.error('Error getting popular games:', error)
      return []
    }
  }

  async getGamesByGenre(genreId: number, limit: number = 20): Promise<IGDBGame[]> {
    try {
      return await gameDataService.getGamesByGenre(genreId, limit)
    } catch (error) {
      console.error('Error getting games by genre:', error)
      return []
    }
  }

  getCoverImageUrl(imageId: string, size: 'cover_small' | 'cover_big' | 'cover_large' = 'cover_big'): string {
    return gameDataService.getCoverImageUrl(imageId, size)
  }
}

export const igdbService = new IGDBService()
