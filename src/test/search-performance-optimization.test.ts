/**
 * Unit tests for Phase 1 search performance optimizations
 * Tests caching improvements, request deduplication, and API call reduction
 */

import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { browserCache } from '../services/browserCacheService';

// Mock the GameDataServiceV2 to control responses
jest.mock('../services/gameDataServiceV2', () => ({
  GameDataServiceV2: jest.fn().mockImplementation(() => ({
    searchGames: jest.fn()
  }))
}));

// Mock utilities to prevent side effects
jest.mock('../utils/intelligentPrioritization', () => ({
  sortGamesIntelligently: jest.fn(games => games),
  detectSearchIntent: jest.fn(() => 'FRANCHISE_BROWSE'),
  SearchIntent: {
    SPECIFIC_GAME: 'specific_game',
    FRANCHISE_BROWSE: 'franchise_browse',
    GENRE_DISCOVERY: 'genre_discovery',
    DEVELOPER_SEARCH: 'developer_search',
    YEAR_SEARCH: 'year_search',
    PLATFORM_SEARCH: 'platform_search'
  }
}));

jest.mock('../utils/contentProtectionFilter', () => ({
  filterProtectedContent: jest.fn(games => games)
}));

jest.mock('../utils/accentNormalization', () => ({
  normalizeAccents: jest.fn(str => str),
  expandWithAccentVariations: jest.fn(() => []),
  createSearchVariants: jest.fn(() => [])
}));

