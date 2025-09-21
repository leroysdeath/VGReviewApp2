/**
 * Layer 4: Advanced Search Coordination & Quality Enhancement
 * 
 * This service provides advanced search coordination features including:
 * - Query expansion and normalization
 * - Multi-source result fusion and deduplication
 * - Dynamic quality thresholds based on search context
 * - Performance optimization with intelligent caching
 * 
 * Built on top of the existing Layer 1-3 services for maximum effectiveness.
 */

// Debug flag to control console logging
const DEBUG_SEARCH_COORDINATION = false;

import { GameDataServiceV2 } from './gameDataServiceV2';
import { igdbService } from './igdbService';
import { sortGamesIntelligently, detectSearchIntent, SearchIntent } from '../utils/intelligentPrioritization';
import { filterProtectedContent, filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';
import { normalizeAccents, expandWithAccentVariations, createSearchVariants } from '../utils/accentNormalization';

// Import error handling services
import { igdbCircuitBreaker } from './igdbCircuitBreaker';
import { igdbFailureCache } from './igdbFailureCache';
import { igdbHealthMonitor } from './igdbHealthMonitor';
import { igdbTelemetry } from './igdbTelemetry';

export interface SearchContext {
  originalQuery: string;
  expandedQueries: string[];
  searchIntent: SearchIntent;
  qualityThreshold: number;
  maxResults: number;
  useAggressive: boolean;
  cacheKey: string;
}

export interface SearchResult {
  id: number;
  name: string;
  summary?: string;
  developer?: string;
  publisher?: string;
  category?: number;
  genres?: string[];
  platforms?: string[];
  release_date?: string;
  cover_url?: string;
  igdb_rating?: number;
  igdb_id?: number;
  relevanceScore?: number;
  qualityScore?: number;
  source: 'database' | 'igdb' | 'hybrid';
  // Manual admin flags
  greenlight_flag?: boolean;
  redlight_flag?: boolean;
  flag_reason?: string;
}

export interface SearchMetrics {
  totalSearchTime: number;
  dbQueryTime: number;
  igdbQueryTime: number;
  processingTime: number;
  cacheHit: boolean;
  resultCount: number;
  qualityFiltered: number;
  contentFiltered: number;
  queriesExpanded: number;
}

/**
 * Advanced Search Coordination Service
 */
export class AdvancedSearchCoordination {
  private gameDataService: GameDataServiceV2;
  private queryCache: Map<string, { results: SearchResult[]; timestamp: number; metrics: SearchMetrics }> = new Map();
  private pendingRequests: Map<string, Promise<{ results: SearchResult[]; context: SearchContext; metrics?: SearchMetrics }>> = new Map();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutes for better performance

  constructor() {
    this.gameDataService = new GameDataServiceV2();
  }

  /**
   * Main search entry point with advanced coordination and request deduplication
   */
  async coordinatedSearch(
    query: string,
    options: {
      maxResults?: number;
      useAggressive?: boolean;
      bypassCache?: boolean;
      includeMetrics?: boolean;
      fastMode?: boolean; // New option for dropdown searches
    } = {}
  ): Promise<{
    results: SearchResult[];
    context: SearchContext;
    metrics?: SearchMetrics;
  }> {
    const startTime = Date.now();
    
    // Fast path for dropdown searches - bypass all complex logic
    if (options.fastMode) {
      if (DEBUG_SEARCH_COORDINATION) console.log(`⚡ FAST MODE: Quick search for dropdown: "${query}"`);
      try {
        const fastResults = await this.gameDataService.searchGamesFast(query, options.maxResults || 8);
        return {
          results: fastResults.map(game => ({
            ...game,
            source: 'database' as const,
            relevanceScore: 0, // Skip relevance calculation for speed
            qualityScore: 0 // Skip quality calculation for speed
          })),
          context: this.buildSearchContext(query, options),
          metrics: options.includeMetrics ? {
            totalSearchTime: Date.now() - startTime,
            dbQueryTime: Date.now() - startTime,
            igdbQueryTime: 0,
            processingTime: 0,
            cacheHit: false,
            resultCount: fastResults.length,
            qualityFiltered: 0,
            contentFiltered: 0,
            queriesExpanded: 1
          } : undefined
        };
      } catch (error) {
        console.error('Fast mode search failed:', error);
        // Fall through to normal search if fast mode fails
      }
    }
    
    // Build search context
    const context = this.buildSearchContext(query, options);
    
    // Check for duplicate in-flight requests first
    if (this.pendingRequests.has(context.cacheKey)) {
      if (DEBUG_SEARCH_COORDINATION) console.log(`🔄 REQUEST DEDUPLICATION: Waiting for in-flight request for "${query}"`);
      return await this.pendingRequests.get(context.cacheKey)!;
    }
    
    // Check cache
    if (!options.bypassCache) {
      const cached = this.getCachedResults(context.cacheKey);
      if (cached) {
        if (DEBUG_SEARCH_COORDINATION) console.log(`⚡ CACHE HIT: Returning ${cached.results.length} cached results for "${query}"`);
        return {
          results: cached.results,
          context,
          metrics: options.includeMetrics ? cached.metrics : undefined
        };
      }
    }
    
    if (DEBUG_SEARCH_COORDINATION) console.log(`🚀 ADVANCED SEARCH: "${query}" (Intent: ${context.searchIntent}, Threshold: ${context.qualityThreshold})`);
    
    // Create and store pending request promise
    const requestPromise = this.executeSearchInternal(context, startTime, options.includeMetrics);
    this.pendingRequests.set(context.cacheKey, requestPromise);
    
    try {
      const result = await requestPromise;
      return result;
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(context.cacheKey);
    }
  }

  /**
   * Internal search execution method
   */
  private async executeSearchInternal(
    context: SearchContext,
    startTime: number,
    includeMetrics?: boolean
  ): Promise<{
    results: SearchResult[];
    context: SearchContext;
    metrics?: SearchMetrics;
  }> {
    // Execute coordinated search
    const searchResults = await this.executeCoordinatedSearch(context);
    
    // Calculate metrics
    const metrics: SearchMetrics = {
      totalSearchTime: Date.now() - startTime,
      dbQueryTime: 0, // Will be filled by sub-services
      igdbQueryTime: 0, // Will be filled by sub-services
      processingTime: 0,
      cacheHit: false,
      resultCount: searchResults.length,
      qualityFiltered: 0, // Will be calculated
      contentFiltered: 0, // Will be calculated
      queriesExpanded: context.expandedQueries.length
    };
    
    // Cache results
    this.cacheResults(context.cacheKey, searchResults, metrics);
    
    return {
      results: searchResults,
      context,
      metrics: includeMetrics ? metrics : undefined
    };
  }

  /**
   * Build comprehensive search context
   */
  private buildSearchContext(query: string, options: any): SearchContext {
    // Normalize Pokemon searches to match mobile keyboard auto-correction
    let normalizedQuery = query;
    if (query.toLowerCase().includes('pokemon')) {
      normalizedQuery = query.replace(/pokemon/gi, 'Pokémon');
      console.log('🔴 SEARCH CONTEXT POKEMON NORMALIZATION:', {
        original: query,
        normalized: normalizedQuery
      });
    }

    const intent = detectSearchIntent(normalizedQuery);
    const expandedQueries = this.expandQuery(normalizedQuery, intent);

    return {
      originalQuery: normalizedQuery,
      expandedQueries,
      searchIntent: intent,
      qualityThreshold: this.calculateQualityThreshold(intent, normalizedQuery),
      maxResults: options.maxResults || this.getDefaultMaxResults(intent),
      useAggressive: options.useAggressive || false,
      cacheKey: this.buildCacheKey(normalizedQuery, intent, options)
    };
  }

  /**
   * Advanced query expansion based on search patterns
   */
  private expandQuery(query: string, intent: SearchIntent): string[] {
    const baseQuery = query.toLowerCase().trim();
    const expansions: string[] = [baseQuery];
    
    // STEP 1: Add accent-normalized variations FIRST
    const accentVariations = expandWithAccentVariations(query);
    expansions.push(...accentVariations);
    
    // Debug: Accent expansions for query

    // Common abbreviations and alternative names
    const expansionRules: Record<string, string[]> = {
      // Final Fantasy series
      'ff': ['final fantasy'],
      'ff7': ['final fantasy vii', 'final fantasy 7'],
      'ff8': ['final fantasy viii', 'final fantasy 8'],
      'ff9': ['final fantasy ix', 'final fantasy 9'],
      'ff10': ['final fantasy x', 'final fantasy 10'],
      'ff12': ['final fantasy xii', 'final fantasy 12'],
      'ff13': ['final fantasy xiii', 'final fantasy 13'],
      'ff14': ['final fantasy xiv', 'final fantasy 14'],
      'ff15': ['final fantasy xv', 'final fantasy 15'],
      'ff16': ['final fantasy xvi', 'final fantasy 16'],
      
      // Dragon Quest series  
      'dq': ['dragon quest', 'dragon warrior'],
      'dragon warrior': ['dragon quest'],
      
      // Zelda series
      'botw': ['breath of the wild', 'zelda breath of the wild'],
      'totk': ['tears of the kingdom', 'zelda tears of the kingdom'],
      'oot': ['ocarina of time', 'zelda ocarina of time'],
      'majoras mask': ['majora\'s mask'],
      
      // Pokemon series (with comprehensive accent handling)
      'pokemon': ['pokémon', 'pokemon'],
      'pokémon': ['pokemon', 'pokémon'],
      
      // Street Fighter series
      'sf': ['street fighter'],
      'sf6': ['street fighter 6', 'street fighter vi'],
      'sf5': ['street fighter 5', 'street fighter v'],
      
      // Grand Theft Auto
      'gta': ['grand theft auto'],
      'gta5': ['grand theft auto v', 'gta v'],
      'gta6': ['grand theft auto vi', 'gta vi'],
      
      // Call of Duty
      'cod': ['call of duty'],
      'mw': ['modern warfare'],
      'mw2': ['modern warfare 2'],
      'mw3': ['modern warfare 3'],
      
      // Assassin's Creed
      'ac': ['assassin\'s creed', 'assassins creed'],
      'assassins creed': ['assassin\'s creed'],
      
      // Other common abbreviations
      'tlou': ['the last of us'],
      'gow': ['god of war'],
      'rdr': ['red dead redemption'],
      'rdr2': ['red dead redemption 2'],
      'nier': ['nier automata', 'nier replicant'],
      'dmc': ['devil may cry'],
      'mgs': ['metal gear solid'],
      'kh': ['kingdom hearts'],
      're': ['resident evil'],
      'dkc': ['donkey kong country'],
      'mk': ['mortal kombat'],
      'tekken': ['tekken 7', 'tekken 8'],
      'smash': ['super smash bros', 'smash bros'],
      'mario kart': ['mario kart 8', 'mario kart deluxe'],
      'splatoon': ['splatoon 3', 'splatoon 2']
    };

    // STEP 2: Apply expansion rules with accent-aware matching
    const normalizedQuery = normalizeAccents(baseQuery);
    for (const [abbrev, alternatives] of Object.entries(expansionRules)) {
      const normalizedAbbrev = normalizeAccents(abbrev);
      
      // Check both original and normalized versions
      if (baseQuery.includes(abbrev) || normalizedQuery.includes(normalizedAbbrev)) {
        alternatives.forEach(alt => {
          const normalizedAlt = normalizeAccents(alt);
          // Add both original and normalized versions
          if (!expansions.some(exp => normalizeAccents(exp) === normalizedAlt)) {
            expansions.push(alt);
            if (normalizedAlt !== alt.toLowerCase()) {
              expansions.push(normalizedAlt);
            }
          }
        });
      }
    }

    // STEP 3: Intent-specific expansions (accent-aware)
    if (intent === SearchIntent.FRANCHISE_BROWSE) {
      // Add common franchise terms using normalized matching
      if (normalizedQuery.includes('mario') && !normalizedQuery.includes('super')) {
        expansions.push('super mario');
      }
      if (normalizedQuery.includes('zelda') && !normalizedQuery.includes('legend')) {
        expansions.push('legend of zelda');
      }
      if (normalizedQuery.includes('pokemon') && !normalizedQuery.includes('pokémon')) {
        expansions.push('pokémon');
      }
      if (normalizedQuery.includes('pokémon') && !normalizedQuery.includes('pokemon')) {
        expansions.push('pokemon');
      }
    }

    // Remove duplicates and return
    return [...new Set(expansions)];
  }

  /**
   * Calculate dynamic quality threshold based on search context
   * PRIORITY-BASED: Much lower thresholds to include more games
   */
  private calculateQualityThreshold(intent: SearchIntent, query: string): number {
    const baseQuery = query.toLowerCase();

    // PRIORITY-BASED: Lower thresholds - we'll rank, not filter
    if (intent === SearchIntent.SPECIFIC_GAME) {
      return 0.3; // Lowered from 0.8 - show all matches, ranked by quality
    }

    // PRIORITY-BASED: Include all franchise games
    if (intent === SearchIntent.FRANCHISE_BROWSE) {
      // Popular franchises should show ALL their games
      const popularFranchises = ['mario', 'zelda', 'pokemon', 'final fantasy', 'call of duty'];
      if (popularFranchises.some(franchise => baseQuery.includes(franchise))) {
        return 0.1; // Lowered from 0.6 - show ALL Pokemon games
      }
      return 0.2; // Lowered from 0.4
    }

    // Lower thresholds for discovery
    if (intent === SearchIntent.GENRE_DISCOVERY || intent === SearchIntent.YEAR_SEARCH) {
      return 0.2; // Lowered from 0.3
    }

    // Default lower threshold
    return 0.3; // Lowered from 0.5
  }

  /**
   * Get appropriate max results based on search intent
   * PRIORITY-BASED: Significantly increased limits to show all relevant games
   */
  private getDefaultMaxResults(intent: SearchIntent): number {
    switch (intent) {
      case SearchIntent.SPECIFIC_GAME:
        return 50; // Increased from 20 - show more variations
      case SearchIntent.FRANCHISE_BROWSE:
        return 200; // Increased from 40 - show ALL franchise games (e.g., 166 Pokemon)
      case SearchIntent.GENRE_DISCOVERY:
        return 100; // Increased from 50 - more discovery
      case SearchIntent.YEAR_SEARCH:
        return 100; // Increased from 40 - comprehensive year view
      case SearchIntent.DEVELOPER_SEARCH:
        return 150; // Increased from 40 - full developer catalog
      case SearchIntent.PLATFORM_SEARCH:
        return 150; // Increased from 40 - full platform library
      default:
        return 100; // Increased from 40 - comprehensive results
    }
  }

  /**
   * Prioritize queries to execute the most important ones first
   */
  private prioritizeQueries(expandedQueries: string[], originalQuery: string): string[] {
    const originalLower = originalQuery.toLowerCase().trim();
    
    return expandedQueries.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      
      // Priority 1: Exact match to original query
      if (aLower === originalLower && bLower !== originalLower) return -1;
      if (bLower === originalLower && aLower !== originalLower) return 1;
      
      // Priority 2: Simple accent variations (pokemon vs pokémon)
      const aIsSimpleVariant = this.isSimpleAccentVariant(aLower, originalLower);
      const bIsSimpleVariant = this.isSimpleAccentVariant(bLower, originalLower);
      if (aIsSimpleVariant && !bIsSimpleVariant) return -1;
      if (bIsSimpleVariant && !aIsSimpleVariant) return 1;
      
      // Priority 3: Shorter queries (more general)
      const lengthDiff = a.length - b.length;
      if (Math.abs(lengthDiff) > 5) return lengthDiff;
      
      // Priority 4: Contains original query as substring
      const aContains = aLower.includes(originalLower);
      const bContains = bLower.includes(originalLower);
      if (aContains && !bContains) return -1;
      if (bContains && !aContains) return 1;
      
      // Default: alphabetical
      return a.localeCompare(b);
    });
  }

  /**
   * Check if a query is a simple accent variant (just accent changes)
   */
  private isSimpleAccentVariant(query: string, original: string): boolean {
    if (query === original) return true;
    
    // Check if normalizing both makes them equal
    const normalizedQuery = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedOriginal = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    return normalizedQuery === normalizedOriginal;
  }

  /**
   * Execute coordinated search with smart query prioritization and IGDB fallback
   */
  private async executeCoordinatedSearch(context: SearchContext): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const seenIds = new Set<number>();

    // SMART QUERY EXECUTION: Prioritize and limit queries to prevent rate limiting
    const prioritizedQueries = this.prioritizeQueries(context.expandedQueries, context.originalQuery);
    const maxQueries = Math.min(prioritizedQueries.length, 5); // Limit to 5 queries max
    const selectedQueries = prioritizedQueries.slice(0, maxQueries);

    if (DEBUG_SEARCH_COORDINATION) console.log(`🔍 Smart execution: Using ${selectedQueries.length} prioritized queries from ${context.expandedQueries.length} expansions:`, selectedQueries);

    // First, search local database
    for (let i = 0; i < selectedQueries.length; i++) {
      const expandedQuery = selectedQueries[i];

      try {
        if (DEBUG_SEARCH_COORDINATION) console.log(`🔍 Local query ${i + 1}/${selectedQueries.length}: "${expandedQuery}"`);

        const queryResults = await this.gameDataService.searchGames(expandedQuery);

        // Convert to SearchResult format and add source tracking
        const convertedResults: SearchResult[] = queryResults.map(game => ({
          ...game,
          source: 'database' as const,
          relevanceScore: this.calculateRelevanceScore(game.name, context.originalQuery),
          qualityScore: this.calculateQualityScore(game)
        }));

        // PRIORITY-BASED: Much lower relevance filter - let ranking handle order
        const relevantResults = convertedResults.filter(game =>
          (game.relevanceScore || 0) >= 0.1 // Lowered from 0.4 - include all remotely relevant
        );

        // Add results from this query
        for (const result of relevantResults) {
          if (!seenIds.has(result.id)) {
            seenIds.add(result.id);
            allResults.push(result);
          }
        }

        // PRIORITY-BASED: Higher termination thresholds to get more results
        const isFranchiseSearch = context.intent === 'franchise_browse';
        const terminationThreshold = isFranchiseSearch ? 250 : 150; // Increased from 80/40

        if (allResults.length >= terminationThreshold) {
          if (DEBUG_SEARCH_COORDINATION) console.log(`✂️ Early termination: Found ${allResults.length} results after ${i + 1} queries`);
          break;
        }

      } catch (error) {
        console.error(`❌ Local query failed for "${expandedQuery}":`, error);
        // Continue with next query instead of failing completely
        continue;
      }
    }

    // Enhanced IGDB fallback with error handling
    // Only attempt IGDB if we have very few results AND all services are healthy
    const IGDB_THRESHOLD = 1; // Reduced from 10 - only use IGDB if we have NO results
    const shouldAttemptIGDB = allResults.length < IGDB_THRESHOLD;

    if (shouldAttemptIGDB) {
      console.log(`🔍 Minimal local results (${allResults.length}), checking if IGDB fallback is available...`);

      // Check all conditions before attempting IGDB
      const canUseIGDB =
        igdbHealthMonitor.isServiceHealthy() &&
        igdbCircuitBreaker.canMakeRequest() &&
        !igdbFailureCache.shouldSkipQuery(context.originalQuery) &&
        !igdbTelemetry.shouldDisableIGDB();

      if (!canUseIGDB) {
        console.log('⚠️ IGDB fallback disabled due to:');
        if (!igdbHealthMonitor.isServiceHealthy()) console.log('  - Service unhealthy');
        if (!igdbCircuitBreaker.canMakeRequest()) console.log('  - Circuit breaker open');
        if (igdbFailureCache.shouldSkipQuery(context.originalQuery)) console.log('  - Query recently failed');
        if (igdbTelemetry.shouldDisableIGDB()) console.log('  - High failure rate detected');
        console.log('📊 Using database results only');
      } else {
        // Attempt IGDB search with timeout and error handling
        const startTime = Date.now();

        try {
          // Create a race between IGDB search and timeout
          const IGDB_TIMEOUT = 2000; // 2 seconds max for search
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('IGDB search timeout')), IGDB_TIMEOUT);
          });

          const igdbPromise = igdbService.searchGames(context.originalQuery, 20);

          console.log(`🔄 Attempting IGDB search with ${IGDB_TIMEOUT}ms timeout...`);

          const igdbResults = await Promise.race([igdbPromise, timeoutPromise]);
          const duration = Date.now() - startTime;

          // Convert IGDB results to SearchResult format
          const convertedIgdbResults: SearchResult[] = igdbResults.map(game => ({
            id: game.id,
            name: game.name,
            summary: game.summary,
            developer: game.involved_companies?.find(c => c.developer)?.company?.name,
            publisher: game.involved_companies?.find(c => c.publisher)?.company?.name,
            category: game.category,
            genres: game.genres?.map(g => g.name) || [],
            platforms: game.platforms?.map(p => p.name) || [],
            release_date: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString() : undefined,
            cover_url: game.cover?.url ? game.cover.url.replace('t_thumb', 't_cover_big').replace('//', 'https://') : undefined,
            igdb_rating: game.rating,
            igdb_id: game.id,
            source: 'igdb' as const,
            relevanceScore: this.calculateRelevanceScore(game.name, context.originalQuery),
            qualityScore: this.calculateQualityScore({
              name: game.name,
              igdb_rating: game.rating
            } as any)
          }));

          // Add IGDB results that aren't duplicates
          let addedCount = 0;
          for (const result of convertedIgdbResults) {
            // Check by IGDB ID to avoid duplicates
            const isDuplicate = allResults.some(r => r.igdb_id === result.igdb_id);
            if (!isDuplicate) {
              allResults.push(result);
              addedCount++;
            }
          }

          // Record success
          igdbCircuitBreaker.recordSuccess();
          igdbHealthMonitor.recordOperationalSuccess();
          igdbFailureCache.markAsSuccessful(context.originalQuery);
          igdbTelemetry.recordCall({
            query: context.originalQuery,
            success: true,
            duration,
            timestamp: Date.now(),
            resultCount: convertedIgdbResults.length
          });

          console.log(`✅ IGDB search succeeded in ${duration}ms - Added ${addedCount} results, total: ${allResults.length}`);

        } catch (error) {
          const duration = Date.now() - startTime;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';

          // Record failure in all services
          igdbCircuitBreaker.recordFailure(error as Error);
          igdbHealthMonitor.recordOperationalFailure(error as Error);
          igdbFailureCache.markAsFailed(context.originalQuery, error as Error);
          igdbTelemetry.recordCall({
            query: context.originalQuery,
            success: false,
            duration,
            timestamp: Date.now(),
            error: errorMessage
          });

          console.error(`❌ IGDB search failed after ${duration}ms: ${errorMessage}`);
          console.log('📊 Continuing with database results only');
        }
      }
    } else if (allResults.length >= IGDB_THRESHOLD) {
      console.log(`✅ Sufficient database results (${allResults.length}), skipping IGDB fallback`);
    }

    // Apply advanced filtering and sorting
    return this.processSearchResults(allResults, context);
  }

  /**
   * Process search results with PRIORITY-BASED ranking instead of aggressive filtering
   */
  private processSearchResults(results: SearchResult[], context: SearchContext): SearchResult[] {
    // Processing raw results

    // PRIORITY-BASED: Conditionally apply filters based on search intent
    let processedResults = results;

    // For popular franchises, skip aggressive content filtering
    const popularFranchises = ['mario', 'zelda', 'pokemon', 'final fantasy', 'call of duty', 'sonic', 'mega man'];
    const isPopularFranchise = popularFranchises.some(franchise =>
      context.originalQuery.toLowerCase().includes(franchise)
    );

    if (!isPopularFranchise && context.searchIntent !== SearchIntent.FRANCHISE_BROWSE) {
      // Only apply content filtering for non-franchise searches
      processedResults = filterProtectedContent(processedResults.map(r => ({
        id: r.id,
        name: r.name,
        developer: r.developer,
        publisher: r.publisher,
        category: r.category,
        genres: r.genres,
        summary: r.summary,
        greenlight_flag: (r as any).greenlight_flag,
        redlight_flag: (r as any).redlight_flag,
        flag_reason: (r as any).flag_reason
      }))).map(filteredGame => {
        return results.find(r => r.id === filteredGame.id)!;
      }).filter(Boolean);

      // Only apply fan game filtering for non-franchise searches
      processedResults = filterFanGamesAndEReaderContent(processedResults.map(r => ({
        id: r.id,
        name: r.name,
        developer: r.developer,
        publisher: r.publisher,
        category: r.category,
        genres: r.genres,
        summary: r.summary,
        greenlight_flag: (r as any).greenlight_flag,
        redlight_flag: (r as any).redlight_flag,
        flag_reason: (r as any).flag_reason
      }))).map(filteredGame => {
        return processedResults.find(r => r.id === filteredGame.id)!;
      }).filter(Boolean);
    }

    // PRIORITY-BASED: Calculate composite scores for ranking
    const scoredResults = processedResults.map(result => ({
      ...result,
      compositeScore: this.calculateCompositeScore(result, context)
    }));

    // PRIORITY-BASED: Much looser quality filtering
    const qualityFilteredResults = scoredResults.filter(result => {
      const meetsThreshold = (result.qualityScore || 0) >= context.qualityThreshold;
      return meetsThreshold;
    });

    // PRIORITY-BASED: Sort by composite score instead of just relevance
    const sortedResults = qualityFilteredResults.sort((a, b) => {
      return (b.compositeScore || 0) - (a.compositeScore || 0);
    });

    // Apply max results limit (now much higher)
    const finalResults = sortedResults.slice(0, context.maxResults);

    // Log filtering stats for debugging
    if (DEBUG_SEARCH_COORDINATION) {
      console.log(`📊 Search Pipeline Stats for "${context.originalQuery}":
        - Raw results: ${results.length}
        - After conditional filters: ${processedResults.length}
        - After quality threshold (${context.qualityThreshold}): ${qualityFilteredResults.length}
        - Final (max ${context.maxResults}): ${finalResults.length}`);
    }

    return finalResults;
  }

  /**
   * Calculate composite score for PRIORITY-BASED ranking
   * Combines multiple factors to rank games instead of filtering them out
   */
  private calculateCompositeScore(result: SearchResult, context: SearchContext): number {
    // Base scores (0-1 scale for each)
    const relevanceScore = result.relevanceScore || 0;
    const qualityScore = result.qualityScore || 0;

    // Additional scoring factors
    let canonicalBonus = 0;
    let popularityBonus = 0;
    let recencyBonus = 0;
    let legitimacyScore = 0;

    // Canonical game detection (main entries vs DLC/collections)
    const gameName = result.name.toLowerCase();
    const query = context.originalQuery.toLowerCase();
    const developer = (result.developer || '').toLowerCase();
    const publisher = (result.publisher || '').toLowerCase();

    // PUBLISHER VERIFICATION: Check for official publishers
    const franchisePublishers: Record<string, string[]> = {
      'pokemon': ['nintendo', 'game freak', 'the pokemon company', 'creatures inc', 'niantic'],
      'mario': ['nintendo'],
      'zelda': ['nintendo'],
      'sonic': ['sega', 'sonic team'],
      'final fantasy': ['square enix', 'square', 'squaresoft'],
      'mega man': ['capcom'],
      'call of duty': ['activision', 'infinity ward', 'treyarch', 'sledgehammer']
    };

    // Determine which franchise we're searching for
    let searchedFranchise = '';
    for (const franchise of Object.keys(franchisePublishers)) {
      if (query.includes(franchise)) {
        searchedFranchise = franchise;
        break;
      }
    }

    // Check if this game has an official publisher for the franchise
    if (searchedFranchise && franchisePublishers[searchedFranchise]) {
      const officialPubs = franchisePublishers[searchedFranchise];
      const hasOfficialPublisher = officialPubs.some(pub =>
        publisher.includes(pub) || developer.includes(pub)
      );

      if (hasOfficialPublisher) {
        legitimacyScore = 0.3; // Big boost for official games
      }
    }

    // FAN GAME DETECTION (as penalty instead of filter)
    // Check for known fan game patterns
    const fanGameIndicators = [
      // Known fan game titles
      'insurgence', 'uranium', 'prism', 'phoenix rising', 'sage', 'reborn',
      'rejuvenation', 'clover', 'glazed', 'gaia', 'light platinum', 'flora sky',
      'dark rising', 'zeta', 'omicron', 'eclipse', 'solar light', 'lunar dark',
      // Fan game naming patterns
      'fan made', 'fan game', 'fan-made', 'rom hack', 'homebrew',
      // Common fan game subtitles
      'cyan', 'orange', 'purple', 'indigo', 'turquoise', 'brown', 'gray'
    ];

    const isFanGame = fanGameIndicators.some(indicator =>
      gameName.includes(indicator)
    );

    // Additional fan game detection: missing publisher/developer
    const hasNoPublisher = !publisher || publisher === 'unknown' || publisher === 'n/a';
    const hasNoDeveloper = !developer || developer === 'unknown' || developer === 'n/a';
    const missingCredentials = hasNoPublisher && hasNoDeveloper;

    // Apply fan game penalties
    if (isFanGame) {
      legitimacyScore -= 0.5; // Heavy penalty for known fan games
    } else if (missingCredentials && searchedFranchise) {
      legitimacyScore -= 0.3; // Moderate penalty for games with no publisher/developer
    } else if (hasNoPublisher && searchedFranchise) {
      legitimacyScore -= 0.15; // Light penalty for missing publisher only
    }

    // Bonus for main/canonical entries
    if (!gameName.includes('dlc') &&
        !gameName.includes('expansion') &&
        !gameName.includes('pack') &&
        !gameName.includes('edition') &&
        !gameName.includes('collection')) {
      canonicalBonus = 0.15;
    }

    // Extra bonus for exact matches or numbered entries
    if (gameName === query ||
        gameName.match(/\b(i{1,3}|iv|v|vi{1,3}|ix|x{1,3}|\d+)\b/)) {
      canonicalBonus += 0.1;
    }

    // Special boost for main series Pokemon games
    if (searchedFranchise === 'pokemon') {
      const mainSeriesPatterns = [
        'red', 'blue', 'yellow', 'gold', 'silver', 'crystal',
        'ruby', 'sapphire', 'emerald', 'diamond', 'pearl', 'platinum',
        'black', 'white', 'x', 'y', 'sun', 'moon', 'ultra sun', 'ultra moon',
        'sword', 'shield', 'scarlet', 'violet', 'legends', 'arceus',
        'let\'s go', 'firered', 'leafgreen', 'heartgold', 'soulsilver'
      ];

      if (mainSeriesPatterns.some(pattern => gameName.includes(pattern))) {
        canonicalBonus += 0.15; // Extra boost for main series games
      }
    }

    // Popularity bonus (based on having complete metadata)
    if (result.developer && result.publisher) {
      popularityBonus += 0.05;
    }
    if (result.genres && result.genres.length > 0) {
      popularityBonus += 0.05;
    }
    if (result.summary && result.summary.length > 100) {
      popularityBonus += 0.05;
    }
    if (result.cover_url) {
      popularityBonus += 0.05;
    }

    // Recency bonus for newer games (if they have a release date)
    if (result.release_date) {
      const releaseYear = new Date(result.release_date).getFullYear();
      const currentYear = new Date().getFullYear();
      const yearsDiff = currentYear - releaseYear;

      if (yearsDiff <= 2) {
        recencyBonus = 0.1; // Very recent
      } else if (yearsDiff <= 5) {
        recencyBonus = 0.05; // Recent
      } else if (yearsDiff <= 10) {
        recencyBonus = 0.02; // Somewhat recent
      }
    }

    // Weighted composite score (adjusted weights to include legitimacy)
    const weights = {
      relevance: 0.30,    // 30% - How well it matches the search
      legitimacy: 0.25,   // 25% - Official vs fan game
      quality: 0.20,      // 20% - Metadata completeness and ratings
      canonical: 0.15,    // 15% - Whether it's a main game vs DLC
      popularity: 0.05,   // 5% - Popularity indicators
      recency: 0.05       // 5% - Newer games get slight boost
    };

    const compositeScore =
      (relevanceScore * weights.relevance) +
      (legitimacyScore * weights.legitimacy) +
      (qualityScore * weights.quality) +
      (canonicalBonus * weights.canonical) +
      (popularityBonus * weights.popularity) +
      (recencyBonus * weights.recency);

    // Log scoring for Pokemon games if debugging
    if (DEBUG_SEARCH_COORDINATION && searchedFranchise === 'pokemon' &&
        (gameName.includes('insurgence') || gameName.includes('uranium') || gameName.includes('scarlet'))) {
      console.log(`🎮 Scoring "${result.name}":
        - Relevance: ${relevanceScore.toFixed(2)}
        - Legitimacy: ${legitimacyScore.toFixed(2)} (Publisher: ${publisher || 'NONE'})
        - Quality: ${qualityScore.toFixed(2)}
        - Canonical: ${canonicalBonus.toFixed(2)}
        - Final Score: ${compositeScore.toFixed(3)}`);
    }

    // Ensure score is between 0 and 1
    return Math.min(Math.max(compositeScore, 0), 1);
  }

  /**
   * Calculate relevance score based on query match
   */
  private calculateRelevanceScore(gameName: string, query: string): number {
    const lowerGameName = gameName.toLowerCase();
    const lowerQuery = query.toLowerCase();
    
    // Exact match
    if (lowerGameName === lowerQuery) return 1.0;
    
    // Starts with query
    if (lowerGameName.startsWith(lowerQuery)) return 0.9;
    
    // Contains query as whole word at the beginning
    if (lowerGameName.startsWith(lowerQuery + ' ')) return 0.85;
    
    // Contains query as whole word
    const queryWords = lowerQuery.split(/\s+/);
    const gameWords = lowerGameName.split(/\s+/);
    const matchedWords = queryWords.filter(qWord => 
      gameWords.some(gWord => gWord.includes(qWord))
    );
    
    const wordMatchRatio = matchedWords.length / queryWords.length;
    
    // Early exit for poor matches to prevent unrelated results
    if (wordMatchRatio < 0.5) {
      // Check if at least one significant word matches
      const hasSignificantMatch = queryWords.some(qWord => 
        qWord.length >= 3 && gameWords.some(gWord => gWord.includes(qWord))
      );
      if (!hasSignificantMatch) {
        return 0.1; // Very low score for unrelated games
      }
    }
    
    // Boost score if query words appear in order
    let sequenceBonus = 0;
    if (wordMatchRatio > 0.5) {
      const queryPattern = queryWords.join('.*');
      const regex = new RegExp(queryPattern, 'i');
      if (regex.test(lowerGameName)) {
        sequenceBonus = 0.2;
      }
    }
    
    // Penalize if the game name contains completely unrelated franchise names
    const unrelatedPenalty = this.calculateUnrelatedPenalty(lowerGameName, lowerQuery);
    
    const baseScore = Math.min(0.7 * wordMatchRatio + sequenceBonus, 0.8);
    return Math.max(baseScore - unrelatedPenalty, 0.1);
  }
  
  /**
   * Calculate penalty for games that contain unrelated franchise names
   */
  private calculateUnrelatedPenalty(gameName: string, query: string): number {
    const queryWords = query.split(/\s+/);
    const gameWords = gameName.split(/\s+/);
    
    // Common franchise keywords that indicate different franchises
    const franchiseKeywords = [
      'mario', 'zelda', 'pokemon', 'sonic', 'mega man', 'megaman',
      'final fantasy', 'dragon quest', 'resident evil', 'silent hill',
      'metal gear', 'grand theft auto', 'call of duty', 'assassin',
      'elder scrolls', 'fallout', 'witcher', 'dark souls', 'halo',
      'uncharted', 'god of war', 'street fighter', 'mortal kombat',
      'tekken', 'kingdom hearts', 'persona', 'shin megami tensei'
    ];
    
    // Check if the game contains franchise keywords not present in the query
    const gameContainsUnrelatedFranchise = franchiseKeywords.some(franchise => {
      const franchiseWords = franchise.split(/\s+/);
      const gameContainsFranchise = franchiseWords.every(word => 
        gameWords.some(gWord => gWord.includes(word))
      );
      const queryContainsFranchise = franchiseWords.some(word => 
        queryWords.some(qWord => qWord.includes(word))
      );
      
      return gameContainsFranchise && !queryContainsFranchise;
    });
    
    return gameContainsUnrelatedFranchise ? 0.4 : 0; // Heavy penalty for unrelated franchises
  }

  /**
   * Calculate quality score based on game metadata
   */
  private calculateQualityScore(game: SearchResult): number {
    let score = 0.5; // Base score
    
    // Rating boost
    if (game.igdb_rating) {
      score += Math.min(game.igdb_rating / 100, 0.3); // Max +0.3 for perfect rating
    }
    
    // Complete metadata boost
    let metadataBonus = 0;
    if (game.summary && game.summary.length > 50) metadataBonus += 0.1;
    if (game.developer) metadataBonus += 0.05;
    if (game.publisher) metadataBonus += 0.05;
    if (game.genres && game.genres.length > 0) metadataBonus += 0.05;
    if (game.cover_url) metadataBonus += 0.05;
    
    score += metadataBonus;
    
    // Category bonus (main games preferred over DLC/mods)
    if (game.category === 0) score += 0.1; // Main game
    else if (game.category === 8) score += 0.05; // Remake/remaster
    else if (game.category === 5) score -= 0.2; // Mod (quality concern)
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Cache management
   */
  private buildCacheKey(query: string, intent: SearchIntent, options: any): string {
    return `advanced_search_${query}_${intent}_${options.maxResults || 'default'}_${options.useAggressive || false}`;
  }

  private getCachedResults(cacheKey: string): { results: SearchResult[]; metrics: SearchMetrics } | null {
    const cached = this.queryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return { results: cached.results, metrics: cached.metrics };
    }
    return null;
  }

  private cacheResults(cacheKey: string, results: SearchResult[], metrics: SearchMetrics): void {
    this.queryCache.set(cacheKey, {
      results,
      metrics,
      timestamp: Date.now()
    });
    
    // Clean old cache entries (keep cache size reasonable)
    if (this.queryCache.size > 100) {
      const oldestKey = Array.from(this.queryCache.keys())[0];
      this.queryCache.delete(oldestKey);
    }
  }

  /**
   * Get performance metrics for the search system
   */
  getPerformanceMetrics(): {
    cacheSize: number;
    cacheHitRate: number;
    averageSearchTime: number;
    igdbHealth: any;
    igdbTelemetry: any;
    circuitBreakerStatus: any;
  } {
    const igdbMetrics = igdbTelemetry.getMetrics();

    return {
      cacheSize: this.queryCache.size,
      cacheHitRate: 0, // Would be calculated from actual usage
      averageSearchTime: 0, // Would be calculated from actual usage
      igdbHealth: igdbHealthMonitor.getStats(),
      igdbTelemetry: {
        ...igdbMetrics,
        healthSummary: igdbTelemetry.getHealthSummary()
      },
      circuitBreakerStatus: igdbCircuitBreaker.getStats()
    };
  }

  /**
   * Get IGDB service health status
   */
  getIGDBHealth() {
    return {
      circuitBreaker: igdbCircuitBreaker.getStats(),
      healthMonitor: igdbHealthMonitor.getStats(),
      failureCache: igdbFailureCache.getStats(),
      telemetry: igdbTelemetry.getHealthSummary()
    };
  }

  /**
   * Reset IGDB error handling (for recovery)
   */
  resetIGDBErrorHandling(): void {
    igdbCircuitBreaker.reset();
    igdbFailureCache.clear();
    igdbTelemetry.reset();
    console.log('🔄 IGDB error handling reset');
  }

  /**
   * Clear search cache (for testing or memory management)
   */
  clearCache(): void {
    this.queryCache.clear();
    igdbFailureCache.clear();
    console.log('🧹 Search cache and failure cache cleared');
  }
}

// Export singleton instance
export const advancedSearchCoordination = new AdvancedSearchCoordination();