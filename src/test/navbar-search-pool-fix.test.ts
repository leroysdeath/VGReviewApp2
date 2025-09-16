/**
 * Test suite to validate that the navbar search pool fix works correctly
 * Tests that fast search now uses a larger database pool while preserving filters/sorting
 */

import { GameDataServiceV2 } from '../services/gameDataServiceV2';

describe('Navbar Search Pool Fix', () => {
  let gameDataService: GameDataServiceV2;

  beforeEach(() => {
    gameDataService = new GameDataServiceV2();
  });

  test('searchGamesFast should search larger pool than maxResults', async () => {
    // Mock the searchByName method to verify it gets called with correct limit
    let actualSearchLimit = 0;
    const originalSearchByName = (gameDataService as any).searchByName;
    
    (gameDataService as any).searchByName = async (query: string, filters: any, limit: number) => {
      actualSearchLimit = limit;
      // Return mock data for testing
      return Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
        id: i + 1,
        name: `Test Game ${i + 1} ${query}`,
        summary: 'Test summary',
        release_date: '2023-01-01',
        cover_url: null,
        averageUserRating: 4.0
      }));
    };

    const maxResults = 8;
    await gameDataService.searchGamesFast('mario', maxResults);

    // Should search much larger pool than maxResults for better filtering
    expect(actualSearchLimit).toBeGreaterThan(maxResults);
    expect(actualSearchLimit).toBeGreaterThanOrEqual(100); // Minimum pool size

    // Restore original method
    (gameDataService as any).searchByName = originalSearchByName;
  });

  test('searchGamesFast should preserve relevance scoring and sorting', async () => {
    // Mock searchByName to return predictable data
    (gameDataService as any).searchByName = async () => [
      { id: 1, name: 'Mario Kart 8', summary: 'Racing game' },
      { id: 2, name: 'Super Mario Bros', summary: 'Platform game' },
      { id: 3, name: 'Totally Different Game', summary: 'Not related to mario' },
      { id: 4, name: 'Mario Party', summary: 'Party game' }
    ];

    const results = await gameDataService.searchGamesFast('mario', 8);

    expect(results.length).toBeGreaterThan(0);
    
    // Results should be sorted by relevance (exact matches first)
    const marioResults = results.filter(game => 
      game.name.toLowerCase().includes('mario')
    );
    
    expect(marioResults.length).toBeGreaterThan(0);
    
    // First result should be a high-relevance Mario game
    expect(results[0].name.toLowerCase()).toContain('mario');
  });

  test('searchGamesFast should filter out low relevance results', async () => {
    // Mock searchByName to return mix of relevant and irrelevant games
    (gameDataService as any).searchByName = async () => [
      { id: 1, name: 'Mario Kart', summary: 'Racing game' },
      { id: 2, name: 'Completely Unrelated Game', summary: 'Nothing to do with search' },
      { id: 3, name: 'Another Mario Game', summary: 'Platform game' }
    ];

    const results = await gameDataService.searchGamesFast('mario', 8);

    // Should only include relevant results
    results.forEach(game => {
      const name = game.name.toLowerCase();
      const hasRelevantMatch = name.includes('mario') || 
        name.split(/\s+/).some(word => 'mario'.includes(word) || word.includes('mario'));
      
      expect(hasRelevantMatch).toBe(true);
    });
  });

  test('searchGamesFast should respect maxResults limit', async () => {
    // Mock searchByName to return many results
    (gameDataService as any).searchByName = async () => 
      Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Mario Game ${i + 1}`,
        summary: 'Test game'
      }));

    const maxResults = 5;
    const results = await gameDataService.searchGamesFast('mario', maxResults);

    expect(results.length).toBeLessThanOrEqual(maxResults);
  });

  test('searchGamesFast should handle empty results gracefully', async () => {
    // Mock searchByName to return no results
    (gameDataService as any).searchByName = async () => [];

    const results = await gameDataService.searchGamesFast('nonexistent', 8);
    expect(results).toEqual([]);
  });

  test('searchGamesFast should maintain fast performance', async () => {
    // Mock searchByName with slight delay to simulate real database
    (gameDataService as any).searchByName = async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
      return [
        { id: 1, name: 'Mario Kart', summary: 'Racing game' },
        { id: 2, name: 'Super Mario Bros', summary: 'Platform game' }
      ];
    };

    const startTime = Date.now();
    const results = await gameDataService.searchGamesFast('mario', 8);
    const endTime = Date.now();

    expect(results.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete under 1 second
  });
});