import { supabase } from './supabase'
import { sanitizeSearchTerm } from '../utils/sqlSecurity'
import type { Game, GameWithCalculatedFields } from '../types/database'
import { igdbService } from './igdbService'

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
        .from('game')
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
      console.log('🔍 gameDataService.getGameByIGDBId called with:', igdbId);
      
      // First try with igdb_id field (integer)
      let { data, error } = await supabase
        .from('game')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .eq('igdb_id', igdbId)
        .single()

      console.log('🔍 First query (igdb_id):', { found: !!data, error });

      // If not found, try with game_id field (string)
      if ((error || !data) && igdbId) {
        console.log('🔍 Trying fallback with game_id field...');
        const { data: gameIdData, error: gameIdError } = await supabase
          .from('game')
          .select(`
            *,
            ratings:rating(rating)
          `)
          .eq('game_id', igdbId.toString())
          .single()
        
        console.log('🔍 Second query (game_id):', { found: !!gameIdData, error: gameIdError });
        
        if (!gameIdError && gameIdData) {
          data = gameIdData
          error = null
        }
      }

      if (error || !data) {
        console.log(`Game with IGDB ID ${igdbId} not found in database, fetching from IGDB API...`)
        
        // Game not in database, try to fetch from IGDB API
        try {
          const igdbGame = await igdbService.getGameById(igdbId)
          
          if (!igdbGame) {
            console.error('Game not found in IGDB either')
            return null
          }
          
          // Transform IGDB game to our format
          const transformedGame = igdbService.transformGame(igdbGame)
          
          // Add the game to database for future use
          const { data: insertedGame, error: insertError } = await supabase
            .from('game')
            .insert({
              igdb_id: transformedGame.igdb_id,
              name: transformedGame.name,
              summary: transformedGame.summary,
              release_date: transformedGame.first_release_date 
                ? new Date(transformedGame.first_release_date * 1000).toISOString().split('T')[0]
                : null,
              cover_url: transformedGame.cover_url,
              genres: transformedGame.genres || [],
              platforms: transformedGame.platforms || [],
              developer: transformedGame.developer,
              publisher: transformedGame.publisher,
              igdb_rating: Math.round(transformedGame.igdb_rating || 0),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select(`
              *,
              ratings:rating(rating)
            `)
            .single()
          
          if (insertError) {
            console.error('Error inserting game into database:', insertError)
            // Even if insert fails, return the game data from IGDB
            return {
              ...transformedGame,
              averageUserRating: 0,
              totalUserRatings: 0
            } as GameWithCalculatedFields
          }
          
          console.log(`✅ Game "${transformedGame.name}" added to database`)
          
          // Return the newly inserted game
          return this.transformGameWithRatings(insertedGame as GameWithRating)
        } catch (igdbError) {
          console.error('Error fetching from IGDB:', igdbError)
          return null
        }
      }

      return this.transformGameWithRatings(data as GameWithRating)
    } catch (error) {
      console.error('Error in getGameByIGDBId:', error)
      return null
    }
  }

  /**
   * Fetch game data with full review details in a single query
   * This reduces redundant API calls and improves performance
   * Now includes fallback to IGDB API if game not found in database
   */
  async getGameWithFullReviews(igdbId: number): Promise<{
    game: GameWithCalculatedFields | null;
    reviews: Array<{
      id: number;
      user_id: number;
      game_id: number;
      rating: number;
      review: string | null;
      post_date_time: string;
      user?: {
        id: number;
        name: string;
        picurl?: string;
      };
    }>;
  }> {
    try {
      // First check if game exists in database
      const { data: gameData, error: gameError } = await supabase
        .from('game')
        .select('*')
        .eq('igdb_id', igdbId)
        .single()

      if (gameError || !gameData) {
        console.log(`Game with IGDB ID ${igdbId} not found in database, fetching from IGDB API...`)
        
        // Game not in database, try to fetch from IGDB API
        try {
          const igdbGame = await igdbService.getGameById(igdbId)
          
          if (!igdbGame) {
            console.error('Game not found in IGDB either')
            return { game: null, reviews: [] }
          }
          
          // Transform IGDB game to our format
          const transformedGame = igdbService.transformGame(igdbGame)
          
          // Add the game to database for future use
          const { data: insertedGame, error: insertError } = await supabase
            .from('game')
            .insert({
              igdb_id: transformedGame.igdb_id,
              name: transformedGame.name,
              summary: transformedGame.summary,
              release_date: transformedGame.first_release_date 
                ? new Date(transformedGame.first_release_date * 1000).toISOString().split('T')[0]
                : null,
              cover_url: transformedGame.cover_url,
              genres: transformedGame.genres || [],
              platforms: transformedGame.platforms || [],
              developer: transformedGame.developer,
              publisher: transformedGame.publisher,
              igdb_rating: Math.round(transformedGame.igdb_rating || 0),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single()
          
          if (insertError) {
            console.error('Error inserting game into database:', insertError)
            // Even if insert fails, return the game data from IGDB
            return {
              game: {
                ...transformedGame,
                averageUserRating: 0,
                totalUserRatings: 0
              } as GameWithCalculatedFields,
              reviews: []
            }
          }
          
          console.log(`✅ Game "${transformedGame.name}" added to database`)
          
          // Return the newly inserted game with no reviews yet
          return {
            game: {
              ...insertedGame,
              averageUserRating: 0,
              totalUserRatings: 0
            } as GameWithCalculatedFields,
            reviews: []
          }
        } catch (igdbError) {
          console.error('Error fetching from IGDB:', igdbError)
          return { game: null, reviews: [] }
        }
      }

      // Game found in database, now fetch reviews using the game's database ID
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('rating')
        .select(`
          *,
          user:user_id(
            id,
            name,
            picurl
          )
        `)
        .eq('game_id', gameData.id)  // Use game.id (database ID), not igdbId
        .order('post_date_time', { ascending: false })
      
      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError)
      }
      
      const reviews = reviewsData || []
      
      // Transform game data for calculated fields
      const game = this.transformGameWithRatings({
        ...gameData,
        ratings: reviews.map((r: any) => ({ rating: r.rating }))
      } as GameWithRating)

      console.log(`✅ Loaded game "${game.name}" with ${reviews.length} reviews`)

      return { game, reviews }
    } catch (error) {
      console.error('Error in getGameWithFullReviews:', error)
      return { game: null, reviews: [] }
    }
  }

  /**
   * Convert IGDB ID to database ID
   */
  async convertIGDBIdToGameId(igdbId: number): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('game')
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
        .from('game')
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
      .from('game')
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
          .gte('release_date', yearStart)
          .lte('release_date', yearEnd)
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
        .from('game')
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
          // First priority: games with summaries come before games without
          const aHasSummary = a.summary && a.summary.trim().length > 0
          const bHasSummary = b.summary && b.summary.trim().length > 0
          
          if (aHasSummary && !bHasSummary) return -1
          if (!aHasSummary && bHasSummary) return 1
          
          // If both have or don't have summaries, sort by rating count first, then by average rating
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
        .from('game')
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
          .from('game')
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
        .from('game')
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
        .from('game')
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
