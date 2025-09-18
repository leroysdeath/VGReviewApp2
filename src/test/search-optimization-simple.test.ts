/**
 * Simple test to validate basic search optimizations work
 * Tests database queries only to avoid IGDB API issues in test environment
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { GameDataServiceV2 } from '../services/gameDataServiceV2';

describe('Search Optimization - Database Only', () => {
  let searchCoordination: AdvancedSearchCoordination;
  let gameDataService: GameDataServiceV2;

  beforeEach(() => {
    searchCoordination = new AdvancedSearchCoordination();
    gameDataService = new GameDataServiceV2();
  });

  describe('Result Count Limits', () => {
    it('should respect maxResults parameter for fast searches', async () => {
      const results = await gameDataService.searchGamesFast('test', 5);
      expect(results.length).toBeLessThanOrEqual(5);
      console.log(`Fast search with limit 5: Got ${results.length} results`);
    }, 10000);

    it('should limit search coordination results to reasonable numbers', async () => {
      const result = await searchCoordination.coordinatedSearch('game', {
        maxResults: 10
      });
      
      expect(result.results.length).toBeLessThanOrEqual(10);
      console.log(`Search coordination with limit 10: Got ${result.results.length} results`);
    }, 15000);

    it('should use fast mode for dropdown searches', async () => {
      const startTime = Date.now();
      const result = await searchCoordination.coordinatedSearch('test', {
        fastMode: true,
        maxResults: 8
      });
      const duration = Date.now() - startTime;
      
      expect(result.results.length).toBeLessThanOrEqual(8);
      expect(duration).toBeLessThan(5000); // Should be fast
      console.log(`Fast mode search completed in ${duration}ms with ${result.results.length} results`);
    }, 10000);
  });

  describe('Relevance Scoring', () => {
    it('should filter out games with very low relevance scores', async () => {
      // Test the relevance scoring function by providing mock data
      const mockGame = {
        id: 1,
        name: 'Test Game',
        igdb_id: 1,
        summary: 'A test game',
        slug: 'test-game',
        cover_url: null,
        release_date: null,
        genres: [],
        platforms: [],
        developer: null,
        publisher: null,
        igdb_rating: 75,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        averageUserRating: 0,
        totalUserRatings: 0
      };

      // Access the private method through prototype
      const relevanceScore = (searchCoordination as any).calculateRelevanceScore('Test Game', 'completely unrelated query');
      
      expect(relevanceScore).toBeLessThan(0.5);
      console.log(`Relevance score for unrelated query: ${relevanceScore} (should be low)`);
    });

    it('should give high relevance scores for exact matches', async () => {
      const relevanceScore = (searchCoordination as any).calculateRelevanceScore('Mario Kart', 'mario kart');
      
      expect(relevanceScore).toBeGreaterThan(0.9);
      console.log(`Relevance score for exact match: ${relevanceScore} (should be high)`);
    });

    it('should penalize unrelated franchise names', async () => {
      const marioScore = (searchCoordination as any).calculateRelevanceScore('Super Mario Bros', 'mario');
      const zeldasFalseScore = (searchCoordination as any).calculateRelevanceScore('Super Mario Bros', 'zelda');
      
      expect(marioScore).toBeGreaterThan(zeldasFalseScore);
      console.log(`Mario game for 'mario' query: ${marioScore}`);
      console.log(`Mario game for 'zelda' query: ${zeldasFalseScore}`);
    });
  });

  describe('Search Configuration', () => {
    it('should use reduced default max results', async () => {
      // Test that the default max results are now lower
      const defaultFranchiseMax = (searchCoordination as any).getDefaultMaxResults('franchise_browse');
      const defaultSpecificMax = (searchCoordination as any).getDefaultMaxResults('specific_game');
      
      expect(defaultFranchiseMax).toBeLessThanOrEqual(40);
      expect(defaultSpecificMax).toBeLessThanOrEqual(20);
      
      console.log(`Default franchise browse max: ${defaultFranchiseMax} (should be ≤ 40)`);
      console.log(`Default specific game max: ${defaultSpecificMax} (should be ≤ 20)`);
    });

    it('should detect franchise queries correctly', async () => {
      const isMarioFranchise = (gameDataService as any).isFranchiseQuery('mario');
      const isZeldaFranchise = (gameDataService as any).isFranchiseQuery('zelda');
      const isSpecificGame = (gameDataService as any).isFranchiseQuery('some random specific game title');
      
      expect(isMarioFranchise).toBe(true);
      expect(isZeldaFranchise).toBe(true);
      expect(isSpecificGame).toBe(false);
      
      console.log(`Mario detected as franchise: ${isMarioFranchise}`);
      console.log(`Zelda detected as franchise: ${isZeldaFranchise}`);
      console.log(`Random title detected as franchise: ${isSpecificGame}`);
    });
  });

  describe('Performance Optimizations', () => {
    it('should complete database-only searches quickly', async () => {
      const startTime = Date.now();
      
      // Search for something that should only find database results
      const results = await gameDataService.searchGamesFast('test', 5);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
      
      console.log(`Database-only search completed in ${duration}ms`);
    }, 5000);

    it('should handle empty search gracefully', async () => {
      const results = await gameDataService.searchGamesFast('', 5);
      expect(results.length).toBe(0);
      console.log(`Empty search returned ${results.length} results`);
    }, 3000);

    it('should handle very short queries', async () => {
      const results = await gameDataService.searchGamesFast('a', 5);
      expect(results.length).toBeLessThanOrEqual(5);
      console.log(`Single character search returned ${results.length} results`);
    }, 5000);
  });
});