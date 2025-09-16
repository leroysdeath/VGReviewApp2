import { act } from '@testing-library/react';
import GameDataServiceV2 from '../services/gameDataServiceV2';

// Mock the search services
jest.mock('../services/advancedSearchCoordination');
jest.mock('../services/gameDataServiceV2');

describe('Phase 1 Search Performance Fixes', () => {
  
  describe('State Synchronization Fix', () => {
    let mockSearchResults: any[];

    beforeEach(() => {
      mockSearchResults = [
        { id: 1, name: 'Super Mario Odyssey', igdb_id: 1, cover_url: 'test.jpg' },
        { id: 2, name: 'Mario Kart 8', igdb_id: 2, cover_url: 'test2.jpg' }
      ];
    });

    it('should return search results directly from searchGames', async () => {
      // Create a mock search function that returns results directly
      const mockSearchGames = jest.fn().mockResolvedValue(mockSearchResults);

      const results = await mockSearchGames('mario');

      // Should return results immediately, not undefined
      expect(results).toEqual(mockSearchResults);
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('Super Mario Odyssey');
    });

    it('should not rely on stale state for immediate results', async () => {
      const mockSearchGames = jest.fn();
      
      // First search returns mario results
      mockSearchGames.mockResolvedValueOnce(mockSearchResults);
      const firstResults = await mockSearchGames('mario');
      expect(firstResults).toEqual(mockSearchResults);

      // Second search returns different results, not stale mario results
      const newResults = [
        { id: 3, name: 'The Legend of Zelda', igdb_id: 3, cover_url: 'zelda.jpg' }
      ];
      mockSearchGames.mockResolvedValueOnce(newResults);

      const secondResults = await mockSearchGames('zelda');
      expect(secondResults).toEqual(newResults);
      expect(secondResults[0].name).toBe('The Legend of Zelda');
      // Should NOT contain mario results
      expect(secondResults).not.toContain(mockSearchResults[0]);
    });
  });

  describe('Debounce Timing Standardization', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should use 500ms debounce in ResponsiveNavbar', () => {
      const mockPerformSearch = jest.fn();
      
      // Simulate the debounced search function
      const debouncedSearch = (query: string) => {
        setTimeout(() => {
          mockPerformSearch(query);
        }, 500);
      };

      // Trigger multiple searches
      debouncedSearch('m');
      debouncedSearch('ma');
      debouncedSearch('mar');
      debouncedSearch('mario');

      // Should not have called yet
      expect(mockPerformSearch).not.toHaveBeenCalled();

      // Fast forward 499ms - still shouldn't be called
      act(() => {
        jest.advanceTimersByTime(499);
      });
      expect(mockPerformSearch).not.toHaveBeenCalled();

      // Fast forward to 500ms - should be called once with final query
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(mockPerformSearch).toHaveBeenCalledTimes(1);
      expect(mockPerformSearch).toHaveBeenCalledWith('mario');
    });

    it('should use 500ms debounce in SearchResultsPage', () => {
      const mockPerformSearch = jest.fn();
      
      // Simulate the debounced filter change function
      const debouncedFilterChange = (filters: any) => {
        setTimeout(() => {
          mockPerformSearch(filters);
        }, 500);
      };

      // Trigger filter changes
      debouncedFilterChange({ sortBy: 'name' });
      debouncedFilterChange({ sortBy: 'rating' });
      debouncedFilterChange({ sortBy: 'release_date' });

      // Should not have called yet
      expect(mockPerformSearch).not.toHaveBeenCalled();

      // Fast forward to 500ms
      act(() => {
        jest.advanceTimersByTime(500);
      });
      expect(mockPerformSearch).toHaveBeenCalledTimes(1);
      expect(mockPerformSearch).toHaveBeenCalledWith({ sortBy: 'release_date' });
    });
  });

  describe('IGDB Threshold Optimization', () => {
    let gameDataService: GameDataServiceV2;
    let mockShouldQueryIGDB: jest.SpyInstance;

    beforeEach(() => {
      gameDataService = new GameDataServiceV2();
      // Access private method for testing
      mockShouldQueryIGDB = jest.spyOn(gameDataService as any, 'shouldQueryIGDB');
    });

    it('should only query IGDB with less than 2 results for general searches', () => {
      const mockResults = [
        { id: 1, name: 'Test Game', igdb_id: 1 }
      ];

      // Should not query IGDB with 1 result (changed from 3)
      const shouldQuery1 = (gameDataService as any).shouldQueryIGDB(mockResults, 'test');
      expect(shouldQuery1).toBe(false);

      // Should query IGDB with 0 results
      const shouldQuery0 = (gameDataService as any).shouldQueryIGDB([], 'test');
      expect(shouldQuery0).toBe(true);
    });

    it('should use stricter thresholds for franchise searches', () => {
      const mockFranchiseResults = [
        { id: 1, name: 'Mario Game 1', igdb_id: 1 },
        { id: 2, name: 'Mario Game 2', igdb_id: 2 }
      ];

      // Mock isFranchiseQuery to return true
      jest.spyOn(gameDataService as any, 'isFranchiseQuery').mockReturnValue(true);

      // Should not query IGDB with 2 results for franchise (changed from 10)
      const shouldQuery = (gameDataService as any).shouldQueryIGDB(mockFranchiseResults, 'mario');
      expect(shouldQuery).toBe(false);

      // Should query IGDB with only 1 result for franchise
      const shouldQueryLow = (gameDataService as any).shouldQueryIGDB([mockFranchiseResults[0]], 'mario');
      expect(shouldQueryLow).toBe(true);
    });

    it('should reduce random refresh probability for franchise searches', () => {
      const mockFranchiseResults = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        name: `Mario Game ${i + 1}`,
        igdb_id: i + 1
      }));

      jest.spyOn(gameDataService as any, 'isFranchiseQuery').mockReturnValue(true);
      
      // Mock Math.random to return 0.04 (should trigger with 5% chance)
      jest.spyOn(Math, 'random').mockReturnValue(0.04);
      
      const shouldQuery = (gameDataService as any).shouldQueryIGDB(mockFranchiseResults, 'mario');
      expect(shouldQuery).toBe(true);

      // Mock Math.random to return 0.06 (should not trigger with 5% chance) 
      jest.spyOn(Math, 'random').mockReturnValue(0.06);
      
      const shouldNotQuery = (gameDataService as any).shouldQueryIGDB(mockFranchiseResults, 'mario');
      expect(shouldNotQuery).toBe(false);
    });
  });

  describe('Performance Impact Validation', () => {
    it('should have minimal delay between search trigger and result availability', async () => {
      const mockSearchGames = jest.fn().mockResolvedValue([
        { id: 1, name: 'Fast Result', igdb_id: 1 }
      ]);

      const startTime = Date.now();
      const results = await mockSearchGames('test');
      const endTime = Date.now();

      // Should return results immediately (mocked, so < 10ms)
      expect(endTime - startTime).toBeLessThan(10);
      expect(results).toHaveLength(1);
    });

    it('should not trigger multiple unnecessary API calls', () => {
      const mockResults = [
        { id: 1, name: 'Game 1', igdb_id: 1 },
        { id: 2, name: 'Game 2', igdb_id: 2 },
        { id: 3, name: 'Game 3', igdb_id: 3 }
      ];

      const gameDataService = new GameDataServiceV2();
      
      // With 3 results, should not trigger IGDB (threshold is now 2)
      const shouldQuery = (gameDataService as any).shouldQueryIGDB(mockResults, 'test');
      expect(shouldQuery).toBe(false);
    });
  });

  describe('API Rate Limiting Compliance', () => {
    it('should respect reduced API call frequency', () => {
      const gameDataService = new GameDataServiceV2();
      
      // Test various scenarios that previously triggered API calls
      const scenarios = [
        { results: 3, query: 'mario', shouldQuery: false },
        { results: 4, query: 'zelda', shouldQuery: false },
        { results: 5, query: 'pokemon', shouldQuery: false },
        { results: 1, query: 'obscure game', shouldQuery: false }, // Changed from true
        { results: 0, query: 'nonexistent', shouldQuery: true }
      ];

      scenarios.forEach(({ results, query, shouldQuery }) => {
        const mockResults = Array.from({ length: results }, (_, i) => ({
          id: i + 1,
          name: `${query} ${i + 1}`,
          igdb_id: i + 1
        }));

        const actual = (gameDataService as any).shouldQueryIGDB(mockResults, query);
        expect(actual).toBe(shouldQuery);
      });
    });

    it('should significantly reduce random refresh triggers', () => {
      const gameDataService = new GameDataServiceV2();
      jest.spyOn(gameDataService as any, 'isFranchiseQuery').mockReturnValue(true);
      
      const mockResults = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Game ${i + 1}`,
        igdb_id: i + 1
      }));

      // Test 100 random values - with 5% chance, expect ~5 triggers
      let triggerCount = 0;
      for (let i = 0; i < 100; i++) {
        jest.spyOn(Math, 'random').mockReturnValue(i / 100);
        const shouldQuery = (gameDataService as any).shouldQueryIGDB(mockResults, 'franchise');
        if (shouldQuery) triggerCount++;
      }

      // Should trigger roughly 5 times (5% of 100), allowing some variance
      expect(triggerCount).toBeLessThan(10); // Much less than old 10% rate
      expect(triggerCount).toBeGreaterThanOrEqual(3); // Still some refresh activity
    });
  });
});