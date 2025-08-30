import { gameSearchService, type SearchFilters, type GameSearchResult, type SearchResponse } from './gameSearchService';
import { igdbService, type IGDBGame } from './igdbService';
import { supabase } from './supabase';
import { filterProtectedContent } from '../utils/contentProtectionFilter';

interface EnhancedSearchOptions extends SearchFilters {
  enableAPIFallback?: boolean;
  fallbackThreshold?: number; // Minimum results needed before fallback
  maxAPIResults?: number;
}

class EnhancedSearchService {
  /**
   * Search with API fallback - tries database first, then IGDB if results are insufficient
   */
  async searchWithFallback(
    filters: EnhancedSearchOptions = {},
    pagination: { limit?: number; offset?: number } = {}
  ): Promise<SearchResponse & { source: 'database' | 'igdb' | 'mixed' }> {
    const { 
      enableAPIFallback = true, 
      fallbackThreshold = 1, // Only fallback if DB has 0 results
      maxAPIResults = 20,
      ...searchFilters 
    } = filters;
    
    const { limit = 20, offset = 0 } = pagination;

    try {
      console.log('🔍 Enhanced search starting:', { 
        query: searchFilters.query, 
        enableAPIFallback, 
        fallbackThreshold 
      });

      // Step 1: Try database search first
      const dbResults = await gameSearchService.searchGames(searchFilters, pagination);
      
      console.log('📊 Database search results:', {
        count: dbResults.games.length,
        totalCount: dbResults.totalCount,
        hasMore: dbResults.hasMore
      });

      // If we have enough results or fallback is disabled, return database results
      if (!enableAPIFallback || dbResults.games.length >= fallbackThreshold) {
        return {
          ...dbResults,
          source: 'database'
        };
      }

      // Step 2: Try IGDB API fallback
      if (searchFilters.query && searchFilters.query.trim()) {
        console.log('🌐 Fallback to IGDB API search...');
        
        const igdbResults = await this.searchIGDBWithTransform(
          searchFilters.query,
          maxAPIResults
        );

        if (igdbResults.length > 0) {
          // Combine results, prioritizing database results
          const combinedGames = [...dbResults.games];
          const dbGameIds = new Set(dbResults.games.map(g => g.igdb_id).filter(Boolean));
          
          // Add IGDB results that aren't already in database results
          for (const igdbGame of igdbResults) {
            if (!dbGameIds.has(igdbGame.igdb_id) && combinedGames.length < limit) {
              combinedGames.push(igdbGame);
            }
          }

          console.log('🔄 Combined results:', {
            database: dbResults.games.length,
            igdb: igdbResults.length,
            combined: combinedGames.length
          });

          return {
            games: combinedGames,
            totalCount: Math.max(dbResults.totalCount, combinedGames.length),
            hasMore: combinedGames.length >= limit || dbResults.hasMore,
            source: dbResults.games.length > 0 ? 'mixed' : 'igdb'
          };
        }
      }

      // If API fallback didn't help, return original database results
      return {
        ...dbResults,
        source: 'database'
      };

    } catch (error) {
      console.error('Enhanced search failed:', error);
      
      // Fallback to just database results on error
      try {
        const dbResults = await gameSearchService.searchGames(searchFilters, pagination);
        return {
          ...dbResults,
          source: 'database'
        };
      } catch (dbError) {
        console.error('Database fallback also failed:', dbError);
        return {
          games: [],
          totalCount: 0,
          hasMore: false,
          source: 'database'
        };
      }
    }
  }

  /**
   * Search IGDB and transform results to match database format
   */
  private async searchIGDBWithTransform(query: string, limit: number): Promise<GameSearchResult[]> {
    try {
      const igdbGames = await igdbService.searchGames(query, limit);
      
      // Transform and filter IGDB results
      const transformedGames = igdbGames.map(game => igdbService.transformGame(game));
      const filteredGames = filterProtectedContent(transformedGames);
      
      // Convert to GameSearchResult format
      const searchResults: GameSearchResult[] = filteredGames.map(game => ({
        id: game.id,
        igdb_id: game.igdb_id,
        name: game.name,
        description: game.description || game.summary,
        summary: game.summary,
        release_date: game.release_date,
        cover_url: game.cover_url,
        developer: game.developer,
        publisher: game.publisher,
        genre: game.genre,
        genres: game.genres || (game.genre ? [game.genre] : []),
        platforms: game.platforms || [],
        igdb_rating: game.igdb_rating || game.rating,
        metacritic_score: undefined, // IGDB doesn't provide this directly
        avg_user_rating: undefined, // No user ratings from IGDB
        user_rating_count: 0, // No user ratings from IGDB
        screenshots: game.screenshots
      }));

      return searchResults;
    } catch (error) {
      console.error('IGDB search failed:', error);
      return [];
    }
  }

