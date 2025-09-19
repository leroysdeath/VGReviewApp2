/**
 * Integration test for Phase 1 performance optimizations
 * Tests the combined effect of all Phase 1 improvements
 */

import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';

// Mock dependencies
jest.mock('../services/gameDataServiceV2', () => ({
  GameDataServiceV2: jest.fn().mockImplementation(() => ({
    searchGames: jest.fn().mockResolvedValue([
      { id: 1, name: 'Mario Bros', source: 'database' },
      { id: 2, name: 'Super Mario World', source: 'database' }
    ])
  }))
}));

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

describe('Phase 1 Performance Integration Test', () => {
  let searchCoordination: AdvancedSearchCoordination;

  beforeEach(() => {
    searchCoordination = new AdvancedSearchCoordination();
    // Simplify query expansion for predictable testing
    (searchCoordination as any).expandQuery = jest.fn((query) => [query]);
    searchCoordination.clearCache();
  });

  test('should demonstrate overall performance improvements', async () => {
    const testCases = [
      'mario',
      'zelda', 
      'pokemon',
      'final fantasy',
      'mario' // Repeat to test caching
    ];

    const startTime = Date.now();
    const results = [];

    // Execute multiple searches to test all optimizations
    for (const query of testCases) {
      const result = await searchCoordination.coordinatedSearch(query, {
        includeMetrics: true,
        maxResults: 50
      });
      results.push(result);
    }

    const totalTime = Date.now() - startTime;

    // Performance assertions
    expect(totalTime).toBeLessThan(2000); // Should complete all searches quickly

    // Cache effectiveness
    expect(results[0].metrics?.cacheHit).toBe(false); // First mario search
    expect(results[4].results).toHaveLength(2); // Cached mario search should return results

    // All searches should return results
    results.forEach((result, index) => {
      expect(result.results.length).toBeGreaterThan(0);
      console.log(`Search ${index + 1} (${testCases[index]}): ${result.results.length} results, cache hit: ${result.metrics?.cacheHit || 'N/A'}`);
    });

    console.log(`✅ Phase 1 Integration Test completed in ${totalTime}ms`);
    console.log(`✅ Average search time: ${(totalTime / testCases.length).toFixed(1)}ms per search`);
  });

  test('should demonstrate cache TTL of 30 minutes', () => {
    // Test that cache TTL is correctly set to 30 minutes
    const cacheManager = (searchCoordination as any);
    expect(cacheManager.CACHE_TTL).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
  });

  test('should demonstrate request deduplication', async () => {
    const mockSearchGames = (searchCoordination as any).gameDataService.searchGames;
    
    // Fire multiple simultaneous requests
    const promises = [
      searchCoordination.coordinatedSearch('mario'),
      searchCoordination.coordinatedSearch('mario'),
      searchCoordination.coordinatedSearch('mario')
    ];

    await Promise.all(promises);

    // Should only make one actual database call due to deduplication
    expect(mockSearchGames).toHaveBeenCalledTimes(1);
  });

  test('should provide performance metrics for monitoring', () => {
    const metrics = searchCoordination.getPerformanceMetrics();
    
    expect(metrics).toEqual({
      cacheSize: expect.any(Number),
      cacheHitRate: expect.any(Number),
      averageSearchTime: expect.any(Number)
    });

    console.log('Performance Metrics:', metrics);
  });
});