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
export class GameDataServiceV2 {
  private queryCache = new Map<string, { results: GameWithCalculatedFields[], timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Main search function with intelligent IGDB supplementation
   */
  async searchGames(query: string, filters?: SearchFilters): Promise<GameWithCalculatedFields[]> {
    const sanitizedQuery = sanitizeSearchTerm(query);
    if (!sanitizedQuery) return [];
    
    // Check cache first (only for simple queries without filters)
    if (!filters || Object.keys(filters).length === 0) {
      const cacheKey = sanitizedQuery.toLowerCase();
      const cached = this.queryCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        if (DEBUG_GAME_DATA) console.log(`🚀 Cache hit for "${query}" (${cached.results.length} results)`);
        return cached.results;
      }
    }
    
    try {
      // Step 1: Always get database results first (fast response)
      const dbResults = await this.searchGamesExact(sanitizedQuery, filters);
      if (DEBUG_GAME_DATA) console.log(`📊 Database search: ${dbResults.length} results for "${query}"`);
      
      // Step 2: Determine if we need IGDB supplementation
      const shouldQueryIGDB = this.shouldQueryIGDB(dbResults, query, filters);
      
      if (shouldQueryIGDB) {
        try {
          if (DEBUG_GAME_DATA) console.log(`🚀 Supplementing with IGDB results...`);
          
          // Step 3: Get fresh IGDB results using Layer 1 improvements
          const igdbGames = await this.getIGDBResults(query);
          
          if (igdbGames && igdbGames.length > 0) {
            if (DEBUG_GAME_DATA) console.log(`✅ IGDB returned ${igdbGames.length} additional results`);
            
            // Step 4: Smart merge strategy
            const mergedResults = await this.smartMerge(dbResults, igdbGames, query);
            
            // Step 5: Update database asynchronously (non-blocking)
            this.updateDatabaseAsync(igdbGames, query);
            
            // Cache results for future requests (no filters only)
            if (!filters || Object.keys(filters).length === 0) {
              this.queryCache.set(sanitizedQuery.toLowerCase(), {
                results: mergedResults,
                timestamp: Date.now()
              });
            }
            
            return mergedResults;
          }
        } catch (igdbError) {
          console.error('IGDB supplement failed:', igdbError);
          // Continue with database results only
        }
      } else {
        if (DEBUG_GAME_DATA) console.log(`📋 Using database results only (${dbResults.length} games)`);
      }
      
      // Cache database-only results too (no filters only)
      if (!filters || Object.keys(filters).length === 0) {
        this.queryCache.set(sanitizedQuery.toLowerCase(), {
          results: dbResults,
          timestamp: Date.now()
        });
      }
      
      return dbResults;
      
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
   * Check if this is a franchise search
   */
  private isFranchiseQuery(query: string): boolean {
    const term = query.toLowerCase();
    const franchises = [
      'mario', 'super mario', 'zelda', 'pokemon', 'final fantasy', 'ff',
      'call of duty', 'cod', 'assassin', 'grand theft auto', 'gta',
      'mega man', 'megaman', 'sonic', 'halo', 'god of war',
      'uncharted', 'last of us', 'resident evil', 'street fighter',
      'mortal kombat', 'tekken', 'elder scrolls', 'fallout',
      'witcher', 'dark souls', 'metal gear', 'silent hill'
    ];
    
    return franchises.some(franchise => term.includes(franchise));
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
    return url.replace('t_thumb', 't_cover_big').replace('//', 'https://');
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
    
    // 7. Manual Curation Boost (150 points) - Green-flagged games get massive priority
    // This ensures manually curated games appear at the top of search results
    if ((game as any).greenlight_flag === true) {
      score += 150;
    }
    
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
   * Efficiently batch insert games to database
   */
  private async batchInsertGames(games: IGDBGame[]): Promise<void> {
    // Process games sequentially to handle slug conflicts properly
    const transformedGames = [];
    
    for (const game of games) {
      try {
        // PERFORMANCE FIX: Use simple slug generation instead of expensive DB queries
        // This eliminates the 406 errors and improves search performance dramatically
        const slug = generateSlug(game.name, game.id);
        
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      } catch (slugError) {
        console.warn(`Failed to generate slug for game ${game.name}:`, slugError);
        // Use fallback slug with IGDB ID
        transformedGames.push({
          igdb_id: game.id,
          game_id: game.id.toString(),
          name: game.name,
          slug: generateSlug(game.name, game.id), // Fallback with ID
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
    
    // Use batch upsert for better performance
    if (transformedGames.length > 0) {
      const { error } = await supabase
        .from('game')
        .upsert(transformedGames, { 
          onConflict: 'igdb_id',
          ignoreDuplicates: true 
        });
      
      if (error && error.code !== '23505') {
        console.error(`Failed to batch upsert ${transformedGames.length} games:`, error);
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
  private async searchGamesExact(query: string, filters?: SearchFilters): Promise<GameWithCalculatedFields[]> {
    try {
      // Strategy: Try name search first (faster), then supplement with summary search if needed
      if (DEBUG_GAME_DATA) console.log(`🔍 Database search for: "${query}"`);
      
      // Run green flag search and name search in parallel for better performance
      const [greenFlaggedGames, nameResults] = await Promise.all([
        this.searchGreenFlaggedGames(query).catch(() => []), // Don't let green flag search fail the whole operation
        this.searchByName(query, filters, 25)
      ]);
      
      if (DEBUG_GAME_DATA) console.log(`🟢 Green-flagged games: ${greenFlaggedGames.length} results`);
      if (DEBUG_GAME_DATA) console.log(`📛 Name search: ${nameResults.length} results`);
      
      // Merge green-flagged games with regular results (avoiding duplicates)
      const existingIds = new Set(nameResults.map(g => g.id));
      const uniqueGreenFlagged = greenFlaggedGames.filter(g => !existingIds.has(g.id));
      let combinedResults = [...uniqueGreenFlagged, ...nameResults];
      
      // If we still don't have enough results, add summary search
      if (combinedResults.length < 15) { // Reduced threshold for faster response
        const summaryResults = await this.searchBySummary(query, filters, 15); // Reduced from 30
        if (DEBUG_GAME_DATA) console.log(`📝 Summary search: ${summaryResults.length} results`);
        
        // Merge results, avoiding duplicates
        const currentIds = new Set(combinedResults.map(g => g.id));
        const newResults = summaryResults.filter(g => !currentIds.has(g.id));
        combinedResults = [...combinedResults, ...newResults];
      }
      
      if (DEBUG_GAME_DATA) console.log(`✅ Total database results: ${combinedResults.length}`);
      
      // Sort by enhanced relevance score using new IGDB metrics (green flags will get 150-point boost)
      return this.sortByRelevance(combinedResults, query);
      
    } catch (error) {
      console.error('Error in searchGamesExact:', error);
      return [];
    }
  }
  
  /**
   * Search for green-flagged games that match the query
   * These are manually curated games that should always appear
   */
  private async searchGreenFlaggedGames(query: string): Promise<GameWithCalculatedFields[]> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000); // Increased to 8 seconds like other searches
    
    try {
      // Simplified query - just search green-flagged games, no complex filters
      const { data, error } = await supabase
        .from('game')
        .select('*')
        .eq('greenlight_flag', true)
        .ilike('name', `%${query}%`)
        .abortSignal(abortController.signal)
        .limit(5); // Reduced limit for faster query
      
      clearTimeout(timeoutId);
      
      if (error) {
        if (DEBUG_GAME_DATA) console.error('Green flag search error:', error);
        return []; // Fail silently to not break regular search
      }
      
      if (DEBUG_GAME_DATA) console.log(`🟢 Green flag search found ${(data || []).length} games for "${query}"`);
      return (data || []).map(game => this.transformGameWithoutRatings(game as Game));
    } catch (abortError) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        if (DEBUG_GAME_DATA) console.warn('⚠️ Green flag search timed out - continuing with regular search');
        return []; // Return empty array to continue with regular search
      }
      throw abortError;
    }
  }
  
  /**
   * Fast name-only search
   */
  private async searchByName(query: string, filters?: SearchFilters, limit: number = 50): Promise<GameWithCalculatedFields[]> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 8000); // 8 second timeout for complex queries
    
    try {
      let queryBuilder = supabase
        .from('game')
        .select('*')
        .ilike('name', `%${query}%`)
        .or('redlight_flag.is.null,redlight_flag.eq.false')  // Filter out red-flagged games
        .abortSignal(abortController.signal);
      
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
        console.error('Name search error:', error);
        return [];
      }
      
      return (data || []).map(game => this.transformGameWithoutRatings(game as Game));
    } catch (abortError) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        console.error('❌ Name search timed out after 3 seconds');
        return [];
      }
      throw abortError;
    }
  }
  
  /**
   * Summary search (used as supplement)
   */
  private async searchBySummary(query: string, filters?: SearchFilters, limit: number = 30): Promise<GameWithCalculatedFields[]> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 6000); // 6 second timeout for summary searches
    
    try {
      let queryBuilder = supabase
        .from('game')
        .select('*')
        .ilike('summary', `%${query}%`)
        .or('redlight_flag.is.null,redlight_flag.eq.false')  // Filter out red-flagged games
        .abortSignal(abortController.signal);
      
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
        console.error('Summary search error:', error);
        return [];
      }
      
      return (data || []).map(game => this.transformGameWithoutRatings(game as Game));
    } catch (abortError) {
      clearTimeout(timeoutId);
      if (abortError.name === 'AbortError') {
        console.error('❌ Summary search timed out after 2 seconds');
        return [];
      }
      throw abortError;
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
   * Transform game data with calculated fields (slower version with ratings)
   */
  private transformGameWithRatings(game: GameWithRating): GameWithCalculatedFields {
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