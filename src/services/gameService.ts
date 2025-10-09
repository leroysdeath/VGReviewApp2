/**
 * Unified Game Service
 * Consolidates gameDataService, gameDataServiceV2, and gameQueryService
 *
 * Features:
 * - CRUD operations with IGDB fallback
 * - Smart caching with LRU eviction
 * - Parallel query execution
 * - Incomplete data detection and refresh
 * - Query optimization with performance tracking
 */

import { supabase } from './supabase';
import { sanitizeSearchTerm } from '../utils/sqlSecurity';
import type { Game, GameWithCalculatedFields } from '../types/database';
import { igdbService } from './igdbService';
import { igdbServiceV2, IGDBGame } from './igdbServiceV2';
import { generateSlug, generateUniqueSlug } from '../utils/gameUrls';
import { searchService } from './searchService';
import { gameSearchService } from './gameSearchService';
import { gameSyncService } from './gameSyncService';
import { syncQueue } from '../utils/syncQueue';
import { prioritizeFlagshipTitles } from '../utils/sisterGameDetection';
import { deduplicateRequest, generateCacheKey } from '../utils/requestDeduplication';

const DEBUG_GAME_SERVICE = true;

export interface SearchFilters {
  genres?: string[];
  platforms?: string[];
  minRating?: number;
  releaseYear?: number;
}

interface GameWithRating extends Game {
  ratings?: Array<{
    rating: number;
  }>;
}

interface QueryPerformance {
  query: string;
  duration: number;
  resultCount: number;
  cached: boolean;
}

export type { Game, GameWithCalculatedFields };

class SearchCache {
  private cache = new Map<string, { results: GameWithCalculatedFields[], timestamp: number, hits: number }>();
  private readonly maxSize = 50;
  private readonly ttl = 5 * 60 * 1000;

  get(key: string): GameWithCalculatedFields[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.results;
  }

