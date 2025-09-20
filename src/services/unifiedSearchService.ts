import { gameDataService } from './gameDataService';
import { gameDataServiceV2 } from './gameDataServiceV2';
import { supabase } from './supabase';
import { filterProtectedContent } from '../utils/contentProtectionFilter';
import { searchIntentService } from './searchIntentService';
import { gameImportService } from './gameImportService';
import type { GameWithCalculatedFields } from '../types/database';

interface SearchOptions {
  includeIGDB?: boolean;
  limit?: number;
  applyFilters?: boolean;
  includeUnverified?: boolean;
}

interface IGDBGame {
  id: number;
  name: string;
  cover?: {
    id: number;
    url: string;
  };
  first_release_date?: number;
  genres?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string }>;
  summary?: string;
  rating?: number;
  total_rating?: number;
  follows?: number;
  hypes?: number;
}

export class UnifiedSearchService {
  private igdbCache = new Map<string, { data: IGDBGame[]; timestamp: number }>();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private IGDB_TIMEOUT = 5000; // 5 second timeout for IGDB

  /**
   * Main search method that combines local and IGDB results
   */
  async search(query: string, options: SearchOptions = {}): Promise<GameWithCalculatedFields[]> {
    const {
      includeIGDB = true,
      limit = 50,
      applyFilters = true,
      includeUnverified = false
    } = options;

    if (!query || query.trim().length === 0) {
      return [];
    }

    try {
      // Generate query variants for better matching
      const queryVariants = searchIntentService.generateQueryVariants(query);
      console.log('Search variants for', query, ':', queryVariants);

      // Search with all variants
      const allSearchPromises: Promise<any>[] = [];

      // Search local database with all variants
      queryVariants.forEach(variant => {
        allSearchPromises.push(this.searchLocalDatabase(variant, limit));
      });

      // Search IGDB with original query and main variant
      if (includeIGDB) {
        allSearchPromises.push(this.searchIGDB(query, limit));
        if (queryVariants.length > 1 && queryVariants[1] !== query) {
          allSearchPromises.push(this.searchIGDB(queryVariants[1], Math.floor(limit / 2)));
        }
      }

      const allResults = await Promise.all(allSearchPromises);

      // Flatten and deduplicate results
      const allGames = allResults.flat();
      const deduplicatedResults = this.deduplicateResults(allGames);

      // Score and sort results based on query intent
      const scoredResults = deduplicatedResults.map(game => ({
        ...game,
        intentScore: searchIntentService.scoreResult(query, game.name)
      }));

      // Sort by intent score, then by rating
      scoredResults.sort((a, b) => {
        const scoreDiff = (b.intentScore || 0) - (a.intentScore || 0);
        if (scoreDiff !== 0) return scoreDiff;
        return (b.igdb_rating || b.total_rating || 0) - (a.igdb_rating || a.total_rating || 0);
      });

      // Queue IGDB-only games for import (non-blocking)
      this.queueMissingGamesForImport(scoredResults, query);

      // Apply content filtering if requested
      if (applyFilters && !includeUnverified) {
        return filterProtectedContent(scoredResults);
      }

      return scoredResults;
    } catch (error) {
      console.error('UnifiedSearchService error:', error);
      // Fallback to local results only if there's an error
      try {
        const localResults = await this.searchLocalDatabase(query, limit);
        return applyFilters ? filterProtectedContent(localResults) : localResults;
      } catch (localError) {
        console.error('Local search also failed:', localError);
        return [];
      }
    }
  }

  /**
   * Search local Supabase database
   */
  private async searchLocalDatabase(query: string, limit: number): Promise<GameWithCalculatedFields[]> {
    try {
      const results = await gameDataService.searchGames(query);
      return results.slice(0, limit);
    } catch (error) {
      console.error('Local database search error:', error);
      return [];
    }
  }

