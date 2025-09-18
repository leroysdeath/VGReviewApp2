/**
 * IGDB Service V2 - Enhanced with Layer 1 improvements
 * Integrates multi-query strategy and better query building
 */

// Debug flag to control console logging
const DEBUG_IGDB = false;

import { filterProtectedContent, getFilterStats } from '../utils/contentProtectionFilter';
import { sortGamesByPriority, calculateGamePriority } from '../utils/gamePrioritization';
import { rankByFuzzyMatch } from '../utils/fuzzySearch';
import { enhancedIGDBService } from './enhancedIGDBService';

// Re-export the IGDBGame interface
export interface IGDBGame {
  id: number;
  name: string;
  summary?: string;
  first_release_date?: number;
  rating?: number;
  total_rating?: number;
  total_rating_count?: number;
  follows?: number;
  hypes?: number;
  category?: number;
  cover?: {
    id: number;
    url: string;
  };
  genres?: Array<{
    id: number;
    name: string;
  }>;
  platforms?: Array<{
    id: number;
    name: string;
  }>;
  involved_companies?: Array<{
    company: {
      name: string;
    };
    developer?: boolean;
    publisher?: boolean;
  }>;
  alternative_names?: Array<{
    id: number;
    name: string;
  }>;
  collection?: {
    id: number;
    name: string;
  };
  franchise?: {
    id: number;
    name: string;
  };
  franchises?: Array<{
    id: number;
    name: string;
  }>;
  parent_game?: number;
  version_parent?: number;
  dlcs?: number[];
  expansions?: number[];
  similar_games?: number[];
}

/**
 * Enhanced IGDB Service V2
 */
export class IGDBServiceV2 {
  private readonly endpoint = '/.netlify/functions/igdb-search';
  
  /**
   * Main search function with all Layer 1 enhancements
   */
  async searchGames(query: string, limit: number = 20): Promise<IGDBGame[]> {
    try {
      if (!query.trim()) {
        return [];
      }
      
      console.log('🚀 IGDB V2 Enhanced Search:', query);
      
      // Use multi-query strategy for better coverage
      let rawGames: IGDBGame[];
      
      // Check if this is a franchise search
      const isFranchise = this.detectFranchiseSearch(query);
      
      if (isFranchise) {
        console.log('🎮 Franchise search detected - using multi-query strategy');
        rawGames = await enhancedIGDBService.multiQuerySearch(query);
      } else {
        console.log('🔍 Specific search - using optimized single query');
        rawGames = await this.performOptimizedSearch(query, limit);
      }
      
      if (DEBUG_IGDB) console.log(`✅ Raw results: ${rawGames.length} games found`);
      
      // Apply content protection filter
      const filteredGames = this.applyContentFilters(rawGames, query);
      if (DEBUG_IGDB) console.log(`🛡️ After content filters: ${filteredGames.length} games`);
      
      // Apply category filters
      let categoryFiltered = this.applyCategoryFilters(filteredGames);
      if (DEBUG_IGDB) console.log(`📦 After category filters: ${categoryFiltered.length} games`);
      
      // Apply relevance filtering
      categoryFiltered = this.filterByRelevance(categoryFiltered, query);
      if (DEBUG_IGDB) console.log(`🎯 After relevance filter: ${categoryFiltered.length} games`);
      
      // Check for sister games if applicable
      if (categoryFiltered.length < limit) {
        const sisterGames = await this.findSisterGames(query, categoryFiltered);
        if (sisterGames.length > 0) {
          if (DEBUG_IGDB) console.log(`👯 Found ${sisterGames.length} sister games`);
          categoryFiltered = this.mergeUnique(categoryFiltered, sisterGames);
        }
      }
      
      // Apply fuzzy ranking for better title matching
      if (categoryFiltered.length > 1) {
        categoryFiltered = rankByFuzzyMatch(categoryFiltered, query);
      }
      
      // Apply intelligent prioritization
      const prioritized = this.applyPrioritization(categoryFiltered, query);
      
      // Return limited results
      return prioritized.slice(0, limit);
      
    } catch (error) {
      console.error('IGDB V2 search failed:', error);
      throw error;
    }
  }
  
