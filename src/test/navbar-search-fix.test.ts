/**
 * Test suite for navbar search delay fix
 * Tests the isolated HeaderSearchBar state management to ensure no delayed results
 */

import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';

describe('Navbar Search Fix Validation', () => {
  let searchCoordination: AdvancedSearchCoordination;

  beforeEach(() => {
    searchCoordination = new AdvancedSearchCoordination();
    // Clear cache to ensure clean test state
    searchCoordination.clearCache();
  });

  test('fast mode search should return immediate results', async () => {
    const query = 'mario';
    
    const result = await searchCoordination.coordinatedSearch(query, {
      maxResults: 8,
      fastMode: true,
      includeMetrics: true
    });

    // Should have results
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.length).toBeLessThanOrEqual(8);
    
    // Should be using fast mode (indicated by metrics)
    expect(result.metrics?.igdbQueryTime).toBe(0); // Fast mode skips IGDB
    expect(result.metrics?.totalSearchTime).toBeLessThan(1000); // Should be under 1 second
    
    // Results should have proper structure for HeaderSearchBar
    result.results.forEach(game => {
      expect(game).toHaveProperty('id');
      expect(game).toHaveProperty('name');
      expect(game).toHaveProperty('source');
    });
  }, 15000);

  test('multiple rapid searches should not interfere with each other', async () => {
    const queries = ['mario', 'zelda', 'pokemon'];
    
    // Simulate rapid typing - search for each query without waiting
    const promises = queries.map(query => 
      searchCoordination.coordinatedSearch(query, {
        maxResults: 5,
        fastMode: true
      })
    );

    const results = await Promise.all(promises);
    
    // Each search should return relevant results
    expect(results[0].results.some(game => 
      game.name.toLowerCase().includes('mario')
    )).toBe(true);
    
    expect(results[1].results.some(game => 
      game.name.toLowerCase().includes('zelda')
    )).toBe(true);
    
    expect(results[2].results.some(game => 
      game.name.toLowerCase().includes('pokemon') || 
      game.name.toLowerCase().includes('pokémon')
    )).toBe(true);
  }, 30000);

  test('search coordination should handle cache correctly', async () => {
    const query = 'mario';
    
    // First search - should populate cache
    const firstResult = await searchCoordination.coordinatedSearch(query, {
      maxResults: 8,
      fastMode: true,
      includeMetrics: true
    });
    
    // Second search - should use cache (faster)
    const secondResult = await searchCoordination.coordinatedSearch(query, {
      maxResults: 8,
      fastMode: true,
      includeMetrics: true
    });
    
    // Results should be identical
    expect(firstResult.results.length).toBe(secondResult.results.length);
    expect(firstResult.results[0].id).toBe(secondResult.results[0].id);
    
    // Second search should be from cache (though fast mode might not show this clearly)
    expect(secondResult.metrics?.totalSearchTime).toBeLessThan(firstResult.metrics?.totalSearchTime || 1000);
  }, 15000);

  test('empty query should return empty results immediately', async () => {
    const result = await searchCoordination.coordinatedSearch('', {
      maxResults: 8,
      fastMode: true
    });

    expect(result.results).toEqual([]);
  });

  test('short query (1 character) should return empty results', async () => {
    const result = await searchCoordination.coordinatedSearch('m', {
      maxResults: 8,
      fastMode: true
    });

    expect(result.results).toEqual([]);
  });

  test('search results should respect maxResults limit', async () => {
    const maxResults = 3;
    
    const result = await searchCoordination.coordinatedSearch('mario', {
      maxResults,
      fastMode: true
    });

    expect(result.results.length).toBeLessThanOrEqual(maxResults);
  }, 15000);
});