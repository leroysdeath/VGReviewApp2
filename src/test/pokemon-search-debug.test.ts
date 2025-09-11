import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { testAccentNormalization } from '../utils/accentNormalization';

describe('Pokemon Search Debug - Accent Normalization', () => {
  let searchService: AdvancedSearchCoordination;
  
  beforeEach(() => {
    searchService = new AdvancedSearchCoordination();
    // Don't mock console for this test - we want to see the output
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    searchService.clearCache();
  });

  it('should demonstrate accent normalization working', () => {
    console.log('\n=== POKEMON SEARCH ACCENT NORMALIZATION DEBUG ===\n');
    testAccentNormalization();
  });

  it('should show Pokemon search query expansion in action', async () => {
    console.log('\n=== POKEMON QUERY EXPANSION DEBUG ===\n');
    
    console.log('🔍 Testing "pokemon" search:');
    const pokemonResult = await searchService.coordinatedSearch('pokemon', { 
      includeMetrics: true,
      maxResults: 5
    });
    
    console.log('Original query: "pokemon"');
    console.log('Expanded queries:', pokemonResult.context.expandedQueries);
    console.log('Search intent:', pokemonResult.context.searchIntent);
    console.log('Results found:', pokemonResult.results.length);
    
    console.log('\n🔍 Testing "pokémon" search:');
    const pokemonAccentResult = await searchService.coordinatedSearch('pokémon', { 
      includeMetrics: true,
      maxResults: 5
    });
    
    console.log('Original query: "pokémon"');
    console.log('Expanded queries:', pokemonAccentResult.context.expandedQueries);
    console.log('Search intent:', pokemonAccentResult.context.searchIntent);
    console.log('Results found:', pokemonAccentResult.results.length);
    
    // Both searches should produce similar results now
    expect(pokemonResult.context.expandedQueries.length).toBeGreaterThan(1);
    expect(pokemonAccentResult.context.expandedQueries.length).toBeGreaterThan(1);
    
    // Should have cross-pollination of terms
    const hasAccentInNormal = pokemonResult.context.expandedQueries.some(q => q.includes('pokémon'));
    const hasNormalInAccent = pokemonAccentResult.context.expandedQueries.some(q => q.includes('pokemon'));
    
    console.log('\n✅ Cross-pollination check:');
    console.log('pokemon search includes "pokémon":', hasAccentInNormal);
    console.log('pokémon search includes "pokemon":', hasNormalInAccent);
    
    expect(hasAccentInNormal || hasNormalInAccent).toBe(true);
  }, 30000);
});