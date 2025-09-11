/**
 * Enhanced IGDB Service - Layer 1 Implementation
 * Implements multi-factor query building and multi-query strategy for better search coverage
 */

import { IGDBGame } from './igdbService';

interface QueryOptions {
  searchType?: 'franchise' | 'specific' | 'general';
  limit?: number;
  sortBy?: 'rating' | 'follows' | 'total_rating' | 'relevance' | 'first_release_date';
  includeCategories?: number[];
  excludeCategories?: number[];
  requireRating?: boolean;
}

interface MultiQueryResult {
  priority: number;
  query: string;
  results: IGDBGame[];
}

/**
 * Enhanced IGDB Service with multi-query strategy and better sorting
 */
export class EnhancedIGDBService {
  private readonly endpoint = '/.netlify/functions/igdb-search';
  
  /**
   * Build an optimized IGDB query with sorting and filtering
   */
  buildEnhancedQuery(searchTerm: string, options: QueryOptions = {}): string {
    const baseFields = `
      fields name, summary, storyline, slug, first_release_date, rating, 
      total_rating, total_rating_count, follows, hypes, category, 
      cover.url, screenshots.url, genres.name, platforms.name, 
      involved_companies.company.name, involved_companies.developer, 
      involved_companies.publisher, alternative_names.name, 
      collection.name, franchise.name, franchises.name, 
      parent_game, version_parent, url, dlcs, expansions, similar_games
    `.trim();
    
    let query = baseFields + '; ';
    
    // Determine search type if not specified
    const searchType = options.searchType || this.detectSearchType(searchTerm);
    
    if (searchType === 'franchise') {
      // For franchise searches, use broader matching and better sorting
      query += `search "${searchTerm}"; `;
      
      // Include main games, remakes, remasters, expansions
      const allowedCategories = options.includeCategories || [0, 2, 4, 8, 9, 10, 11];
      query += `where (category = (${allowedCategories.join(',')}) | version_parent != null | parent_game != null); `;
      
      // Sort by total rating with fallback to follows
      const sortField = options.sortBy || 'total_rating';
      if (sortField === 'total_rating') {
        query += `sort total_rating desc; where total_rating != null; `;
      } else if (sortField === 'follows') {
        query += `sort follows desc; `;
      } else {
        query += `sort ${sortField} desc; `;
      }
      
      query += `limit ${options.limit || 100}; `;
    } else if (searchType === 'specific') {
      // For specific title searches, be more precise
      query += `search "${searchTerm}"; `;
      
      // Exclude problematic categories
      const excludedCategories = options.excludeCategories || [5, 7, 13, 14];
      query += `where category != (${excludedCategories.join(',')}); `;
      
      // Sort by relevance (follows is a good proxy)
      query += `sort follows desc; `;
      query += `limit ${options.limit || 50}; `;
    } else {
      // General search
      query += `search "${searchTerm}"; `;
      query += `limit ${options.limit || 50}; `;
    }
    
    return query;
  }
  
  /**
   * Execute multiple targeted queries and merge results
   */
  async multiQuerySearch(searchTerm: string): Promise<IGDBGame[]> {
    const queries: Array<{ priority: number; query: string; description: string }> = [];
    
    // 1. Exact match for main games
    queries.push({
      priority: 100,
      description: 'Exact match main games',
      query: this.buildQueryForExactMatch(searchTerm)
    });
    
    // 2. Franchise search for series
    if (this.isFranchiseSearch(searchTerm)) {
      queries.push({
        priority: 80,
        description: 'Franchise search',
        query: this.buildQueryForFranchise(searchTerm)
      });
    }
    
    // 3. Alternative names search
    queries.push({
      priority: 60,
      description: 'Alternative names',
      query: this.buildQueryForAlternativeNames(searchTerm)
    });
    
    // 4. Collection search for compilations
    queries.push({
      priority: 40,
      description: 'Collections',
      query: this.buildQueryForCollections(searchTerm)
    });
    
    console.log(`🔍 Executing ${queries.length} targeted queries for "${searchTerm}"`);
    
    // Execute queries in parallel
    const queryPromises = queries.map(async (q) => {
      try {
        const results = await this.executeQuery(q.query);
        console.log(`✅ ${q.description}: ${results.length} results`);
        return { ...q, results };
      } catch (error) {
        console.log(`⚠️ ${q.description} failed:`, error);
        return { ...q, results: [] };
      }
    });
    
    const queryResults = await Promise.all(queryPromises);
    
    // Merge results by priority
    return this.mergeResultsByPriority(queryResults);
  }
  
