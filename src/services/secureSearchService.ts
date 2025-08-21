/**
 * Professional Secure Search Service
 * 
 * This service completely eliminates SQL injection vulnerabilities by:
 * 1. Using PostgreSQL full-text search with proper parameterization
 * 2. Leveraging database RPC functions for all search operations
 * 3. Providing type-safe search interfaces
 * 4. Implementing professional search features (ranking, phrase search)
 */

import { supabase } from './supabase';

export interface SearchResult {
  id: number;
  name: string;
  summary: string | null;
  description: string | null;
  release_date: string | null;
  cover_url: string | null;
  genres: string[] | null;
  igdb_id: number;
  search_rank?: number;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  exact_phrase?: boolean;
  genre_filter?: string[];
  release_year?: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total_count: number;
  search_time_ms: number;
  query_used: string;
}

class SecureSearchService {
  
  /**
   * Main search function with full-text search and ranking
   */
  async searchGames(options: SearchOptions): Promise<SearchResponse> {
    const startTime = Date.now();
    const { query, limit = 20, exact_phrase = false, genre_filter, release_year } = options;
    
    // Input validation
    if (!query || typeof query !== 'string') {
      return {
        results: [],
        total_count: 0,
        search_time_ms: Date.now() - startTime,
        query_used: ''
      };
    }
    
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 || trimmedQuery.length > 100) {
      return {
        results: [],
        total_count: 0,
        search_time_ms: Date.now() - startTime,
        query_used: trimmedQuery
      };
    }
    
    try {
      let searchResults: SearchResult[] = [];
      
      if (exact_phrase) {
        // Use phrase search for exact matching
        const { data, error } = await supabase
          .rpc('search_games_phrase', {
            search_phrase: trimmedQuery,
            limit_count: Math.min(limit, 100)
          });
          
        if (error) throw error;
        searchResults = data || [];
      } else {
        // Use ranked full-text search
        const { data, error } = await supabase
          .rpc('search_games_secure', {
            search_query: trimmedQuery,
            limit_count: Math.min(limit, 100)
          });
          
        if (error) throw error;
        searchResults = data || [];
      }
      
      // Apply additional filters if specified
      if (genre_filter && genre_filter.length > 0) {
        searchResults = await this.filterByGenres(searchResults, genre_filter);
      }
      
      if (release_year) {
        searchResults = this.filterByReleaseYear(searchResults, release_year);
      }
      
      return {
        results: searchResults,
        total_count: searchResults.length,
        search_time_ms: Date.now() - startTime,
        query_used: trimmedQuery
      };
      
    } catch (error) {
      console.error('Secure search failed:', error);
      return {
        results: [],
        total_count: 0,
        search_time_ms: Date.now() - startTime,
        query_used: trimmedQuery
      };
    }
  }
  
  /**
   * Search by genre using secure function
   */
  async searchByGenre(genre: string, limit = 20): Promise<SearchResult[]> {
    if (!genre || typeof genre !== 'string') {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .rpc('search_games_by_genre', {
          genre_name: genre.trim(),
          limit_count: Math.min(limit, 100)
        });
        
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Genre search failed:', error);
      return [];
    }
  }
  
  /**
   * Get search suggestions (autocomplete)
   */
  async getSearchSuggestions(partial_query: string, limit = 10): Promise<string[]> {
    if (!partial_query || partial_query.length < 2) {
      return [];
    }
    
    try {
      const { data, error } = await supabase
        .rpc('search_games_secure', {
          search_query: partial_query.trim(),
          limit_count: limit
        });
        
      if (error) throw error;
      
      // Extract unique game names for suggestions
      const suggestions = (data || [])
        .map(game => game.name)
        .filter((name, index, arr) => arr.indexOf(name) === index)
        .slice(0, limit);
        
      return suggestions;
    } catch (error) {
      console.error('Search suggestions failed:', error);
      return [];
    }
  }
  
  /**
   * Advanced search with multiple criteria
   */
  async advancedSearch(criteria: {
    name?: string;
    genre?: string;
    release_year_min?: number;
    release_year_max?: number;
    has_summary?: boolean;
    limit?: number;
  }): Promise<SearchResult[]> {
    const { name, genre, release_year_min, release_year_max, has_summary, limit = 20 } = criteria;
    
    try {
      let query = supabase
        .from('game')
        .select(`
          id,
          name,
          summary,
          description,
          release_date,
          cover_url,
          genres,
          igdb_id
        `);
      
      // Apply filters securely using Supabase's built-in parameterization
      if (name) {
        const { data: nameResults } = await supabase
          .rpc('search_games_secure', {
            search_query: name.trim(),
            limit_count: 1000
          });
          
        if (nameResults && nameResults.length > 0) {
          const matchingIds = nameResults.map(r => r.id);
          query = query.in('id', matchingIds);
        } else {
          return []; // No name matches
        }
      }
      
      if (genre) {
        const { data: genreResults } = await supabase
          .rpc('search_games_by_genre', {
            genre_name: genre.trim(),
            limit_count: 1000
          });
          
        if (genreResults && genreResults.length > 0) {
          const matchingIds = genreResults.map(r => r.id);
          query = query.in('id', matchingIds);
        } else {
          return []; // No genre matches
        }
      }
      
      if (release_year_min) {
        query = query.gte('release_date', `${release_year_min}-01-01`);
      }
      
      if (release_year_max) {
        query = query.lte('release_date', `${release_year_max}-12-31`);
      }
      
      if (has_summary !== undefined) {
        if (has_summary) {
          query = query.not('summary', 'is', null);
        } else {
          query = query.is('summary', null);
        }
      }
      
      const { data, error } = await query
        .order('name')
        .limit(Math.min(limit, 100));
        
      if (error) throw error;
      return data || [];
      
    } catch (error) {
      console.error('Advanced search failed:', error);
      return [];
    }
  }
  
  /**
   * Filter results by genres (helper function)
   */
  private async filterByGenres(results: SearchResult[], genres: string[]): Promise<SearchResult[]> {
    const genreMatchingIds = new Set<number>();
    
    for (const genre of genres) {
      const genreResults = await this.searchByGenre(genre, 1000);
      genreResults.forEach(result => genreMatchingIds.add(result.id));
    }
    
    return results.filter(result => genreMatchingIds.has(result.id));
  }
  
  /**
   * Filter results by release year (helper function)
   */
  private filterByReleaseYear(results: SearchResult[], year: number): SearchResult[] {
    return results.filter(result => {
      if (!result.release_date) return false;
      const releaseYear = new Date(result.release_date).getFullYear();
      return releaseYear === year;
    });
  }
}

// Export singleton instance
export const secureSearchService = new SecureSearchService();

// Export types for use in components
export type { SearchResult, SearchOptions, SearchResponse };