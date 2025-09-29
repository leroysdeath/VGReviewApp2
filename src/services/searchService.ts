/**
 * Unified Search Service
 * Consolidates searchCoordinator, secureSearchService, searchDeduplicationService,
 * searchCacheService, enhancedSearchService, gameSearchService, and advancedSearchCoordination
 *
 * Features:
 * - Secure search with SQL injection prevention
 * - Intelligent caching with LRU eviction
 * - Search coordination with debouncing
 * - Duplicate result detection and removal
 * - Full-text search with ranking
 * - Game-specific search operations
 */

import { supabase } from './supabase';
import { sanitizeSearchTerm } from '../utils/sqlSecurity';
import type { GameWithCalculatedFields } from '../types/database';

const DEBUG_SEARCH = false;

// Unified interfaces - consolidating from all search services
export interface SearchOptions {
  query: string;
  limit?: number;
  exact_phrase?: boolean;
  genre_filter?: string[];
  platform_filter?: string[];
  release_year?: number;
  min_rating?: number;
}

export interface SearchResult {
  id: number;
  name: string;
  summary: string | null;
  description: string | null;
  release_date: string | null;
  cover_url: string | null;
  genres: string[] | null;
  platforms: string[] | null;
  igdb_id: number;
  search_rank?: number;
  relevance_score?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  search_time_ms: number;
  query_used: string;
  cache_hit?: boolean;
  deduplicated_count?: number;
}

export interface GameSearchResult extends GameWithCalculatedFields {
  search_rank?: number;
  relevance_score?: number;
}

interface SearchRequest {
  id: string;
  source: string;
  query: string;
  timestamp: number;
}

interface SearchExecutor {
  (query: string): Promise<any>;
}

interface CachedSearchResult {
  results: SearchResult[];
  total_count: number;
  timestamp: number;
  hits: number;
}

interface DuplicateGroup {
  canonical_id: number;
  duplicate_ids: number[];
  confidence: number;
  match_type: 'exact' | 'fuzzy' | 'igdb' | 'slug';
}

/**
 * Unified Search Service - handles all search operations
 */
class UnifiedSearchService {
  // Coordination and debouncing
  private activeSearchId: string | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private searchExecutor: SearchExecutor | null = null;
  private pendingRequests = new Map<string, SearchRequest>();

  // Caching system
  private searchCache = new Map<string, CachedSearchResult>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Deduplication
  private duplicateCache = new Map<string, DuplicateGroup[]>();
  private readonly SIMILARITY_THRESHOLD = 0.8;