  /**
   * Build query for exact name matches
   */
  private buildQueryForExactMatch(searchTerm: string): string {
    return `
      fields name, summary, first_release_date, rating, total_rating, 
      total_rating_count, follows, category, cover.url, genres.name, 
      platforms.name, involved_companies.company.name, franchises.name;
      where name ~ *"${searchTerm}"* & category = (0,8,9,10);
      sort total_rating desc;
      limit 20;
    `.trim();
  }
  
  /**
   * Build query for franchise searches
   */
  private buildQueryForFranchise(searchTerm: string): string {
    const franchiseName = this.extractFranchiseName(searchTerm);
    return `
      fields name, summary, first_release_date, rating, total_rating, 
      total_rating_count, follows, category, cover.url, genres.name, 
      platforms.name, involved_companies.company.name, franchises.name;
      where franchises.name ~ *"${franchiseName}"*;
      sort first_release_date asc;
      limit 50;
    `.trim();
  }
  
  /**
   * Build query for alternative names
   */
  private buildQueryForAlternativeNames(searchTerm: string): string {
    return `
      fields name, summary, first_release_date, rating, total_rating, 
      total_rating_count, follows, category, cover.url, genres.name, 
      platforms.name, involved_companies.company.name, alternative_names.name;
      where alternative_names.name ~ *"${searchTerm}"*;
      sort total_rating desc;
      limit 10;
    `.trim();
  }
  
  /**
   * Build query for collections
   */
  private buildQueryForCollections(searchTerm: string): string {
    return `
      fields name, summary, first_release_date, rating, total_rating, 
      total_rating_count, follows, category, cover.url, genres.name, 
      platforms.name, involved_companies.company.name, collection.name;
      where collection.name ~ *"${searchTerm}"*;
      sort first_release_date desc;
      limit 20;
    `.trim();
  }
  
