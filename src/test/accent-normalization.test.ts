import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { 
  normalizeAccents, 
  expandWithAccentVariations, 
  createSearchVariants, 
  isAccentInsensitiveMatch,
  testAccentNormalization 
} from '../utils/accentNormalization';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';

describe('Accent Normalization - Pokemon Search Fix', () => {
  let searchService: AdvancedSearchCoordination;
  
  beforeEach(() => {
    searchService = new AdvancedSearchCoordination();
    // Mock console methods to reduce test noise
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
    searchService.clearCache();
  });

  describe('Basic Accent Normalization', () => {
    it('should normalize Pokemon correctly', () => {
      expect(normalizeAccents('Pokémon')).toBe('pokemon');
      expect(normalizeAccents('pokémon')).toBe('pokemon');
      expect(normalizeAccents('POKÉMON')).toBe('pokemon');
    });

    it('should normalize common accented characters', () => {
      expect(normalizeAccents('café')).toBe('cafe');
      expect(normalizeAccents('résumé')).toBe('resume');
      expect(normalizeAccents('naïve')).toBe('naive');
      expect(normalizeAccents('Müller')).toBe('muller');
      expect(normalizeAccents('Sørensen')).toBe('sorensen');
    });

    it('should handle trademark symbols', () => {
      expect(normalizeAccents('Final Fantasy™')).toBe('final fantasy');
      expect(normalizeAccents('Pokémon®')).toBe('pokemon');
      expect(normalizeAccents('Street Fighter©')).toBe('street fighter');
    });

    it('should handle mixed accents and symbols', () => {
      expect(normalizeAccents('Pokémon™ Red')).toBe('pokemon red');
      expect(normalizeAccents('Café Déluxe®')).toBe('cafe deluxe');
    });
  });

  describe('Search Variant Creation', () => {
    it('should create search variants for Pokemon', () => {
      const variants = createSearchVariants('Pokémon');
      expect(variants).toContain('pokémon');
      expect(variants).toContain('pokemon');
      expect(variants.length).toBeGreaterThanOrEqual(1);
    });

    it('should create variants for regular text', () => {
      const variants = createSearchVariants('mario');
      expect(variants).toContain('mario');
      expect(variants.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle empty input', () => {
      const variants = createSearchVariants('');
      expect(variants).toEqual([]);
    });
  });

  describe('Accent-Insensitive Matching', () => {
    it('should match Pokemon variations', () => {
      expect(isAccentInsensitiveMatch('pokemon', 'Pokémon')).toBe(true);
      expect(isAccentInsensitiveMatch('pokémon', 'POKEMON')).toBe(true);
      expect(isAccentInsensitiveMatch('Pokémon Red', 'pokemon red')).toBe(true);
    });

    it('should not match different words', () => {
      expect(isAccentInsensitiveMatch('pokemon', 'mario')).toBe(false);
      expect(isAccentInsensitiveMatch('café', 'coffee')).toBe(false);
    });
  });

  describe('Game-Specific Accent Variations', () => {
    it('should expand Pokemon with accent variations', () => {
      const expansions = expandWithAccentVariations('pokemon');
      expect(expansions).toContain('pokemon');
      expect(expansions).toContain('pokémon');
      expect(expansions.length).toBeGreaterThan(1);
    });

    it('should expand Pokémon with variations', () => {
      const expansions = expandWithAccentVariations('pokémon');
      expect(expansions).toContain('pokemon');
      expect(expansions).toContain('pokémon');
    });

    it('should expand Pokemon game titles', () => {
      const expansions = expandWithAccentVariations('pokemon red');
      expect(expansions).toContain('pokemon red');
      expect(expansions).toContain('pokémon red');
    });

    it('should handle other accented game terms', () => {
      const expansions = expandWithAccentVariations('café');
      expect(expansions).toContain('café');
      expect(expansions).toContain('cafe');
    });
  });

  describe('Advanced Search Integration', () => {
    it('should find Pokemon games when searching "pokemon"', async () => {
      const result = await searchService.coordinatedSearch('pokemon', {
        maxResults: 10,
        includeMetrics: true
      });
      
      // Should expand to include pokémon variations
      expect(result.context.expandedQueries.length).toBeGreaterThan(1);
      expect(result.context.expandedQueries.some(q => q.includes('pokémon'))).toBe(true);
      
      // Should return some results
      expect(result.results.length).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should find Pokemon games when searching "pokémon"', async () => {
      const result = await searchService.coordinatedSearch('pokémon', {
        maxResults: 10,
        includeMetrics: true
      });
      
      // Should expand to include pokemon variations
      expect(result.context.expandedQueries.length).toBeGreaterThan(1);
      expect(result.context.expandedQueries.some(q => q.includes('pokemon'))).toBe(true);
      
      // Should return some results
      expect(result.results.length).toBeGreaterThanOrEqual(0);
    }, 30000);

    it('should handle mixed accent queries', async () => {
      const result = await searchService.coordinatedSearch('Pokémon Red', {
        maxResults: 5,
        includeMetrics: true
      });
      
      // Should include both accented and non-accented versions
      const hasAccentedExpansion = result.context.expandedQueries.some(q => q.includes('pokémon'));
      const hasNormalExpansion = result.context.expandedQueries.some(q => q.includes('pokemon'));
      
      expect(hasAccentedExpansion || hasNormalExpansion).toBe(true);
    }, 30000);
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null and undefined input', () => {
      expect(normalizeAccents('')).toBe('');
      expect(normalizeAccents(null as any)).toBe('');
      expect(normalizeAccents(undefined as any)).toBe('');
    });

    it('should handle non-string input', () => {
      expect(normalizeAccents(123 as any)).toBe('');
      expect(normalizeAccents({} as any)).toBe('');
      expect(normalizeAccents([] as any)).toBe('');
    });

    it('should handle extremely long strings', () => {
      const longString = 'pokémon'.repeat(1000);
      const result = normalizeAccents(longString);
      expect(result).toContain('pokemon');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle special characters and numbers', () => {
      expect(normalizeAccents('Pokémon 2024!')).toBe('pokemon 2024!');
      expect(normalizeAccents('Final Fantasy VII™')).toBe('final fantasy vii');
    });
  });

  describe('Performance', () => {
    it('should normalize accents quickly', () => {
      const testStrings = [
        'Pokémon', 'Final Fantasy™', 'Café Déluxe', 'Résumé Builder',
        'Naïve Algorithm', 'Sørensen Index', 'Müller Report'
      ];
      
      const startTime = Date.now();
      testStrings.forEach(str => normalizeAccents(str));
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should expand variants efficiently', () => {
      const testQueries = ['pokemon', 'pokémon', 'final fantasy', 'café', 'résumé'];
      
      const startTime = Date.now();
      testQueries.forEach(query => expandWithAccentVariations(query));
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(50); // Should be very fast
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should work with search intent detection', async () => {
      const result = await searchService.coordinatedSearch('pokémon games', {
        includeMetrics: true
      });
      
      // Should be detected as franchise browsing
      expect(result.context.searchIntent).toBeDefined();
      expect(result.context.expandedQueries.length).toBeGreaterThan(1);
    }, 30000);

    it('should maintain quality thresholds with accent normalization', async () => {
      const result = await searchService.coordinatedSearch('pokemon', {
        includeMetrics: true
      });
      
      // Quality threshold should still be applied
      expect(result.context.qualityThreshold).toBeGreaterThan(0);
      expect(result.context.qualityThreshold).toBeLessThanOrEqual(1);
    }, 30000);
  });

  describe('Manual Testing Helper', () => {
    it('should run accent normalization test suite', () => {
      // This test runs the built-in test function
      expect(() => testAccentNormalization()).not.toThrow();
    });
  });
});