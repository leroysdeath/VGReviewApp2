import { supabase } from './supabase'
import type { GameWithCalculatedFields } from '../types/database'

interface QueryCache {
  data: any
  timestamp: number
  ttl: number
}

interface RatingDistribution {
  rating: number
  count: number
  percentage: number
}

interface SearchOptions {
  query: string
  limit?: number
  offset?: number
  minSimilarity?: number
  genres?: string[]
  platforms?: string[]
  minRating?: number
  releaseYear?: number
  useExactMatch?: boolean // New parameter to control exact vs fuzzy search
}

interface QueryPerformance {
  query: string
  duration: number
  resultCount: number
  cached: boolean
}

class GameQueryService {
  private cache: Map<string, QueryCache> = new Map()
  private performanceLogs: QueryPerformance[] = []
  private readonly DEFAULT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly POPULAR_GAMES_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  constructor() {
    // Initialize cache cleanup interval
    setInterval(() => this.cleanupCache(), 60 * 1000) // Cleanup every minute
  }

  /**
   * Search games with exact title matching as default, falling back to fuzzy search
   * Exact matching uses ILIKE for substring matching
   * Fuzzy matching uses PostgreSQL trigram similarity (requires pg_trgm extension)
   */
  async searchGamesWithSimilarity(options: SearchOptions): Promise<GameWithCalculatedFields[]> {
    const startTime = performance.now()
    const cacheKey = `search:${JSON.stringify(options)}`
    
    // Check cache first
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.logPerformance('searchGamesWithSimilarity', startTime, cached.length, true)
      return cached
    }