  constructor() {
    // Set up cache cleanup interval only in browser environment
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanupCache(), 60000); // Every minute
    }
  }

  /**
   * Search Coordination
   */
  setExecutor(executor: SearchExecutor): void {
    this.searchExecutor = executor;
  }

  async requestSearch(
    source: string,
    query: string,
    delay: number = 1500,
    immediate: boolean = false
  ): Promise<void> {
    const searchId = `${source}-${Date.now()}-${Math.random()}`;

    this.cancelActiveSearch();
    this.activeSearchId = searchId;

    const request: SearchRequest = {
      id: searchId,
      source,
      query,
      timestamp: Date.now()
    };

    this.pendingRequests.set(searchId, request);

    if (immediate) {
      await this.executeSearch(searchId);
    } else {
      this.debounceTimer = setTimeout(() => {
        this.executeSearch(searchId);
      }, delay);
    }
  }

  private async executeSearch(searchId: string): Promise<void> {
    const request = this.pendingRequests.get(searchId);
    if (!request || this.activeSearchId !== searchId) {
      return;
    }

    try {
      if (this.searchExecutor) {
        await this.searchExecutor(request.query);
      }
    } catch (error) {
      if (DEBUG_SEARCH) console.error('Search execution failed:', error);
    } finally {
      this.pendingRequests.delete(searchId);
      if (this.activeSearchId === searchId) {
        this.activeSearchId = null;
      }
    }
  }

  private cancelActiveSearch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.activeSearchId) {
      this.pendingRequests.delete(this.activeSearchId);
      this.activeSearchId = null;
    }
  }

  /**
   * Cache Management
   */
  private cleanupCache(): void {
    const now = Date.now();

    // Clean expired entries
    for (const [key, cached] of this.searchCache.entries()) {
      if (now - cached.timestamp > this.CACHE_TTL) {
        this.searchCache.delete(key);
        if (DEBUG_SEARCH) console.log('🧹 Cleaned expired search cache:', key);
      }
    }

    // LRU eviction if cache too large
    if (this.searchCache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.searchCache.entries())
        .sort((a, b) => a[1].hits - b[1].hits)
        .slice(0, this.searchCache.size - this.MAX_CACHE_SIZE);

      for (const [key] of entries) {
        this.searchCache.delete(key);
        if (DEBUG_SEARCH) console.log('🧹 LRU evicted search cache:', key);
      }
    }

    // Clean duplicate cache
    for (const [key, groups] of this.duplicateCache.entries()) {
      if (now - groups[0]?.confidence > this.CACHE_TTL) {
        this.duplicateCache.delete(key);
      }
    }
  }

  private getCacheKey(query: string, options?: SearchOptions): string {
    const sortedOptions = options ? Object.keys(options).sort().map(k => `${k}:${JSON.stringify(options[k as keyof SearchOptions])}`).join('|') : '';
    return `${query}|${sortedOptions}`;
  }

  private getCachedResults(cacheKey: string): CachedSearchResult | null {
    const cached = this.searchCache.get(cacheKey);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.searchCache.delete(cacheKey);
      return null;
    }

    cached.hits++;
    if (DEBUG_SEARCH) console.log('🚀 Cache hit for search:', cacheKey);
    return cached;
  }

  private setCachedResults(cacheKey: string, results: SearchResult[], totalCount: number): void {
    this.searchCache.set(cacheKey, {
      results,
      total_count: totalCount,
      timestamp: Date.now(),
      hits: 0
    });
    if (DEBUG_SEARCH) console.log('💾 Cached search results:', cacheKey);
  }

  /**
   * Secure Search Operations
   */
  async searchGames(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const { query, limit = 20, exact_phrase = false, genre_filter, platform_filter, release_year, min_rating } = options;

    // Input validation and sanitization
    if (!query || typeof query !== 'string') {
      return {
        results: [],
        total_count: 0,
        search_time_ms: Date.now() - startTime,
        query_used: '',
        cache_hit: false
      };
    }

    const sanitizedQuery = sanitizeSearchTerm(query.trim());
    if (!sanitizedQuery) {
      return {
        results: [],
        total_count: 0,
        search_time_ms: Date.now() - startTime,
        query_used: '',
        cache_hit: false
      };
    }

    // Check cache first
    const cacheKey = this.getCacheKey(sanitizedQuery, options);
    const cached = this.getCachedResults(cacheKey);
    if (cached) {
      return {
        ...cached,
        search_time_ms: Date.now() - startTime,
        query_used: sanitizedQuery,
        cache_hit: true
      };
    }

    try {
      // Use secure RPC function for search
      const { data: results, error } = await supabase.rpc('secure_game_search', {
        search_query: sanitizedQuery,
        search_limit: Math.min(limit, 100),
        use_phrase_search: exact_phrase,
        genre_filters: genre_filter || null,
        platform_filters: platform_filter || null,
        release_year_filter: release_year || null,
        min_rating_filter: min_rating || null
      });

      if (error) {
        if (DEBUG_SEARCH) console.error('❌ Search RPC error:', error);
        return {
          results: [],
          total_count: 0,
          search_time_ms: Date.now() - startTime,
          query_used: sanitizedQuery,
          cache_hit: false
        };
      }

      const searchResults = results || [];
      const deduplicatedResults = await this.deduplicateResults(searchResults);

      // Cache the results
      this.setCachedResults(cacheKey, deduplicatedResults, deduplicatedResults.length);

      const response: SearchResponse = {
        results: deduplicatedResults,
        total_count: deduplicatedResults.length,
        search_time_ms: Date.now() - startTime,
        query_used: sanitizedQuery,
        cache_hit: false,
        deduplicated_count: searchResults.length - deduplicatedResults.length
      };

      if (DEBUG_SEARCH) console.log('✅ Search completed:', response);
      return response;

    } catch (error) {
      if (DEBUG_SEARCH) console.error('💥 Search error:', error);
      return {
        results: [],
        total_count: 0,
        search_time_ms: Date.now() - startTime,
        query_used: sanitizedQuery,
        cache_hit: false
      };
    }
  }

  /**
   * Game-Specific Search Operations
   */
  async searchGamesByTitle(title: string, limit: number = 10): Promise<GameSearchResult[]> {
    const options: SearchOptions = {
      query: title,
      limit,
      exact_phrase: false
    };

    const response = await this.searchGames(options);
    return this.convertToGameSearchResults(response.results);
  }

  async searchGamesByGenre(genre: string, limit: number = 20): Promise<GameSearchResult[]> {
    const options: SearchOptions = {
      query: '*', // Wildcard search
      limit,
      genre_filter: [genre]
    };

    const response = await this.searchGames(options);
    return this.convertToGameSearchResults(response.results);
  }

  async getGameSuggestions(partialQuery: string, limit: number = 5): Promise<GameSearchResult[]> {
    if (partialQuery.length < 2) return [];

    const options: SearchOptions = {
      query: partialQuery,
      limit,
      exact_phrase: false
    };

    const response = await this.searchGames(options);
    return this.convertToGameSearchResults(response.results);
  }

  async searchGamesAdvanced(
    query: string,
    filters: {
      genres?: string[];
      platforms?: string[];
      releaseYear?: number;
      minRating?: number;
    } = {},
    limit: number = 20
  ): Promise<GameSearchResult[]> {
    const options: SearchOptions = {
      query,
      limit,
      genre_filter: filters.genres,
      platform_filter: filters.platforms,
      release_year: filters.releaseYear,
      min_rating: filters.minRating
    };

    const response = await this.searchGames(options);
    return this.convertToGameSearchResults(response.results);
  }

  private convertToGameSearchResults(searchResults: SearchResult[]): GameSearchResult[] {
    return searchResults.map(result => ({
      id: result.id,
      name: result.name,
      summary: result.summary,
      description: result.description,
      release_date: result.release_date,
      cover_url: result.cover_url,
      genres: result.genres || [],
      platforms: result.platforms || [],
      igdb_id: result.igdb_id,
      search_rank: result.search_rank,
      relevance_score: result.relevance_score,
      // Add other required GameWithCalculatedFields properties
      slug: result.name.toLowerCase().replace(/\s+/g, '-'),
      averageUserRating: 0,
      totalUserRatings: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as GameSearchResult));
  }

  /**
   * Deduplication Operations
   */
  private async deduplicateResults(results: SearchResult[]): Promise<SearchResult[]> {
    if (results.length <= 1) return results;

    const duplicateGroups = this.detectDuplicates(results);
    const deduplicatedResults: SearchResult[] = [];
    const processedIds = new Set<number>();

    for (const result of results) {
      if (processedIds.has(result.id)) continue;

      // Check if this result is part of a duplicate group
      const group = duplicateGroups.find(g =>
        g.canonical_id === result.id || g.duplicate_ids.includes(result.id)
      );

      if (group) {
        // Use canonical result and mark all duplicates as processed
        const canonicalResult = results.find(r => r.id === group.canonical_id) || result;
        deduplicatedResults.push(canonicalResult);
        processedIds.add(group.canonical_id);
        group.duplicate_ids.forEach(id => processedIds.add(id));
      } else {
        // No duplicates found, include the result
        deduplicatedResults.push(result);
        processedIds.add(result.id);
      }
    }

    if (DEBUG_SEARCH && duplicateGroups.length > 0) {
      console.log(`🔄 Deduplicated ${results.length} → ${deduplicatedResults.length} results`);
    }

    return deduplicatedResults;
  }

  private detectDuplicates(results: SearchResult[]): DuplicateGroup[] {
    const groups: DuplicateGroup[] = [];
    const processed = new Set<number>();

    for (let i = 0; i < results.length; i++) {
      if (processed.has(results[i].id)) continue;

      const duplicates: number[] = [];
      const canonical = results[i];

      for (let j = i + 1; j < results.length; j++) {
        if (processed.has(results[j].id)) continue;

        const similarity = this.calculateSimilarity(canonical, results[j]);
        if (similarity >= this.SIMILARITY_THRESHOLD) {
          duplicates.push(results[j].id);
          processed.add(results[j].id);
        }
      }

      if (duplicates.length > 0) {
        groups.push({
          canonical_id: canonical.id,
          duplicate_ids: duplicates,
          confidence: Math.min(...duplicates.map(id => {
            const duplicate = results.find(r => r.id === id);
            return duplicate ? this.calculateSimilarity(canonical, duplicate) : 0;
          })),
          match_type: this.determineMatchType(canonical, duplicates.map(id => results.find(r => r.id === id)!))
        });
        processed.add(canonical.id);
      }
    }

    return groups;
  }

  private calculateSimilarity(a: SearchResult, b: SearchResult): number {
    // Exact IGDB ID match
    if (a.igdb_id && b.igdb_id && a.igdb_id === b.igdb_id) {
      return 1.0;
    }

    // Exact name match (case insensitive)
    if (a.name.toLowerCase() === b.name.toLowerCase()) {
      return 0.95;
    }

    // Fuzzy name similarity using Levenshtein distance
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    const distance = this.levenshteinDistance(nameA, nameB);
    const maxLength = Math.max(nameA.length, nameB.length);
    const nameSimilarity = 1 - (distance / maxLength);

    // Release date similarity
    let dateSimilarity = 0;
    if (a.release_date && b.release_date) {
      const dateA = new Date(a.release_date);
      const dateB = new Date(b.release_date);
      const daysDiff = Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
      dateSimilarity = daysDiff <= 365 ? 0.2 : 0; // Same year gets bonus
    }

    return nameSimilarity + dateSimilarity;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,        // deletion
          matrix[j - 1][i] + 1,        // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private determineMatchType(canonical: SearchResult, duplicates: SearchResult[]): 'exact' | 'fuzzy' | 'igdb' | 'slug' {
    // Check for IGDB matches
    if (duplicates.some(d => d.igdb_id && canonical.igdb_id && d.igdb_id === canonical.igdb_id)) {
      return 'igdb';
    }

    // Check for exact name matches
    if (duplicates.some(d => d.name.toLowerCase() === canonical.name.toLowerCase())) {
      return 'exact';
    }

    return 'fuzzy';
  }

  /**
   * Enhanced Search Features
   */
  async searchWithAutoCorrection(query: string, options?: SearchOptions): Promise<SearchResponse> {
    // First try exact search
    const exactResponse = await this.searchGames({ ...options, query });

    if (exactResponse.results.length > 0) {
      return exactResponse;
    }

    // Try with common corrections
    const correctedQueries = this.generateCorrections(query);

    for (const correctedQuery of correctedQueries) {
      const response = await this.searchGames({ ...options, query: correctedQuery });
      if (response.results.length > 0) {
        return {
          ...response,
          query_used: `${correctedQuery} (corrected from "${query}")`
        };
      }
    }

    return exactResponse;
  }

  private generateCorrections(query: string): string[] {
    const corrections: string[] = [];

    // Remove common typos and extra spaces
    corrections.push(query.replace(/\s+/g, ' ').trim());

    // Try without special characters
    corrections.push(query.replace(/[^\w\s]/g, '').trim());

    // Try individual words if multiple words
    const words = query.split(/\s+/);
    if (words.length > 1) {
      corrections.push(...words);
    }

    return corrections.filter(c => c.length > 1);
  }

  /**
   * Utility Methods
   */
  clearCache(): void {
    this.searchCache.clear();
    this.duplicateCache.clear();
    if (DEBUG_SEARCH) console.log('🧹 Cleared all search caches');
  }

  getCacheStats(): { size: number; hitRate: number } {
    const totalHits = Array.from(this.searchCache.values()).reduce((sum, cached) => sum + cached.hits, 0);
    const totalEntries = this.searchCache.size;

    return {
      size: totalEntries,
      hitRate: totalEntries > 0 ? totalHits / totalEntries : 0
    };
  }

  isSearchActive(): boolean {
    return this.activeSearchId !== null;
  }
}

// Export unified service instance
export const searchService = new UnifiedSearchService();

// Backward compatibility exports
export { searchService as searchCoordinator };
export { searchService as secureSearchService };
export { searchService as searchCacheService };
export { searchService as searchDeduplicationService };
export { searchService as enhancedSearchService };
export { searchService as gameSearchService };

// Hook for React components
export function useSearchCoordinator(searchExecutor?: SearchExecutor) {
  if (searchExecutor) {
    searchService.setExecutor(searchExecutor);
  }
  return searchService;
}

// Legacy class export
export { UnifiedSearchService as SearchService };