import { supabase } from './supabase'
import { sanitizeSearchTerm } from '../utils/sqlSecurity'
import type { Game, GameWithCalculatedFields } from '../types/database'
import { igdbService } from './igdbService'
import { enhancedSearchService } from './enhancedSearchService'
import { gameSearchService } from './gameSearchService'
import { generateSlug } from '../utils/gameUrls'
import { gameSyncService } from './gameSyncService'
import { syncQueue } from '../utils/syncQueue'
import { IGDBGame } from '../types/igdb'
import { prioritizeFlagshipTitles } from '../utils/sisterGameDetection'

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
          rating(rating)
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
          rating(rating)
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
            rating(rating)
          `)
          .eq('game_id', igdbId.toString())
          .single()

        console.log('🔍 Second query (game_id):', { found: !!gameIdData, error: gameIdError });

        if (!gameIdError && gameIdData) {
          data = gameIdData
          error = null
        }
      }

      // Check if game exists but has incomplete data (only check fields we actually use)
      const needsUpdate = data && (!data.summary || !data.developer || !data.publisher)
      
      if (error || !data || needsUpdate) {
        if (needsUpdate) {
          console.log(`Game with IGDB ID ${igdbId} has incomplete data, refreshing from IGDB API...`)
        } else {
          console.log(`Game with IGDB ID ${igdbId} not found in database, fetching from IGDB API...`)
        }

        // Game not in database or needs update, fetch from IGDB API
        try {
          const igdbGame = await igdbService.getGameById(igdbId)

          if (!igdbGame) {
            console.error('Game not found in IGDB either')
            return null
          }

          // Transform IGDB game to our format
          const transformedGame = igdbService.transformGame(igdbGame)

          // Prepare game data - Only store what we actually fetch and use
          const gameData = {
            igdb_id: transformedGame.igdb_id,
            game_id: transformedGame.igdb_id.toString(),
            name: transformedGame.name,
            slug: data?.slug || generateSlug(transformedGame.name), // Keep existing slug if updating
            summary: transformedGame.summary,
            release_date: transformedGame.first_release_date
              ? (typeof transformedGame.first_release_date === 'number'
                  ? new Date(transformedGame.first_release_date * 1000).toISOString().split('T')[0]
                  : new Date(transformedGame.first_release_date).toISOString().split('T')[0])
              : null,
            cover_url: transformedGame.cover_url,
            pic_url: transformedGame.cover_url, // Add pic_url for compatibility
            platforms: transformedGame.platforms || [],
            developer: transformedGame.developer,
            publisher: transformedGame.publisher,
            category: transformedGame.category || null, // Add category for content filtering
            dlc_ids: transformedGame.dlcs || null, // Add DLC IDs for DLCSection
            expansion_ids: transformedGame.expansions || null, // Add expansion IDs for expansion section
            updated_at: new Date().toISOString()
          }

          // Either insert new or update existing game
          let upsertedGame, upsertError
          
          if (needsUpdate) {
            // Update existing game
            const { data: updated, error: updateErr } = await supabase
              .from('game')
              .update(gameData)
              .eq('igdb_id', igdbId)
              .select(`
                *,
                rating(rating)
              `)
              .single()
            upsertedGame = updated
            upsertError = updateErr
          } else {
            // Insert new game
            const { data: inserted, error: insertErr } = await supabase
              .from('game')
              .insert({
                ...gameData,
                created_at: new Date().toISOString()
              })
              .select(`
                *,
                rating(rating)
              `)
              .single()
            upsertedGame = inserted
            upsertError = insertErr
          }

          if (upsertError) {
            console.error(needsUpdate ? 'Error updating game in database:' : 'Error inserting game into database:', upsertError)
            // Even if insert fails, return the game data from IGDB
            return {
              ...transformedGame,
              averageUserRating: 0,
              totalUserRatings: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as GameWithCalculatedFields
          }

          console.log(needsUpdate 
            ? `✅ Game "${transformedGame.name}" updated in database with complete data`
            : `✅ Game "${transformedGame.name}" added to database`)

          // Return the newly inserted/updated game
          return this.transformGameWithRatings(upsertedGame as GameWithRating)
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
        avatar_url?: string;
      };
    }>;
  }> {
    try {
      console.log(`🔍 Looking up game with IGDB ID: ${igdbId}`);
      
      // First check if game exists in database
      const { data: gameData, error: gameError } = await supabase
        .from('game')
        .select('*')
        .eq('igdb_id', igdbId)
        .single()

      if (gameError) {
        console.log(`Database error for IGDB ID ${igdbId}:`, gameError);
      }
      
      if (gameData) {
        console.log(`✅ Found game in database:`, {
          id: gameData.id,
          igdb_id: gameData.igdb_id,
          name: gameData.name,
          slug: gameData.slug
        });
      }

      // Check if game exists but has incomplete data (only check fields we actually use)
      const needsUpdate = gameData && (!gameData.summary || !gameData.developer || !gameData.publisher)
      
      if (gameError || !gameData || needsUpdate) {
        if (needsUpdate) {
          console.log(`Game with IGDB ID ${igdbId} has incomplete data, refreshing from IGDB API...`)
        } else {
          console.log(`Game with IGDB ID ${igdbId} not found in database, fetching from IGDB API...`)
        }

        // Game not in database or needs update, fetch from IGDB API
        try {
          const igdbGame = await igdbService.getGameById(igdbId)

          if (!igdbGame) {
            console.error('Game not found in IGDB either')
            return { game: null, reviews: [] }
          }

          // Transform IGDB game to our format
          const transformedGame = igdbService.transformGame(igdbGame)

          // Prepare game data
          const preparedGameData = {
            igdb_id: transformedGame.igdb_id,
            game_id: transformedGame.igdb_id.toString(),
            name: transformedGame.name,
            slug: gameData?.slug || generateSlug(transformedGame.name), // Keep existing slug if updating
            summary: transformedGame.summary,
            description: transformedGame.description, // Add description field
            release_date: transformedGame.first_release_date
              ? (typeof transformedGame.first_release_date === 'number' 
                  ? new Date(transformedGame.first_release_date * 1000).toISOString().split('T')[0]
                  : new Date(transformedGame.first_release_date).toISOString().split('T')[0])
              : null,
            cover_url: transformedGame.cover_url,
            pic_url: transformedGame.cover_url, // Add pic_url for compatibility
            screenshots: transformedGame.screenshots || null, // Add screenshots
            genres: transformedGame.genres || [],
            platforms: transformedGame.platforms || [],
            developer: transformedGame.developer,
            publisher: transformedGame.publisher,
            igdb_rating: Math.round(transformedGame.igdb_rating || 0),
            category: transformedGame.category || null, // Add category
            alternative_names: transformedGame.alternative_names || null, // Add alternative names
            franchise_name: transformedGame.franchise || null, // Add franchise name
            collection_name: transformedGame.collection || null, // Add collection name
            dlc_ids: transformedGame.dlcs || null, // Add DLC IDs
            expansion_ids: transformedGame.expansions || null, // Add expansion IDs
            similar_game_ids: transformedGame.similar_games || null, // Add similar game IDs
            updated_at: new Date().toISOString()
          }

          // Either insert new or update existing game
          let upsertedGame, upsertError
          
          if (needsUpdate) {
            // Update existing game
            const { data: updated, error: updateErr } = await supabase
              .from('game')
              .update(preparedGameData)
              .eq('igdb_id', igdbId)
              .select()
              .single()
            upsertedGame = updated
            upsertError = updateErr
          } else {
            // Insert new game
            const { data: inserted, error: insertErr } = await supabase
              .from('game')
              .insert({
                ...preparedGameData,
                created_at: new Date().toISOString()
              })
              .select()
              .single()
            upsertedGame = inserted
            upsertError = insertErr
          }

          if (upsertError) {
            console.error(needsUpdate ? 'Error updating game in database:' : 'Error inserting game into database:', upsertError)
            // Even if insert fails, return the game data from IGDB
            return {
              game: {
                ...transformedGame,
                averageUserRating: 0,
                totalUserRatings: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } as GameWithCalculatedFields,
              reviews: []
            }
          }

          console.log(needsUpdate 
            ? `✅ Game "${transformedGame.name}" updated in database with complete data`
            : `✅ Game "${transformedGame.name}" added to database`)

          // Return the newly inserted/updated game with no reviews yet
          return {
            game: {
              ...upsertedGame,
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
          user!fk_rating_user(
            id,
            name,
            avatar_url
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
   * Get game by slug with ratings
   */
  async getGameBySlug(slug: string): Promise<GameWithCalculatedFields | null> {
    try {
      console.log('🔍 gameDataService.getGameBySlug called with:', slug)
      
      const { data, error } = await supabase
        .from('game')
        .select(`
          *,
          rating(rating)
        `)
        .eq('slug', slug)
        .single()
      
      if (error || !data) {
        console.error('Game not found by slug:', slug, error)
        return null
      }
      
      console.log('✅ Game found by slug:', data.name)
      return this.transformGameWithRatings(data as GameWithRating)
    } catch (error) {
      console.error('Error in getGameBySlug:', error)
      return null
    }
  }

  /**
   * Get game with full reviews by slug
   */
  async getGameWithFullReviewsBySlug(slug: string): Promise<{
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
        avatar_url?: string;
      };
    }>;
  }> {
    try {
      // Get game by slug
      const { data: gameData, error: gameError } = await supabase
        .from('game')
        .select('*')
        .eq('slug', slug)
        .single()

      if (gameError || !gameData) {
        console.log(`Game with slug ${slug} not found in database`)
        return { game: null, reviews: [] }
      }

      // Get reviews using the game's database ID
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('rating')
        .select(`
          *,
          user!fk_rating_user(
            id,
            name,
            avatar_url
          )
        `)
        .eq('game_id', gameData.id)
        .order('post_date_time', { ascending: false })
      
      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError)
      }
      
      const reviews = reviewsData || []
      
      // Transform game data for calculated fields
      const game = this.transformGameWithRatings({
        ...gameData,
        rating: reviews.map((r: any) => ({ rating: r.rating }))
      } as GameWithRating)

      console.log(`✅ Loaded game "${game.name}" by slug with ${reviews.length} reviews`)

      return { game, reviews }
    } catch (error) {
      console.error('Error in getGameWithFullReviewsBySlug:', error)
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

  /**
   * Enhanced search with sister games, sequels, and intelligent prioritization
   * Replaces basic search with comprehensive franchise coverage
   */
  async searchGames(query: string, filters?: SearchFilters): Promise<GameWithCalculatedFields[]> {
    try {
      console.log(`🔍 Searching for "${query}"`);
      
      const sanitizedQuery = sanitizeSearchTerm(query);
      if (!sanitizedQuery) {
        return [];
      }

      // PHASE 1 & 2: Enhanced search with flagship prioritization
      let dbResults = await this.searchGamesBasic(sanitizedQuery, filters);
      
      console.log(`📊 Initial database search: ${dbResults.length} games`);
      
      // Apply flagship prioritization from priority games database
      const prioritizedResults = prioritizeFlagshipTitles(dbResults, sanitizedQuery);
      
      // Enhanced sorting: flagship games first, then by boost score
      prioritizedResults.sort((a, b) => {
        const boostA = (a._sisterGameBoost || 0) + (a._priorityBoost || 0);
        const boostB = (b._sisterGameBoost || 0) + (b._priorityBoost || 0);
        
        // Primary sort: flagship games first
        if (a._flagshipStatus === 'flagship' && b._flagshipStatus !== 'flagship') return -1;
        if (b._flagshipStatus === 'flagship' && a._flagshipStatus !== 'flagship') return 1;
        
        // Secondary sort: by total boost score
        if (boostA !== boostB) return boostB - boostA;
        
        // Tertiary sort: alphabetically
        return (a.name || '').localeCompare(b.name || '');
      });
      
      console.log(`✨ Applied flagship prioritization - ${prioritizedResults.filter(g => g._flagshipStatus === 'flagship').length} flagship games identified`);
      
      // If we have very few results and this looks like a franchise search, try sister game expansion
      if (prioritizedResults.length < 5 && this.isFranchiseQuery(sanitizedQuery)) {
        console.log(`🔍 Low results (${prioritizedResults.length}) for potential franchise "${sanitizedQuery}", trying sister game expansion...`);
        
        try {
          const expandedResults = await gameSearchService.searchGames(
            {
              query: sanitizedQuery,
              orderBy: 'relevance',
              orderDirection: 'desc',
              ...filters
            },
            { limit: 15, offset: 0 }
          );
          
          if (expandedResults.games.length > prioritizedResults.length) {
            console.log(`📈 Sister game expansion found ${expandedResults.games.length} games`);
            return expandedResults.games.map(game => this.convertToCalculatedFields(game));
          }
        } catch (expansionError) {
          console.warn('Sister game expansion failed:', expansionError);
        }
      }
      
      // Returning games with flagship prioritization
      return prioritizedResults;
    } catch (error) {
      console.error('❌ ENHANCED SEARCH FAILED:', error);
      console.log('🔄 FALLING BACK TO BASIC SEARCH');
      
      // Fallback to basic search if enhanced search fails
      return this.searchGamesBasic(query, filters);
    }
  }

  // BACKUP: Original search method (can be restored if needed)
  async searchGamesBasic(query: string, filters?: SearchFilters): Promise<GameWithCalculatedFields[]> {
    try {
      const sanitizedQuery = sanitizeSearchTerm(query)

      if (!sanitizedQuery) {
        return []
      }

      // Step 1: Always check database first
      const dbResults = await this.searchGamesExact(sanitizedQuery, filters)
      console.log(`📊 Database search for "${query}": ${dbResults.length} results`)

      // Step 2: If insufficient results, fetch from IGDB
      const MIN_RESULTS_THRESHOLD = 5
      if (dbResults.length < MIN_RESULTS_THRESHOLD) {
        console.log(`🔍 Fetching additional games from IGDB API...`)
        
        try {
          // Fetch from IGDB
          const igdbGames = await igdbService.searchGames(query, 20)
          
          if (igdbGames && igdbGames.length > 0) {
            // Step 3: Save IGDB results to database (non-blocking)
            console.log(`💾 IGDB games found (saving disabled for performance)...`)
            
            // Step 4: Merge results for immediate return
            const igdbConverted = this.convertIGDBToLocal(igdbGames)
            return this.mergeSearchResults(dbResults, igdbConverted)
          }
        } catch (igdbError) {
          console.error('IGDB search failed:', igdbError)
          // Fall back to database results only
        }
      }

      return dbResults
    } catch (error) {
      console.error('Error in searchGamesBasic:', error)
      return []
    }
  }

  /**
   * Convert IGDB games to local format for immediate display
   */
  private convertIGDBToLocal(igdbGames: any[]): GameWithCalculatedFields[] {
    return igdbGames.map(game => {
      const converted = {
        id: -(game.id || 0), // Negative ID to indicate it's from IGDB
        igdb_id: game.id || 0,
        name: game.name || 'Unknown Game',
        slug: generateSlug(game.name || 'Unknown Game'), // Generate slug for IGDB games
      summary: game.summary || null,
      release_date: game.first_release_date ? 
        new Date(game.first_release_date * 1000).toISOString().split('T')[0] : null,
      cover_url: game.cover?.url ? 
        (game.cover.url.startsWith('//') ? `https:${game.cover.url}` : game.cover.url)
          .replace('t_thumb', 't_cover_big') : null,
      genres: game.genres?.map((g: any) => g.name) || [],
      platforms: game.platforms?.map((p: any) => p.name) || [],
      screenshots: [],
      videos: [],
      developer: null,
      publisher: null,
      igdb_rating: game.rating || null,
      category: game.category || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      averageUserRating: 0,
      totalUserRatings: 0,
      fromIGDB: true // Track that this came from IGDB API
    };
    
    // DEBUG: Log the conversion
    if (game.name && game.name.toLowerCase().includes('expedition')) {
      console.error('🔄 DEBUG - Converting IGDB game:', {
        original_id: game.id,
        converted_id: converted.id,
        igdb_id: converted.igdb_id,
        slug: converted.slug,
        name: converted.name
      });
    }
    
    return converted;
    })
  }

  /**
   * Merge database and IGDB results, removing duplicates
   */
  private mergeSearchResults(
    dbResults: GameWithCalculatedFields[], 
    igdbResults: GameWithCalculatedFields[]
  ): GameWithCalculatedFields[] {
    const seen = new Set<number>()
    const merged: GameWithCalculatedFields[] = []

    // DEBUG: Log merge inputs
    console.log('🔀 DEBUG - Merging results:', {
      dbResults: dbResults.map(g => ({ name: g.name, id: g.id, igdb_id: g.igdb_id })),
      igdbResults: igdbResults.map(g => ({ name: g.name, id: g.id, igdb_id: g.igdb_id }))
    });

    // Add database results first (preferred)
    dbResults.forEach(game => {
      if (game.igdb_id) {
        seen.add(game.igdb_id)
      }
      merged.push(game)
    })

    // Add IGDB results that aren't duplicates
    igdbResults.forEach(game => {
      if (game.igdb_id && !seen.has(game.igdb_id)) {
        merged.push(game)
      }
    })
    
    // DEBUG: Log final merged results
    console.log('✅ DEBUG - Final merged results:', 
      merged.map(g => ({ name: g.name, id: g.id, igdb_id: g.igdb_id }))
    );

    return merged
  }

  /**
   * Search games using exact title matching with ILIKE
   */
  private async searchGamesExact(query: string, filters?: SearchFilters): Promise<GameWithCalculatedFields[]> {
    try {
      let queryBuilder = supabase
        .from('game')
        .select(`
          *,
          rating(rating)
        `)
        .ilike('name', `%${query}%`)
        .limit(50) // Increased from 20 for Phase 1

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

      console.log(`✅ Found ${games.length} games from database search`);
      return games
    } catch (error) {
      console.error('Error in searchGamesExact:', error);
      return [];
    }
  }


  async getPopularGames(limit: number = 20): Promise<GameWithCalculatedFields[]> {
    try {
      // Get games with the most ratings, ordered by rating count
      const { data, error } = await supabase
        .from('game')
        .select(`
          *,
          rating(rating)
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
          rating(rating)
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
            rating(rating)
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
          rating(rating)
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
          rating(rating)
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

    // Handle both old and new data structure for compatibility
    const ratingData = ratings || []

    // Calculate average rating and count
    let averageUserRating = 0
    let totalUserRatings = 0

    if (ratingData && ratingData.length > 0) {
      totalUserRatings = ratingData.length
      const sum = ratingData.reduce((acc, r) => acc + r.rating, 0)
      averageUserRating = sum / totalUserRatings
    }

    return {
      ...gameData,
      averageUserRating,
      totalUserRatings,
      fromIGDB: false // Mark that this came from database
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

  /**
   * Get game by IGDB ID with API fallback - if not in database, fetch from IGDB and optionally add
   */
  async getGameByIGDBIdWithFallback(
    igdbId: number,
    autoAdd: boolean = false
  ): Promise<GameWithCalculatedFields | null> {
    try {
      // First try to get from database
      const dbGame = await this.getGameByIGDBId(igdbId);
      if (dbGame) {
        return dbGame;
      }

      console.log(`🌐 Game ${igdbId} not in database, fetching from IGDB...`);

      // Fetch from IGDB API
      const igdbGame = await igdbService.getGameById(igdbId);
      if (!igdbGame) {
        return null;
      }

      // Transform to our format
      const transformedGame = igdbService.transformGame(igdbGame);

      if (autoAdd) {
        console.log(`💾 Auto-adding game ${igdbGame.name} to database...`);

        try {
          await enhancedSearchService.addMissingGamesToDatabase([igdbGame]);

          // Try to fetch the newly added game
          const newDbGame = await this.getGameByIGDBId(igdbId);
          if (newDbGame) {
            return newDbGame;
          }
        } catch (addError) {
          console.error('Failed to auto-add game to database:', addError);
        }
      }

      // Return as temporary result (not in database)
      return {
        ...transformedGame,
        averageUserRating: 0,
        totalUserRatings: 0,
        // Mark as temporary/external
        id: -igdbId // Negative ID to indicate it's not in our database
      } as GameWithCalculatedFields;

    } catch (error) {
      console.error('Error in getGameByIGDBIdWithFallback:', error);
      return null;
    }
  }

  /**
   * Search for games with enhanced fallback logic
   */
  async searchGamesEnhanced(
    query: string,
    options: {
      limit?: number;
      enableAPIFallback?: boolean;
      autoAddMissing?: boolean;
    } = {}
  ): Promise<GameWithCalculatedFields[]> {
    const { limit = 50, enableAPIFallback = true, autoAddMissing = false } = options; // Phase 1: Increased from 20

    try {
      const searchResponse = await enhancedSearchService.searchWithFallback(
        {
          query,
          enableAPIFallback,
          fallbackThreshold: 3
        },
        { limit }
      );

      // If we got IGDB results and auto-add is enabled, add missing games
      if (autoAddMissing && searchResponse.source !== 'database') {
        const igdbGames = await igdbService.searchGames(query, 5);
        if (igdbGames.length > 0) {
          try {
            await enhancedSearchService.addMissingGamesToDatabase(igdbGames);
            console.log(`💾 Auto-added ${igdbGames.length} missing games to database`);
          } catch (error) {
            console.error('Failed to auto-add missing games:', error);
          }
        }
      }

      // Convert GameSearchResult[] to GameWithCalculatedFields[]
      return searchResponse.games.map(game => ({
        id: game.id,
        igdb_id: game.igdb_id || 0,
        name: game.name || 'Unknown Game',
        summary: game.summary || game.description || null,
        release_date: game.release_date || null,
        cover_url: game.cover_url || null,
        genres: game.genres || [],
        platforms: game.platforms || [],
        screenshots: game.screenshots || [],
        videos: [],
        developer: game.developer || null,
        publisher: game.publisher || null,
        igdb_rating: game.igdb_rating || null,
        category: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        averageUserRating: game.avg_user_rating || 0,
        totalUserRatings: game.user_rating_count || 0,
        fromIGDB: false
      } as GameWithCalculatedFields));
    } catch (error) {
      console.error('Enhanced search failed:', error);
      return [];
    }
  }

  /**
   * Check if a query looks like a franchise search
   */
  private isFranchiseQuery(query: string): boolean {
    const franchiseKeywords = [
      'pokemon', 'mario', 'zelda', 'final fantasy', 'call of duty',
      'resident evil', 'metal gear', 'star fox', 'street fighter',
      'tekken', 'mortal kombat', 'grand theft auto', 'assassins creed'
    ];
    
    const lowerQuery = query.toLowerCase();
    return franchiseKeywords.some(franchise => 
      lowerQuery.includes(franchise) || franchise.includes(lowerQuery)
    );
  }

  /**
   * Convert GameSearchResult to GameWithCalculatedFields
   */
  private convertToCalculatedFields(game: any): GameWithCalculatedFields {
    return {
      id: game.id,
      igdb_id: game.igdb_id || 0,
      name: game.name || 'Unknown Game',
      summary: game.summary || game.description || null,
      release_date: game.release_date || null,
      cover_url: game.cover_url || null,
      genres: game.genres || [],
      platforms: game.platforms || [],
      screenshots: game.screenshots || [],
      videos: [],
      developer: game.developer || null,
      publisher: game.publisher || null,
      igdb_rating: game.igdb_rating || null,
      category: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      averageUserRating: game.avg_user_rating || 0,
      totalUserRatings: game.user_rating_count || 0,
      fromIGDB: false,
      // Preserve enhancement data
      ...(game._sisterGameBoost && { _sisterGameBoost: game._sisterGameBoost }),
      ...(game._flagshipStatus && { _flagshipStatus: game._flagshipStatus }),
      ...(game._priorityBoost && { _priorityBoost: game._priorityBoost })
    } as GameWithCalculatedFields;
  }
}

export const gameDataService = new GameDataService()

// Export types for backward compatibility
export type { GameWithCalculatedFields as IGDBGame }