    try {
      const { 
        query, 
        limit = 20, 
        offset = 0, 
        minSimilarity = 0.1,
        genres,
        platforms,
        minRating,
        releaseYear,
        useExactMatch = true // Default to exact matching
      } = options

      // Use exact match or fuzzy search based on option
      if (useExactMatch) {
        // First try exact title matching using ILIKE
        let queryBuilder = supabase
          .from('games')
          .select(`
            *,
            ratings:rating(rating)
          `)
          .ilike('name', `%${query}%`)

        // Apply filters
        if (genres && genres.length > 0) {
          queryBuilder = queryBuilder.contains('genres', genres)
        }

        if (platforms && platforms.length > 0) {
          queryBuilder = queryBuilder.contains('platforms', platforms)
        }

        if (releaseYear) {
          const yearStart = `${releaseYear}-01-01`
          const yearEnd = `${releaseYear}-12-31`
          queryBuilder = queryBuilder
            .gte('first_release_date', yearStart)
            .lte('first_release_date', yearEnd)
        }

        queryBuilder = queryBuilder
          .range(offset, offset + limit - 1)
          .limit(limit)

        const { data, error } = await queryBuilder

        if (error) throw error

        const results = this.transformGamesWithRatings(data || [])
        
        // Apply minimum rating filter
        const finalResults = minRating 
          ? results.filter(g => g.averageUserRating >= minRating)
          : results

        this.cacheResult(cacheKey, finalResults, this.DEFAULT_CACHE_TTL)
        this.logPerformance('searchGamesWithSimilarity', startTime, finalResults.length, false)
        return finalResults
      }

      // Use RPC function for fuzzy similarity search if available
      const { data: similarGames, error: rpcError } = await supabase
        .rpc('search_games_similarity', {
          search_query: query,
          similarity_threshold: minSimilarity
        })

      if (!rpcError && similarGames) {
        // Apply additional filters to similarity results
        let filteredGames = similarGames

        if (genres && genres.length > 0) {
          filteredGames = filteredGames.filter((game: any) => 
            game.genres && genres.some(g => game.genres.includes(g))
          )
        }

        if (platforms && platforms.length > 0) {
          filteredGames = filteredGames.filter((game: any) =>
            game.platforms && platforms.some(p => game.platforms.includes(p))
          )
        }

        if (releaseYear) {
          filteredGames = filteredGames.filter((game: any) => {
            if (!game.first_release_date) return false
            const year = new Date(game.first_release_date).getFullYear()
            return year === releaseYear
          })
        }

        // Get ratings for filtered games
        const gameIds = filteredGames.slice(offset, offset + limit).map((g: any) => g.id)
        const { data: gamesWithRatings } = await supabase
          .from('games')
          .select(`
            *,
            ratings:rating(rating)
          `)
          .in('id', gameIds)

        const results = this.transformGamesWithRatings(gamesWithRatings || [])
        
        // Apply minimum rating filter after calculating averages
        const finalResults = minRating 
          ? results.filter(g => g.averageUserRating >= minRating)
          : results

        this.cacheResult(cacheKey, finalResults, this.DEFAULT_CACHE_TTL)
        this.logPerformance('searchGamesWithSimilarity', startTime, finalResults.length, false)
        return finalResults
      }

      // Fallback to ILIKE search if RPC function doesn't exist for fuzzy search
      console.log('Using fallback ILIKE search (consider creating search_games_similarity function)')
      
      let queryBuilder = supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .ilike('name', `%${query}%`)

      if (genres && genres.length > 0) {
        queryBuilder = queryBuilder.contains('genres', genres)
      }

      if (platforms && platforms.length > 0) {
        queryBuilder = queryBuilder.contains('platforms', platforms)
      }

      if (releaseYear) {
        const yearStart = `${releaseYear}-01-01`
        const yearEnd = `${releaseYear}-12-31`
        queryBuilder = queryBuilder
          .gte('first_release_date', yearStart)
          .lte('first_release_date', yearEnd)
      }

      queryBuilder = queryBuilder
        .range(offset, offset + limit - 1)
        .limit(limit)

      const { data, error } = await queryBuilder

      if (error) throw error

      const results = this.transformGamesWithRatings(data || [])
      
      // Apply minimum rating filter
      const finalResults = minRating 
        ? results.filter(g => g.averageUserRating >= minRating)
        : results

      this.cacheResult(cacheKey, finalResults, this.DEFAULT_CACHE_TTL)
      this.logPerformance('searchGamesWithSimilarity', startTime, finalResults.length, false)
      return finalResults

    } catch (error) {
      console.error('Error in searchGamesWithSimilarity:', error)
      this.logPerformance('searchGamesWithSimilarity', startTime, 0, false)
      return []
    }
  }

  /**
   * Get popular games ordered by user rating count
   * Uses optimized query with proper indexing
   */
  async getPopularGamesByRatingCount(limit: number = 20): Promise<GameWithCalculatedFields[]> {
    const startTime = performance.now()
    const cacheKey = `popular:${limit}`
    
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.logPerformance('getPopularGamesByRatingCount', startTime, cached.length, true)
      return cached
    }

    try {
      // Use RPC function for optimized popular games query if available
      const { data: popularGames, error: rpcError } = await supabase
        .rpc('get_popular_games', { 
          limit_count: limit 
        })

      if (!rpcError && popularGames) {
        const results = this.transformRPCGamesWithRatings(popularGames)
        this.cacheResult(cacheKey, results, this.POPULAR_GAMES_CACHE_TTL)
        this.logPerformance('getPopularGamesByRatingCount', startTime, results.length, false)
        return results
      }

      // Fallback to manual query
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .limit(limit * 3) // Get more to filter

      if (error) throw error

      const gamesWithRatings = this.transformGamesWithRatings(data || [])
      
      // Sort by rating count and filter games with ratings
      const results = gamesWithRatings
        .filter(g => g.totalUserRatings > 0)
        .sort((a, b) => {
          const countDiff = b.totalUserRatings - a.totalUserRatings
          if (countDiff !== 0) return countDiff
          return b.averageUserRating - a.averageUserRating
        })
        .slice(0, limit)

      this.cacheResult(cacheKey, results, this.POPULAR_GAMES_CACHE_TTL)
      this.logPerformance('getPopularGamesByRatingCount', startTime, results.length, false)
      return results

    } catch (error) {
      console.error('Error in getPopularGamesByRatingCount:', error)
      this.logPerformance('getPopularGamesByRatingCount', startTime, 0, false)
      return []
    }
  }

  /**
   * Get highly rated games (minimum average rating threshold)
   */
  async getHighlyRatedGames(minRating: number = 8.0, minRatingCount: number = 5, limit: number = 20): Promise<GameWithCalculatedFields[]> {
    const startTime = performance.now()
    const cacheKey = `highly-rated:${minRating}:${minRatingCount}:${limit}`
    
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.logPerformance('getHighlyRatedGames', startTime, cached.length, true)
      return cached
    }

    try {
      // Use RPC function if available
      const { data: highlyRated, error: rpcError } = await supabase
        .rpc('get_highly_rated_games', { 
          min_rating: minRating,
          min_count: minRatingCount,
          limit_count: limit 
        })

      if (!rpcError && highlyRated) {
        const results = this.transformRPCGamesWithRatings(highlyRated)
        this.cacheResult(cacheKey, results, this.POPULAR_GAMES_CACHE_TTL)
        this.logPerformance('getHighlyRatedGames', startTime, results.length, false)
        return results
      }

      // Fallback query
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .limit(limit * 5) // Get more to filter

      if (error) throw error

      const gamesWithRatings = this.transformGamesWithRatings(data || [])
      
      // Filter by rating criteria
      const results = gamesWithRatings
        .filter(g => 
          g.totalUserRatings >= minRatingCount && 
          g.averageUserRating >= minRating
        )
        .sort((a, b) => b.averageUserRating - a.averageUserRating)
        .slice(0, limit)

      this.cacheResult(cacheKey, results, this.POPULAR_GAMES_CACHE_TTL)
      this.logPerformance('getHighlyRatedGames', startTime, results.length, false)
      return results

    } catch (error) {
      console.error('Error in getHighlyRatedGames:', error)
      this.logPerformance('getHighlyRatedGames', startTime, 0, false)
      return []
    }
  }

  /**
   * Get rating distribution for a game
   */
  async getGameRatingDistribution(gameId: number): Promise<RatingDistribution[]> {
    const startTime = performance.now()
    const cacheKey = `rating-dist:${gameId}`
    
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      this.logPerformance('getGameRatingDistribution', startTime, cached.length, true)
      return cached
    }

    try {
      // Get all ratings for the game
      const { data, error } = await supabase
        .from('rating')
        .select('rating')
        .eq('game_id', gameId)

      if (error) throw error

      if (!data || data.length === 0) {
        this.logPerformance('getGameRatingDistribution', startTime, 0, false)
        return []
      }

      // Calculate distribution
      const distribution = new Map<number, number>()
      const totalRatings = data.length

      // Initialize all rating values (1-10)
      for (let i = 1; i <= 10; i++) {
        distribution.set(i, 0)
      }

      // Count ratings
      data.forEach(r => {
        const rating = Math.round(r.rating)
        distribution.set(rating, (distribution.get(rating) || 0) + 1)
      })

      // Convert to array with percentages
      const results: RatingDistribution[] = Array.from(distribution.entries())
        .map(([rating, count]) => ({
          rating,
          count,
          percentage: totalRatings > 0 ? (count / totalRatings) * 100 : 0
        }))
        .sort((a, b) => b.rating - a.rating)

      this.cacheResult(cacheKey, results, this.DEFAULT_CACHE_TTL)
      this.logPerformance('getGameRatingDistribution', startTime, results.length, false)
      return results

    } catch (error) {
      console.error('Error in getGameRatingDistribution:', error)
      this.logPerformance('getGameRatingDistribution', startTime, 0, false)
      return []
    }
  }

  /**
   * Get games with similar ratings to a given game
   */
  async getSimilarlyRatedGames(gameId: number, limit: number = 10): Promise<GameWithCalculatedFields[]> {
    const startTime = performance.now()
    
    try {
      // First get the target game's rating
      const targetGame = await this.getGameWithRating(gameId)
      if (!targetGame || !targetGame.averageUserRating) {
        this.logPerformance('getSimilarlyRatedGames', startTime, 0, false)
        return []
      }

      const targetRating = targetGame.averageUserRating
      const ratingRange = 0.5 // Games within ±0.5 rating points

      // Get games with similar ratings
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .neq('id', gameId)
        .limit(limit * 5) // Get more to filter

      if (error) throw error

      const gamesWithRatings = this.transformGamesWithRatings(data || [])
      
      // Filter and sort by rating similarity
      const results = gamesWithRatings
        .filter(g => 
          g.totalUserRatings > 0 &&
          Math.abs(g.averageUserRating - targetRating) <= ratingRange
        )
        .sort((a, b) => {
          const aDiff = Math.abs(a.averageUserRating - targetRating)
          const bDiff = Math.abs(b.averageUserRating - targetRating)
          return aDiff - bDiff
        })
        .slice(0, limit)

      this.logPerformance('getSimilarlyRatedGames', startTime, results.length, false)
      return results

    } catch (error) {
      console.error('Error in getSimilarlyRatedGames:', error)
      this.logPerformance('getSimilarlyRatedGames', startTime, 0, false)
      return []
    }
  }

  /**
   * Invalidate cache entries related to a game
   */
  invalidateGameCache(gameId?: number): void {
    if (gameId) {
      // Invalidate specific game caches
      this.cache.delete(`game:${gameId}`)
      this.cache.delete(`rating-dist:${gameId}`)
    }
    
    // Invalidate general caches that might be affected
    for (const key of this.cache.keys()) {
      if (key.startsWith('popular:') || key.startsWith('highly-rated:')) {
        this.cache.delete(key)
      }
    }
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.cache.clear()
    console.log('Game query cache cleared')
  }

  /**
   * Get performance logs (for development)
   */
  getPerformanceLogs(): QueryPerformance[] {
    return this.performanceLogs
  }

  /**
   * Clear performance logs
   */
  clearPerformanceLogs(): void {
    this.performanceLogs = []
  }

  // Private helper methods

  private async getGameWithRating(gameId: number): Promise<GameWithCalculatedFields | null> {
    const cacheKey = `game:${gameId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) return cached

    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          ratings:rating(rating)
        `)
        .eq('id', gameId)
        .single()

      if (error || !data) return null

      const result = this.transformGameWithRatings(data)
      this.cacheResult(cacheKey, result, this.DEFAULT_CACHE_TTL)
      return result

    } catch (error) {
      console.error('Error getting game with rating:', error)
      return null
    }
  }

  private transformGamesWithRatings(games: any[]): GameWithCalculatedFields[] {
    return games.map(game => this.transformGameWithRatings(game))
  }

  private transformGameWithRatings(game: any): GameWithCalculatedFields {
    const { ratings, ...gameData } = game
    
    let averageUserRating = 0
    let totalUserRatings = 0
    
    if (ratings && ratings.length > 0) {
      totalUserRatings = ratings.length
      const sum = ratings.reduce((acc: number, r: any) => acc + r.rating, 0)
      averageUserRating = sum / totalUserRatings
    }

    return {
      ...gameData,
      averageUserRating,
      totalUserRatings
    }
  }

  private transformRPCGamesWithRatings(games: any[]): GameWithCalculatedFields[] {
    // RPC functions might return pre-calculated ratings
    return games.map(game => ({
      ...game,
      averageUserRating: game.average_rating || 0,
      totalUserRatings: game.rating_count || 0
    }))
  }

  private cacheResult(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key)
      }
    }
  }

  private logPerformance(query: string, startTime: number, resultCount: number, cached: boolean): void {
    const duration = performance.now() - startTime
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[GameQuery] ${query}: ${duration.toFixed(2)}ms, ${resultCount} results${cached ? ' (cached)' : ''}`)
    }

    this.performanceLogs.push({
      query,
      duration,
      resultCount,
      cached
    })

    // Keep only last 100 logs
    if (this.performanceLogs.length > 100) {
      this.performanceLogs.shift()
    }
  }
}

export const gameQueryService = new GameQueryService()

// Export types
export type { SearchOptions, RatingDistribution, QueryPerformance }