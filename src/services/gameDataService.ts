import { supabase } from './supabase'
import { sanitizeSearchTerm } from '../utils/sqlSecurity'
import type { Game, GameWithCalculatedFields } from '../types/database'

interface SearchFilters {
  genres?: string[]
  platforms?: string[]
  minRating?: number
  releaseYear?: number
}

interface GameWithRating extends Game {
  ratings?: Array<{
    rating: number
  }>
}

// Re-export for backward compatibility
export type { Game, GameWithCalculatedFields }

class GameDataService {
  async getGameById(id: number): Promise<GameWithCalculatedFields | null> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        console.error('Error fetching game by ID:', error)
        return null
      }

      return this.transformGameWithRatings(data as GameWithRating)
    } catch (error) {
      console.error('Error in getGameById:', error)
      return null
    }
  }

  async getGameByIGDBId(igdbId: number): Promise<GameWithCalculatedFields | null> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .eq('igdb_id', igdbId)
        .single()

      if (error || !data) {
        console.error('Error fetching game by IGDB ID:', error)
        return null
      }

      return this.transformGameWithRatings(data as GameWithRating)
    } catch (error) {
      console.error('Error in getGameByIGDBId:', error)
      return null
    }
  }

  /**
   * Convert IGDB ID to database ID
   */
  async convertIGDBIdToGameId(igdbId: number): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('id')
        .eq('igdb_id', igdbId)
        .single()

      if (error || !data) {
        console.error('Error converting IGDB ID to game ID:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Error in convertIGDBIdToGameId:', error)
      return null
    }
  }

  /**
   * Convert database ID to IGDB ID
   */
  async convertGameIdToIGDBId(gameId: number): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('igdb_id')
        .eq('id', gameId)
        .single()

      if (error || !data) {
        console.error('Error converting game ID to IGDB ID:', error)
        return null
      }

      return data.igdb_id
    } catch (error) {
      console.error('Error in convertGameIdToIGDBId:', error)
      return null
    }
  }

  async searchGames(query: string, filters?: SearchFilters): Promise<GameWithCalculatedFields[]> {
    try {
      const sanitizedQuery = sanitizeSearchTerm(query)
      
      if (!sanitizedQuery) {
        return []
      }

      // Use exact title matching with ILIKE only
      return this.searchGamesExact(sanitizedQuery, filters)
    } catch (error) {
      console.error('Error in searchGames:', error)
      return []
    }
  }

  /**
   * Search games using exact title matching with ILIKE
   */
  private async searchGamesExact(query: string, filters?: SearchFilters): Promise<GameWithCalculatedFields[]> {
    let queryBuilder = supabase
      .from('games')
      .select(`
        *,
        ratings:rating(rating)
      `)
      .ilike('name', `%${query}%`)
      .limit(20)

    // Apply filters if provided
    if (filters) {
      if (filters.genres && filters.genres.length > 0) {
        queryBuilder = queryBuilder.contains('genres', filters.genres)
      }
      
      if (filters.platforms && filters.platforms.length > 0) {
        queryBuilder = queryBuilder.contains('platforms', filters.platforms)
      }
      
      if (filters.releaseYear) {
        const yearStart = `${filters.releaseYear}-01-01`
        const yearEnd = `${filters.releaseYear}-12-31`
        queryBuilder = queryBuilder
          .gte('first_release_date', yearStart)
          .lte('first_release_date', yearEnd)
      }
    }

    const { data, error } = await queryBuilder

    if (error) {
      console.error('Error in exact search:', error)
      return []
    }

    const games = (data || []).map((game: GameWithRating) => 
      this.transformGameWithRatings(game)
    )

    // Apply minimum rating filter after calculating averages
    if (filters?.minRating) {
      return games.filter(game => 
        game.averageUserRating && game.averageUserRating >= filters.minRating
      )
    }

    return games
  }


  async getPopularGames(limit: number = 20): Promise<GameWithCalculatedFields[]> {
    try {
      // Get games with the most ratings, ordered by rating count
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .limit(limit * 2) // Get more initially to filter by rating

      if (error) {
        console.error('Error fetching popular games:', error)
        return []
      }

      // Transform and sort by rating count
      const games = (data || [])
        .map((game: GameWithRating) => this.transformGameWithRatings(game))
        .filter(game => game.totalUserRatings && game.totalUserRatings > 0)
        .sort((a, b) => {
          // Sort by rating count first, then by average rating
          const countDiff = (b.totalUserRatings || 0) - (a.totalUserRatings || 0)
          if (countDiff !== 0) return countDiff
          return (b.averageUserRating || 0) - (a.averageUserRating || 0)
        })
        .slice(0, limit)

      return games
    } catch (error) {
      console.error('Error in getPopularGames:', error)
      return []
    }
  }

  async getRecentGames(limit: number = 20): Promise<GameWithCalculatedFields[]> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Error fetching recent games:', error)
        return []
      }

      return (data || []).map((game: GameWithRating) => 
        this.transformGameWithRatings(game)
      )
    } catch (error) {
      console.error('Error in getRecentGames:', error)
      return []
    }
  }

  async getGameWithUserRating(gameId: number, userId: string): Promise<GameWithCalculatedFields | null> {
    try {
      const [gameResult, userRatingResult] = await Promise.all([
        // Get game with all ratings
        supabase
          .from('games')
          .select(`
            *,
            ratings:rating(rating)
          `)
          .eq('id', gameId)
          .single(),
        
        // Get user's specific rating
        supabase
          .from('rating')
          .select('rating')
          .eq('game_id', gameId)
          .eq('user_id', userId)
          .single()
      ])

      if (gameResult.error || !gameResult.data) {
        console.error('Error fetching game:', gameResult.error)
        return null
      }

      const game = this.transformGameWithRatings(gameResult.data as GameWithRating)
      
      // Add user's rating if it exists
      if (userRatingResult.data) {
        game.userRating = userRatingResult.data.rating
      }

      return game
    } catch (error) {
      console.error('Error in getGameWithUserRating:', error)
      return null
    }
  }

  async getGamesByGenre(genre: string, limit: number = 20): Promise<GameWithCalculatedFields[]> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .contains('genres', [genre])
        .limit(limit)

      if (error) {
        console.error('Error fetching games by genre:', error)
        return []
      }

      return (data || [])
        .map((game: GameWithRating) => this.transformGameWithRatings(game))
        .sort((a, b) => (b.averageUserRating || 0) - (a.averageUserRating || 0))
    } catch (error) {
      console.error('Error in getGamesByGenre:', error)
      return []
    }
  }

  async getGamesByPlatform(platform: string, limit: number = 20): Promise<GameWithCalculatedFields[]> {
    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .contains('platforms', [platform])
        .limit(limit)

      if (error) {
        console.error('Error fetching games by platform:', error)
        return []
      }

      return (data || [])
        .map((game: GameWithRating) => this.transformGameWithRatings(game))
        .sort((a, b) => (b.averageUserRating || 0) - (a.averageUserRating || 0))
    } catch (error) {
      console.error('Error in getGamesByPlatform:', error)
      return []
    }
  }

  private transformGameWithRatings(game: GameWithRating): GameWithCalculatedFields {
    const { ratings, ...gameData } = game
    
    // Calculate average rating and count
    let averageUserRating = 0
    let totalUserRatings = 0
    
    if (ratings && ratings.length > 0) {
      totalUserRatings = ratings.length
      const sum = ratings.reduce((acc, r) => acc + r.rating, 0)
      averageUserRating = sum / totalUserRatings
    }

    return {
      ...gameData,
      averageUserRating,
      totalUserRatings
    }
  }

  // Utility method for getting cover image URL - kept for backward compatibility
  getCoverImageUrl(imageUrl: string | undefined, size: 'small' | 'big' | 'large' = 'big'): string {
    if (!imageUrl) return ''
    
    // If it's already a full URL, return it
    if (imageUrl.startsWith('http')) {
      return imageUrl
    }
    
    // If it's an IGDB image ID, construct the URL
    return `https://images.igdb.com/igdb/image/upload/t_cover_${size}/${imageUrl}.jpg`
  }
}

export const gameDataService = new GameDataService()

// Export types for backward compatibility
export type { GameWithCalculatedFields as IGDBGame }