  /**
   * Search IGDB API via proxy
   */
  private async searchIGDB(query: string, limit: number): Promise<IGDBGame[]> {
    // Check cache first
    const cacheKey = `igdb:${query.toLowerCase()}:${limit}`;
    const cached = this.igdbCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log('Using cached IGDB results for:', query);
      return cached.data;
    }

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.IGDB_TIMEOUT);

      // Try Netlify function first (if available)
      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchTerm: query,
          limit: limit
        }),
        signal: controller.signal
      }).catch(() => {
        // Fallback to Supabase Edge Function
        return supabase.functions.invoke('igdb-proxy', {
          body: {
            endpoint: 'games',
            query: `search "${query}"; fields id,name,cover.*,first_release_date,genres.*,platforms.*,summary,rating,total_rating,follows,hypes; limit ${limit};`
          }
        });
      });

      clearTimeout(timeoutId);

      let igdbGames: IGDBGame[] = [];

      if ('data' in response) {
        // Supabase response format
        igdbGames = response.data || [];
      } else {
        // Netlify response format
        const data = await response.json();
        igdbGames = data.games || data || [];
      }

      // Cache the results
      this.igdbCache.set(cacheKey, {
        data: igdbGames,
        timestamp: Date.now()
      });

      return igdbGames;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn('IGDB search timed out for:', query);
      } else {
        console.error('IGDB search error:', error);
      }
      return [];
    }
  }

  /**
   * Deduplicate results based on IGDB ID or name similarity
   */
  private deduplicateResults(games: GameWithCalculatedFields[]): GameWithCalculatedFields[] {
    const seen = new Map<string, GameWithCalculatedFields>();

    games.forEach(game => {
      // Use IGDB ID as primary key
      const key = game.igdb_id ? `igdb:${game.igdb_id}` : `name:${game.name.toLowerCase()}`;

      if (!seen.has(key)) {
        seen.set(key, game);
      } else {
        // Keep the one with more data (usually local over IGDB)
        const existing = seen.get(key)!;
        if (game.id && !existing.id) {
          // Prefer local database entry
          seen.set(key, game);
        }
      }
    });

    return Array.from(seen.values());
  }


  /**
   * Transform IGDB game data to match local database schema
   */
  private transformIGDBGame(igdbGame: IGDBGame): GameWithCalculatedFields {
    // Transform cover URL to use larger image size
    let coverUrl = '';
    if (igdbGame.cover?.url) {
      coverUrl = igdbGame.cover.url.replace('t_thumb', 't_cover_big');
      if (!coverUrl.startsWith('https:')) {
        coverUrl = 'https:' + coverUrl;
      }
    }

    return {
      id: 0, // Temporary ID since it's not in database
      igdb_id: igdbGame.id,
      name: igdbGame.name,
      slug: igdbGame.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      cover_url: coverUrl,
      summary: igdbGame.summary,
      first_release_date: igdbGame.first_release_date,
      genres: igdbGame.genres?.map(g => g.name) || [],
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      igdb_rating: igdbGame.total_rating,
      total_rating: igdbGame.total_rating,
      rating_count: 0,
      follows: igdbGame.follows || 0,
      hypes: igdbGame.hypes || 0,

      // Calculated fields (defaults for IGDB results)
      averageRating: 0,
      gameReviewCount: 0,

      // Indicate this is from IGDB (not in local DB)
      data_source: 'igdb' as any
    };
  }

  /**
   * Queue games for import to local database (async, non-blocking)
   */
  private async queueMissingGamesForImport(games: GameWithCalculatedFields[], searchQuery: string): Promise<void> {
    if (!games || games.length === 0) return;

    try {
      // Find games that are from IGDB only (not in local database)
      const igdbOnlyGames = games.filter(game =>
        !game.id && game.igdb_id && (game as any).data_source === 'igdb'
      );

      if (igdbOnlyGames.length > 0) {
        // Transform to IGDB format for import service
        const gamesToImport = igdbOnlyGames.map(game => ({
          id: game.igdb_id!,
          name: game.name,
          summary: game.summary,
          cover: game.cover_url ? { id: 0, url: game.cover_url } : undefined,
          first_release_date: game.first_release_date,
          genres: game.genres?.map((g, i) => ({ id: i, name: g })),
          platforms: game.platforms?.map((p, i) => ({ id: i, name: p })),
          total_rating: game.total_rating,
          follows: game.follows,
          hypes: game.hypes
        }));

        // Queue for import (non-blocking)
        gameImportService.queueGamesForImport(gamesToImport, searchQuery)
          .catch(error => console.error('Failed to queue games for import:', error));

        console.log(`Queued ${gamesToImport.length} games for import from search "${searchQuery}"`);
      }
    } catch (error) {
      // Don't let import queue errors affect search
      console.error('Error queuing games for import:', error);
    }
  }
}

// Export singleton instance
export const unifiedSearchService = new UnifiedSearchService();