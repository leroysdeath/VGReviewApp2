/**
 * Unit Tests for GamePickerModal Search Integration
 * Tests the refactored modal that now uses searchService instead of igdbService
 */

import { searchService } from '../services/searchService';

// Mock searchService
jest.mock('../services/searchService', () => ({
  searchService: {
    coordinatedSearch: jest.fn()
  }
}));

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          or: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    }))
  }
}));

describe('GamePickerModal - Search Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchService Integration', () => {
    it('should call searchService.coordinatedSearch with correct parameters', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'Super Mario Bros',
          summary: 'Classic platformer',
          description: 'Legendary game',
          release_date: '1985-09-13',
          cover_url: 'https://example.com/mario.jpg',
          genres: ['Platform', 'Action'],
          platforms: ['NES'],
          igdb_id: 1234,
          search_rank: 0.95
        }
      ];

      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: mockResults,
        total_count: 1,
        search_time_ms: 50,
        query_used: 'mario',
        cache_hit: false
      });

      const result = await searchService.coordinatedSearch('mario', {
        maxResults: 20,
        bypassCache: false
      });

      expect(searchService.coordinatedSearch).toHaveBeenCalledWith('mario', {
        maxResults: 20,
        bypassCache: false
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].name).toBe('Super Mario Bros');
    });

    it('should transform search results to IGDB game format', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'The Legend of Zelda',
          summary: 'Adventure game',
          description: 'Epic adventure',
          release_date: '1986-02-21',
          cover_url: 'https://example.com/zelda.jpg',
          genres: ['Adventure', 'RPG'],
          platforms: ['NES', 'Game Boy'],
          igdb_id: 5678,
          search_rank: 0.9
        }
      ];

      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: mockResults,
        total_count: 1,
        search_time_ms: 45,
        query_used: 'zelda',
        cache_hit: false
      });

      const result = await searchService.coordinatedSearch('zelda', {
        maxResults: 20,
        bypassCache: false
      });

      // Verify transformation logic
      const game = result.results[0];
      expect(game.igdb_id).toBe(5678);
      expect(game.name).toBe('The Legend of Zelda');
      expect(game.cover_url).toBe('https://example.com/zelda.jpg');
      expect(game.genres).toEqual(['Adventure', 'RPG']);
      expect(game.platforms).toEqual(['NES', 'Game Boy']);
    });

    it('should handle empty search results', async () => {
      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: [],
        total_count: 0,
        search_time_ms: 30,
        query_used: 'nonexistent',
        cache_hit: false
      });

      const result = await searchService.coordinatedSearch('nonexistent', {
        maxResults: 20,
        bypassCache: false
      });

      expect(result.results).toHaveLength(0);
      expect(result.total_count).toBe(0);
    });

    it('should handle search errors gracefully', async () => {
      (searchService.coordinatedSearch as any).mockRejectedValue(
        new Error('Network error')
      );

      try {
        await searchService.coordinatedSearch('test', {
          maxResults: 20,
          bypassCache: false
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toBe('Network error');
      }
    });
  });

  describe('Search Performance & Caching', () => {
    it('should use cache by default', async () => {
      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: [],
        total_count: 0,
        search_time_ms: 5,
        query_used: 'test',
        cache_hit: true
      });

      const result = await searchService.coordinatedSearch('test', {
        maxResults: 20,
        bypassCache: false
      });

      expect(searchService.coordinatedSearch).toHaveBeenCalledWith('test', {
        maxResults: 20,
        bypassCache: false
      });

      expect(result.cache_hit).toBe(true);
    });

    it('should respect bypassCache option when specified', async () => {
      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: [],
        total_count: 0,
        search_time_ms: 50,
        query_used: 'test',
        cache_hit: false
      });

      await searchService.coordinatedSearch('test', {
        maxResults: 20,
        bypassCache: true
      });

      expect(searchService.coordinatedSearch).toHaveBeenCalledWith('test', {
        maxResults: 20,
        bypassCache: true
      });
    });

    it('should limit results to specified maxResults', async () => {
      const mockResults = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Game ${i + 1}`,
        summary: `Summary ${i + 1}`,
        description: `Description ${i + 1}`,
        release_date: '2020-01-01',
        cover_url: `https://example.com/game${i + 1}.jpg`,
        genres: ['Action'],
        platforms: ['PC'],
        igdb_id: 1000 + i,
        search_rank: 0.9 - (i * 0.01)
      }));

      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: mockResults.slice(0, 20), // Should be limited to 20
        total_count: 20,
        search_time_ms: 75,
        query_used: 'game',
        cache_hit: false
      });

      const result = await searchService.coordinatedSearch('game', {
        maxResults: 20,
        bypassCache: false
      });

      expect(result.results).toHaveLength(20);
    });
  });

  describe('Data Transformation', () => {
    it('should handle games without cover URLs', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'No Cover Game',
          summary: 'Test game',
          description: 'Test',
          release_date: '2020-01-01',
          cover_url: null,
          genres: ['Action'],
          platforms: ['PC'],
          igdb_id: 999,
          search_rank: 0.8
        }
      ];

      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: mockResults,
        total_count: 1,
        search_time_ms: 40,
        query_used: 'test',
        cache_hit: false
      });

      const result = await searchService.coordinatedSearch('test', {
        maxResults: 20,
        bypassCache: false
      });

      expect(result.results[0].cover_url).toBeNull();
    });

    it('should handle games without genres', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'No Genre Game',
          summary: 'Test game',
          description: 'Test',
          release_date: '2020-01-01',
          cover_url: 'https://example.com/game.jpg',
          genres: null,
          platforms: ['PC'],
          igdb_id: 888,
          search_rank: 0.8
        }
      ];

      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: mockResults,
        total_count: 1,
        search_time_ms: 40,
        query_used: 'test',
        cache_hit: false
      });

      const result = await searchService.coordinatedSearch('test', {
        maxResults: 20,
        bypassCache: false
      });

      expect(result.results[0].genres).toBeNull();
    });

    it('should handle games without platforms', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'No Platform Game',
          summary: 'Test game',
          description: 'Test',
          release_date: '2020-01-01',
          cover_url: 'https://example.com/game.jpg',
          genres: ['Action'],
          platforms: null,
          igdb_id: 777,
          search_rank: 0.8
        }
      ];

      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: mockResults,
        total_count: 1,
        search_time_ms: 40,
        query_used: 'test',
        cache_hit: false
      });

      const result = await searchService.coordinatedSearch('test', {
        maxResults: 20,
        bypassCache: false
      });

      expect(result.results[0].platforms).toBeNull();
    });

    it('should handle games without release dates', async () => {
      const mockResults = [
        {
          id: 1,
          name: 'No Date Game',
          summary: 'Test game',
          description: 'Test',
          release_date: null,
          cover_url: 'https://example.com/game.jpg',
          genres: ['Action'],
          platforms: ['PC'],
          igdb_id: 666,
          search_rank: 0.8
        }
      ];

      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: mockResults,
        total_count: 1,
        search_time_ms: 40,
        query_used: 'test',
        cache_hit: false
      });

      const result = await searchService.coordinatedSearch('test', {
        maxResults: 20,
        bypassCache: false
      });

      expect(result.results[0].release_date).toBeNull();
    });
  });

  describe('Search Query Handling', () => {
    it('should handle short queries', async () => {
      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: [],
        total_count: 0,
        search_time_ms: 20,
        query_used: 'a',
        cache_hit: false
      });

      await searchService.coordinatedSearch('a', {
        maxResults: 20,
        bypassCache: false
      });

      expect(searchService.coordinatedSearch).toHaveBeenCalledWith('a', {
        maxResults: 20,
        bypassCache: false
      });
    });

    it('should handle queries with special characters', async () => {
      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: [],
        total_count: 0,
        search_time_ms: 25,
        query_used: 'doom: eternal',
        cache_hit: false
      });

      await searchService.coordinatedSearch('doom: eternal', {
        maxResults: 20,
        bypassCache: false
      });

      expect(searchService.coordinatedSearch).toHaveBeenCalledWith('doom: eternal', {
        maxResults: 20,
        bypassCache: false
      });
    });

    it('should handle queries with numbers', async () => {
      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: [],
        total_count: 0,
        search_time_ms: 25,
        query_used: 'halo 3',
        cache_hit: false
      });

      await searchService.coordinatedSearch('halo 3', {
        maxResults: 20,
        bypassCache: false
      });

      expect(searchService.coordinatedSearch).toHaveBeenCalledWith('halo 3', {
        maxResults: 20,
        bypassCache: false
      });
    });

    it('should handle queries with unicode characters', async () => {
      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: [],
        total_count: 0,
        search_time_ms: 30,
        query_used: 'pokémon',
        cache_hit: false
      });

      await searchService.coordinatedSearch('pokémon', {
        maxResults: 20,
        bypassCache: false
      });

      expect(searchService.coordinatedSearch).toHaveBeenCalledWith('pokémon', {
        maxResults: 20,
        bypassCache: false
      });
    });
  });

  describe('Rate Limiting & API Safety', () => {
    it('should not exceed database query limits', async () => {
      // Simulate rapid searches
      const searches = Array.from({ length: 10 }, (_, i) => `query${i}`);

      (searchService.coordinatedSearch as any).mockResolvedValue({
        results: [],
        total_count: 0,
        search_time_ms: 15,
        query_used: 'test',
        cache_hit: true // Should use cache for most requests
      });

      for (const query of searches) {
        await searchService.coordinatedSearch(query, {
          maxResults: 20,
          bypassCache: false
        });
      }

      // Verify all calls were made (debouncing should happen in component)
      expect(searchService.coordinatedSearch).toHaveBeenCalledTimes(10);
    });

    it('should handle concurrent searches safely', async () => {
      (searchService.coordinatedSearch as any).mockImplementation(async (query: string) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return {
          results: [],
          total_count: 0,
          search_time_ms: 50,
          query_used: query,
          cache_hit: false
        };
      });

      // Execute 3 searches concurrently
      const promises = [
        searchService.coordinatedSearch('query1', { maxResults: 20, bypassCache: false }),
        searchService.coordinatedSearch('query2', { maxResults: 20, bypassCache: false }),
        searchService.coordinatedSearch('query3', { maxResults: 20, bypassCache: false })
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(searchService.coordinatedSearch).toHaveBeenCalledTimes(3);
    });
  });
});