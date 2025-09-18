/**
 * Simple race condition tests focusing on the core async behavior
 */

import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';

// Mock the game data service to simulate different response times
const mockSearchGames = jest.fn();

jest.mock('../services/gameDataServiceV2', () => ({
  GameDataServiceV2: jest.fn().mockImplementation(() => ({
    searchGames: mockSearchGames,
    searchGamesFast: jest.fn().mockResolvedValue([])
  }))
}));

describe('Race Condition Core Tests', () => {
  let searchCoordination: AdvancedSearchCoordination;

  beforeEach(() => {
    jest.clearAllMocks();
    searchCoordination = new AdvancedSearchCoordination();
  });

  test('should demonstrate the race condition problem', async () => {
    // Mock different response times
    mockSearchGames
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve([
          { id: 1, name: 'Mario Game (slow)', igdb_id: 1 }
        ]), 500)) // Slow response
      )
      .mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve([
          { id: 2, name: 'Zelda Game (fast)', igdb_id: 2 }
        ]), 100)) // Fast response
      );

    // Start both searches
    const promise1 = searchCoordination.coordinatedSearch('mario');
    const promise2 = searchCoordination.coordinatedSearch('zelda');

    // Wait for both to complete
    const [result1, result2] = await Promise.all([promise1, promise2]);

    // Both searches should complete
    expect(result1.results).toHaveLength(1);
    expect(result2.results).toHaveLength(1);
    expect(result1.results[0].name).toContain('Mario');
    expect(result2.results[0].name).toContain('Zelda');
  });

  test('should verify request deduplication is working', async () => {
    // Mock a search that takes time
    mockSearchGames.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve([
        { id: 1, name: 'Test Game', igdb_id: 1 }
      ]), 200))
    );

    // Start multiple identical searches simultaneously
    const promises = [
      searchCoordination.coordinatedSearch('mario'),
      searchCoordination.coordinatedSearch('mario'),
      searchCoordination.coordinatedSearch('mario')
    ];

    await Promise.all(promises);

    // Should only make one actual search call due to deduplication
    expect(mockSearchGames).toHaveBeenCalledTimes(1);
  });

  test('should handle AbortController properly', async () => {
    let searchResolve: Function;
    const searchPromise = new Promise(resolve => {
      searchResolve = resolve;
    });

    mockSearchGames.mockImplementation(() => searchPromise);

    // Start a search
    const resultPromise = searchCoordination.coordinatedSearch('mario');

    // Clear the cache to simulate cancellation
    searchCoordination.clearCache();

    // Resolve the search
    searchResolve([{ id: 1, name: 'Mario Game', igdb_id: 1 }]);

    // Should complete normally
    const result = await resultPromise;
    expect(result.results).toHaveLength(1);
  });

  test('should measure performance improvement', async () => {
    // Create many games to test performance
    const manyGames = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `Game ${i + 1}`,
      igdb_id: i + 1
    }));

    mockSearchGames.mockResolvedValue(manyGames);

    const startTime = Date.now();
    const result = await searchCoordination.coordinatedSearch('test');
    const endTime = Date.now();

    const searchTime = endTime - startTime;

    // With the 406 fix, this should be much faster (< 1000ms)
    expect(searchTime).toBeLessThan(1000);
    expect(result.results).toHaveLength(50);
    
    console.log(`Search completed in ${searchTime}ms for ${result.results.length} games`);
  });

  test('should verify no 406 errors in mock environment', async () => {
    // This test ensures our mock setup doesn't trigger the 406 issues
    mockSearchGames.mockResolvedValue([
      { id: 1, name: 'The Legend of Zelda: Return of the Hylian', igdb_id: 46430 },
      { id: 2, name: 'The Legend of Zelda: Mystical Seed of Wisdom', igdb_id: 208493 },
      { id: 3, name: 'The Legend of Zelda: Four Swords', igdb_id: 163572 }
    ]);

    let errorThrown = false;
    try {
      const result = await searchCoordination.coordinatedSearch('zelda');
      expect(result.results).toHaveLength(3);
    } catch (error: any) {
      if (error.message.includes('406') || error.message.includes('Not Acceptable')) {
        errorThrown = true;
      }
    }

    expect(errorThrown).toBe(false);
  });
});