describe('Search Performance Optimizations - Phase 1', () => {
  let searchCoordination: AdvancedSearchCoordination;
  let mockSearchGames: jest.Mock;

  beforeEach(() => {
    searchCoordination = new AdvancedSearchCoordination();
    // Access the mocked method
    mockSearchGames = (searchCoordination as any).gameDataService.searchGames;
    
    // Override query expansion to return single query for predictable testing
    (searchCoordination as any).expandQuery = jest.fn((query) => [query]);
    
    // Clear caches before each test
    searchCoordination.clearCache();
    browserCache.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Cache TTL Improvements', () => {
    test('should cache results for 30 minutes', async () => {
      const mockResults = [
        { id: 1, name: 'Test Game', source: 'database' as const }
      ];
      
      mockSearchGames.mockResolvedValue(mockResults);

      // First search - should hit database
      const result1 = await searchCoordination.coordinatedSearch('mario', {
        includeMetrics: true
      });
      
      expect(mockSearchGames).toHaveBeenCalledTimes(1);
      expect(result1.results).toHaveLength(1);
      expect(result1.results[0]).toMatchObject({
        id: 1,
        name: 'Test Game'
      });
      expect(result1.metrics?.cacheHit).toBe(false);

      // Second search within TTL - should hit cache
      const result2 = await searchCoordination.coordinatedSearch('mario', {
        includeMetrics: true
      });
      
      expect(mockSearchGames).toHaveBeenCalledTimes(1); // No additional call
      expect(result2.results).toHaveLength(1);
      expect(result2.results[0]).toMatchObject({
        id: 1,
        name: 'Test Game'
      });
    });

    test('should respect cache TTL and refresh after expiry', async () => {
      const mockResults1 = [{ id: 1, name: 'Test Game 1', source: 'database' as const }];
      const mockResults2 = [{ id: 2, name: 'Test Game 2', source: 'database' as const }];
      
      mockSearchGames
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);

      // First search
      await searchCoordination.coordinatedSearch('mario');
      expect(mockSearchGames).toHaveBeenCalledTimes(1);

      // Mock cache expiry by manually manipulating cache
      const cacheKey = 'advanced_search_mario_FRANCHISE_BROWSE_default_false';
      const cacheEntry = (searchCoordination as any).queryCache.get(cacheKey);
      if (cacheEntry) {
        cacheEntry.timestamp = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      }

      // Second search after cache expiry - should hit database again
      const result = await searchCoordination.coordinatedSearch('mario');
      expect(mockSearchGames).toHaveBeenCalledTimes(2);
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({
        id: 2,
        name: 'Test Game 2'
      });
    });
  });

  describe('Request Deduplication', () => {
    test('should deduplicate simultaneous identical requests', async () => {
      const mockResults = [
        { id: 1, name: 'Test Game', source: 'database' as const }
      ];
      
      // Add delay to simulate real search time
      mockSearchGames.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockResults), 100))
      );

      // Fire 3 simultaneous identical requests
      const promises = [
        searchCoordination.coordinatedSearch('zelda'),
        searchCoordination.coordinatedSearch('zelda'),
        searchCoordination.coordinatedSearch('zelda')
      ];

      const results = await Promise.all(promises);

      // Should only make one actual search call
      expect(mockSearchGames).toHaveBeenCalledTimes(1);
      
      // All requests should return the same results
      results.forEach(result => {
        expect(result.results).toHaveLength(1);
        expect(result.results[0]).toMatchObject({
          id: 1,
          name: 'Test Game'
        });
      });
    });

    test('should not deduplicate different search queries', async () => {
      const mockResults1 = [{ id: 1, name: 'Mario Game', source: 'database' as const }];
      const mockResults2 = [{ id: 2, name: 'Zelda Game', source: 'database' as const }];
      
      mockSearchGames
        .mockResolvedValueOnce(mockResults1)
        .mockResolvedValueOnce(mockResults2);

      // Fire simultaneous different requests
      const promises = [
        searchCoordination.coordinatedSearch('mario'),
        searchCoordination.coordinatedSearch('zelda')
      ];

      const results = await Promise.all(promises);

      // Should make two search calls for different queries
      expect(mockSearchGames).toHaveBeenCalledTimes(2);
      expect(results[0].results[0]).toMatchObject({ id: 1, name: 'Mario Game' });
      expect(results[1].results[0]).toMatchObject({ id: 2, name: 'Zelda Game' });
    });

    test('should clean up pending requests after completion', async () => {
      const mockResults = [{ id: 1, name: 'Test Game', source: 'database' as const }];
      mockSearchGames.mockResolvedValue(mockResults);

      await searchCoordination.coordinatedSearch('pokemon');
      
      // Verify pending requests map is cleaned up
      const pendingRequests = (searchCoordination as any).pendingRequests;
      expect(pendingRequests.size).toBe(0);
    });

    test('should clean up pending requests on error', async () => {
      mockSearchGames.mockRejectedValue(new Error('Search failed'));

      try {
        await searchCoordination.coordinatedSearch('pokemon');
      } catch (error) {
        // Expected to throw
      }
      
      // Verify pending requests map is cleaned up even on error
      const pendingRequests = (searchCoordination as any).pendingRequests;
      expect(pendingRequests.size).toBe(0);
    });
  });

  describe('Cache vs Deduplication Priority', () => {
    test('should check cache before deduplication for immediate response', async () => {
      const mockResults = [{ id: 1, name: 'Cached Game', source: 'database' as const }];
      mockSearchGames.mockResolvedValue(mockResults);

      // First request to populate cache
      await searchCoordination.coordinatedSearch('mario');
      expect(mockSearchGames).toHaveBeenCalledTimes(1);

      // Second request should hit cache, not deduplication
      const startTime = Date.now();
      const result = await searchCoordination.coordinatedSearch('mario');
      const endTime = Date.now();

      expect(mockSearchGames).toHaveBeenCalledTimes(1); // No additional call
      expect(result.results).toHaveLength(1);
      expect(result.results[0]).toMatchObject({ id: 1, name: 'Cached Game' });
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast (cache hit)
    });
  });

  describe('Performance Metrics', () => {
    test('should track cache hit metrics correctly', async () => {
      const mockResults = [{ id: 1, name: 'Test Game', source: 'database' as const }];
      mockSearchGames.mockResolvedValue(mockResults);

      // First search - cache miss
      const result1 = await searchCoordination.coordinatedSearch('mario', {
        includeMetrics: true
      });
      expect(result1.metrics?.cacheHit).toBe(false);

      // Second search - cache hit (should not include metrics since it's cached)  
      const result2 = await searchCoordination.coordinatedSearch('mario');
      expect(result2.results).toHaveLength(1); // Should return cached results
    });

    test('should provide performance metrics for monitoring', () => {
      const metrics = searchCoordination.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('cacheSize');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('averageSearchTime');
      expect(typeof metrics.cacheSize).toBe('number');
    });
  });

  describe('Cache Management', () => {
    test('should limit cache size to prevent memory issues', async () => {
      const mockResults = [{ id: 1, name: 'Test Game', source: 'database' as const }];
      mockSearchGames.mockResolvedValue(mockResults);

      // Fill cache beyond limit (100 entries)
      for (let i = 0; i < 105; i++) {
        await searchCoordination.coordinatedSearch(`game${i}`);
      }

      const cacheSize = (searchCoordination as any).queryCache.size;
      expect(cacheSize).toBeLessThanOrEqual(100);
    });

    test('should clear cache when requested', async () => {
      const mockResults = [{ id: 1, name: 'Test Game', source: 'database' as const }];
      mockSearchGames.mockResolvedValue(mockResults);

      // Add some entries to cache
      await searchCoordination.coordinatedSearch('mario');
      await searchCoordination.coordinatedSearch('zelda');

      expect((searchCoordination as any).queryCache.size).toBeGreaterThan(0);

      // Clear cache
      searchCoordination.clearCache();
      expect((searchCoordination as any).queryCache.size).toBe(0);
    });
  });
});