  set(key: string, results: GameWithCalculatedFields[]): void {
    if (this.cache.size >= this.maxSize) {
      const lru = Array.from(this.cache.entries())
        .sort((a, b) => a[1].hits - b[1].hits)[0];
      if (lru) this.cache.delete(lru[0]);
    }

    this.cache.set(key, {
      results,
      timestamp: Date.now(),
      hits: 0
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

class GameService {
  private queryCache = new SearchCache();
  private performanceLogs: QueryPerformance[] = [];

  async getGameById(id: number): Promise<GameWithCalculatedFields | null> {
    const cacheKey = generateCacheKey('gameService', 'getGameById', id);

    return deduplicateRequest(cacheKey, async () => {
      try {
        const { data, error } = await supabase
          .from('game')
          .select(`
            *,
            rating(rating)
          `)
          .eq('id', id)
          .single();

        if (error || !data) {
          console.error('Error fetching game by ID:', error);
          return null;
        }

        return this.transformGameWithRatings(data as GameWithRating);
      } catch (error) {
        console.error('Error in getGameById:', error);
        return null;
      }
    });
  }

  async getGameByIGDBId(igdbId: number): Promise<GameWithCalculatedFields | null> {
    const cacheKey = generateCacheKey('gameService', 'getGameByIGDBId', igdbId);

    return deduplicateRequest(cacheKey, async () => {
      try {
        if (DEBUG_GAME_SERVICE) console.log('🔍 getGameByIGDBId:', igdbId);

        let { data, error } = await supabase
          .from('game')
          .select(`
            *,
            rating(rating)
          `)
          .eq('igdb_id', igdbId)
          .single();

        if (DEBUG_GAME_SERVICE) console.log('🔍 First query (igdb_id):', { found: !!data, error });

        if ((error || !data) && igdbId) {
          if (DEBUG_GAME_SERVICE) console.log('🔍 Trying fallback with game_id field...');
          const { data: gameIdData, error: gameIdError } = await supabase
            .from('game')
            .select(`
              *,
              rating(rating)
            `)
            .eq('game_id', igdbId.toString())
            .single();

          if (DEBUG_GAME_SERVICE) console.log('🔍 Second query (game_id):', { found: !!gameIdData, error: gameIdError });

          if (!gameIdError && gameIdData) {
            data = gameIdData;
            error = null;
          }
        }

        // Only consider critical fields for needsUpdate - cover_url is optional (many games don't have covers in IGDB)
        const needsUpdate = data && (!data.summary || !data.developer || !data.publisher);

        if (error || !data || needsUpdate) {
          if (needsUpdate) {
          console.log(`Game with IGDB ID ${igdbId} has incomplete data, refreshing from IGDB API...`);
        } else {
          console.log(`Game with IGDB ID ${igdbId} not found in database, fetching from IGDB API...`);
        }

        try {
          const igdbGame = await igdbService.getGameById(igdbId);

          if (!igdbGame) {
            console.error('Game not found in IGDB either');
            return null;
          }

          const transformedGame = igdbService.transformGame(igdbGame);

          const gameData = {
            igdb_id: transformedGame.igdb_id,
            game_id: transformedGame.igdb_id.toString(),
            name: transformedGame.name,
            slug: data?.slug || generateSlug(transformedGame.name),
            summary: transformedGame.summary,
            description: transformedGame.description,
            release_date: transformedGame.first_release_date
              ? (typeof transformedGame.first_release_date === 'number'
                  ? new Date(transformedGame.first_release_date * 1000).toISOString().split('T')[0]
                  : new Date(transformedGame.first_release_date).toISOString().split('T')[0])
              : null,
            cover_url: transformedGame.cover_url,
            pic_url: transformedGame.cover_url,
            platforms: transformedGame.platforms || [],
            developer: transformedGame.developer,
            publisher: transformedGame.publisher,
            category: transformedGame.category || null,
            dlc_ids: transformedGame.dlcs || null,
            expansion_ids: transformedGame.expansions || null,
            updated_at: new Date().toISOString()
          };

          let upsertedGame, upsertError;

          if (needsUpdate) {
            const { data: updated, error: updateErr } = await supabase
              .from('game')
              .update(gameData)
              .eq('igdb_id', igdbId)
              .select(`
                *,
                rating(rating)
              `)
              .single();
            upsertedGame = updated;
            upsertError = updateErr;
          } else {
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
              .single();
            upsertedGame = inserted;
            upsertError = insertErr;
          }

          if (upsertError) {
            console.error(needsUpdate ? 'Error updating game in database:' : 'Error inserting game into database:', upsertError);
            return {
              ...transformedGame,
              averageUserRating: 0,
              totalUserRatings: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            } as GameWithCalculatedFields;
          }

          console.log(needsUpdate
            ? `✅ Game "${transformedGame.name}" updated in database with complete data`
            : `✅ Game "${transformedGame.name}" added to database`);

          return this.transformGameWithRatings(upsertedGame as GameWithRating);
        } catch (igdbError) {
          console.error('Error fetching from IGDB:', igdbError);
          if (data) {
            console.warn(`⚠️ IGDB fetch failed for ${igdbId}, falling back to existing database data`);
            return this.transformGameWithRatings(data as GameWithRating);
          }
          return null;
        }
      }

        return this.transformGameWithRatings(data as GameWithRating);
      } catch (error) {
        console.error('Error in getGameByIGDBId:', error);
        return null;
      }
    });
  }

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
    const cacheKey = generateCacheKey('gameService', 'getGameWithFullReviews', igdbId);

    return deduplicateRequest(cacheKey, async () => {
      try {
      if (DEBUG_GAME_SERVICE) console.log(`🔍 Looking up game with IGDB ID: ${igdbId}`);

      const { data: gameData, error: gameError } = await supabase
        .from('game')
        .select('*')
        .eq('igdb_id', igdbId)
        .single();

      if (gameError) {
        if (DEBUG_GAME_SERVICE) console.log(`Database error for IGDB ID ${igdbId}:`, gameError);
      }

      if (gameData && DEBUG_GAME_SERVICE) {
        console.log(`✅ Found game in database:`, {
          id: gameData.id,
          igdb_id: gameData.igdb_id,
          name: gameData.name,
          slug: gameData.slug
        });
      }

      // Only consider critical fields for needsUpdate - cover_url is optional (many games don't have covers in IGDB)
      const needsUpdate = gameData && (!gameData.summary || !gameData.developer || !gameData.publisher);

      if (gameError || !gameData || needsUpdate) {
        if (needsUpdate) {
          console.log(`Game with IGDB ID ${igdbId} has incomplete data, refreshing from IGDB API...`);
        } else {
          console.log(`Game with IGDB ID ${igdbId} not found in database, fetching from IGDB API...`);
        }

        try {
          const igdbGame = await igdbService.getGameById(igdbId);

          if (!igdbGame) {
            console.error('Game not found in IGDB either');
            return { game: null, reviews: [] };
          }

          const transformedGame = igdbService.transformGame(igdbGame);

          const preparedGameData = {
            igdb_id: transformedGame.igdb_id,
            game_id: transformedGame.igdb_id.toString(),
            name: transformedGame.name,
            slug: gameData?.slug || generateSlug(transformedGame.name),
            summary: transformedGame.summary,
            description: transformedGame.description,
            release_date: transformedGame.first_release_date
              ? (typeof transformedGame.first_release_date === 'number'
                  ? new Date(transformedGame.first_release_date * 1000).toISOString().split('T')[0]
                  : new Date(transformedGame.first_release_date).toISOString().split('T')[0])
              : null,
            cover_url: transformedGame.cover_url,
            pic_url: transformedGame.cover_url,
            screenshots: transformedGame.screenshots || null,
            genres: transformedGame.genres || [],
            platforms: transformedGame.platforms || [],
            developer: transformedGame.developer,
            publisher: transformedGame.publisher,
            igdb_rating: Math.round(transformedGame.igdb_rating || 0),
            category: transformedGame.category || null,
            alternative_names: transformedGame.alternative_names || null,
            franchise_name: transformedGame.franchise || null,
            collection_name: transformedGame.collection || null,
            dlc_ids: transformedGame.dlcs || null,
            expansion_ids: transformedGame.expansions || null,
            similar_game_ids: transformedGame.similar_games || null,
            updated_at: new Date().toISOString()
          };

          let upsertedGame, upsertError;

          if (needsUpdate) {
            const { data: updated, error: updateErr } = await supabase
              .from('game')
              .update(preparedGameData)
              .eq('igdb_id', igdbId)
              .select()
              .single();
            upsertedGame = updated;
            upsertError = updateErr;
          } else {
            const { data: inserted, error: insertErr } = await supabase
              .from('game')
              .insert({
                ...preparedGameData,
                created_at: new Date().toISOString()
              })
              .select()
              .single();
            upsertedGame = inserted;
            upsertError = insertErr;
          }

          if (upsertError) {
            console.error(needsUpdate ? 'Error updating game in database:' : 'Error inserting game into database:', upsertError);
            return {
              game: {
                ...transformedGame,
                averageUserRating: 0,
                totalUserRatings: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              } as GameWithCalculatedFields,
              reviews: []
            };
          }

          console.log(needsUpdate
            ? `✅ Game "${transformedGame.name}" updated in database with complete data`
            : `✅ Game "${transformedGame.name}" added to database`);

          return {
            game: {
              ...upsertedGame,
              averageUserRating: 0,
              totalUserRatings: 0
            } as GameWithCalculatedFields,
            reviews: []
          };
        } catch (igdbError) {
          console.error('Error fetching from IGDB:', igdbError);
          if (gameData) {
            console.warn(`⚠️ IGDB fetch failed for ${igdbId}, falling back to existing database data`);
          } else {
            return { game: null, reviews: [] };
          }
        }
      }

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
        .order('post_date_time', { ascending: false });

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError);
      }

      const reviews = reviewsData || [];

      const game = this.transformGameWithRatings({
        ...gameData,
        ratings: reviews.map((r: any) => ({ rating: r.rating }))
      } as GameWithRating);

      if (DEBUG_GAME_SERVICE) console.log(`✅ Loaded game "${game.name}" with ${reviews.length} reviews`);

        return { game, reviews };
      } catch (error) {
        console.error('Error in getGameWithFullReviews:', error);
        return { game: null, reviews: [] };
      }
    });
  }

  async getGameBySlug(slug: string): Promise<GameWithCalculatedFields | null> {
    const cacheKey = generateCacheKey('gameService', 'getGameBySlug', slug);
    return deduplicateRequest(cacheKey, async () => {
      try {
        if (DEBUG_GAME_SERVICE) console.log('🔍 getGameBySlug:', slug);

        const { data, error } = await supabase
          .from('game')
          .select(`
            *,
            rating(rating)
          `)
          .eq('slug', slug)
          .single();

        if (error || !data) {
          console.error('Game not found by slug:', slug, error);
          return null;
        }

        if (DEBUG_GAME_SERVICE) console.log('✅ Game found by slug:', data.name);
        return this.transformGameWithRatings(data as GameWithRating);
      } catch (error) {
        console.error('Error in getGameBySlug:', error);
        return null;
      }
    });
  }

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
    const cacheKey = generateCacheKey('gameService', 'getGameWithFullReviewsBySlug', slug);
    return deduplicateRequest(cacheKey, async () => {
      try {
        const { data: gameData, error: gameError } = await supabase
          .from('game')
          .select('*')
          .eq('slug', slug)
          .single();

        if (gameError || !gameData) {
          console.log(`Game with slug ${slug} not found in database`);
          return { game: null, reviews: [] };
        }

        // Only consider critical fields for needsUpdate - cover_url is optional (many games don't have covers in IGDB)
        const needsUpdate = gameData && (!gameData.summary || !gameData.developer || !gameData.publisher);

        if (needsUpdate && gameData.igdb_id) {
          console.log(`Game "${gameData.name}" (slug: ${slug}) has incomplete data, refreshing from IGDB...`);
          return await this.getGameWithFullReviews(gameData.igdb_id);
        }

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
          .order('post_date_time', { ascending: false });

        if (reviewsError) {
          console.error('Error fetching reviews:', reviewsError);
        }

        const reviews = reviewsData || [];

        const game = this.transformGameWithRatings({
          ...gameData,
          rating: reviews.map((r: any) => ({ rating: r.rating }))
        } as GameWithRating);

        return { game, reviews };
      } catch (error) {
        console.error('Error in getGameWithFullReviewsBySlug:', error);
        return { game: null, reviews: [] };
      }
    });
  }