  /**
   * Perform optimized search with better query building
   */
  private async performOptimizedSearch(query: string, limit: number): Promise<IGDBGame[]> {
    // Build optimized query
    const optimizedQuery = enhancedIGDBService.buildEnhancedQuery(query, {
      searchType: this.detectFranchiseSearch(query) ? 'franchise' : 'specific',
      limit: limit * 2, // Get more results for filtering
      sortBy: 'total_rating'
    });
    
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        isBulkRequest: true,
        endpoint: 'games',
        requestBody: optimizedQuery
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
   * Apply content protection filters
   */
  private applyContentFilters(games: IGDBGame[], query: string): IGDBGame[] {
    const transformed = games.map(game => ({
      id: game.id,
      name: game.name,
      allNames: [game.name, ...(game.alternative_names?.map(alt => alt.name) || [])].filter(Boolean),
      developer: game.involved_companies?.find(c => c.developer)?.company?.name,
      publisher: game.involved_companies?.find(c => c.publisher)?.company?.name,
      summary: game.summary,
      description: game.summary,
      category: game.category,
      genres: game.genres?.map(g => g.name) || [],
      franchise: game.franchise?.name,
      collection: game.collection?.name,
    }));
    
    const filtered = filterProtectedContent(transformed);
    
    // Log filter statistics
    const stats = getFilterStats(transformed);
    if (stats.filtered > 0) {
      console.log('🛡️ Content filter stats:', stats);
    }
    
    // Convert back to IGDBGame format
    return filtered.map(game => games.find(raw => raw.id === game.id)!);
  }
  
  /**
   * Apply category filters (remove seasons, packs, etc.)
   */
  private applyCategoryFilters(games: IGDBGame[]): IGDBGame[] {
    return games.filter(game => {
      // Filter out problematic categories
      if (game.category === 7) { // Season
        if (DEBUG_IGDB) console.log(`🚫 Filtered season: "${game.name}"`);
        return false;
      }
      
      if (game.category === 14) { // Update
        if (DEBUG_IGDB) console.log(`🚫 Filtered update: "${game.name}"`);
        return false;
      }
      
      // Be more selective with packs/bundles
      if (game.category === 3) { // Bundle/Pack
        const name = game.name?.toLowerCase() || '';
        const isActualBundle = name.includes('bundle') || 
                              name.includes('collection') ||
                              name.includes('anthology') ||
                              name.includes('compilation');
        
        if (isActualBundle && !name.includes('edition')) {
          if (DEBUG_IGDB) console.log(`🚫 Filtered bundle: "${game.name}"`);
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Filter by relevance with dynamic thresholds
   */
  private filterByRelevance(games: IGDBGame[], query: string): IGDBGame[] {
    const threshold = this.detectFranchiseSearch(query) ? 0.08 : 0.12;
    
    return games.filter(game => {
      const relevance = this.calculateRelevance(game, query);
      if (relevance < threshold) {
        if (DEBUG_IGDB) console.log(`🚫 Low relevance: "${game.name}" (${relevance.toFixed(3)})`);
        return false;
      }
      return true;
    });
  }
  
  /**
   * Calculate relevance score
   */
  private calculateRelevance(game: IGDBGame, query: string): number {
    const q = query.toLowerCase();
    const name = game.name?.toLowerCase() || '';
    
    let score = 0;
    
    // Exact match
    if (name === q) return 1.0;
    
    // Contains query
    if (name.includes(q)) {
      score += 0.5;
    }
    
    // Query words in name
    const queryWords = q.split(/\s+/);
    const nameWords = name.split(/\s+/);
    const matchedWords = queryWords.filter(qw => 
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );
    score += (matchedWords.length / queryWords.length) * 0.3;
    
    // Franchise match
    if (game.franchises?.some(f => f.name.toLowerCase().includes(q))) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }
  
  /**
   * Find sister games (Pokemon-style paired releases)
   */
  private async findSisterGames(query: string, existingGames: IGDBGame[]): Promise<IGDBGame[]> {
    const patterns = enhancedIGDBService['detectSisterGamePatterns'](query);
    if (patterns.length === 0) return [];
    
    // PERFORMANCE FIX: Execute sister game searches sequentially to prevent rate limiting
    const results: IGDBGame[][] = [];
    for (const pattern of patterns) {
      try {
        const result = await this.performOptimizedSearch(pattern, 5);
        results.push(result);
      } catch {
        results.push([]);
      }
    }
    const flat = results.flat();
    
    // Filter out games we already have
    const existingIds = new Set(existingGames.map(g => g.id));
    return flat.filter(g => !existingIds.has(g.id));
  }
  
  /**
   * Apply intelligent prioritization
   */
  private applyPrioritization(games: IGDBGame[], query: string): IGDBGame[] {
    // Convert to format expected by prioritization
    const gamesForPriority = games.map(game => ({
      ...game,
      genres: game.genres?.map(g => g.name) || [],
      developer: game.involved_companies?.find(c => c.developer)?.company?.name,
      publisher: game.involved_companies?.find(c => c.publisher)?.company?.name,
      igdb_rating: game.rating
    }));
    
    // Apply prioritization
    const sorted = sortGamesByPriority(gamesForPriority as any);
    
    // Convert back
    return sorted.map(sortedGame => {
      const original = games.find(g => g.id === sortedGame.id);
      return original || sortedGame;
    }) as IGDBGame[];
  }
  
  /**
   * Detect if this is a franchise search
   */
  private detectFranchiseSearch(query: string): boolean {
    const term = query.toLowerCase();
    const franchises = [
      'mario', 'zelda', 'pokemon', 'final fantasy', 'call of duty',
      'assassin', 'grand theft auto', 'mega man', 'sonic', 'halo',
      'god of war', 'uncharted', 'last of us', 'resident evil'
    ];
    
    return franchises.some(f => term.includes(f));
  }
  
  /**
   * Merge arrays keeping unique games only
   */
  private mergeUnique(games1: IGDBGame[], games2: IGDBGame[]): IGDBGame[] {
    const seen = new Set(games1.map(g => g.id));
    const unique = games2.filter(g => !seen.has(g.id));
    return [...games1, ...unique];
  }
  
  /**
   * Get game by ID
   */
  async getGameById(gameId: number): Promise<IGDBGame | null> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'getById',
          gameId: gameId
        })
      });
      
      if (!response.ok) {
        throw new Error(`IGDB API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'IGDB API error');
      }
      
      return data.games?.[0] || null;
      
    } catch (error) {
      console.error('IGDB game fetch failed:', error);
      throw error;
    }
  }
  
  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: 'test',
          limit: 1
        })
      });
      
      const data = await response.json();
      return response.ok && data.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const igdbServiceV2 = new IGDBServiceV2();