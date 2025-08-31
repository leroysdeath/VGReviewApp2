import { supabase } from './supabase'
import { sortGamesByPriority, calculateGamePriority } from '../utils/gamePrioritization'

export interface SearchFilters {
  query?: string
  releaseDateStart?: Date
  releaseDateEnd?: Date
  platformIds?: number[]
  minRating?: number
  maxRating?: number
  minRatingCount?: number
  genres?: string[]
  orderBy?: 'relevance' | 'rating' | 'release_date' | 'name' | 'rating_count'
  orderDirection?: 'asc' | 'desc'
}

export interface PaginationOptions {
  limit?: number
  offset?: number
}

export interface GameSearchResult {
  id: number
  igdb_id?: number
  name: string
  description?: string
  summary?: string
  release_date?: string
  cover_url?: string
  cover_url?: string
  developer?: string
  publisher?: string
  genre?: string
  genres?: string[]
  platforms?: string[]
  igdb_rating?: number
  metacritic_score?: number
  avg_user_rating?: number
  user_rating_count?: number
  screenshots?: string[]
  total_rating?: number
  total_rating_count?: number
  rating_count?: number
  follows?: number
  hypes?: number
}

export interface SearchResponse {
  games: GameSearchResult[]
  totalCount: number
  hasMore: boolean
}

/**
 * Calculate relevance score for search results
 * Prevents unrelated games from appearing (like Mario in Zelda searches)
 */
function calculateSearchRelevance(game: any, searchQuery: string): number {
  if (!searchQuery || !searchQuery.trim()) return 1;

  const query = searchQuery.toLowerCase().trim();
  const gameName = (game.name || '').toLowerCase();
  const developer = (game.developer || '').toLowerCase();
  const publisher = (game.publisher || '').toLowerCase();
  const summary = (game.summary || '').toLowerCase();
  const genres = Array.isArray(game.genres) ? game.genres.join(' ').toLowerCase() : (game.genre || '').toLowerCase();

  let relevanceScore = 0;
  let maxPossibleScore = 0;

  // Exact name match (highest relevance)
  maxPossibleScore += 100;
  if (gameName === query) {
    relevanceScore += 100;
  } else if (gameName.includes(query) || query.includes(gameName)) {
    // Calculate how much of the name matches
    const matchRatio = Math.min(query.length, gameName.length) / Math.max(query.length, gameName.length);
    relevanceScore += 100 * matchRatio;
  }

  // Query words in name (very high relevance)
  maxPossibleScore += 80;
  const queryWords = query.split(/\s+/);
  const nameWords = gameName.split(/\s+/);
  let nameWordMatches = 0;
  queryWords.forEach(queryWord => {
    if (nameWords.some(nameWord => nameWord.includes(queryWord) || queryWord.includes(nameWord))) {
      nameWordMatches++;
    }
  });
  if (queryWords.length > 0) {
    relevanceScore += 80 * (nameWordMatches / queryWords.length);
  }

  // Developer/Publisher match (medium relevance)
  maxPossibleScore += 30;
  queryWords.forEach(queryWord => {
    if (developer.includes(queryWord) || publisher.includes(queryWord)) {
      relevanceScore += 30 / queryWords.length;
    }
  });

  // Summary/Description match (lower relevance)
  maxPossibleScore += 20;
  queryWords.forEach(queryWord => {
    if (summary.includes(queryWord)) {
      relevanceScore += 20 / queryWords.length;
    }
  });

  // Genre match (lowest relevance)
  maxPossibleScore += 10;
  queryWords.forEach(queryWord => {
    if (genres.includes(queryWord)) {
      relevanceScore += 10 / queryWords.length;
    }
  });

  // Calculate final relevance as percentage
  const finalRelevance = maxPossibleScore > 0 ? (relevanceScore / maxPossibleScore) : 0;
  
  // Apply strict threshold - games below 15% relevance are considered unrelated
  const RELEVANCE_THRESHOLD = 0.15;
  return finalRelevance >= RELEVANCE_THRESHOLD ? finalRelevance : 0;
}

