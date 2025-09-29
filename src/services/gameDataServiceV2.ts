/**
 * GameDataService V2 - Layer 2 Implementation
 * Fixes the database threshold issue that prevents IGDB polling
 */

// Debug flag to control console logging
const DEBUG_GAME_DATA = true; // INVESTIGATION MODE - Enable detailed logging

import { supabase } from './supabase';
import { sanitizeSearchTerm } from '../utils/sqlSecurity';
import type { Game, GameWithCalculatedFields } from '../types/database';
import { igdbServiceV2, IGDBGame } from './igdbServiceV2';
import { generateSlug, generateUniqueSlug } from '../utils/gameUrls';

interface SearchFilters {
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

/**
 * Enhanced Game Data Service V2 - Fixes Database Threshold Issue
 */
/**
 * OPTIMIZED: Smart cache with size limits and LRU eviction
 */
class SearchCache {
  private cache = new Map<string, { results: GameWithCalculatedFields[], timestamp: number, hits: number }>();
  private readonly maxSize = 50; // Max cached searches
  private readonly ttl = 5 * 60 * 1000; // 5 minutes

  get(key: string): GameWithCalculatedFields[] | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count for LRU
    entry.hits++;
    return entry.results;
  }

  set(key: string, results: GameWithCalculatedFields[]): void {
    // Evict least recently used if at capacity
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

export class GameDataServiceV2 {
  private queryCache = new SearchCache();
  
  /**
   * Main search function with intelligent IGDB supplementation
   */
  async searchGames(query: string, filters?: SearchFilters, maxResults: number = 200): Promise<GameWithCalculatedFields[]> {
    const sanitizedQuery = sanitizeSearchTerm(query);
    if (!sanitizedQuery) return [];
    
    // OPTIMIZED: Smart cache check
    const cacheKey = this.generateCacheKey(sanitizedQuery, filters);
    const cached = this.queryCache.get(cacheKey);
    if (cached) {
      if (DEBUG_GAME_DATA) console.log(`🚀 Cache hit for "${query}" (${cached.length} results)`);
      return cached;
    }
    
    try {
      // OPTIMIZED: Run database and IGDB queries in parallel
      const startTime = Date.now();

      // Start both queries simultaneously
      const dbPromise = this.searchGamesExact(sanitizedQuery, filters, maxResults);

      // Conditionally start IGDB query based on common searches
      const isCommonSearch = this.isCommonSearch(query);
      const igdbPromise = isCommonSearch
        ? Promise.resolve(null) // Skip IGDB for common searches with good DB coverage
        : this.getIGDBResultsConditionally(query);

      // Wait for both to complete
      const [dbResults, igdbGames] = await Promise.allSettled([dbPromise, igdbPromise]);

      // Extract results from settled promises
      const dbGames = dbResults.status === 'fulfilled' ? dbResults.value : [];
      const igdbResults = igdbGames.status === 'fulfilled' && igdbGames.value ? igdbGames.value : null;

      if (DEBUG_GAME_DATA) {
        const elapsed = Date.now() - startTime;
        console.log(`⚡ Parallel search completed in ${elapsed}ms`);
        console.log(`📊 Database: ${dbGames.length} results`);
        console.log(`🌐 IGDB: ${igdbResults ? igdbResults.length : 'skipped'} results`);
      }

      // Decide if we should use IGDB results
      const shouldUseIGDB = igdbResults &&
                           igdbResults.length > 0 &&
                           this.shouldQueryIGDB(dbGames, query, filters);

      if (shouldUseIGDB && igdbResults) {
        // Smart merge strategy
        const mergedResults = await this.smartMerge(dbGames, igdbResults, query);

        // Update database asynchronously (non-blocking)
        this.updateDatabaseAsync(igdbResults, query);

        // Cache merged results
        this.queryCache.set(cacheKey, mergedResults);

        return mergedResults;
      }

      // Use database results only
      if (DEBUG_GAME_DATA) console.log(`📋 Using database results only (${dbGames.length} games)`);

      // Cache database results
      this.queryCache.set(cacheKey, dbGames);

      return dbGames;
      
    } catch (error) {
      console.error('Error in searchGames:', error);
      return [];
    }
  }
  
  /**
   * Intelligent decision on when to query IGDB
   */
  private shouldQueryIGDB(dbResults: GameWithCalculatedFields[], query: string, filters?: SearchFilters): boolean {
    // Always query IGDB if we have very few results
    if (dbResults.length < 3) {
      if (DEBUG_GAME_DATA) console.log(`🔍 Low DB results (${dbResults.length}) - querying IGDB`);
      return true;
    }
    
    // Check if this is a franchise search that might benefit from fresh data
    if (this.isFranchiseQuery(query)) {
      // For franchise searches, supplement if we have < 10 results
      if (dbResults.length < 10) {
        if (DEBUG_GAME_DATA) console.log(`🎮 Franchise query "${query}" with ${dbResults.length} results - supplementing with IGDB`);
        return true;
      }
      
      // Also check if DB results are stale (older than 7 days)
      const hasStaleResults = dbResults.some(game => 
        this.isStaleGame(game, 7 * 24 * 60 * 60 * 1000) // 7 days
      );
      
      if (hasStaleResults) {
        if (DEBUG_GAME_DATA) console.log(`🕐 Stale database results detected - refreshing with IGDB`);
        return true;
      }
      
      // For franchise searches with good coverage, occasionally refresh (10% chance)
      if (dbResults.length >= 10 && Math.random() < 0.1) {
        if (DEBUG_GAME_DATA) console.log(`🎲 Random refresh for franchise search (10% chance)`);
        return true;
      }
    }
    
    // For specific searches, be more conservative
    if (dbResults.length < 5) {
      if (DEBUG_GAME_DATA) console.log(`🎯 Specific search with ${dbResults.length} results - querying IGDB`);
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate cache key including filters
   */
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

  /**
   * OPTIMIZED: Single-pass filter application
   */
  private applyFiltersOptimized(games: any[], filters?: SearchFilters): any[] {
    if (!filters || Object.keys(filters).length === 0) {
      return games;
    }

    // Single pass through the array
    return games.filter(game => {
      // All conditions must pass
      if (filters.genres?.length &&
          (!game.genres || !game.genres.some((g: string) => filters.genres!.includes(g)))) {
        return false;
      }

      if (filters.platforms?.length &&
          (!game.platforms || !game.platforms.some((p: string) => filters.platforms!.includes(p)))) {
        return false;
      }

      if (filters.minRating !== undefined &&
          (!game.rating || game.rating < filters.minRating)) {
        return false;
      }

      if (filters.releaseYear &&
          (!game.release_date || !game.release_date.startsWith(filters.releaseYear.toString()))) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if this is a franchise search
   */
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

  /**
   * OPTIMIZED: Check if this is a common search with good DB coverage
   */
  private isCommonSearch(query: string): boolean {
    const term = query.toLowerCase().trim();
    const commonSearches = [
      'mario', 'pokemon', 'zelda', 'final fantasy',
      'sonic', 'mega man', 'street fighter', 'resident evil'
    ];
    return commonSearches.includes(term);
  }

  /**
   * OPTIMIZED: Conditionally get IGDB results
   */
  private async getIGDBResultsConditionally(query: string): Promise<IGDBGame[] | null> {
    try {
      // Quick check - don't wait for IGDB if taking too long
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 1000); // 1 second max
      });

      const igdbPromise = this.getIGDBResults(query);

      // Race between IGDB and timeout
      const result = await Promise.race([igdbPromise, timeoutPromise]);
      return result;
    } catch (error) {
      console.error('IGDB query failed/timed out:', error);
      return null;
    }
  }
  
  /**
   * Get IGDB results using enhanced Layer 1 service
   */
  private async getIGDBResults(query: string): Promise<IGDBGame[]> {
    try {
      // Use the enhanced IGDB service we implemented in Layer 1
      if (this.isFranchiseQuery(query)) {
        return await igdbServiceV2.searchGames(query, 40); // Focused franchise results for better relevance
      } else {
        return await igdbServiceV2.searchGames(query, 30); // Focused results for specific searches
      }
    } catch (error) {
      console.error('Enhanced IGDB search failed:', error);
      throw error;
    }
  }
  
  /**
   * Smart merge strategy that prioritizes quality over quantity
   */
  private async smartMerge(
    dbResults: GameWithCalculatedFields[], 
    igdbGames: IGDBGame[], 
    query: string
  ): Promise<GameWithCalculatedFields[]> {
    
    // Convert IGDB games to local format
    const igdbConverted = this.convertIGDBToLocal(igdbGames);
    
    // Optimize duplicate checking with faster lookups
    const existingIGDBIds = new Set<number>();
    const existingNames = new Set<string>();
    
    // Single pass to build lookup sets
    for (const game of dbResults) {
      if (game.igdb_id) {
        existingIGDBIds.add(game.igdb_id);
      }
      existingNames.add(this.normalizeGameName(game.name));
    }
    
    // Filter out IGDB games we already have
    const newIGDBGames = igdbConverted.filter(game => {
      // Skip if we already have this IGDB ID
      if (game.igdb_id && existingIGDBIds.has(game.igdb_id)) {
        return false;
      }
      
      // Skip if we have a very similar name (fuzzy duplicate detection)
      const normalizedName = this.normalizeGameName(game.name);
      if (existingNames.has(normalizedName)) {
        return false;
      }
      
      return true;
    });
    
    if (DEBUG_GAME_DATA) console.log(`🔄 Merge: ${dbResults.length} DB + ${newIGDBGames.length} new IGDB = ${dbResults.length + newIGDBGames.length} total`);
    
    // Combine and sort by relevance
    const combined = [...dbResults, ...newIGDBGames];
    return this.sortByRelevance(combined, query);
  }
  
  /**
   * Normalize game name for duplicate detection
   */
  private normalizeGameName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }
  
  /**
   * Check if a game's data is stale
   */
  private isStaleGame(game: GameWithCalculatedFields, maxAgeMs: number): boolean {
    if (!game.updated_at) return true;
    
    const gameAge = Date.now() - new Date(game.updated_at).getTime();
    return gameAge > maxAgeMs;
  }
  
  /**
   * Convert IGDB games to local format for immediate display
   */
  private convertIGDBToLocal(igdbGames: IGDBGame[]): GameWithCalculatedFields[] {
    return igdbGames.map(game => ({
      id: -(game.id || 0), // Negative ID to indicate it's from IGDB (not saved yet)
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
      // Calculated fields
      averageUserRating: 0,
      totalUserRatings: 0,
      // Mark as IGDB-sourced
      _isFromIGDB: true
    } as GameWithCalculatedFields & { _isFromIGDB: boolean }));
  }
  
  /**
   * Transform IGDB image URL to higher quality
   */
  private transformImageUrl(url: string): string {
    if (!url) return '';
    // Use t_1080p for high quality images instead of t_cover_big (264x374)
    return url.replace('t_thumb', 't_1080p').replace('//', 'https://');
  }
  
  /**
   * Sort combined results by relevance to query
   */
  private sortByRelevance(games: GameWithCalculatedFields[], query: string): GameWithCalculatedFields[] {
    const queryLower = query.toLowerCase();
    
    return games.sort((a, b) => {
      // Calculate relevance scores
      const scoreA = this.calculateRelevanceScore(a, queryLower);
      const scoreB = this.calculateRelevanceScore(b, queryLower);
      
      if (scoreA !== scoreB) {
        return scoreB - scoreA; // Higher score first
      }
      
      // Tie-breaker: prefer database results over IGDB results (more reliable)
      const aIsFromDB = !(a as any)._isFromIGDB;
      const bIsFromDB = !(b as any)._isFromIGDB;
      
      if (aIsFromDB && !bIsFromDB) return -1;
      if (!aIsFromDB && bIsFromDB) return 1;
      
      // Final tie-breaker: alphabetical
      return a.name.localeCompare(b.name);
    });
  }
  
  /**
   * Calculate relevance score for a game against query
   * Enhanced with IGDB metrics for professional-grade ranking
   */
  private calculateRelevanceScore(game: GameWithCalculatedFields, query: string): number {
    const name = game.name.toLowerCase();
    let score = 0;
    
    // 1. Text Relevance (0-100 points)
    if (name === query) {
      score += 100;
    } else if (name.startsWith(query)) {
      score += 80;
    } else if (name.includes(query)) {
      score += 60;
    } else {
      // Word-based matching
      const queryWords = query.split(/\s+/);
      const nameWords = name.split(/\s+/);
      const matchedWords = queryWords.filter(qw => 
        nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
      );
      score += (matchedWords.length / queryWords.length) * 40;
    }
    
    // 2. Quality Score (0-50 points) - Based on IGDB total_rating
    const totalRating = (game as any).total_rating;
    if (totalRating) {
      // Non-linear scaling to favor highly rated games
      // 90-100: Maximum bonus (45-50 points)
      // 80-90: Strong bonus (35-45 points)  
      // 70-80: Moderate bonus (20-35 points)
      // Below 70: Minimal bonus
      if (totalRating >= 90) {
        score += 45 + (totalRating - 90) * 0.5;
      } else if (totalRating >= 80) {
        score += 35 + (totalRating - 80);
      } else if (totalRating >= 70) {
        score += 20 + (totalRating - 70) * 1.5;
      } else {
        score += totalRating * 0.285; // ~20 points at 70
      }
    } else if (game.igdb_rating > 0) {
      // Fallback to old igdb_rating if available (reduced weight)
      const qualityScore = Math.pow(game.igdb_rating / 100, 1.5) * 25;
      score += qualityScore;
    }
    
    // 3. Authority Score (0-45 points) - Tiered based on rating_count
    const ratingCount = (game as any).rating_count || 0;
    
    // Tiered authority scoring for more intuitive results
    // Elite tier (1000+ reviews): 35-45 points
    // High tier (500-999 reviews): 28-35 points
    // Mid tier (100-499 reviews): 20-28 points
    // Low tier (20-99 reviews): 10-20 points
    // Minimal tier (<20 reviews): 0-10 points
    let authorityScore = 0;
    if (ratingCount >= 1000) {
      authorityScore = 35 + Math.min(Math.log10(ratingCount / 1000) * 10, 10);
    } else if (ratingCount >= 500) {
      authorityScore = 28 + ((ratingCount - 500) / 500) * 7;
    } else if (ratingCount >= 100) {
      authorityScore = 20 + ((ratingCount - 100) / 400) * 8;
    } else if (ratingCount >= 20) {
      authorityScore = 10 + ((ratingCount - 20) / 80) * 10;
    } else {
      authorityScore = (ratingCount / 20) * 10;
    }
    
    score += authorityScore;
    
    // 4. Engagement Score (0-25 points) - Based on follows and hypes
    const follows = (game as any).follows || 0;
    const hypes = (game as any).hypes || 0;
    
    // Hypes indicate upcoming/recent interest (weighted higher)
    // Follows indicate sustained interest
    let engagementScore = 0;
    
    // Hype factor (0-15 points) - for upcoming or recently released games
    if (hypes > 0) {
      if (hypes >= 100) {
        engagementScore += 12 + Math.min(Math.log10(hypes / 100) * 3, 3);
      } else if (hypes >= 50) {
        engagementScore += 8 + ((hypes - 50) / 50) * 4;
      } else if (hypes >= 10) {
        engagementScore += 4 + ((hypes - 10) / 40) * 4;
      } else {
        engagementScore += (hypes / 10) * 4;
      }
    }
    
    // Follow factor (0-10 points) - for established interest
    if (follows > 0) {
      engagementScore += Math.min(Math.log10(follows + 1) * 3.5, 10);
    }
    
    score += engagementScore;
    
    // 5. Franchise Bonus (0-10 points) - Boost well-known series
    if (this.isFranchiseQuery(query)) {
      const franchiseBonus = this.calculateFranchiseBonus(game, query);
      score += franchiseBonus;
    }
    
    // 6. Content & Community Bonus (0-5 points)
    if (game.summary && game.summary.length > 100) score += 2;
    if (game.cover_url) score += 1; // Has cover art
    if (game.totalUserRatings > 10) score += 2;
    // REMOVED: Green flag boost for performance optimization
    
    return Math.round(score * 10) / 10; // Round to 1 decimal for cleaner debug output
  }
  
  /**
   * Calculate franchise bonus for games that are core entries
   */
  private calculateFranchiseBonus(game: GameWithCalculatedFields, query: string): number {
    const name = game.name.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Bonus for numbered entries (Mario 3, Final Fantasy VII, etc.)
    if (/\b(i{1,3}|iv|v|vi{0,3}|ix|x|\d+)\b/.test(name)) {
      return 8;
    }
    
    // Bonus for subtitle entries (Ocarina of Time, etc.)
    if (name.includes(':') || name.includes(' - ')) {
      return 6;
    }
    
    // Bonus if game contains franchise name prominently
    if (name.startsWith(queryLower)) {
      return 4;
    }
    
    return 2;
  }
  
  /**
   * Asynchronously update database with new IGDB results (non-blocking)
   */
  private updateDatabaseAsync(igdbGames: IGDBGame[], query: string): void {
    // Use queueMicrotask for better performance than setTimeout
    queueMicrotask(async () => {
      try {
        const gamesToSave = igdbGames
          .filter(game => game.name && game.id)
          .slice(0, 10); // Limit batch size
        
        if (gamesToSave.length > 0) {
          await this.batchInsertGames(gamesToSave);
          if (DEBUG_GAME_DATA) console.log(`💾 Background: Saved ${gamesToSave.length} games to database for query "${query}"`);
        }
      } catch (error: any) {
        // Only log non-duplicate errors
        if (error?.code !== '23505') {
          console.error('Background database update failed:', error);
        }
        // Don't throw - this is non-critical
      }
    });
  }
  
  /**
   * Efficiently batch insert games to database with conflict detection
   */
  private async batchInsertGames(games: IGDBGame[]): Promise<void> {
    // First, check for existing IGDB IDs to prevent conflicts
    const igdbIds = games.map(g => g.id).filter(Boolean);

    if (igdbIds.length === 0) {
      console.warn('No valid IGDB IDs to insert');
      return;
    }

    // Check which IDs already exist
    const { data: existingGames } = await supabase
      .from('game')
      .select('igdb_id, name')
      .in('igdb_id', igdbIds);

    const existingIgdbIds = new Set(existingGames?.map(g => g.igdb_id) || []);

    // Log conflicts for debugging
    if (existingGames && existingGames.length > 0) {
      for (const existing of existingGames) {
        const newGame = games.find(g => g.id === existing.igdb_id);
        if (newGame && newGame.name !== existing.name) {
          console.warn(`⚠️ IGDB ID Conflict: ${existing.igdb_id} is "${existing.name}" in DB, trying to insert "${newGame.name}"`);
        }
      }
    }

    // Process only new games
    const newGames = games.filter(g => !existingIgdbIds.has(g.id));

    if (newGames.length === 0) {
      if (DEBUG_GAME_DATA) console.log('All games already exist in database');
      return;
    }

    // Process games sequentially to handle slug conflicts properly
    const transformedGames = [];

    for (const game of newGames) {
      try {
        const slug = generateSlug(game.name, game.id);

        // Ensure category is set correctly
        const category = game.category !== undefined ? game.category : 0;

        transformedGames.push({
          igdb_id: game.id,
          game_id: game.id.toString(),
          name: game.name,
          slug: slug,
          summary: game.summary,
          release_date: game.first_release_date
            ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
            : null,
          cover_url: game.cover?.url ? this.transformImageUrl(game.cover.url) : null,
          genres: game.genres?.map(g => g.name) || [],
          platforms: game.platforms?.map(p => p.name) || [],
          developer: game.involved_companies?.find(c => c.developer)?.company?.name,
          publisher: game.involved_companies?.find(c => c.publisher)?.company?.name,
          igdb_rating: Math.round(game.rating || 0),
          total_rating: game.total_rating ? Math.round(game.total_rating) : null,
          rating_count: game.rating_count || 0,
          follows: game.follows || 0,
          hypes: game.hypes || 0,
          category: category, // Explicitly set category
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        if (DEBUG_GAME_DATA) console.log(`✅ Prepared for insert: "${game.name}" (IGDB: ${game.id}, Category: ${category})`);
      } catch (error) {
        console.error(`Failed to prepare game ${game.name}:`, error);
      }
    }

    // Use batch insert (not upsert) for new games only
    if (transformedGames.length > 0) {
      const { error } = await supabase
        .from('game')
        .insert(transformedGames);

      if (error) {
        if (error.code === '23505') {
          console.warn(`Some games already existed (duplicate key)`);
        } else {
          console.error(`Failed to insert ${transformedGames.length} games:`, error);

          // Try inserting one by one to identify problematic entries
          for (const game of transformedGames) {
            const { error: singleError } = await supabase
              .from('game')
              .insert(game);

            if (singleError) {
              console.error(`Failed to insert "${game.name}":`, singleError);
            } else {
              if (DEBUG_GAME_DATA) console.log(`✅ Inserted: "${game.name}"`);
            }
          }
        }
      } else {
        if (DEBUG_GAME_DATA) console.log(`💾 Successfully inserted ${transformedGames.length} new games`);
      }
    }
  }
  
  /**
   * Fast search optimized for dropdown suggestions
   */
  async searchGamesFast(query: string, maxResults: number = 8): Promise<GameWithCalculatedFields[]> {
    try {
      if (DEBUG_GAME_DATA) console.log(`⚡ Fast search for: "${query}" (max: ${maxResults})`);
      
      // Search larger pool then filter to maxResults - preserves search quality
      const searchLimit = Math.max(maxResults * 10, 100); // Get 10x results or min 100 for better filtering
      const results = await this.searchByName(query, undefined, searchLimit);
      if (DEBUG_GAME_DATA) console.log(`⚡ Fast search retrieved: ${results.length} from pool of ${searchLimit}`);
      
      // Sort by relevance but skip complex metrics for speed
      const scoredResults = results.map(game => ({
        ...game,
        _relevanceScore: this.calculateSimpleRelevanceScore(game, query)
      }));
      
      // Filter out very low relevance results, sort, and limit to maxResults
      const filteredAndSorted = scoredResults
        .filter(game => game._relevanceScore >= 30) // Filter unrelated games
        .sort((a, b) => b._relevanceScore - a._relevanceScore)
        .slice(0, maxResults) // Apply final result limit
        .map(({ _relevanceScore, ...game }) => game); // Remove temp score field
        
      if (DEBUG_GAME_DATA) console.log(`⚡ Fast search final results: ${filteredAndSorted.length} (filtered from ${results.length})`);
      return filteredAndSorted;
    } catch (error) {
      console.error('Error in fast search:', error);
      return [];
    }
  }
  
  /**
   * Simple relevance scoring for fast searches (no complex IGDB metrics)
   */
  private calculateSimpleRelevanceScore(game: GameWithCalculatedFields, query: string): number {
    const name = game.name.toLowerCase();
    const queryLower = query.toLowerCase();
    
    if (name === queryLower) return 100;
    if (name.startsWith(queryLower)) return 80;
    if (name.includes(queryLower)) return 60;
    
    // Word-based matching
    const queryWords = queryLower.split(/\s+/);
    const nameWords = name.split(/\s+/);
    const matchedWords = queryWords.filter(qw => 
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );
    
    const wordMatchRatio = matchedWords.length / queryWords.length;
    
    // Early exit for poor matches to prevent unrelated results in dropdown
    if (wordMatchRatio < 0.5) {
      // Check if at least one significant word matches
      const hasSignificantMatch = queryWords.some(qWord => 
        qWord.length >= 3 && nameWords.some(nWord => nWord.includes(qWord))
      );
      if (!hasSignificantMatch) {
        return 5; // Very low score for unrelated games
      }
    }
    
    return wordMatchRatio * 40;
  }

  /**
   * Search games in database (exact matching)
   */
  private async searchGamesExact(query: string, filters?: SearchFilters, maxResults: number = 200): Promise<GameWithCalculatedFields[]> {
    try {
      // Strategy: Try name search first (faster), then supplement with summary search if needed
      if (DEBUG_GAME_DATA) console.log(`🔍 Database search for: "${query}"`);

      // OPTIMIZED: Removed green flag search for better performance
      const nameResults = await this.searchByName(query, filters, maxResults).catch(() => []);

      if (DEBUG_GAME_DATA) console.log(`📛 Name search: ${nameResults.length} results`);

      let combinedResults = nameResults;

      // If we still don't have enough results, add summary search
      if (combinedResults.length < Math.min(maxResults / 2, 50)) { // Dynamic threshold based on maxResults
        const summaryResults = await this.searchBySummary(query, filters, Math.floor(maxResults / 2)).catch(() => []); // Use half of maxResults for summary
        if (DEBUG_GAME_DATA) console.log(`📝 Summary search: ${summaryResults.length} results`);

        // Merge results, avoiding duplicates
        const currentIds = new Set(combinedResults.map(g => g.id));
        const newResults = summaryResults.filter(g => !currentIds.has(g.id));
        combinedResults = [...combinedResults, ...newResults];
      }

      if (DEBUG_GAME_DATA) console.log(`✅ Total database results: ${combinedResults.length}`);

      // Sort by enhanced relevance score
      return this.sortByRelevance(combinedResults, query);
      
    } catch (error) {
      console.error('Error in searchGamesExact:', error);
      return [];
    }
  }
  
  // REMOVED: Green flag search for performance optimization
  
  /**
   * Fast name-only search with alias support
   */
  private async searchByName(query: string, filters?: SearchFilters, limit: number = 200): Promise<GameWithCalculatedFields[]> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 1000); // OPTIMIZED: 1 second timeout for fast response

    try {
      // Direct query with rating aggregation using raw SQL for better control
      const { data: ratedResults, error: ratedError } = await supabase
        .from('game')
        .select(`
          *,
          rating!left(
            rating
          )
        `)
        .ilike('name', `%${query}%`)
        .limit(limit)
        .abortSignal(abortController.signal);

      clearTimeout(timeoutId);

      // Process results with rating aggregation
      if (!ratedError && ratedResults) {
        if (DEBUG_GAME_DATA) console.log(`🎯 Search found ${ratedResults.length} games for "${query}"`);

        // Calculate rating aggregates for each game
        const resultsWithRatings = ratedResults.map(game => {
          const ratings = (game as any).rating || [];
          const validRatings = ratings.filter((r: any) => r.rating != null);
          const avgRating = validRatings.length > 0
            ? validRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / validRatings.length
            : 0;

          return {
            ...game,
            average_rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
            rating_count: validRatings.length
          };
        });

        // Apply filters after getting results
        const filteredResults = this.applyFiltersOptimized(resultsWithRatings, filters);

        // Transform with rating data included
        return filteredResults.map(game => this.transformGameWithRatings(game as any));
      }

      // Fallback to search_games_with_aliases if search_games_with_mode doesn't exist
      const { data: aliasResults, error: aliasError } = await supabase
        .rpc('search_games_with_aliases', {
          search_query: query,
          max_results: limit
        })
        .abortSignal(abortController.signal);

      // If the alias function exists and returns results, use them
      if (!aliasError && aliasResults) {
        if (DEBUG_GAME_DATA) console.log(`🎯 Alias search found ${aliasResults.length} games for "${query}"`);

        // OPTIMIZED: Single-pass filtering
        const filteredResults = this.applyFiltersOptimized(aliasResults, filters);

        return filteredResults.map(game => this.transformGameWithoutRatings(game as any));
      }

      // Fallback to regular search if alias function doesn't exist
      let queryBuilder = supabase
        .from('game')
        .select('*')
        .ilike('name', `%${query}%`)
        .abortSignal(abortController.signal); // REMOVED: Red flag filtering for performance

      // Apply filters
      if (filters?.genres && filters.genres.length > 0) {
        queryBuilder = queryBuilder.contains('genres', filters.genres);
      }

      if (filters?.platforms && filters.platforms.length > 0) {
        queryBuilder = queryBuilder.contains('platforms', filters.platforms);
      }

      if (filters?.minRating) {
        queryBuilder = queryBuilder.gte('igdb_rating', filters.minRating);
      }

      if (filters?.releaseYear) {
        queryBuilder = queryBuilder.like('release_date', `${filters.releaseYear}%`);
      }

      queryBuilder = queryBuilder.limit(limit);

      const { data, error } = await queryBuilder;

      if (error) {
        // Don't log abort errors - they're expected
        if (error.code !== '20' && error.message && !error.message.includes('AbortError')) {
          console.error('Name search error:', error);
        }
        return [];
      }

      return (data || []).map(game => this.transformGameWithoutRatings(game as Game));
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      // Handle abort gracefully without logging
      if (abortError.name === 'AbortError' || abortError.code === '20') {
        return []; // Silently return empty array for timeouts
      }
      // Only log unexpected errors
      console.error('Unexpected name search error:', abortError);
      return [];
    }
  }
  
  /**
   * Summary search (used as supplement)
   */
  private async searchBySummary(query: string, filters?: SearchFilters, limit: number = 100): Promise<GameWithCalculatedFields[]> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 1000); // OPTIMIZED: 1 second timeout for fast response
    
    try {
      let queryBuilder = supabase
        .from('game')
        .select('*')
        .ilike('summary', `%${query}%`)
        .abortSignal(abortController.signal); // REMOVED: Red flag filtering for performance
      
      // Apply filters
      if (filters?.genres && filters.genres.length > 0) {
        queryBuilder = queryBuilder.contains('genres', filters.genres);
      }
      
      if (filters?.platforms && filters.platforms.length > 0) {
        queryBuilder = queryBuilder.contains('platforms', filters.platforms);
      }
      
      if (filters?.minRating) {
        queryBuilder = queryBuilder.gte('igdb_rating', filters.minRating);
      }
      
      if (filters?.releaseYear) {
        queryBuilder = queryBuilder.like('release_date', `${filters.releaseYear}%`);
      }
      
      queryBuilder = queryBuilder.limit(limit);
      
      const { data, error } = await queryBuilder;
      
      clearTimeout(timeoutId);
      
      if (error) {
        // Don't log abort errors - they're expected
        if (error.code !== '20' && error.message && !error.message.includes('AbortError')) {
          console.error('Summary search error:', error);
        }
        return [];
      }
      
      return (data || []).map(game => this.transformGameWithoutRatings(game as Game));
    } catch (abortError: any) {
      clearTimeout(timeoutId);
      // Handle abort gracefully without logging
      if (abortError.name === 'AbortError' || abortError.code === '20') {
        return []; // Silently return empty array for timeouts
      }
      // Only log unexpected errors
      console.error('Unexpected summary search error:', abortError);
      return [];
    }
  }
  
  /**
   * Transform game data with calculated fields (fast version without rating joins)
   */
  private transformGameWithoutRatings(game: Game): GameWithCalculatedFields {
    return {
      ...game,
      averageUserRating: 0, // Set to 0 for fast loading - can be loaded separately if needed
      totalUserRatings: 0
    } as GameWithCalculatedFields;
  }

  /**
   * Transform game data with rating fields from search_games_with_mode RPC
   */
  private transformGameWithRatings(game: any): GameWithCalculatedFields {
    return {
      ...game,
      // Map the RPC fields to our expected field names
      averageUserRating: game.average_rating || 0,
      totalUserRatings: game.rating_count || 0,
      // Also add them as the SearchResult interface expects
      avg_user_rating: game.average_rating || 0,
      user_rating_count: game.rating_count || 0
    } as GameWithCalculatedFields & { avg_user_rating?: number; user_rating_count?: number };
  }
  
  /**
   * Transform game data with calculated fields (slower version with inline ratings)
   */
  private transformGameWithInlineRatings(game: GameWithRating): GameWithCalculatedFields {
    const ratings = game.ratings || [];
    const totalRatings = ratings.length;
    const averageRating = totalRatings > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings
      : 0;

    return {
      ...game,
      averageUserRating: Math.round(averageRating * 100) / 100,
      totalUserRatings: totalRatings
    } as GameWithCalculatedFields;
  }
  
  /**
   * Test connection and functionality
   */
  async testEnhancedSearch(query: string): Promise<{
    dbResults: number;
    igdbUsed: boolean;
    totalResults: number;
    timeTaken: number;
  }> {
    const start = Date.now();
    
    const results = await this.searchGames(query);
    const timeTaken = Date.now() - start;
    
    const dbCount = results.filter(r => !(r as any)._isFromIGDB).length;
    const igdbCount = results.filter(r => (r as any)._isFromIGDB).length;
    
    return {
      dbResults: dbCount,
      igdbUsed: igdbCount > 0,
      totalResults: results.length,
      timeTaken
    };
  }
}

// Export singleton instance
export const gameDataServiceV2 = new GameDataServiceV2();