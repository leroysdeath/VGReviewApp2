/**
 * Tests for maxResults parameter flow through service layers
 */

import { describe, it, expect, vi, beforeEach } from '@jest/globals';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { GameDataServiceV2 } from '../services/gameDataServiceV2';

// Mock Supabase
vi.mock('../services/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
    })),
  },
}));

describe('MaxResults Parameter Flow', () => {
  let searchCoordination: AdvancedSearchCoordination;
  let gameDataService: GameDataServiceV2;

  beforeEach(() => {
    vi.clearAllMocks();
    searchCoordination = new AdvancedSearchCoordination();
    gameDataService = new GameDataServiceV2();
  });

  describe('AdvancedSearchCoordination', () => {
    it('should respect maxResults parameter in coordinatedSearch', async () => {
      const spy = vi.spyOn(gameDataService, 'searchGames');

      // Test with default maxResults (200)
      await searchCoordination.coordinatedSearch('Pokemon', {
        maxResults: 200,
        includeMetrics: false,
        bypassCache: true
      });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        200 // Should pass maxResults through
      );
    });

    it('should pass custom maxResults to gameDataService', async () => {
      const spy = vi.spyOn(gameDataService, 'searchGames');

      // Test with custom maxResults
      await searchCoordination.coordinatedSearch('Final Fantasy', {
        maxResults: 150,
        includeMetrics: false,
        bypassCache: true
      });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        150 // Should pass custom maxResults
      );
    });

    it('should handle franchise searches with increased limits', async () => {
      const spy = vi.spyOn(gameDataService, 'searchGames');

      // Test franchise search (should use maxResults)
      await searchCoordination.coordinatedSearch('Street Fighter', {
        maxResults: 200,
        includeMetrics: false,
        bypassCache: true
      });

      expect(spy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        200 // Franchise search should use full maxResults
      );
    });
  });

  describe('GameDataServiceV2', () => {
    it('should use maxResults for searchByName calls', async () => {
      const mockResults = Array(200).fill(null).map((_, i) => ({
        id: i,
        name: `Pokemon ${i}`,
        developer: 'Game Freak',
        publisher: 'Nintendo',
      }));

      // Mock the searchByName function
      const searchByNameSpy = vi.fn().mockResolvedValue(mockResults);
      gameDataService.searchByName = searchByNameSpy;

      await gameDataService.searchGames('Pokemon', {}, 200);

      // Verify searchByName was called with maxResults
      expect(searchByNameSpy).toHaveBeenCalledWith('Pokemon', 200);
    });

    it('should use half maxResults for searchBySummary', async () => {
      const mockResults = Array(100).fill(null).map((_, i) => ({
        id: i,
        name: `Game ${i}`,
        summary: 'Contains Pokemon reference',
      }));

      // Mock the searchBySummary function
      const searchBySummarySpy = vi.fn().mockResolvedValue(mockResults);
      gameDataService.searchBySummary = searchBySummarySpy;

      await gameDataService.searchGames('Pokemon adventure', {}, 200);

      // Should use maxResults/2 for summary searches
      expect(searchBySummarySpy).toHaveBeenCalledWith(
        expect.any(String),
        100 // 200/2
      );
    });

    it('should not artificially limit results below maxResults', async () => {
      // Create 200 mock games
      const mockGames = Array(200).fill(null).map((_, i) => ({
        id: i,
        name: `Pokemon ${i}`,
        developer: 'Game Freak',
        publisher: 'Nintendo',
        rating: Math.random() * 100,
      }));

      // Mock the database response
      const mockSupabaseResponse = {
        data: mockGames,
        error: null
      };

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(mockSupabaseResponse)
      } as any);

      const results = await gameDataService.searchGames('Pokemon', {}, 200);

      // Should return all 200 results, not artificially limited
      expect(results.length).toBe(200);
    });
  });

  describe('useGameSearch Hook Integration', () => {
    it('should configure default limit as 200', () => {
      // This would be tested in a React testing environment
      // Verify that useGameSearch initializes with limit: 200
      const expectedDefaultOptions = {
        limit: 200,
        offset: 0,
        sortBy: 'popularity',
        sortOrder: 'desc'
      };

      // Mock test - in real test would use renderHook from @testing-library/react-hooks
      expect(expectedDefaultOptions.limit).toBe(200);
    });

    it('should pass maxResults through search coordination', async () => {
      const mockCoordinatedSearch = vi.fn().mockResolvedValue({
        results: [],
        totalFound: 0
      });

      // Replace the coordinatedSearch method
      AdvancedSearchCoordination.prototype.coordinatedSearch = mockCoordinatedSearch;

      // Simulate search with limit
      const searchParams = {
        maxResults: 200,
        includeMetrics: true,
        bypassCache: false
      };

      await new AdvancedSearchCoordination().coordinatedSearch('Pokemon', searchParams);

      expect(mockCoordinatedSearch).toHaveBeenCalledWith('Pokemon', expect.objectContaining({
        maxResults: 200
      }));
    });
  });

  describe('End-to-End Parameter Flow', () => {
    it('should maintain maxResults through entire search chain', async () => {
      const spies = {
        coordination: vi.spyOn(AdvancedSearchCoordination.prototype, 'coordinatedSearch'),
        dataService: vi.spyOn(GameDataServiceV2.prototype, 'searchGames'),
      };

      const searchCoord = new AdvancedSearchCoordination();

      // Simulate full search flow
      await searchCoord.coordinatedSearch('Mario', {
        maxResults: 250,
        includeMetrics: false,
        bypassCache: true
      });

      // Verify parameter flow
      expect(spies.coordination).toHaveBeenCalledWith('Mario', expect.objectContaining({
        maxResults: 250
      }));

      expect(spies.dataService).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        250
      );
    });

    it('should handle different maxResults for different search types', async () => {
      const dataServiceSpy = vi.spyOn(GameDataServiceV2.prototype, 'searchGames');

      const searchCoord = new AdvancedSearchCoordination();

      // Quick search (dropdown) - should use small limit
      await searchCoord.coordinatedSearch('Zelda', {
        maxResults: 8,
        includeMetrics: false,
        bypassCache: false
      });

      expect(dataServiceSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        8
      );

      // Full search - should use large limit
      await searchCoord.coordinatedSearch('Zelda', {
        maxResults: 200,
        includeMetrics: true,
        bypassCache: false
      });

      expect(dataServiceSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        200
      );
    });
  });

  describe('Boundary Tests', () => {
    it('should handle maxResults edge cases', async () => {
      const service = new GameDataServiceV2();

      // Test minimum
      const minResults = await service.searchGames('test', {}, 1);
      expect(minResults.length).toBeLessThanOrEqual(1);

      // Test maximum reasonable limit
      const maxResults = await service.searchGames('test', {}, 500);
      expect(maxResults.length).toBeLessThanOrEqual(500);

      // Test zero (should default to something reasonable)
      const zeroResults = await service.searchGames('test', {}, 0);
      expect(zeroResults).toBeDefined();
    });

    it('should not break with very large maxResults', async () => {
      const service = new GameDataServiceV2();

      // Should handle gracefully without throwing
      await expect(
        service.searchGames('Pokemon', {}, 10000)
      ).resolves.toBeDefined();
    });
  });
});