  /**
   * Execute a single IGDB query
   */
  private async executeQuery(query: string): Promise<IGDBGame[]> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isBulkRequest: true,
        endpoint: 'games',
        requestBody: query
      })
    });
    
    if (!response.ok) {
      throw new Error(`IGDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'IGDB API error');
    }
    
    return data.games || [];
  }
  
  /**
   * Merge results from multiple queries by priority
   */
  private mergeResultsByPriority(queryResults: MultiQueryResult[]): IGDBGame[] {
    const seenIds = new Set<number>();
    const mergedResults: IGDBGame[] = [];
    
    // Sort by priority (highest first)
    queryResults.sort((a, b) => b.priority - a.priority);
    
    // Add games in priority order, avoiding duplicates
    for (const queryResult of queryResults) {
      for (const game of queryResult.results) {
        if (!seenIds.has(game.id)) {
          seenIds.add(game.id);
          mergedResults.push(game);
        }
      }
    }
    
    return mergedResults;
  }
  
  /**
   * Detect the type of search being performed
   */
  private detectSearchType(searchTerm: string): 'franchise' | 'specific' | 'general' {
    const term = searchTerm.toLowerCase();
    
    // Check for specific game indicators first (numbers, subtitles)
    // This takes precedence to handle cases like "Super Mario 64" as specific
    if (/\d+$/.test(term) || /\b(i{1,3}|iv|v|vi{1,3}|ix|x)\b/i.test(term) || term.includes(':') || term.includes('-')) {
      return 'specific';
    }
    
    // Check for franchise indicators
    const franchiseKeywords = [
      'mario', 'zelda', 'pokemon', 'final fantasy', 'call of duty',
      'assassin', 'grand theft auto', 'mega man', 'sonic', 'halo',
      'god of war', 'uncharted', 'last of us', 'resident evil'
    ];
    
    for (const franchise of franchiseKeywords) {
      if (term.includes(franchise)) {
        return 'franchise';
      }
    }
    
    return 'general';
  }
  
  /**
   * Check if this is a franchise search
   */
  private isFranchiseSearch(searchTerm: string): boolean {
    return this.detectSearchType(searchTerm) === 'franchise';
  }
  
  /**
   * Extract franchise name from search term
   */
  private extractFranchiseName(searchTerm: string): string {
    const term = searchTerm.toLowerCase();
    
    // Map common search terms to franchise names
    const franchiseMap: Record<string, string> = {
      'mario': 'mario',
      'super mario': 'mario',
      'zelda': 'the legend of zelda',
      'pokemon': 'pokémon',
      'final fantasy': 'final fantasy',
      'ff': 'final fantasy',
      'cod': 'call of duty',
      'gta': 'grand theft auto',
      'megaman': 'mega man',
      'mega man': 'mega man'
    };
    
    for (const [key, value] of Object.entries(franchiseMap)) {
      if (term.includes(key)) {
        return value;
      }
    }
    
    return searchTerm;
  }
  
  /**
   * Sister game detection for Pokemon-style paired releases
   */
  async searchWithSisterGames(searchTerm: string, limit: number = 20): Promise<IGDBGame[]> {
    const baseResults = await this.multiQuerySearch(searchTerm);
    
    // Check for sister game patterns
    const sisterPatterns = this.detectSisterGamePatterns(searchTerm);
    if (sisterPatterns.length === 0) {
      return baseResults.slice(0, limit);
    }
    
    console.log(`👯 Searching for sister games: ${sisterPatterns.join(', ')}`);
    
    // Search for sister games
    const sisterSearches = sisterPatterns.map(pattern => 
      this.executeQuery(this.buildQueryForExactMatch(pattern))
        .catch(() => [])
    );
    
    const sisterResults = await Promise.all(sisterSearches);
    const flatSisterResults = sisterResults.flat();
    
    // Merge with base results
    const existingIds = new Set(baseResults.map(g => g.id));
    const uniqueSisterGames = flatSisterResults.filter(g => !existingIds.has(g.id));
    
    console.log(`✅ Found ${uniqueSisterGames.length} sister games`);
    
    return [...baseResults, ...uniqueSisterGames].slice(0, limit);
  }
  
  /**
   * Detect sister game patterns (e.g., Pokemon Red → Pokemon Blue)
   */
  private detectSisterGamePatterns(searchTerm: string): string[] {
    const term = searchTerm.toLowerCase();
    const patterns: string[] = [];
    
    // Pokemon generation patterns
    const pokemonGenerations = [
      ['red', 'blue', 'yellow', 'green'],
      ['gold', 'silver', 'crystal'],
      ['ruby', 'sapphire', 'emerald'],
      ['diamond', 'pearl', 'platinum'],
      ['black', 'white'],
      ['x', 'y'],
      ['sun', 'moon', 'ultra sun', 'ultra moon'],
      ['sword', 'shield'],
      ['scarlet', 'violet']
    ];
    
    if (term.includes('pokemon') || term.includes('pokémon')) {
      for (const generation of pokemonGenerations) {
        for (const version of generation) {
          if (term.includes(version)) {
            // Add other versions from the same generation
            for (const sister of generation) {
              if (sister !== version) {
                patterns.push(term.replace(version, sister));
              }
            }
            break;
          }
        }
      }
    }
    
    // Fire Emblem patterns
    if (term.includes('fire emblem')) {
      const fePatterns = [
        ['birthright', 'conquest', 'revelation'],
        ['shadow dragon', 'new mystery']
      ];
      
      for (const group of fePatterns) {
        for (const version of group) {
          if (term.includes(version)) {
            for (const sister of group) {
              if (sister !== version) {
                patterns.push(term.replace(version, sister));
              }
            }
            break;
          }
        }
      }
    }
    
    // Oracle games
    if (term.includes('oracle')) {
      if (term.includes('ages')) {
        patterns.push(term.replace('ages', 'seasons'));
      } else if (term.includes('seasons')) {
        patterns.push(term.replace('seasons', 'ages'));
      }
    }
    
    return patterns;
  }
  
  /**
   * Series expansion for numbered sequels
   */
  expandSeriesSearch(searchTerm: string): string[] {
    const expanded: string[] = [searchTerm];
    const term = searchTerm.toLowerCase();
    
    // Numbered sequel patterns
    const numberMatch = term.match(/\d+$/);
    if (numberMatch) {
      const baseTitle = term.replace(/\d+$/, '').trim();
      const number = parseInt(numberMatch[0]);
      
      // Add nearby numbers
      for (let i = Math.max(1, number - 2); i <= number + 2; i++) {
        if (i !== number) {
          expanded.push(`${baseTitle} ${i}`);
        }
      }
    }
    
    // Roman numeral patterns
    const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const romanPattern = new RegExp(`\\b(${romanNumerals.join('|')})\\b`, 'i');
    const romanMatch = searchTerm.match(romanPattern);
    
    if (romanMatch) {
      const matchedNumeral = romanMatch[0].toUpperCase();
      const index = romanNumerals.indexOf(matchedNumeral);
      const baseTitle = searchTerm.replace(romanPattern, '').trim();
      
      // Add arabic number version
      expanded.push(`${baseTitle} ${index + 1}`);
      
      // Add nearby roman numerals
      if (index > 0) {
        expanded.push(`${baseTitle} ${romanNumerals[index - 1]}`);
      }
      if (index < romanNumerals.length - 1) {
        expanded.push(`${baseTitle} ${romanNumerals[index + 1]}`);
      }
    }
    
    // Subtitle patterns - search base franchise
    if (term.includes(':') || term.includes(' - ')) {
      const baseTitle = searchTerm.split(/[:\-]/)[0].trim();
      expanded.push(baseTitle);
    }
    
    return [...new Set(expanded)];
  }
}

export const enhancedIGDBService = new EnhancedIGDBService();