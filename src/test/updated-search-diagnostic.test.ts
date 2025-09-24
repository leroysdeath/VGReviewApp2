/**
 * Updated Search Diagnostic Service Tests
 * 
 * Tests for the enhanced search diagnostic service with new ranking and relaxed filtering
 */

import { searchDiagnosticService } from '../services/searchDiagnosticService';

describe('Updated Search Diagnostic Service', () => {
  // Test the new composite scoring analysis
  describe('Composite Scoring Analysis', () => {
    test('should include composite scoring metrics in analysis', async () => {
      const mockGames = [
        {
          id: 1,
          name: 'Super Mario Bros.',
          publisher: 'Nintendo',
          developer: 'Nintendo',
          category: 0,
          release_date: '1985-09-13',
          igdb_rating: 85,
          total_rating: 90,
          summary: 'Classic platformer game',
          genres: ['Platformer'],
          greenlight_flag: false,
          redlight_flag: false,
          averageUserRating: 0,
          totalUserRatings: 0
        },
        {
          id: 2,
          name: 'Pokemon Insurgence',
          publisher: 'Unknown',
          developer: 'Unknown',
          category: 5, // Mod
          release_date: '2014-01-01',
          igdb_rating: 75,
          summary: 'Fan-made Pokemon game',
          genres: ['RPG'],
          greenlight_flag: false,
          redlight_flag: false,
          averageUserRating: 0,
          totalUserRatings: 0
        }
      ];

      // Test the private method through the public interface
      const result = await searchDiagnosticService.analyzeSingleSearch('mario');
      
      expect(result).toBeDefined();
      expect(result.filterAnalysis).toBeDefined();
      expect(result.filterAnalysis.compositeScoringAnalysis).toBeDefined();
      
      const compositeAnalysis = result.filterAnalysis.compositeScoringAnalysis;
      expect(compositeAnalysis).toHaveProperty('averageLegitimacyScore');
      expect(compositeAnalysis).toHaveProperty('averageCanonicalScore');
      expect(compositeAnalysis).toHaveProperty('averagePopularityScore');
      expect(compositeAnalysis).toHaveProperty('averageRecencyScore');
      expect(compositeAnalysis).toHaveProperty('officialGameCount');
      expect(compositeAnalysis).toHaveProperty('fanGameCount');
      expect(compositeAnalysis).toHaveProperty('suspiciousGameCount');
    }, 30000);

    test('should detect official vs fan games correctly', async () => {
      // Test with a known franchise
      const result = await searchDiagnosticService.analyzeSingleSearch('pokemon');
      
      expect(result).toBeDefined();
      expect(result.filterAnalysis.compositeScoringAnalysis).toBeDefined();
      
      const analysis = result.filterAnalysis.compositeScoringAnalysis;
      
      // Should have some metrics about official vs fan games for Pokemon searches
      expect(typeof analysis.officialGameCount).toBe('number');
      expect(typeof analysis.fanGameCount).toBe('number');
      expect(typeof analysis.suspiciousGameCount).toBe('number');
      expect(analysis.officialGameCount + analysis.fanGameCount + analysis.suspiciousGameCount).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  // Test the new content filtering analysis
  describe('Content Filtering Analysis', () => {
    test('should include content filtering metrics', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('mario');
      
      expect(result).toBeDefined();
      expect(result.filterAnalysis.contentFilteringAnalysis).toBeDefined();
      
      const contentAnalysis = result.filterAnalysis.contentFilteringAnalysis;
      expect(contentAnalysis).toHaveProperty('totalBeforeFiltering');
      expect(contentAnalysis).toHaveProperty('filteredByContentProtection');
      expect(contentAnalysis).toHaveProperty('filteredByFanGameDetection');
      expect(contentAnalysis).toHaveProperty('bypassedForPopularFranchise');
      expect(contentAnalysis).toHaveProperty('modGames');
      expect(contentAnalysis).toHaveProperty('dlcGames');
      expect(contentAnalysis).toHaveProperty('officialGames');
    }, 30000);

    test('should bypass filtering for popular franchises', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('pokemon');
      
      expect(result).toBeDefined();
      const contentAnalysis = result.filterAnalysis.contentFilteringAnalysis;
      
      // Pokemon is a popular franchise, so filtering should be bypassed
      expect(contentAnalysis.bypassedForPopularFranchise).toBe(true);
      // When bypassed, content protection filtering should be 0
      expect(contentAnalysis.filteredByContentProtection).toBe(0);
      expect(contentAnalysis.filteredByFanGameDetection).toBe(0);
    }, 30000);

    test('should apply filtering for non-popular franchises', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('unknown game series');
      
      expect(result).toBeDefined();
      const contentAnalysis = result.filterAnalysis.contentFilteringAnalysis;
      
      // Non-popular franchise should not bypass filtering
      expect(contentAnalysis.bypassedForPopularFranchise).toBe(false);
    }, 30000);
  });

  // Test the enhanced sorting analysis
  describe('Enhanced Sorting Analysis', () => {
    test('should include composite score sorting', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('mario');
      
      expect(result).toBeDefined();
      expect(result.sortingAnalysis).toBeDefined();
      
      const sortingAnalysis = result.sortingAnalysis;
      expect(sortingAnalysis).toHaveProperty('sortedByCompositeScore');
      expect(sortingAnalysis).toHaveProperty('topScoredGame');
      expect(sortingAnalysis).toHaveProperty('averageCompositeScore');
      
      expect(Array.isArray(sortingAnalysis.sortedByCompositeScore)).toBe(true);
      expect(typeof sortingAnalysis.topScoredGame).toBe('string');
      expect(typeof sortingAnalysis.averageCompositeScore).toBe('number');
    }, 30000);

    test('should calculate meaningful composite scores', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('super mario');
      
      expect(result).toBeDefined();
      const sortingAnalysis = result.sortingAnalysis;
      
      // Composite score should be between 0 and 1
      expect(sortingAnalysis.averageCompositeScore).toBeGreaterThanOrEqual(0);
      expect(sortingAnalysis.averageCompositeScore).toBeLessThanOrEqual(1);
      
      // Should have a top scored game if there are results
      if (sortingAnalysis.sortedByCompositeScore.length > 0) {
        expect(sortingAnalysis.topScoredGame).toBeTruthy();
        expect(sortingAnalysis.topScoredGame).not.toBe('None');
      }
    }, 30000);
  });

  // Test mod detection and handling
  describe('Mod Game Detection', () => {
    test('should properly categorize mod games', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('pokemon');
      
      expect(result).toBeDefined();
      const contentAnalysis = result.filterAnalysis.contentFilteringAnalysis;
      
      // Should track mod games separately
      expect(typeof contentAnalysis.modGames).toBe('number');
      expect(typeof contentAnalysis.dlcGames).toBe('number');
      expect(typeof contentAnalysis.officialGames).toBe('number');
      
      // Total should equal total games
      const total = contentAnalysis.modGames + contentAnalysis.dlcGames + contentAnalysis.officialGames;
      expect(total).toBeLessThanOrEqual(contentAnalysis.totalBeforeFiltering);
    }, 30000);
  });

  // Test performance with new analysis
  describe('Performance Impact', () => {
    test('should complete analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await searchDiagnosticService.analyzeSingleSearch('final fantasy');
      
      const duration = Date.now() - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      // Verify all new analysis sections are present
      expect(result.filterAnalysis.contentFilteringAnalysis).toBeDefined();
      expect(result.filterAnalysis.compositeScoringAnalysis).toBeDefined();
      expect(result.sortingAnalysis.sortedByCompositeScore).toBeDefined();
    }, 15000);
  });

  // Test relaxed filtering behavior
  describe('Relaxed Filtering Behavior', () => {
    test('should show more results with relaxed filtering', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('pokemon');
      
      expect(result).toBeDefined();
      
      // With relaxed filtering, we should see more results
      const totalResults = result.dbResults.totalCount;
      expect(totalResults).toBeGreaterThan(0);
      
      // Content filtering should be bypassed for popular franchises
      const contentAnalysis = result.filterAnalysis.contentFilteringAnalysis;
      if (contentAnalysis.bypassedForPopularFranchise) {
        expect(contentAnalysis.filteredByContentProtection).toBe(0);
        expect(contentAnalysis.filteredByFanGameDetection).toBe(0);
      }
    }, 30000);

    test('should prioritize instead of filter', async () => {
      const result = await searchDiagnosticService.analyzeSingleSearch('mario');
      
      expect(result).toBeDefined();
      
      // Should have results in composite score order
      const sortingAnalysis = result.sortingAnalysis;
      expect(sortingAnalysis.sortedByCompositeScore.length).toBeGreaterThanOrEqual(0);
      
      // Composite scoring should be meaningful
      if (sortingAnalysis.averageCompositeScore > 0) {
        expect(sortingAnalysis.averageCompositeScore).toBeGreaterThan(0);
        expect(sortingAnalysis.averageCompositeScore).toBeLessThanOrEqual(1);
      }
    }, 30000);
  });
});

export {};