/**
 * Filter out games with insufficient search relevance
 */
function filterByRelevance(games: any[], searchQuery?: string): any[] {
  if (!searchQuery || !searchQuery.trim()) {
    return games;
  }

  return games.filter(game => {
    const relevance = calculateSearchRelevance(game, searchQuery);
    if (relevance === 0) {
      console.log(`🚫 FILTERED: "${game.name}" - insufficient relevance for query "${searchQuery}"`);
      return false;
    }
    return true;
  });
}

class GameSearchService {
  async searchGames(
    filters: SearchFilters = {},
    pagination: PaginationOptions = {}
  ): Promise<SearchResponse> {
    const { limit = 20, offset = 0 } = pagination
    const {
      query,
      releaseDateStart,
      releaseDateEnd,
      platformIds,
      minRating,
      maxRating,
      minRatingCount,
      genres,
      orderBy = 'relevance',
      orderDirection = 'desc'
    } = filters

    try {
      // Build the base query with rating aggregations
      let baseQuery = supabase
        .from('game')
        .select(`
          *,
          rating_count:rating(id).count(),
          avg_rating:rating(rating).avg()
        `, { count: 'exact' })

      // Apply search query filter using secure full-text search
      if (query && query.trim()) {
        // Use secure RPC function instead of vulnerable ILIKE
        const { data: searchResults, error: searchError } = await supabase
          .rpc('search_games_secure', {
            search_query: query.trim(),
            limit_count: 1000 // Get all matching for further filtering
          });
          
        if (searchError) {
          console.error('Search RPC error:', searchError);
          throw searchError;
        }
        
        if (searchResults && searchResults.length > 0) {
          const matchingIds = searchResults.map(r => r.id);
          baseQuery = baseQuery.in('id', matchingIds);
        } else {
          // No search results, return empty
          return { data: [], count: 0, error: null };
        }
      }

      // Apply release date filters
      if (releaseDateStart) {
        baseQuery = baseQuery.gte('release_date', releaseDateStart.toISOString().split('T')[0])
      }
      if (releaseDateEnd) {
        baseQuery = baseQuery.lte('release_date', releaseDateEnd.toISOString().split('T')[0])
      }

      // Apply genre filters using secure function
      if (genres && genres.length > 0) {
        const genreMatchingIds = new Set<number>();
        
        for (const genre of genres) {
          const { data: genreResults, error: genreError } = await supabase
            .rpc('search_games_by_genre', {
              genre_name: genre,
              limit_count: 1000
            });
            
          if (genreError) {
            console.error('Genre search error:', genreError);
            continue; // Skip this genre but continue with others
          }
          
          if (genreResults) {
            genreResults.forEach(result => genreMatchingIds.add(result.id));
          }
        }
        
        if (genreMatchingIds.size > 0) {
          baseQuery = baseQuery.in('id', Array.from(genreMatchingIds));
        } else {
          // No genre matches found
          return { data: [], count: 0, error: null };
        }
      }

      // Execute the base query
      const { data: games, error, count } = await baseQuery
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Error searching games:', error)
        return { games: [], totalCount: 0, hasMore: false }
      }

      // If we need to filter by platforms or ratings, we need additional queries
      let filteredGames = games || []

      // Filter by platforms if specified
      if (platformIds && platformIds.length > 0 && filteredGames.length > 0) {
        const gameIds = filteredGames.map(g => g.id)
        
        const { data: platformGames } = await supabase
          .from('platform_games')
          .select('game_id')
          .in('game_id', gameIds)
          .in('platform_id', platformIds)

        const gamesWithPlatform = new Set(platformGames?.map(pg => pg.game_id) || [])
        filteredGames = filteredGames.filter(game => gamesWithPlatform.has(game.id))
      }

      // Get rating stats for filtered games
      if (filteredGames.length > 0) {
        const gameIds = filteredGames.map(g => g.id)
        
        const { data: ratingsData } = await supabase
          .from('rating')
          .select('game_id, rating')
          .in('game_id', gameIds)

        // Calculate average ratings and counts
        const ratingStats = new Map<number, { sum: number, count: number }>()
        
        ratingsData?.forEach(rating => {
          if (!ratingStats.has(rating.game_id)) {
            ratingStats.set(rating.game_id, { sum: 0, count: 0 })
          }
          const stats = ratingStats.get(rating.game_id)!
          stats.sum += rating.rating
          stats.count += 1
        })

        // Add rating stats to games
        filteredGames = filteredGames.map(game => {
          const stats = ratingStats.get(game.id)
          return {
            ...game,
            avg_user_rating: stats ? stats.sum / stats.count : undefined,
            user_rating_count: stats?.count || 0
          }
        })

        // Apply rating filters
        if (minRating !== undefined) {
          filteredGames = filteredGames.filter(game => 
            game.avg_user_rating !== undefined && game.avg_user_rating >= minRating
          )
        }
        if (maxRating !== undefined) {
          filteredGames = filteredGames.filter(game => 
            game.avg_user_rating !== undefined && game.avg_user_rating <= maxRating
          )
        }
        if (minRatingCount !== undefined) {
          filteredGames = filteredGames.filter(game => 
            game.user_rating_count >= minRatingCount
          )
        }
      }

      // Apply strict relevance filtering to prevent unrelated games
      if (query && query.trim()) {
        filteredGames = filterByRelevance(filteredGames, query.trim());
      }

      // Sort the results using the intelligent priority system
      if (orderBy === 'relevance') {
        // Use the advanced prioritization system for relevance sorting
        filteredGames = sortGamesByPriority(filteredGames);
      } else {
        // Use traditional sorting for other sort options
        filteredGames = this.sortGames(filteredGames, orderBy, orderDirection, query);
      }

      // Get platforms for the final games
      if (filteredGames.length > 0) {
        const gameIds = filteredGames.map(g => g.id)
        
        const { data: platformData } = await supabase
          .from('platform_games')
          .select(`
            game_id,
            platform:platform_id (
              name
            )
          `)
          .in('game_id', gameIds)

        // Group platforms by game
        const gamePlatforms = new Map<number, string[]>()
        platformData?.forEach(pg => {
          if (pg.platform) {
            if (!gamePlatforms.has(pg.game_id)) {
              gamePlatforms.set(pg.game_id, [])
            }
            gamePlatforms.get(pg.game_id)!.push(pg.platform.name)
          }
        })

        // Add platforms to games
        filteredGames = filteredGames.map(game => ({
          ...game,
          platforms: gamePlatforms.get(game.id) || []
        }))
      }

      // Map to final result format
      const searchResults: GameSearchResult[] = filteredGames.map(game => ({
        id: game.id,
        igdb_id: game.igdb_id,
        name: game.name,
        description: game.description,
        summary: game.summary,
        release_date: game.release_date,
        cover_url: game.cover_url,
        developer: game.developer || game.dev,
        publisher: game.publisher,
        genre: game.genre,
        genres: game.genres || (game.genre ? [game.genre] : []),
        platforms: game.platforms || [],
        igdb_rating: game.igdb_rating,
        metacritic_score: game.metacritic_score,
        avg_user_rating: game.avg_user_rating,
        user_rating_count: game.user_rating_count,
        screenshots: game.screenshots,
        total_rating: game.total_rating,
        total_rating_count: game.total_rating_count,
        rating_count: game.rating_count,
        follows: game.follows,
        hypes: game.hypes
      }))

      return {
        games: searchResults,
        totalCount: count || 0,
        hasMore: (offset + limit) < (count || 0)
      }
    } catch (error) {
      console.error('Error in searchGames:', error)
      return { games: [], totalCount: 0, hasMore: false }
    }
  }

  private sortGames(
    games: any[],
    orderBy: string,
    direction: 'asc' | 'desc',
    query?: string
  ): any[] {
    const sorted = [...games]
    
    switch (orderBy) {
      case 'relevance':
        // Sort by relevance if there's a search query
        if (query) {
          const lowerQuery = query.toLowerCase()
          sorted.sort((a, b) => {
            // Exact name match gets highest priority
            const aExact = a.name.toLowerCase() === lowerQuery ? 1000 : 0
            const bExact = b.name.toLowerCase() === lowerQuery ? 1000 : 0
            
            // Name contains query gets second priority  
            const aNameMatch = a.name.toLowerCase().includes(lowerQuery) ? 100 : 0
            const bNameMatch = b.name.toLowerCase().includes(lowerQuery) ? 100 : 0
            
            // Add bonus for having a summary (deprioritize games without summaries)
            const aHasSummary = (a.summary && a.summary.trim().length > 0) ? 50 : 0
            const bHasSummary = (b.summary && b.summary.trim().length > 0) ? 50 : 0
            
            // Then sort by rating count (popularity)
            const aScore = aExact + aNameMatch + aHasSummary + (a.user_rating_count || 0)
            const bScore = bExact + bNameMatch + bHasSummary + (b.user_rating_count || 0)
            
            return direction === 'desc' ? bScore - aScore : aScore - bScore
          })
        } else {
          // Without query, sort by popularity (rating count) and summary presence
          sorted.sort((a, b) => {
            // Add significant penalty for missing summary
            const aHasSummary = (a.summary && a.summary.trim().length > 0) ? 1000 : 0
            const bHasSummary = (b.summary && b.summary.trim().length > 0) ? 1000 : 0
            
            const aScore = aHasSummary + (a.user_rating_count || 0)
            const bScore = bHasSummary + (b.user_rating_count || 0)
            
            const diff = bScore - aScore
            return direction === 'desc' ? diff : -diff
          })
        }
        break
        
      case 'rating':
        sorted.sort((a, b) => {
          const aRating = a.avg_user_rating || 0
          const bRating = b.avg_user_rating || 0
          const diff = bRating - aRating
          return direction === 'desc' ? diff : -diff
        })
        break
        
      case 'rating_count':
        sorted.sort((a, b) => {
          const diff = (b.user_rating_count || 0) - (a.user_rating_count || 0)
          return direction === 'desc' ? diff : -diff
        })
        break
        
      case 'release_date':
        sorted.sort((a, b) => {
          const aDate = a.release_date ? new Date(a.release_date).getTime() : 0
          const bDate = b.release_date ? new Date(b.release_date).getTime() : 0
          const diff = bDate - aDate
          return direction === 'desc' ? diff : -diff
        })
        break
        
      case 'name':
        sorted.sort((a, b) => {
          const comp = a.name.localeCompare(b.name)
          return direction === 'desc' ? -comp : comp
        })
        break
    }
    
    return sorted
  }

  async getPopularGames(limit: number = 20): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { 
        orderBy: 'rating_count',
        minRatingCount: 1
      },
      { limit }
    )
    return response.games
  }

  async getTopRatedGames(limit: number = 20, minRatingCount: number = 5): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { 
        orderBy: 'rating',
        minRatingCount
      },
      { limit }
    )
    return response.games
  }

  async getRecentGames(limit: number = 20): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { orderBy: 'release_date' },
      { limit }
    )
    return response.games
  }

  async getGamesByPlatform(platformId: number, limit: number = 20): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { platformIds: [platformId] },
      { limit }
    )
    return response.games
  }

  async getGamesByGenre(genre: string, limit: number = 20): Promise<GameSearchResult[]> {
    const response = await this.searchGames(
      { genres: [genre] },
      { limit }
    )
    return response.games
  }
}

export const gameSearchService = new GameSearchService()