/**
 * Comprehensive Unit Tests for Search Functionality
 * Tests the secure_game_search RPC function and searchService integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { searchService } from '../services/searchService';
import { supabase } from '../services/supabase';

// Mock Supabase
vi.mock('../services/supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}));

describe('Search Service - secure_game_search Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchService.clearCache();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Search Functionality', () => {
    it('should call secure_game_search RPC with correct parameters', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'The Legend of Zelda',
          summary: 'A classic adventure game',
          description: 'Full description',
          release_date: '1986-02-21',
          cover_url: 'https://example.com/zelda.jpg',
          genres: ['Adventure', 'Action'],
          platforms: ['NES'],
          igdb_id: 1234,
          search_rank: 0.95
        }
      ];

      (supabase.rpc as any).mockResolvedValue({
        data: mockResults,
        error: null
      });

      const result = await searchService.searchGames({
        query: 'zelda',
        limit: 20
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'zelda',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('The Legend of Zelda');
      expect(result.total_count).toBe(1);
    });

    it('should handle empty search query', async () => {
      const result = await searchService.searchGames({
        query: '',
        limit: 20
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    it('should sanitize and trim search query', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({
        query: '  mario  ',
        limit: 20
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'mario',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });

    it('should enforce maximum limit of 100', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({
        query: 'test',
        limit: 500
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'test',
        search_limit: 100,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });
  });

  describe('Advanced Search Filtering', () => {
    it('should apply genre filters', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({
        query: 'game',
        limit: 20,
        genre_filter: ['RPG', 'Action']
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'game',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: ['RPG', 'Action'],
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });

    it('should apply platform filters', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({
        query: 'game',
        limit: 20,
        platform_filter: ['PC', 'PlayStation 5']
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'game',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: ['PC', 'PlayStation 5'],
        release_year_filter: null,
        min_rating_filter: null
      });
    });

    it('should apply release year filter', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({
        query: 'game',
        limit: 20,
        release_year: 2023
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'game',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: 2023,
        min_rating_filter: null
      });
    });

    it('should apply minimum rating filter', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({
        query: 'game',
        limit: 20,
        min_rating: 8.0
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'game',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: 8.0
      });
    });

    it('should apply multiple filters simultaneously', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({
        query: 'game',
        limit: 20,
        genre_filter: ['RPG'],
        platform_filter: ['PC'],
        release_year: 2023,
        min_rating: 8.0
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'game',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: ['RPG'],
        platform_filters: ['PC'],
        release_year_filter: 2023,
        min_rating_filter: 8.0
      });
    });

    it('should use phrase search when exact_phrase is true', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({
        query: 'super mario',
        limit: 20,
        exact_phrase: true
      });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'super mario',
        search_limit: 20,
        use_phrase_search: true,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle RPC errors gracefully', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Function not found', code: '404' }
      });

      const result = await searchService.searchGames({
        query: 'test',
        limit: 20
      });

      expect(result.results).toHaveLength(0);
      expect(result.total_count).toBe(0);
      expect(result.cache_hit).toBe(false);
    });

    it('should handle network errors', async () => {
      (supabase.rpc as any).mockRejectedValue(new Error('Network error'));

      const result = await searchService.searchGames({
        query: 'test',
        limit: 20
      });

      expect(result.results).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    it('should handle null results', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: null,
        error: null
      });

      const result = await searchService.searchGames({
        query: 'test',
        limit: 20
      });

      expect(result.results).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    it('should reject invalid query types', async () => {
      const result = await searchService.searchGames({
        query: null as any,
        limit: 20
      });

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(0);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache search results', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Test Game',
          summary: 'A test',
          description: 'Test description',
          release_date: '2020-01-01',
          cover_url: 'url',
          genres: ['Action'],
          platforms: ['PC'],
          igdb_id: 123,
          search_rank: 0.9
        }
      ];

      (supabase.rpc as any).mockResolvedValue({
        data: mockResults,
        error: null
      });

      // First call - should hit database
      const result1 = await searchService.searchGames({
        query: 'test',
        limit: 20
      });

      expect(result1.cache_hit).toBe(false);
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Second call - should hit cache
      const result2 = await searchService.searchGames({
        query: 'test',
        limit: 20
      });

      expect(result2.cache_hit).toBe(true);
      expect(supabase.rpc).toHaveBeenCalledTimes(1); // Still only 1 call
      expect(result2.results).toEqual(result1.results);
    });

    it('should differentiate cache by query and options', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      // Different queries should not share cache
      await searchService.searchGames({ query: 'test1', limit: 20 });
      await searchService.searchGames({ query: 'test2', limit: 20 });

      expect(supabase.rpc).toHaveBeenCalledTimes(2);

      // Different filters should not share cache
      await searchService.searchGames({ query: 'test', limit: 20 });
      await searchService.searchGames({ query: 'test', limit: 20, genre_filter: ['RPG'] });

      expect(supabase.rpc).toHaveBeenCalledTimes(4);
    });

    it('should allow cache bypass', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      // First call
      await searchService.coordinatedSearch('test', { bypassCache: false });
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Second call with cache bypass
      await searchService.coordinatedSearch('test', { bypassCache: true });
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should clear cache when requested', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      // Populate cache
      await searchService.searchGames({ query: 'test', limit: 20 });
      expect(supabase.rpc).toHaveBeenCalledTimes(1);

      // Clear cache
      searchService.clearCache();

      // Next call should hit database again
      await searchService.searchGames({ query: 'test', limit: 20 });
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate results with same IGDB ID', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Game A',
          summary: 'Test',
          description: 'Test',
          release_date: '2020-01-01',
          cover_url: 'url1',
          genres: ['Action'],
          platforms: ['PC'],
          igdb_id: 123,
          search_rank: 0.9
        },
        {
          id: 2,
          name: 'Game A',
          summary: 'Test',
          description: 'Test',
          release_date: '2020-01-01',
          cover_url: 'url2',
          genres: ['Action'],
          platforms: ['PC'],
          igdb_id: 123, // Same IGDB ID
          search_rank: 0.85
        }
      ];

      (supabase.rpc as any).mockResolvedValue({
        data: mockResults,
        error: null
      });

      const result = await searchService.searchGames({
        query: 'game',
        limit: 20
      });

      expect(result.results).toHaveLength(1);
      expect(result.deduplicated_count).toBe(1);
    });

    it('should keep unique results', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Game A',
          summary: 'Test',
          description: 'Test',
          release_date: '2020-01-01',
          cover_url: 'url1',
          genres: ['Action'],
          platforms: ['PC'],
          igdb_id: 123,
          search_rank: 0.9
        },
        {
          id: 2,
          name: 'Game B',
          summary: 'Test',
          description: 'Test',
          release_date: '2020-01-01',
          cover_url: 'url2',
          genres: ['RPG'],
          platforms: ['PS5'],
          igdb_id: 456,
          search_rank: 0.85
        }
      ];

      (supabase.rpc as any).mockResolvedValue({
        data: mockResults,
        error: null
      });

      const result = await searchService.searchGames({
        query: 'game',
        limit: 20
      });

      expect(result.results).toHaveLength(2);
      expect(result.deduplicated_count).toBe(0);
    });
  });

  describe('Game-Specific Search Methods', () => {
    it('should search games by title', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGamesByTitle('zelda', 10);

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'zelda',
        search_limit: 10,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });

    it('should search games by genre', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGamesByGenre('RPG', 20);

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: '*',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: ['RPG'],
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });

    it('should get game suggestions for partial queries', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.getGameSuggestions('zel', 5);

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'zel',
        search_limit: 5,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });

    it('should not search with queries shorter than 2 characters', async () => {
      const result = await searchService.getGameSuggestions('z', 5);

      expect(supabase.rpc).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should perform advanced search with filters', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGamesAdvanced(
        'adventure',
        {
          genres: ['Adventure', 'Action'],
          platforms: ['PC'],
          releaseYear: 2023,
          minRating: 8.0
        },
        20
      );

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'adventure',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: ['Adventure', 'Action'],
        platform_filters: ['PC'],
        release_year_filter: 2023,
        min_rating_filter: 8.0
      });
    });
  });

  describe('Coordinated Search', () => {
    it('should use default options', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.coordinatedSearch('test');

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'test',
        search_limit: 20,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });

    it('should respect maxResults option', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.coordinatedSearch('test', { maxResults: 50 });

      expect(supabase.rpc).toHaveBeenCalledWith('secure_game_search', {
        search_query: 'test',
        search_limit: 50,
        use_phrase_search: false,
        genre_filters: null,
        platform_filters: null,
        release_year_filter: null,
        min_rating_filter: null
      });
    });
  });

  describe('Cache Statistics', () => {
    it('should report cache statistics', async () => {
      (supabase.rpc as any).mockResolvedValue({
        data: [],
        error: null
      });

      // Clear cache first
      searchService.clearCache();

      const initialStats = searchService.getCacheStats();
      expect(initialStats.size).toBe(0);
      expect(initialStats.hitRate).toBe(0);

      // Add some cached results
      await searchService.searchGames({ query: 'test1', limit: 20 });
      await searchService.searchGames({ query: 'test2', limit: 20 });

      const afterAddStats = searchService.getCacheStats();
      expect(afterAddStats.size).toBe(2);

      // Access cache
      await searchService.searchGames({ query: 'test1', limit: 20 });
      await searchService.searchGames({ query: 'test1', limit: 20 });

      const afterAccessStats = searchService.getCacheStats();
      expect(afterAccessStats.size).toBe(2);
      expect(afterAccessStats.hitRate).toBeGreaterThan(0);
    });
  });
});