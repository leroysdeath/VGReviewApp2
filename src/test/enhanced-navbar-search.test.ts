/**
 * Test suite for enhanced navbar search functionality
 * Tests the improved search with better relevance and fast response
 */

import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';

describe('Enhanced Navbar Search', () => {
  let searchCoordination: AdvancedSearchCoordination;

  beforeEach(() => {
    searchCoordination = new AdvancedSearchCoordination();
    searchCoordination.clearCache();
  });

  test('enhanced search should prioritize exact matches', async () => {
    const query = 'mario';
    
    const result = await searchCoordination.coordinatedSearch(query, {
      maxResults: 8,
      fastMode: true,
      useAggressive: false
    });

    expect(result.results.length).toBeGreaterThan(0);
    
    // Should find games with "mario" in the name
    const marioGames = result.results.filter(game => 
      game.name.toLowerCase().includes('mario')
    );
    
    expect(marioGames.length).toBeGreaterThan(0);
    
    // First few results should be Mario games
    const firstTwo = result.results.slice(0, 2);
    const marioInFirstTwo = firstTwo.filter(game => 
      game.name.toLowerCase().includes('mario')
    );
    
    expect(marioInFirstTwo.length).toBeGreaterThan(0);
  }, 15000);

  test('enhanced search should handle franchise searches', async () => {
    const query = 'zelda';
    
    const result = await searchCoordination.coordinatedSearch(query, {
      maxResults: 8,
      fastMode: true,
      useAggressive: false
    });

    expect(result.results.length).toBeGreaterThan(0);
    
    // Should find Zelda games
    const zeldaGames = result.results.filter(game => 
      game.name.toLowerCase().includes('zelda') ||
      game.name.toLowerCase().includes('legend')
    );
    
    expect(zeldaGames.length).toBeGreaterThan(0);
  }, 15000);

  test('enhanced search should be fast enough for dropdown', async () => {
    const startTime = Date.now();
    
    const result = await searchCoordination.coordinatedSearch('pokemon', {
      maxResults: 8,
      fastMode: true,
      includeMetrics: true
    });

    const endTime = Date.now();
    const searchTime = endTime - startTime;
    
    // Should complete within 2 seconds for good UX
    expect(searchTime).toBeLessThan(2000);
    expect(result.results.length).toBeGreaterThan(0);
  }, 15000);

  test('enhanced search should filter unrelated results', async () => {
    const query = 'mario';
    
    const result = await searchCoordination.coordinatedSearch(query, {
      maxResults: 8,
      fastMode: true,
      useAggressive: false
    });

    // All results should be somewhat related to the query
    result.results.forEach(game => {
      const name = game.name.toLowerCase();
      const queryLower = query.toLowerCase();
      
      // Should either contain the query or have significant word overlap
      const hasDirectMatch = name.includes(queryLower);
      const words = queryLower.split(/\s+/);
      const nameWords = name.split(/\s+/);
      const wordMatches = words.filter(word => 
        nameWords.some(nameWord => nameWord.includes(word))
      );
      const hasWordMatch = wordMatches.length / words.length >= 0.6;
      
      expect(hasDirectMatch || hasWordMatch).toBe(true);
    });
  }, 15000);

  test('enhanced search should respect maxResults limit', async () => {
    const maxResults = 5;
    
    const result = await searchCoordination.coordinatedSearch('mario', {
      maxResults,
      fastMode: true
    });

    expect(result.results.length).toBeLessThanOrEqual(maxResults);
  }, 15000);

  test('enhanced search should handle empty and short queries gracefully', async () => {
    // Empty query
    const emptyResult = await searchCoordination.coordinatedSearch('', {
      maxResults: 8,
      fastMode: true
    });
    expect(emptyResult.results).toEqual([]);

    // Short query
    const shortResult = await searchCoordination.coordinatedSearch('a', {
      maxResults: 8,
      fastMode: true
    });
    expect(shortResult.results).toEqual([]);
  });
});