  async searchGames(query: string, filters?: SearchFilters, maxResults: number = 200): Promise<GameWithCalculatedFields[]> {
    const sanitizedQuery = sanitizeSearchTerm(query);
    if (!sanitizedQuery) return [];

    const cacheKey = this.generateCacheKey(sanitizedQuery, filters);
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      if (DEBUG_GAME_SERVICE) console.log(`🚀 Cache hit for "${query}" (${cached.length} results)`);
      return cached;
    }

    try {
      const startTime = Date.now();

      const dbPromise = this.searchGamesExact(sanitizedQuery, filters, maxResults);

      const isCommonSearch = this.isCommonSearch(query);
      const igdbPromise = isCommonSearch
        ? Promise.resolve(null)
        : this.getIGDBResultsConditionally(query);

      const [dbResults, igdbGames] = await Promise.allSettled([dbPromise, igdbPromise]);

      const dbGames = dbResults.status === 'fulfilled' ? dbResults.value : [];
      const igdbResults = igdbGames.status === 'fulfilled' && igdbGames.value ? igdbGames.value : null;

      if (DEBUG_GAME_SERVICE) {
        const elapsed = Date.now() - startTime;
        console.log(`⚡ Parallel search completed in ${elapsed}ms`);
        console.log(`📊 Database: ${dbGames.length} results`);
        console.log(`🌐 IGDB: ${igdbResults ? igdbResults.length : 'skipped'} results`);
      }

      const shouldUseIGDB = igdbResults &&
                           igdbResults.length > 0 &&
                           this.shouldQueryIGDB(dbGames, query, filters);

      if (shouldUseIGDB && igdbResults) {
        const mergedResults = await this.smartMerge(dbGames, igdbResults, query);
        this.updateDatabaseAsync(igdbResults, query);
        this.queryCache.set(cacheKey, mergedResults);
        return mergedResults;
      }

      if (DEBUG_GAME_SERVICE) console.log(`📋 Using database results only (${dbGames.length} games)`);

      this.queryCache.set(cacheKey, dbGames);
      return dbGames;

    } catch (error) {
      console.error('Error in searchGames:', error);
      return [];
    }
  }

  async getPopularGames(limit: number = 20): Promise<GameWithCalculatedFields[]> {
    const cacheKey = generateCacheKey('gameService', 'getPopularGames', limit);
    return deduplicateRequest(cacheKey, async () => {
      try {
        const { data, error } = await supabase
          .from('game')
          .select(`
            *,
            rating(rating)
          `)
          .limit(limit * 3);

        if (error) throw error;

        const gamesWithRatings = (data || []).map(game =>
          this.transformGameWithRatings(game as GameWithRating)
        );

        return gamesWithRatings
          .filter(g => g.totalUserRatings > 0)
          .sort((a, b) => {
            const countDiff = b.totalUserRatings - a.totalUserRatings;
            if (countDiff !== 0) return countDiff;
            return b.averageUserRating - a.averageUserRating;
          })
          .slice(0, limit);
      } catch (error) {
        console.error('Error in getPopularGames:', error);
        return [];
      }
    });
  }

  async searchGamesExact(query: string, filters?: SearchFilters, limit: number = 200): Promise<GameWithCalculatedFields[]> {
    const cacheKey = generateCacheKey('gameService', 'searchGamesExact', query, JSON.stringify(filters), limit);
    return deduplicateRequest(cacheKey, async () => {
      try {
        let queryBuilder = supabase
          .from('game')
          .select(`
            *,
            rating(rating)
          `)
          .ilike('name', `%${query}%`);

        if (filters?.genres?.length) {
          queryBuilder = queryBuilder.contains('genres', filters.genres);
        }

        if (filters?.platforms?.length) {
          queryBuilder = queryBuilder.contains('platforms', filters.platforms);
        }

        if (filters?.releaseYear) {
          const yearStart = `${filters.releaseYear}-01-01`;
          const yearEnd = `${filters.releaseYear}-12-31`;
          queryBuilder = queryBuilder
            .gte('release_date', yearStart)
            .lte('release_date', yearEnd);
        }

        queryBuilder = queryBuilder.limit(limit);

        const { data, error } = await queryBuilder;

        if (error) throw error;

        let results = (data || []).map(game =>
          this.transformGameWithRatings(game as GameWithRating)
        );

        if (filters?.minRating !== undefined) {
          results = results.filter(g => g.averageUserRating >= filters.minRating!);
        }

        return results;
      } catch (error) {
        console.error('Error in searchGamesExact:', error);
        return [];
      }
    });
  }

  private transformGameWithRatings(game: GameWithRating): GameWithCalculatedFields {
    const ratings = game.ratings || [];
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    const { ratings: _, ...gameWithoutRatings } = game;

    return {
      ...gameWithoutRatings,
      averageUserRating: Math.round(averageRating * 10) / 10,
      totalUserRatings: totalRatings
    };
  }

  private generateCacheKey(query: string, filters?: SearchFilters): string {
    const parts = [query.toLowerCase()];
    if (filters) {
      if (filters.genres?.length) parts.push(`g:${filters.genres.sort().join(',')}`);
      if (filters.platforms?.length) parts.push(`p:${filters.platforms.sort().join(',')}`);
      if (filters.minRating) parts.push(`r:${filters.minRating}`);
      if (filters.releaseYear) parts.push(`y:${filters.releaseYear}`);
    }
    return parts.join('|');
  }

  private shouldQueryIGDB(dbResults: GameWithCalculatedFields[], query: string, filters?: SearchFilters): boolean {
    if (dbResults.length < 3) {
      if (DEBUG_GAME_SERVICE) console.log(`🔍 Low DB results (${dbResults.length}) - querying IGDB`);
      return true;
    }

    if (this.isFranchiseQuery(query)) {
      if (dbResults.length < 10) {
        if (DEBUG_GAME_SERVICE) console.log(`🎮 Franchise query "${query}" with ${dbResults.length} results - supplementing with IGDB`);
        return true;
      }

      const hasStaleResults = dbResults.some(game =>
        this.isStaleGame(game, 7 * 24 * 60 * 60 * 1000)
      );

      if (hasStaleResults) {
        if (DEBUG_GAME_SERVICE) console.log(`🕐 Stale database results detected - refreshing with IGDB`);
        return true;
      }

      if (dbResults.length >= 10 && Math.random() < 0.1) {
        if (DEBUG_GAME_SERVICE) console.log(`🎲 Random refresh for franchise search (10% chance)`);
        return true;
      }
    }

    if (dbResults.length < 5) {
      if (DEBUG_GAME_SERVICE) console.log(`🎯 Specific search with ${dbResults.length} results - querying IGDB`);
      return true;
    }

    return false;
  }

  private isFranchiseQuery(query: string): boolean {
    const term = query.toLowerCase();
    const franchises = [
      'mario', 'super mario', 'zelda', 'pokemon', 'final fantasy', 'ff',
      'call of duty', 'cod', 'assassin', 'grand theft auto', 'gta',
      'mega man', 'megaman', 'sonic', 'halo', 'god of war',
      'uncharted', 'last of us', 'resident evil', 'street fighter', 'sf',
      'mortal kombat', 'mk', 'tekken', 'elder scrolls', 'fallout',
      'witcher', 'dark souls', 'metal gear', 'silent hill'
    ];

    return franchises.some(franchise => term.includes(franchise));
  }

  private isCommonSearch(query: string): boolean {
    const term = query.toLowerCase().trim();
    const commonSearches = [
      'mario', 'pokemon', 'zelda', 'final fantasy',
      'sonic', 'mega man', 'street fighter', 'resident evil'
    ];
    return commonSearches.includes(term);
  }

  private async getIGDBResultsConditionally(query: string): Promise<IGDBGame[] | null> {
    try {
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 1000);
      });

      const igdbPromise = this.getIGDBResults(query);

      const result = await Promise.race([igdbPromise, timeoutPromise]);
      return result;
    } catch (error) {
      console.error('IGDB query failed/timed out:', error);
      return null;
    }
  }

  private async getIGDBResults(query: string): Promise<IGDBGame[]> {
    try {
      if (this.isFranchiseQuery(query)) {
        return await igdbServiceV2.searchGames(query, 40);
      } else {
        return await igdbServiceV2.searchGames(query, 30);
      }
    } catch (error) {
      console.error('Enhanced IGDB search failed:', error);
      throw error;
    }
  }

  private async smartMerge(
    dbResults: GameWithCalculatedFields[],
    igdbGames: IGDBGame[],
    query: string
  ): Promise<GameWithCalculatedFields[]> {
    const igdbConverted = this.convertIGDBToLocal(igdbGames);

    const existingIGDBIds = new Set<number>();
    const existingNames = new Set<string>();

    for (const game of dbResults) {
      if (game.igdb_id) {
        existingIGDBIds.add(game.igdb_id);
      }
      existingNames.add(this.normalizeGameName(game.name));
    }

    const newIGDBGames = igdbConverted.filter(game => {
      if (game.igdb_id && existingIGDBIds.has(game.igdb_id)) {
        return false;
      }

      const normalizedName = this.normalizeGameName(game.name);
      if (existingNames.has(normalizedName)) {
        return false;
      }

      return true;
    });

    if (DEBUG_GAME_SERVICE) console.log(`🔄 Merge: ${dbResults.length} DB + ${newIGDBGames.length} new IGDB = ${dbResults.length + newIGDBGames.length} total`);

    const combined = [...dbResults, ...newIGDBGames];
    return this.sortByRelevance(combined, query);
  }

  private normalizeGameName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isStaleGame(game: GameWithCalculatedFields, maxAgeMs: number): boolean {
    if (!game.updated_at) return true;

    const gameAge = Date.now() - new Date(game.updated_at).getTime();
    return gameAge > maxAgeMs;
  }

  private convertIGDBToLocal(igdbGames: IGDBGame[]): GameWithCalculatedFields[] {
    return igdbGames.map(game => ({
      id: -(game.id || 0),
      igdb_id: game.id || 0,
      name: game.name || 'Unknown Game',
      slug: generateSlug(game.name || 'unknown-game'),
      summary: game.summary || '',
      release_date: game.first_release_date
        ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
        : null,
      cover_url: game.cover?.url ? this.transformImageUrl(game.cover.url) : null,
      genres: game.genres?.map(g => g.name) || [],
      platforms: game.platforms?.map(p => p.name) || [],
      developer: game.involved_companies?.find(c => c.developer)?.company?.name || '',
      publisher: game.involved_companies?.find(c => c.publisher)?.company?.name || '',
      igdb_rating: Math.round(game.rating || 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      averageUserRating: 0,
      totalUserRatings: 0,
      _isFromIGDB: true
    } as GameWithCalculatedFields & { _isFromIGDB: boolean }));
  }

  private transformImageUrl(url: string): string {
    if (!url) return '';
    return url.replace('t_thumb', 't_1080p').replace('//', 'https://');
  }

  private sortByRelevance(games: GameWithCalculatedFields[], query: string): GameWithCalculatedFields[] {
    const queryLower = query.toLowerCase();

    return games.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, queryLower);
      const scoreB = this.calculateRelevanceScore(b, queryLower);

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      const aIsFromDB = !(a as any)._isFromIGDB;
      const bIsFromDB = !(b as any)._isFromIGDB;

      if (aIsFromDB && !bIsFromDB) return -1;
      if (!aIsFromDB && bIsFromDB) return 1;

      return a.name.localeCompare(b.name);
    });
  }

  private calculateRelevanceScore(game: GameWithCalculatedFields, query: string): number {
    const name = game.name.toLowerCase();
    let score = 0;

    if (name === query) {
      score += 100;
    } else if (name.startsWith(query)) {
      score += 80;
    } else if (name.includes(query)) {
      score += 60;
    } else {
      const queryWords = query.split(/\s+/);
      const nameWords = name.split(/\s+/);
      const matchedWords = queryWords.filter(qw =>
        nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
      );
      score += (matchedWords.length / queryWords.length) * 40;
    }

    const totalRating = (game as any).total_rating;
    if (totalRating) {
      if (totalRating >= 90) {
        score += 45 + (totalRating - 90) * 0.5;
      } else if (totalRating >= 80) {
        score += 35 + (totalRating - 80);
      } else if (totalRating >= 70) {
        score += 20 + (totalRating - 70) * 1.5;
      } else {
        score += totalRating * 0.285;
      }
    } else if (game.igdb_rating > 0) {
      const qualityScore = Math.pow(game.igdb_rating / 100, 1.5) * 25;
      score += qualityScore;
    }

    const ratingCount = (game as any).rating_count || 0;

    if (ratingCount >= 1000) {
      score += 35 + Math.min((ratingCount - 1000) / 100, 10);
    } else if (ratingCount >= 500) {
      score += 28 + (ratingCount - 500) / 71.4;
    } else if (ratingCount >= 100) {
      score += 20 + (ratingCount - 100) / 50;
    } else if (ratingCount >= 20) {
      score += 10 + (ratingCount - 20) / 8;
    } else if (ratingCount > 0) {
      score += ratingCount / 2;
    }

    return score;
  }

  private async updateDatabaseAsync(igdbGames: IGDBGame[], query: string): Promise<void> {
    setTimeout(async () => {
      try {
        for (const game of igdbGames.slice(0, 5)) {
          if (!game.id) continue;

          const { data: existing } = await supabase
            .from('game')
            .select('id')
            .eq('igdb_id', game.id)
            .single();

          if (existing) continue;

          const gameData = {
            igdb_id: game.id,
            game_id: game.id.toString(),
            name: game.name || 'Unknown Game',
            slug: await generateUniqueSlug(game.name || 'unknown-game'),
            summary: game.summary || '',
            release_date: game.first_release_date
              ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
              : null,
            cover_url: game.cover?.url ? this.transformImageUrl(game.cover.url) : null,
            genres: game.genres?.map(g => g.name) || [],
            platforms: game.platforms?.map(p => p.name) || [],
            developer: game.involved_companies?.find(c => c.developer)?.company?.name || '',
            publisher: game.involved_companies?.find(c => c.publisher)?.company?.name || '',
            igdb_rating: Math.round(game.rating || 0),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          await supabase.from('game').insert(gameData);
        }
      } catch (error) {
        console.error('Background database update failed:', error);
      }
    }, 0);
  }

  clearCache(): void {
    this.queryCache.clear();
  }
}

export const gameService = new GameService();
export { gameService as gameDataService };
export { GameService };