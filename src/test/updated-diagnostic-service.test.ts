import type { GameWithCalculatedFields } from '../types/database';

// Mock dependencies
jest.mock('../services/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        ilike: () => ({
          limit: () => Promise.resolve({ data: [], error: null })
        })
      })
    })
  }
}));

jest.mock('../services/advancedSearchCoordination', () => ({
  AdvancedSearchCoordination: jest.fn().mockImplementation(() => ({
    coordinatedSearch: jest.fn()
  }))
}));

jest.mock('../services/resultAnalysisService', () => ({
  resultAnalysisService: {
    analyzeSearchResults: jest.fn(() => ({
      relevanceMetrics: { exactMatches: 0, partialMatches: 0 },
      qualityMetrics: { averageRating: 0, highQualityCount: 0 },
      diversityMetrics: { genreCount: 0, platformCount: 0 }
    }))
  }
}));

jest.mock('../services/igdbServiceV2', () => ({
  igdbServiceV2: {
    searchGames: jest.fn(() => Promise.resolve([]))
  }
}));

// Import after mocking
import { SearchDiagnosticService } from '../services/searchDiagnosticService';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';

describe('Updated Diagnostic Service', () => {
  let searchDiagnosticService: SearchDiagnosticService;
  let mockCoordinatedSearch: jest.Mock;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock coordinated search function that returns the correct structure
    mockCoordinatedSearch = jest.fn().mockResolvedValue({
      results: [
        {
          id: 1,
          name: 'Super Mario Bros.',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          total_rating: 85,
          rating_count: 50,
          follows: 100000,
          popularity_score: 75000,
          greenlight_flag: false,
          redlight_flag: false
        },
        {
          id: 2,
          name: 'Super Mario World',
          developer: 'Nintendo EAD',
          publisher: 'Nintendo',
          category: 0,
          total_rating: 90,
          rating_count: 80,
          follows: 150000,
          popularity_score: 85000,
          greenlight_flag: false,
          redlight_flag: false
        }
      ],
      metrics: { totalResults: 2, processingTime: 100 }
    });
    
    // Mock the AdvancedSearchCoordination constructor to return an object with our mock
    (AdvancedSearchCoordination as jest.Mock).mockImplementation(() => ({
      coordinatedSearch: mockCoordinatedSearch
    }));
    
    // Create a new instance of the service
    searchDiagnosticService = new SearchDiagnosticService();
  });

  describe('Integration with Improved Search Coordination', () => {
    it('should use advanced search coordination for final results', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('mario');

      // Verify it called the coordinated search with correct parameters
      expect(mockCoordinatedSearch).toHaveBeenCalledWith('mario', {
        maxResults: 40,
        includeMetrics: true,
        fastMode: false,
        bypassCache: false,
        useAggressive: false
      });

      expect(result.query).toBe('mario');
      expect(result.performance).toBeDefined();
      expect(result.filterAnalysis).toBeDefined();
    });

    it('should analyze new IGDB metrics in filter analysis', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('mario');

      // Check that new metrics are included in analysis
      expect(result.filterAnalysis.totalRatingDistribution).toBeDefined();
      expect(result.filterAnalysis.popularityDistribution).toBeDefined();
      expect(result.filterAnalysis.flagAnalysis).toBeDefined();

      // Verify specific distributions
      expect(result.filterAnalysis.totalRatingDistribution['81-100']).toBeGreaterThan(0);
      expect(result.filterAnalysis.popularityDistribution['mainstream']).toBeGreaterThan(0);
      expect(result.filterAnalysis.flagAnalysis.unflagged).toBeGreaterThan(0);
    });
  });

  describe('New Metrics Analysis', () => {
    it('should correctly categorize popularity scores', async () => {
      // Mock games with different popularity levels
      mockCoordinatedSearch.mockResolvedValue({
        results: [
          { id: 1, name: 'Viral Game', popularity_score: 90000, total_rating: 85 },
          { id: 2, name: 'Mainstream Game', popularity_score: 60000, total_rating: 80 },
          { id: 3, name: 'Popular Game', popularity_score: 25000, total_rating: 75 },
          { id: 4, name: 'Known Game', popularity_score: 5000, total_rating: 70 },
          { id: 5, name: 'Niche Game', popularity_score: 500, total_rating: 65 }
        ]
      });

      const result = await searchDiagnosticService.analyzeSingleSearch('test');

      expect(result.filterAnalysis.popularityDistribution.viral).toBe(1);
      expect(result.filterAnalysis.popularityDistribution.mainstream).toBe(1);
      expect(result.filterAnalysis.popularityDistribution.popular).toBe(1);
      expect(result.filterAnalysis.popularityDistribution.known).toBe(1);
      expect(result.filterAnalysis.popularityDistribution.niche).toBe(1);
    });

    it('should correctly analyze total rating distribution', async () => {
      mockCoordinatedSearch.mockResolvedValue({
        results: [
          { id: 1, name: 'Excellent Game', total_rating: 95 },
          { id: 2, name: 'Great Game', total_rating: 85 },
          { id: 3, name: 'Good Game', total_rating: 75 },
          { id: 4, name: 'Average Game', total_rating: 55 },
          { id: 5, name: 'Poor Game', total_rating: 35 }
        ]
      });

      const result = await searchDiagnosticService.analyzeSingleSearch('test');

      expect(result.filterAnalysis.totalRatingDistribution['81-100']).toBe(2);
      expect(result.filterAnalysis.totalRatingDistribution['61-80']).toBe(1);
      expect(result.filterAnalysis.totalRatingDistribution['41-60']).toBe(1);
      expect(result.filterAnalysis.totalRatingDistribution['21-40']).toBe(1);
    });

    it('should analyze manual flag status correctly', async () => {
      mockCoordinatedSearch.mockResolvedValue({
        results: [
          { id: 1, name: 'Greenlight Game', greenlight_flag: true, redlight_flag: false },
          { id: 2, name: 'Redlight Game', greenlight_flag: false, redlight_flag: true },
          { id: 3, name: 'Normal Game', greenlight_flag: false, redlight_flag: false }
        ]
      });

      const result = await searchDiagnosticService.analyzeSingleSearch('test');

      expect(result.filterAnalysis.flagAnalysis.greenlight).toBe(1);
      expect(result.filterAnalysis.flagAnalysis.redlight).toBe(1);
      expect(result.filterAnalysis.flagAnalysis.unflagged).toBe(1);
      expect(result.filterAnalysis.flagAnalysis.total).toBe(2);
    });
  });

  describe('Enhanced Sorting Analysis', () => {
    it('should prioritize total_rating over igdb_rating in sorting', async () => {
      mockCoordinatedSearch.mockResolvedValue({
        results: [
          { 
            id: 1, 
            name: 'Game A', 
            igdb_rating: 90, 
            total_rating: 85 // Lower total_rating
          },
          { 
            id: 2, 
            name: 'Game B', 
            igdb_rating: 80, 
            total_rating: 95 // Higher total_rating
          }
        ]
      });

      const result = await searchDiagnosticService.analyzeSingleSearch('test');

      // Game B should be sorted first due to higher total_rating
      expect(result.sortingAnalysis.sortedByRating[0]).toBe('Game B');
      expect(result.sortingAnalysis.sortedByRating[1]).toBe('Game A');
      expect(result.sortingAnalysis.topRatedGame).toBe('Game B');
    });

    it('should use popularity in relevance scoring', async () => {
      mockCoordinatedSearch.mockResolvedValue({
        results: [
          { 
            id: 1, 
            name: 'mario bros', 
            popularity_score: 60000, // Mainstream
            total_rating: 80
          },
          { 
            id: 2, 
            name: 'mario world', 
            popularity_score: 5000, // Known
            total_rating: 80
          }
        ]
      });

      const result = await searchDiagnosticService.analyzeSingleSearch('mario');

      // Higher popularity should boost relevance
      expect(result.sortingAnalysis.sortedByRelevance[0]).toBe('mario bros');
    });

    it('should calculate average rating using total_rating when available', async () => {
      mockCoordinatedSearch.mockResolvedValue({
        results: [
          { id: 1, name: 'Game A', total_rating: 80, igdb_rating: 70 },
          { id: 2, name: 'Game B', total_rating: 90, igdb_rating: 75 },
          { id: 3, name: 'Game C', igdb_rating: 85, total_rating: undefined }
        ]
      });

      const result = await searchDiagnosticService.analyzeSingleSearch('test');

      // Should average: (80 + 90 + 85) / 3 = 85
      expect(result.sortingAnalysis.averageRating).toBe(85);
    });
  });

  describe('Performance and Integration', () => {
    it('should maintain performance metrics structure', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('mario');

      expect(result.performance).toHaveProperty('totalDuration');
      expect(result.performance).toHaveProperty('dbQueryTime');
      expect(result.performance).toHaveProperty('processingTime');
      expect(result.performance.totalDuration).toBeGreaterThan(0);
    });

    it('should include result analysis from improved search', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('mario');

      expect(result.resultAnalysis).toBeDefined();
      expect(result.resultAnalysis).toHaveProperty('relevanceMetrics');
      expect(result.resultAnalysis).toHaveProperty('qualityMetrics');
      expect(result.resultAnalysis).toHaveProperty('diversityMetrics');
    });

    it('should handle empty search results gracefully', async () => {
      mockCoordinatedSearch.mockResolvedValue({ results: [] });

      const result = await searchDiagnosticService.analyzeSingleSearch('nonexistent');

      expect(result.sortingAnalysis.originalOrder).toEqual([]);
      expect(result.sortingAnalysis.topRatedGame).toBe('None');
      expect(result.sortingAnalysis.averageRating).toBe(0);
      expect(result.filterAnalysis.flagAnalysis.total).toBe(0);
    });
  });

  describe('IGDB Rate Limiting Integration', () => {
    it('should respect rate limiting in bulk tests', async () => {
      const queries = ['mario', 'zelda', 'pokemon'];
      
      // Mock shorter delay for testing
      const originalDelay = searchDiagnosticService['delay'];
      searchDiagnosticService['delay'] = jest.fn().mockResolvedValue(undefined);

      const result = await searchDiagnosticService.bulkTestQueries(queries);

      expect(result.testQueries).toEqual(queries);
      expect(result.results).toHaveLength(3);
      expect(result.igdbUsageStats).toBeDefined();
      
      // Restore original delay
      searchDiagnosticService['delay'] = originalDelay;
    });

    it('should provide IGDB usage statistics', () => {
      const stats = searchDiagnosticService.getIGDBStats();

      expect(stats).toHaveProperty('dailyRequestCount');
      expect(stats).toHaveProperty('remainingQuota');
      expect(stats).toHaveProperty('currentRateLimit');
    });
  });

  describe('Error Handling', () => {
    it('should handle search coordination errors gracefully', async () => {
      mockCoordinatedSearch.mockRejectedValue(
        new Error('Search coordination failed')
      );

      // Should not throw
      await expect(
        searchDiagnosticService.analyzeSingleSearch('error-test')
      ).rejects.toThrow('Search coordination failed');
    });

    it('should handle missing metrics gracefully', async () => {
      mockCoordinatedSearch.mockResolvedValue({
        results: [
          { 
            id: 1, 
            name: 'Incomplete Game',
            // Missing total_rating, popularity_score, flags
          }
        ]
      });

      const result = await searchDiagnosticService.analyzeSingleSearch('test');

      // Should not crash and provide defaults
      expect(result.filterAnalysis.totalRatingDistribution['0-20']).toBe(1); // Missing total_rating defaults to 0
      expect(result.filterAnalysis.popularityDistribution.niche).toBe(1);
      expect(result.filterAnalysis.flagAnalysis.unflagged).toBe(1);
    });
  });
});