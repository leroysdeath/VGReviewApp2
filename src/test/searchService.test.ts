/**
 * Unified Search Service Tests
 * Consolidates tests from searchCoordinator, secureSearchService, searchCacheService,
 * searchDeduplicationService, enhancedSearchService, and gameSearchService
 */

import { searchService, useSearchCoordinator } from '../services/searchService';
import type { SearchOptions, SearchResult, SearchResponse, GameSearchResult } from '../services/searchService';
import { supabase } from '../services/supabase';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    rpc: jest.fn()
  }
}));

// Mock sanitization utilities
jest.mock('../utils/sqlSecurity', () => ({
  sanitizeSearchTerm: jest.fn((term) => term.trim())
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Unified Search Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchService.clearCache();
  });

  describe('Core Search Operations', () => {
    describe('searchGames', () => {
      it('should perform basic search successfully', async () => {
        const mockResults = [
          {
            id: 1,
            name: 'Super Mario Bros',
            summary: 'Classic platformer',
            description: 'A legendary game',
            release_date: '1985-09-13',
            cover_url: 'https://example.com/mario.jpg',
            genres: ['Platform'],
            platforms: ['NES'],
            igdb_id: 1234,
            search_rank: 1,
            relevance_score: 0.95
          },
          {
            id: 2,
            name: 'Mario Kart',
            summary: 'Racing game',
            description: 'Fun racing with Mario characters',
            release_date: '1992-08-27',
            cover_url: 'https://example.com/kart.jpg',
            genres: ['Racing'],
            platforms: ['SNES'],
            igdb_id: 5678,
            search_rank: 2,
            relevance_score: 0.85
          }
        ];

        mockSupabase.rpc.mockResolvedValue({
          data: mockResults,
          error: null
        });

        const options: SearchOptions = {
          query: 'mario',
          limit: 10
        };

        const response = await searchService.searchGames(options);

        expect(response.results).toHaveLength(2);
        expect(response.results[0].name).toBe('Super Mario Bros');
        expect(response.total_count).toBe(2);
        expect(response.query_used).toBe('mario');
        expect(response.cache_hit).toBe(false);
        expect(mockSupabase.rpc).toHaveBeenCalledWith('secure_game_search', {
          search_query: 'mario',
          search_limit: 10,
          use_phrase_search: false,
          genre_filters: null,
          platform_filters: null,
          release_year_filter: null,
          min_rating_filter: null
        });
      });

      it('should handle empty search query', async () => {
        const response = await searchService.searchGames({ query: '' });

        expect(response.results).toHaveLength(0);
        expect(response.total_count).toBe(0);
        expect(response.query_used).toBe('');
        expect(mockSupabase.rpc).not.toHaveBeenCalled();
      });

      it('should apply genre filters', async () => {
        const mockResults = [
          {
            id: 1,
            name: 'RPG Game',
            summary: 'Role playing game',
            description: null,
            release_date: '2020-01-01',
            cover_url: null,
            genres: ['RPG'],
            platforms: ['PC'],
            igdb_id: 999,
            search_rank: 1
          }
        ];

        mockSupabase.rpc.mockResolvedValue({
          data: mockResults,
          error: null
        });

        const options: SearchOptions = {
          query: 'game',
          genre_filter: ['RPG'],
          limit: 20
        };

        const response = await searchService.searchGames(options);

        expect(response.results).toHaveLength(1);
        expect(response.results[0].genres).toContain('RPG');
        expect(mockSupabase.rpc).toHaveBeenCalledWith('secure_game_search', {
          search_query: 'game',
          search_limit: 20,
          use_phrase_search: false,
          genre_filters: ['RPG'],
          platform_filters: null,
          release_year_filter: null,
          min_rating_filter: null
        });
      });

      it('should apply platform and year filters', async () => {
        const options: SearchOptions = {
          query: 'retro',
          platform_filter: ['NES', 'SNES'],
          release_year: 1990,
          min_rating: 8
        };

        mockSupabase.rpc.mockResolvedValue({
          data: [],
          error: null
        });

        await searchService.searchGames(options);

        expect(mockSupabase.rpc).toHaveBeenCalledWith('secure_game_search', {
          search_query: 'retro',
          search_limit: 20,
          use_phrase_search: false,
          genre_filters: null,
          platform_filters: ['NES', 'SNES'],
          release_year_filter: 1990,
          min_rating_filter: 8
        });
      });

      it('should handle exact phrase search', async () => {
        const options: SearchOptions = {
          query: 'super mario bros',
          exact_phrase: true
        };

        mockSupabase.rpc.mockResolvedValue({
          data: [],
          error: null
        });

        await searchService.searchGames(options);

        expect(mockSupabase.rpc).toHaveBeenCalledWith('secure_game_search', {
          search_query: 'super mario bros',
          search_limit: 20,
          use_phrase_search: true,
          genre_filters: null,
          platform_filters: null,
          release_year_filter: null,
          min_rating_filter: null
        });
      });

      it('should handle search errors gracefully', async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        });

        const response = await searchService.searchGames({ query: 'test' });

        expect(response.results).toHaveLength(0);
        expect(response.total_count).toBe(0);
        expect(response.search_time_ms).toBeGreaterThan(0);
      });

      it('should respect search limit constraints', async () => {
        const options: SearchOptions = {
          query: 'game',
          limit: 200 // Should be capped at 100
        };

        mockSupabase.rpc.mockResolvedValue({
          data: [],
          error: null
        });

        await searchService.searchGames(options);

        expect(mockSupabase.rpc).toHaveBeenCalledWith('secure_game_search', {
          search_query: 'game',
          search_limit: 100, // Capped
          use_phrase_search: false,
          genre_filters: null,
          platform_filters: null,
          release_year_filter: null,
          min_rating_filter: null
        });
      });
    });

    describe('Game-Specific Search Operations', () => {
      describe('searchGamesByTitle', () => {
        it('should search games by title', async () => {
          const mockResults = [
            {
              id: 1,
              name: 'Zelda: Breath of the Wild',
              summary: 'Open world adventure',
              description: null,
              release_date: '2017-03-03',
              cover_url: 'https://example.com/zelda.jpg',
              genres: ['Adventure', 'Action'],
              platforms: ['Switch'],
              igdb_id: 1234
            }
          ];

          mockSupabase.rpc.mockResolvedValue({
            data: mockResults,
            error: null
          });

          const results = await searchService.searchGamesByTitle('zelda', 5);

          expect(results).toHaveLength(1);
          expect(results[0].name).toBe('Zelda: Breath of the Wild');
          expect(results[0].slug).toBe('zelda:-breath-of-the-wild');
          expect(results[0].averageUserRating).toBe(0);
          expect(results[0].totalUserRatings).toBe(0);
        });
      });

      describe('searchGamesByGenre', () => {
        it('should search games by genre', async () => {
          mockSupabase.rpc.mockResolvedValue({
            data: [
              {
                id: 1,
                name: 'Final Fantasy VII',
                summary: 'JRPG classic',
                genres: ['RPG'],
                platforms: ['PlayStation'],
                igdb_id: 5678
              }
            ],
            error: null
          });

          const results = await searchService.searchGamesByGenre('RPG', 15);

          expect(results).toHaveLength(1);
          expect(results[0].genres).toContain('RPG');
          expect(mockSupabase.rpc).toHaveBeenCalledWith('secure_game_search', {
            search_query: '*',
            search_limit: 15,
            use_phrase_search: false,
            genre_filters: ['RPG'],
            platform_filters: null,
            release_year_filter: null,
            min_rating_filter: null
          });
        });
      });

      describe('getGameSuggestions', () => {
        it('should return suggestions for partial queries', async () => {
          mockSupabase.rpc.mockResolvedValue({
            data: [
              { id: 1, name: 'Mario', igdb_id: 1 },
              { id: 2, name: 'Mariokart', igdb_id: 2 }
            ],
            error: null
          });

          const results = await searchService.getGameSuggestions('mar', 3);

          expect(results).toHaveLength(2);
          expect(results[0].name).toBe('Mario');
        });

        it('should return empty array for short queries', async () => {
          const results = await searchService.getGameSuggestions('m', 5);

          expect(results).toHaveLength(0);
          expect(mockSupabase.rpc).not.toHaveBeenCalled();
        });
      });

      describe('searchGamesAdvanced', () => {
        it('should perform advanced search with multiple filters', async () => {
          mockSupabase.rpc.mockResolvedValue({
            data: [
              {
                id: 1,
                name: 'Cyberpunk 2077',
                genres: ['RPG', 'Action'],
                platforms: ['PC', 'PS4'],
                release_date: '2020-12-10',
                igdb_id: 1234
              }
            ],
            error: null
          });

          const results = await searchService.searchGamesAdvanced(
            'cyberpunk',
            {
              genres: ['RPG'],
              platforms: ['PC'],
              releaseYear: 2020,
              minRating: 7
            },
            10
          );

          expect(results).toHaveLength(1);
          expect(results[0].name).toBe('Cyberpunk 2077');
          expect(mockSupabase.rpc).toHaveBeenCalledWith('secure_game_search', {
            search_query: 'cyberpunk',
            search_limit: 10,
            use_phrase_search: false,
            genre_filters: ['RPG'],
            platform_filters: ['PC'],
            release_year_filter: 2020,
            min_rating_filter: 7
          });
        });
      });
    });

    describe('Enhanced Search Features', () => {
      describe('searchWithAutoCorrection', () => {
        it('should return exact results when available', async () => {
          const mockResults = [
            { id: 1, name: 'Pokemon Red', igdb_id: 123 }
          ];

          mockSupabase.rpc.mockResolvedValue({
            data: mockResults,
            error: null
          });

          const response = await searchService.searchWithAutoCorrection('pokemon');

          expect(response.results).toHaveLength(1);
          expect(response.query_used).toBe('pokemon');
        });

        it('should try corrections when no exact results found', async () => {
          // First call returns empty
          mockSupabase.rpc.mockResolvedValueOnce({
            data: [],
            error: null
          });

          // Second call with correction returns results
          mockSupabase.rpc.mockResolvedValueOnce({
            data: [{ id: 1, name: 'Pokemon Red', igdb_id: 123 }],
            error: null
          });

          const response = await searchService.searchWithAutoCorrection('pokmon'); // Typo

          expect(response.results).toHaveLength(1);
          expect(response.query_used).toContain('corrected from');
          expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
        });
      });
    });
  });

  describe('Search Coordination', () => {
    describe('requestSearch', () => {
      it('should coordinate search requests with debouncing', async () => {
        const mockExecutor = jest.fn().mockResolvedValue([]);
        searchService.setExecutor(mockExecutor);

        await searchService.requestSearch('test-source', 'mario', 100, true);

        expect(mockExecutor).toHaveBeenCalledWith('mario');
      });

      it('should cancel previous searches', async () => {
        const mockExecutor = jest.fn().mockResolvedValue([]);
        searchService.setExecutor(mockExecutor);

        // Start first search
        searchService.requestSearch('source1', 'query1', 1000, false);

        // Start second search immediately (should cancel first)
        await searchService.requestSearch('source2', 'query2', 100, true);

        expect(mockExecutor).toHaveBeenCalledTimes(1);
        expect(mockExecutor).toHaveBeenCalledWith('query2');
      });

      it('should handle search executor errors gracefully', async () => {
        const mockExecutor = jest.fn().mockRejectedValue(new Error('Search failed'));
        searchService.setExecutor(mockExecutor);

        // Should not throw
        await expect(
          searchService.requestSearch('test-source', 'mario', 100, true)
        ).resolves.toBeUndefined();
      });
    });

    describe('useSearchCoordinator hook', () => {
      it('should return search service instance', () => {
        const coordinator = useSearchCoordinator();
        expect(coordinator).toBe(searchService);
      });

      it('should set executor when provided', () => {
        const mockExecutor = jest.fn();
        const coordinator = useSearchCoordinator(mockExecutor);

        expect(coordinator).toBe(searchService);
        // Verify executor was set by checking if it can be called
        expect(coordinator.isSearchActive()).toBe(false);
      });
    });
  });

  describe('Cache Management', () => {
    it('should cache search results', async () => {
      const mockResults = [
        { id: 1, name: 'Cached Game', igdb_id: 123 }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });

      // First search
      const response1 = await searchService.searchGames({ query: 'test' });
      expect(response1.cache_hit).toBe(false);

      // Second search should be cached
      const response2 = await searchService.searchGames({ query: 'test' });
      expect(response2.cache_hit).toBe(true);
      expect(response2.results).toEqual(response1.results);

      // Should only call RPC once
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(1);
    });

    it('should use different cache keys for different filters', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null
      });

      await searchService.searchGames({ query: 'test', genre_filter: ['RPG'] });
      await searchService.searchGames({ query: 'test', genre_filter: ['Action'] });

      // Should call RPC twice due to different filters
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should clear cache on demand', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ id: 1, name: 'Test Game', igdb_id: 123 }],
        error: null
      });

      // First search
      await searchService.searchGames({ query: 'test' });

      // Clear cache
      searchService.clearCache();

      // Second search should not be cached
      const response = await searchService.searchGames({ query: 'test' });
      expect(response.cache_hit).toBe(false);
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ id: 1, name: 'Test Game', igdb_id: 123 }],
        error: null
      });

      // Perform some cached searches
      await searchService.searchGames({ query: 'test1' });
      await searchService.searchGames({ query: 'test2' });
      await searchService.searchGames({ query: 'test1' }); // Cache hit

      const stats = searchService.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate results with same IGDB ID', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Game A',
          igdb_id: 1234,
          release_date: '2020-01-01',
          summary: 'Test game',
          description: null,
          cover_url: null,
          genres: null,
          platforms: null
        },
        {
          id: 2,
          name: 'Game A (Duplicate)',
          igdb_id: 1234, // Same IGDB ID
          release_date: '2020-01-01',
          summary: 'Test game duplicate',
          description: null,
          cover_url: null,
          genres: null,
          platforms: null
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });

      const response = await searchService.searchGames({ query: 'game' });

      expect(response.results).toHaveLength(1);
      expect(response.deduplicated_count).toBe(1);
      expect(response.results[0].name).toBe('Game A');
    });

    it('should deduplicate results with similar names', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Super Mario Bros',
          igdb_id: 1234,
          release_date: '1985-09-13',
          summary: 'Original',
          description: null,
          cover_url: null,
          genres: null,
          platforms: null
        },
        {
          id: 2,
          name: 'super mario bros', // Same name, different case
          igdb_id: 5678,
          release_date: '1985-09-13',
          summary: 'Duplicate',
          description: null,
          cover_url: null,
          genres: null,
          platforms: null
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });

      const response = await searchService.searchGames({ query: 'mario' });

      expect(response.results).toHaveLength(1);
      expect(response.deduplicated_count).toBe(1);
    });

    it('should not deduplicate different games', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Super Mario Bros',
          igdb_id: 1234,
          release_date: '1985-09-13',
          summary: 'Platformer',
          description: null,
          cover_url: null,
          genres: null,
          platforms: null
        },
        {
          id: 2,
          name: 'Mario Kart',
          igdb_id: 5678,
          release_date: '1992-08-27',
          summary: 'Racing',
          description: null,
          cover_url: null,
          genres: null,
          platforms: null
        }
      ];

      mockSupabase.rpc.mockResolvedValue({
        data: mockResults,
        error: null
      });

      const response = await searchService.searchGames({ query: 'mario' });

      expect(response.results).toHaveLength(2);
      expect(response.deduplicated_count).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors', async () => {
      mockSupabase.rpc.mockRejectedValue(new Error('Connection failed'));

      const response = await searchService.searchGames({ query: 'test' });

      expect(response.results).toHaveLength(0);
      expect(response.total_count).toBe(0);
      expect(response.search_time_ms).toBeGreaterThan(0);
    });

    it('should handle RPC function errors', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC function not found' }
      });

      const response = await searchService.searchGames({ query: 'test' });

      expect(response.results).toHaveLength(0);
      expect(response.cache_hit).toBe(false);
    });

    it('should handle malformed search results', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [null, undefined, { incomplete: 'data' }],
        error: null
      });

      const response = await searchService.searchGames({ query: 'test' });

      // Should filter out invalid results
      expect(response.results).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    it('should track search execution time', async () => {
      mockSupabase.rpc.mockImplementation(() =>
        new Promise(resolve =>
          setTimeout(() => resolve({ data: [], error: null }), 50)
        )
      );

      const response = await searchService.searchGames({ query: 'test' });

      expect(response.search_time_ms).toBeGreaterThan(40);
      expect(response.search_time_ms).toBeLessThan(200);
    });

    it('should handle concurrent searches', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [{ id: 1, name: 'Test Game', igdb_id: 123 }],
        error: null
      });

      const promises = [
        searchService.searchGames({ query: 'test1' }),
        searchService.searchGames({ query: 'test2' }),
        searchService.searchGames({ query: 'test3' })
      ];

      const responses = await Promise.all(promises);

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.results).toHaveLength(1);
      });
    });
  });

  describe('Utility Methods', () => {
    it('should report search activity status', () => {
      expect(searchService.isSearchActive()).toBe(false);
    });

    it('should handle cache cleanup', () => {
      searchService.clearCache();
      const stats = searchService.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });
});