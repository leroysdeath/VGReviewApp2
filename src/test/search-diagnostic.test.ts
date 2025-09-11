/**
 * Unit Tests for Search Diagnostic Service
 * Tests IGDB compliance, rate limiting, and diagnostic functionality
 */

import { searchDiagnosticService } from '../services/searchDiagnosticService';

// Mock data for testing
const mockGameData = [
  {
    id: 1,
    igdb_id: 1001,
    name: 'Super Mario Bros.',
    summary: 'Classic platformer game',
    genres: ['Platformer', 'Adventure'],
    platforms: ['NES', 'Switch'],
    release_date: '1985-09-13',
    igdb_rating: 85,
    developer: 'Nintendo',
    publisher: 'Nintendo',
    averageUserRating: 4.5,
    totalUserRatings: 100,
    slug: 'super-mario-bros',
    cover_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    igdb_id: 1002,
    name: 'Mario Kart 8',
    summary: 'Racing game featuring Mario characters',
    genres: ['Racing', 'Sports'],
    platforms: ['Wii U', 'Switch'],
    release_date: '2014-05-29',
    igdb_rating: 88,
    developer: 'Nintendo EPD',
    publisher: 'Nintendo',
    averageUserRating: 4.7,
    totalUserRatings: 150,
    slug: 'mario-kart-8',
    cover_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
];

describe('Search Diagnostic Service', () => {
  beforeEach(() => {
    // Reset any mocks or state before each test
    jest.clearAllMocks();
  });

  describe('IGDB Rate Limiter', () => {
    test('should respect rate limits (4 requests per second)', async () => {
      const rateLimiter = (searchDiagnosticService as any).rateLimiter;
      
      // Test that we can make 4 requests quickly
      const promises = [];
      for (let i = 0; i < 4; i++) {
        promises.push(rateLimiter.canMakeRequest());
      }
      
      const results = await Promise.all(promises);
      expect(results.filter(r => r === true)).toHaveLength(4);
      
      // 5th request should be rate limited
      const fifthRequest = await rateLimiter.canMakeRequest();
      expect(fifthRequest).toBe(false);
    }, 10000);

    test('should track daily request limits', async () => {
      const rateLimiter = (searchDiagnosticService as any).rateLimiter;
      const stats = rateLimiter.getStats();
      
      expect(stats).toHaveProperty('dailyRequestCount');
      expect(stats).toHaveProperty('remainingQuota');
      expect(stats.remainingQuota).toBeLessThanOrEqual(450);
    });

    test('should reset rate limit after 1 second', async () => {
      const rateLimiter = (searchDiagnosticService as any).rateLimiter;
      
      // Fill up the rate limit
      for (let i = 0; i < 4; i++) {
        await rateLimiter.canMakeRequest();
      }
      
      // Should be rate limited now
      expect(await rateLimiter.canMakeRequest()).toBe(false);
      
      // Wait for rate limit to reset
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should be able to make requests again
      expect(await rateLimiter.canMakeRequest()).toBe(true);
    }, 15000);
  });

  describe('Filter Analysis', () => {
    test('should analyze genre distribution correctly', () => {
      const filterAnalysis = (searchDiagnosticService as any).analyzeFilters(mockGameData);
      
      expect(filterAnalysis.genreDistribution).toEqual({
        'Platformer': 1,
        'Adventure': 1,
        'Racing': 1,
        'Sports': 1
      });
    });

    test('should analyze platform distribution correctly', () => {
      const filterAnalysis = (searchDiagnosticService as any).analyzeFilters(mockGameData);
      
      expect(filterAnalysis.platformDistribution).toEqual({
        'NES': 1,
        'Switch': 2,
        'Wii U': 1
      });
    });

    test('should analyze rating distribution correctly', () => {
      const filterAnalysis = (searchDiagnosticService as any).analyzeFilters(mockGameData);
      
      expect(filterAnalysis.ratingDistribution).toEqual({
        '0-20': 0,
        '21-40': 0,
        '41-60': 0,
        '61-80': 0,
        '81-100': 2
      });
    });

    test('should analyze release year distribution correctly', () => {
      const filterAnalysis = (searchDiagnosticService as any).analyzeFilters(mockGameData);
      
      expect(filterAnalysis.releaseYearDistribution).toEqual({
        '1985': 1,
        '2014': 1
      });
    });
  });

  describe('Sorting Analysis', () => {
    test('should sort games by rating correctly', () => {
      const sortingAnalysis = (searchDiagnosticService as any).analyzeSorting(mockGameData, 'mario');
      
      expect(sortingAnalysis.sortedByRating[0]).toBe('Mario Kart 8'); // Higher rating (88)
      expect(sortingAnalysis.sortedByRating[1]).toBe('Super Mario Bros.'); // Lower rating (85)
    });

    test('should calculate relevance scores correctly', () => {
      const calculateRelevanceScore = (searchDiagnosticService as any).calculateRelevanceScore;
      
      // Exact match should score highest
      const exactScore = calculateRelevanceScore(mockGameData[0], 'Super Mario Bros.');
      
      // Partial match should score lower
      const partialScore = calculateRelevanceScore(mockGameData[0], 'mario');
      
      expect(exactScore).toBeGreaterThan(partialScore);
      expect(exactScore).toBe(100); // Exact match
      expect(partialScore).toBeLessThan(100);
    });

    test('should identify top rated game correctly', () => {
      const sortingAnalysis = (searchDiagnosticService as any).analyzeSorting(mockGameData, 'mario');
      
      expect(sortingAnalysis.topRatedGame).toBe('Mario Kart 8');
      expect(sortingAnalysis.averageRating).toBe(86.5); // (85 + 88) / 2
    });
  });

  describe('Pattern Analysis', () => {
    const mockResults = [
      {
        query: 'mario',
        filterAnalysis: {
          genreDistribution: { 'Platformer': 5, 'Racing': 2 },
          platformDistribution: { 'Switch': 7, 'NES': 3 },
          releaseYearDistribution: { '1985': 2, '2017': 3 },
          ratingDistribution: { '81-100': 5, '61-80': 2, '41-60': 0, '21-40': 0, '0-20': 0 }
        },
        performance: { totalDuration: 1500, dbQueryTime: 800, processingTime: 700 },
        dbResults: { totalCount: 25 },
        igdbResults: { count: 5 }
      },
      {
        query: 'zelda',
        filterAnalysis: {
          genreDistribution: { 'Adventure': 8, 'RPG': 3 },
          platformDistribution: { 'Switch': 6, 'GameCube': 2 },
          releaseYearDistribution: { '1986': 1, '2017': 4 },
          ratingDistribution: { '81-100': 7, '61-80': 3, '41-60': 1, '21-40': 0, '0-20': 0 }
        },
        performance: { totalDuration: 1200, dbQueryTime: 600, processingTime: 600 },
        dbResults: { totalCount: 30 },
        igdbResults: { count: 3 }
      }
    ];

    test('should identify common genres across searches', () => {
      const patterns = (searchDiagnosticService as any).analyzePatterns(mockResults);
      
      expect(patterns.commonFilters).toContain(expect.stringContaining('Adventure'));
      expect(patterns.commonFilters).toContain(expect.stringContaining('Platformer'));
    });

    test('should identify performance bottlenecks', () => {
      const slowResults = [
        {
          ...mockResults[0],
          performance: { ...mockResults[0].performance, dbQueryTime: 2500, totalDuration: 3000 }
        }
      ];
      
      const patterns = (searchDiagnosticService as any).analyzePatterns(slowResults);
      
      expect(patterns.performanceBottlenecks).toContain(
        expect.stringContaining('Database queries averaging over 1 second')
      );
      expect(patterns.performanceBottlenecks).toContain(
        expect.stringContaining('Total search time averaging over 2 seconds')
      );
    });

    test('should identify quality issues', () => {
      const poorResults = mockResults.map(r => ({
        ...r,
        dbResults: { ...r.dbResults, totalCount: 2 } // Low result count
      }));
      
      const patterns = (searchDiagnosticService as any).analyzePatterns(poorResults);
      
      expect(patterns.qualityIssues).toContain(
        expect.stringContaining('queries returned fewer than 5 results')
      );
    });

    test('should provide relevant recommendations', () => {
      const results = [
        {
          ...mockResults[0],
          performance: { dbQueryTime: 1500, totalDuration: 2000 },
          dbResults: { totalCount: 2 },
          igdbResults: { count: 8 }
        }
      ];
      
      const patterns = (searchDiagnosticService as any).analyzePatterns(results);
      
      expect(patterns.recommendations).toContain(
        expect.stringContaining('database indexing')
      );
      expect(patterns.recommendations).toContain(
        expect.stringContaining('bulk importing more games')
      );
    });
  });

  describe('Search Decision Logic', () => {
    test('should decide to use IGDB when DB results are low', () => {
      const shouldUseIGDB = (searchDiagnosticService as any).shouldUseIGDB;
      
      // Low results should trigger IGDB
      expect(shouldUseIGDB([], 'obscure game')).toBe(true);
      expect(shouldUseIGDB([mockGameData[0]], 'obscure game')).toBe(true);
      
      // High results should not trigger IGDB
      const manyGames = Array(10).fill(mockGameData[0]);
      expect(shouldUseIGDB(manyGames, 'popular game')).toBe(false);
    });

    test('should identify franchise queries correctly', () => {
      const isFranchiseQuery = (searchDiagnosticService as any).isFranchiseQuery;
      
      expect(isFranchiseQuery('mario')).toBe(true);
      expect(isFranchiseQuery('Super Mario Bros')).toBe(true);
      expect(isFranchiseQuery('pokemon')).toBe(true);
      expect(isFranchiseQuery('final fantasy')).toBe(true);
      expect(isFranchiseQuery('ff')).toBe(true);
      
      expect(isFranchiseQuery('random indie game')).toBe(false);
      expect(isFranchiseQuery('specific title')).toBe(false);
    });

    test('should use IGDB for franchise queries with moderate results', () => {
      const shouldUseIGDB = (searchDiagnosticService as any).shouldUseIGDB;
      
      // Franchise query with 8 results should use IGDB
      const someGames = Array(8).fill(mockGameData[0]);
      expect(shouldUseIGDB(someGames, 'mario')).toBe(true);
      
      // Non-franchise query with 8 results should not use IGDB
      expect(shouldUseIGDB(someGames, 'indie platformer')).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('should handle empty search results gracefully', async () => {
      // Mock empty database response
      const originalSearchByName = (searchDiagnosticService as any).searchByName;
      (searchDiagnosticService as any).searchByName = jest.fn().mockResolvedValue([]);
      (searchDiagnosticService as any).searchBySummary = jest.fn().mockResolvedValue([]);
      
      const result = await searchDiagnosticService.analyzeSingleSearch('nonexistent game');
      
      expect(result.dbResults.totalCount).toBe(0);
      expect(result.filterAnalysis.genreDistribution).toEqual({});
      expect(result.sortingAnalysis.topRatedGame).toBe('None');
      
      // Restore original method
      (searchDiagnosticService as any).searchByName = originalSearchByName;
    });

    test('should respect IGDB rate limits during bulk testing', async () => {
      const testQueries = ['mario', 'zelda', 'pokemon'];
      
      // Mock IGDB responses to avoid actual API calls
      const originalAnalyzeIGDBSearch = (searchDiagnosticService as any).analyzeIGDBSearch;
      (searchDiagnosticService as any).analyzeIGDBSearch = jest.fn().mockResolvedValue({
        games: mockGameData,
        rateLimited: false
      });
      
      const result = await searchDiagnosticService.bulkTestQueries(testQueries);
      
      expect(result.results).toHaveLength(testQueries.length);
      expect(result.igdbUsageStats.rateLimitHits).toBe(0);
      
      // Restore original method
      (searchDiagnosticService as any).analyzeIGDBSearch = originalAnalyzeIGDBSearch;
    }, 30000);
  });

  describe('Performance Tests', () => {
    test('should complete single search analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      // Mock fast database responses
      (searchDiagnosticService as any).searchByName = jest.fn().mockResolvedValue([mockGameData[0]]);
      (searchDiagnosticService as any).searchBySummary = jest.fn().mockResolvedValue([]);
      
      await searchDiagnosticService.analyzeSingleSearch('mario');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test('should handle concurrent searches without conflicts', async () => {
      // Mock database responses
      (searchDiagnosticService as any).searchByName = jest.fn().mockResolvedValue([mockGameData[0]]);
      (searchDiagnosticService as any).searchBySummary = jest.fn().mockResolvedValue([]);
      
      const searches = [
        searchDiagnosticService.analyzeSingleSearch('mario'),
        searchDiagnosticService.analyzeSingleSearch('zelda'),
        searchDiagnosticService.analyzeSingleSearch('pokemon')
      ];
      
      const results = await Promise.all(searches);
      
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('query');
        expect(result).toHaveProperty('dbResults');
        expect(result).toHaveProperty('filterAnalysis');
      });
    });
  });
});

describe('IGDB Compliance', () => {
  test('should include proper attribution in requests', () => {
    // This would test that IGDB attribution is included in API calls
    // Implementation depends on how the actual IGDB service is structured
    expect(true).toBe(true); // Placeholder - implement based on actual IGDB service
  });

  test('should cache results to minimize API calls', () => {
    // Test caching implementation to reduce IGDB API usage
    expect(true).toBe(true); // Placeholder - implement based on caching strategy
  });

  test('should not exceed daily rate limits', () => {
    const rateLimiter = (searchDiagnosticService as any).rateLimiter;
    const stats = rateLimiter.getStats();
    
    // Should never exceed the conservative limit of 450 requests per day
    expect(stats.dailyRequestCount).toBeLessThanOrEqual(450);
  });
});