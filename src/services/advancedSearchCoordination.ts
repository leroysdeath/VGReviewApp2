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

import { GameDataServiceV2 } from './gameDataServiceV2';
import { sortGamesIntelligently, detectSearchIntent, SearchIntent } from '../utils/intelligentPrioritization';
import { filterProtectedContent } from '../utils/contentProtectionFilter';
import { normalizeAccents, expandWithAccentVariations, createSearchVariants } from '../utils/accentNormalization';

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
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.gameDataService = new GameDataServiceV2();
  }

  /**
   * Main search entry point with advanced coordination
   */
  async coordinatedSearch(
    query: string,
    options: {
      maxResults?: number;
      useAggressive?: boolean;
      bypassCache?: boolean;
      includeMetrics?: boolean;
    } = {}
  ): Promise<{
    results: SearchResult[];
    context: SearchContext;
    metrics?: SearchMetrics;
  }> {
    const startTime = Date.now();
    
    // Build search context
    const context = this.buildSearchContext(query, options);
    
    // Check cache first
    if (!options.bypassCache) {
      const cached = this.getCachedResults(context.cacheKey);
      if (cached) {
        console.log(`⚡ CACHE HIT: Returning ${cached.results.length} cached results for "${query}"`);
        return {
          results: cached.results,
          context,
          metrics: options.includeMetrics ? cached.metrics : undefined
        };
      }
    }
    
    console.log(`🚀 ADVANCED SEARCH: "${query}" (Intent: ${context.searchIntent}, Threshold: ${context.qualityThreshold})`);
    
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
      metrics: options.includeMetrics ? metrics : undefined
    };
  }

  /**
   * Build comprehensive search context
   */
  private buildSearchContext(query: string, options: any): SearchContext {
    const intent = detectSearchIntent(query);
    const expandedQueries = this.expandQuery(query, intent);
    
    return {
      originalQuery: query,
      expandedQueries,
      searchIntent: intent,
      qualityThreshold: this.calculateQualityThreshold(intent, query),
      maxResults: options.maxResults || this.getDefaultMaxResults(intent),
      useAggressive: options.useAggressive || false,
      cacheKey: this.buildCacheKey(query, intent, options)
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
    
    console.log(`🔤 Accent expansions for "${query}":`, accentVariations);

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
   */
  private calculateQualityThreshold(intent: SearchIntent, query: string): number {
    const baseQuery = query.toLowerCase();
    
    // Higher thresholds for specific searches (want exact matches)
    if (intent === SearchIntent.SPECIFIC_GAME) {
      return 0.8;
    }
    
    // Medium thresholds for franchise browsing (balance quality and coverage)
    if (intent === SearchIntent.FRANCHISE_BROWSE) {
      // Popular franchises can be more selective
      const popularFranchises = ['mario', 'zelda', 'pokemon', 'final fantasy', 'call of duty'];
      if (popularFranchises.some(franchise => baseQuery.includes(franchise))) {
        return 0.6;
      }
      return 0.4;
    }
    
    // Lower thresholds for discovery (want more results)
    if (intent === SearchIntent.GENRE_DISCOVERY || intent === SearchIntent.YEAR_SEARCH) {
      return 0.3;
    }
    
    // Default moderate threshold
    return 0.5;
  }

  /**
   * Get appropriate max results based on search intent
   */
  private getDefaultMaxResults(intent: SearchIntent): number {
    switch (intent) {
      case SearchIntent.SPECIFIC_GAME:
        return 50; // Allow for variations and similar games
      case SearchIntent.FRANCHISE_BROWSE:
        return 150; // Full franchise coverage for pagination
      case SearchIntent.GENRE_DISCOVERY:
        return 150; // Extensive results for discovery
      case SearchIntent.YEAR_SEARCH:
        return 100; // Recent games exploration
      case SearchIntent.DEVELOPER_SEARCH:
        return 100; // Developer portfolio browsing
      case SearchIntent.PLATFORM_SEARCH:
        return 100; // Platform library browsing
      default:
        return 100; // Default to enough for pagination
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
   * Execute coordinated search with smart query prioritization and batching
   */
  private async executeCoordinatedSearch(context: SearchContext): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    const seenIds = new Set<number>();

    // SMART QUERY EXECUTION: Prioritize and limit queries to prevent rate limiting
    const prioritizedQueries = this.prioritizeQueries(context.expandedQueries, context.originalQuery);
    const maxQueries = Math.min(prioritizedQueries.length, 5); // Limit to 5 queries max
    const selectedQueries = prioritizedQueries.slice(0, maxQueries);

    console.log(`🔍 Smart execution: Using ${selectedQueries.length} prioritized queries from ${context.expandedQueries.length} expansions:`, selectedQueries);

    // Execute selected queries with concurrency control
    const batchSize = 2; // Execute 2 queries at a time
    for (let i = 0; i < selectedQueries.length; i += batchSize) {
      const batch = selectedQueries.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (expandedQuery) => {
        try {
          const queryResults = await this.gameDataService.searchGames(expandedQuery);
          
          // Convert to SearchResult format and add source tracking
          const convertedResults: SearchResult[] = queryResults.map(game => ({
            ...game,
            source: 'hybrid' as const,
            relevanceScore: this.calculateRelevanceScore(game.name, context.originalQuery),
            qualityScore: this.calculateQualityScore(game)
          }));

          return { query: expandedQuery, results: convertedResults };
        } catch (error) {
          console.error(`❌ Query failed for "${expandedQuery}":`, error);
          return { query: expandedQuery, results: [] };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Add results from this batch
      for (const { query, results } of batchResults) {
        for (const result of results) {
          if (!seenIds.has(result.id)) {
            seenIds.add(result.id);
            allResults.push(result);
          }
        }
      }

      // Early termination if we have enough results
      if (allResults.length >= 20) {
        console.log(`✂️ Early termination: Found ${allResults.length} results after ${i + batchSize} queries`);
        break;
      }
    }

    console.log(`📊 Smart results: ${allResults.length} games from ${selectedQueries.length} prioritized queries`);

    // Apply advanced filtering and sorting
    return this.processSearchResults(allResults, context);
  }

  /**
   * Process search results with advanced filtering and sorting
   */
  private processSearchResults(results: SearchResult[], context: SearchContext): SearchResult[] {
    console.log(`🔧 Processing ${results.length} raw results...`);

    // Apply content protection filtering
    const contentFilteredResults = filterProtectedContent(results.map(r => ({
      id: r.id,
      name: r.name,
      developer: r.developer,
      publisher: r.publisher,
      category: r.category,
      genres: r.genres,
      summary: r.summary
    }))).map(filteredGame => {
      return results.find(r => r.id === filteredGame.id)!;
    }).filter(Boolean);

    console.log(`🛡️ Content filtering: ${results.length} → ${contentFilteredResults.length} (${results.length - contentFilteredResults.length} filtered)`);

    // Apply quality threshold filtering
    const qualityFilteredResults = contentFilteredResults.filter(result => {
      const meetsThreshold = (result.qualityScore || 0) >= context.qualityThreshold;
      return meetsThreshold;
    });

    console.log(`⭐ Quality filtering: ${contentFilteredResults.length} → ${qualityFilteredResults.length} (threshold: ${context.qualityThreshold})`);

    // Sort by intelligent prioritization
    const sortedResults = sortGamesIntelligently(
      qualityFilteredResults, 
      context.originalQuery
    );

    // Apply max results limit
    const finalResults = sortedResults.slice(0, context.maxResults);

    console.log(`✅ Final results: ${finalResults.length} games (limit: ${context.maxResults})`);

    return finalResults;
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
    
    // Contains query as whole word
    const queryWords = lowerQuery.split(/\s+/);
    const gameWords = lowerGameName.split(/\s+/);
    const matchedWords = queryWords.filter(qWord => 
      gameWords.some(gWord => gWord.includes(qWord))
    );
    
    const wordMatchRatio = matchedWords.length / queryWords.length;
    
    // Boost score if query words appear in order
    let sequenceBonus = 0;
    if (wordMatchRatio > 0.5) {
      const queryPattern = queryWords.join('.*');
      const regex = new RegExp(queryPattern, 'i');
      if (regex.test(lowerGameName)) {
        sequenceBonus = 0.2;
      }
    }
    
    return Math.min(0.7 * wordMatchRatio + sequenceBonus, 0.8);
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
  } {
    // This would track metrics over time in a production system
    return {
      cacheSize: this.queryCache.size,
      cacheHitRate: 0, // Would be calculated from actual usage
      averageSearchTime: 0 // Would be calculated from actual usage
    };
  }

  /**
   * Clear search cache (for testing or memory management)
   */
  clearCache(): void {
    this.queryCache.clear();
    console.log('🧹 Search cache cleared');
  }
}

// Export singleton instance
export const advancedSearchCoordination = new AdvancedSearchCoordination();