  /**
   * Add IGDB games to database when they're found but missing
   */
  async addMissingGamesToDatabase(igdbGames: IGDBGame[]): Promise<void> {
    if (igdbGames.length === 0) return;

    try {
      console.log('💾 Adding missing games to database:', igdbGames.length);

      for (const igdbGame of igdbGames) {
        try {
          // Check if game already exists
          const { data: existingGame } = await supabase
            .from('game')
            .select('id')
            .eq('igdb_id', igdbGame.id)
            .single();

          if (existingGame) {
            console.log(`⏭️  Game already exists: ${igdbGame.name}`);
            continue;
          }

          // Transform and insert game
          const gameData = {
            game_id: igdbGame.id.toString(),
            igdb_id: igdbGame.id,
            name: igdbGame.name,
            slug: igdbGame.name.toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-|-$/g, ''),
            summary: igdbGame.summary || null,
            description: igdbGame.summary || null,
            release_date: igdbGame.first_release_date 
              ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
              : null,
            igdb_rating: igdbGame.rating ? Math.round(parseFloat(igdbGame.rating.toString())) : null,
            cover_url: igdbGame.cover?.url 
              ? igdbGame.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') 
              : null,
            igdb_link: `https://www.igdb.com/games/${igdbGame.id}`,
            genre: igdbGame.genres?.[0]?.name || null,
            genres: igdbGame.genres?.map(g => g.name) || null,
            developer: igdbGame.involved_companies?.find(c => c.developer)?.company?.name || 
                       igdbGame.involved_companies?.[0]?.company?.name || null,
            publisher: igdbGame.involved_companies?.find(c => c.publisher)?.company?.name || 
                       igdbGame.involved_companies?.[0]?.company?.name || null,
            platforms: igdbGame.platforms?.map(p => p.name) || null,
            is_verified: false,
            view_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('game')
            .insert([gameData]);

          if (insertError) {
            console.error(`❌ Failed to insert ${igdbGame.name}:`, insertError.message);
          } else {
            console.log(`✅ Added ${igdbGame.name} to database`);
          }

          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (gameError) {
          console.error(`❌ Error processing ${igdbGame.name}:`, gameError);
        }
      }

    } catch (error) {
      console.error('❌ Failed to add games to database:', error);
    }
  }

  /**
   * Smart search that learns from missing results
   */
  async smartSearch(
    filters: EnhancedSearchOptions = {},
    pagination: { limit?: number; offset?: number } = {},
    autoAddMissing: boolean = false
  ): Promise<SearchResponse & { source: 'database' | 'igdb' | 'mixed'; added?: number }> {
    const result = await this.searchWithFallback(filters, pagination);
    let addedCount = 0;

    // If we found IGDB results and auto-add is enabled, add them to database
    if (autoAddMissing && result.source !== 'database' && filters.query) {
      try {
        const igdbGames = await igdbService.searchGames(filters.query, 10);
        const filteredIGDBGames = igdbGames.filter(game => {
          const transformed = igdbService.transformGame(game);
          return !filterProtectedContent([transformed]).length === 0; // Only add if not filtered
        });

        if (filteredIGDBGames.length > 0) {
          await this.addMissingGamesToDatabase(filteredIGDBGames);
          addedCount = filteredIGDBGames.length;
        }
      } catch (error) {
        console.error('Failed to auto-add missing games:', error);
      }
    }

    return {
      ...result,
      added: addedCount
    };
  }

  /**
   * Get popular games with API fallback
   */
  async getPopularGames(limit: number = 20): Promise<GameSearchResult[]> {
    try {
      // Try database first
      const dbResults = await gameSearchService.getPopularGames(limit);
      
      if (dbResults.length >= Math.min(limit, 10)) {
        return dbResults;
      }

      // Fallback to IGDB for popular games
      const popularQueries = ['final fantasy', 'zelda', 'mario', 'pokemon', 'call of duty'];
      const igdbResults: GameSearchResult[] = [];
      
      for (const query of popularQueries) {
        if (igdbResults.length >= limit) break;
        
        const results = await this.searchIGDBWithTransform(query, 5);
        igdbResults.push(...results.slice(0, limit - igdbResults.length));
      }

      // Combine and deduplicate
      const combined = [...dbResults];
      const existingIds = new Set(dbResults.map(g => g.igdb_id).filter(Boolean));
      
      for (const game of igdbResults) {
        if (!existingIds.has(game.igdb_id) && combined.length < limit) {
          combined.push(game);
        }
      }

      return combined;
    } catch (error) {
      console.error('Get popular games failed:', error);
      return [];
    }
  }

  /**
   * Test specific game search (useful for debugging MMX2/MMX3 issues)
   */
  async testGameSearch(gameName: string): Promise<{
    database: GameSearchResult[];
    igdb: GameSearchResult[];
    filtered: boolean;
  }> {
    try {
      // Test database search
      const dbResults = await gameSearchService.searchGames({ query: gameName }, { limit: 10 });
      
      // Test IGDB search
      const igdbRaw = await igdbService.searchGames(gameName, 10);
      const igdbTransformed = igdbRaw.map(game => igdbService.transformGame(game));
      const igdbFiltered = filterProtectedContent(igdbTransformed);
      const igdbResults = await this.searchIGDBWithTransform(gameName, 10);
      
      console.log(`🧪 Test search for "${gameName}":`, {
        database: dbResults.games.length,
        igdb_raw: igdbRaw.length,
        igdb_filtered: igdbFiltered.length,
        igdb_final: igdbResults.length
      });

      return {
        database: dbResults.games,
        igdb: igdbResults,
        filtered: igdbRaw.length > igdbResults.length
      };
    } catch (error) {
      console.error('Test search failed:', error);
      return { database: [], igdb: [], filtered: false };
    }
  }
}

export const enhancedSearchService = new EnhancedSearchService();
export type { EnhancedSearchOptions };