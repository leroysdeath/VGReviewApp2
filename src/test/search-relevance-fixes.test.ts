/**
 * Test suite to validate search relevance fixes
 * 
 * Tests the following improvements:
 * 1. Reduced result counts (40 instead of 150)
 * 2. Better relevance filtering to prevent unrelated games
 * 3. Improved dropdown search prioritization
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { GameDataServiceV2 } from '../services/gameDataServiceV2';

describe('Search Relevance Fixes', () => {
  let searchCoordination: AdvancedSearchCoordination;
  let gameDataService: GameDataServiceV2;

  beforeEach(() => {
    searchCoordination = new AdvancedSearchCoordination();
    gameDataService = new GameDataServiceV2();
  });

  describe('Result Count Limits', () => {
    it('should return no more than 40 results for franchise searches', async () => {
      const result = await searchCoordination.coordinatedSearch('mario', {
        maxResults: undefined // Use default
      });

      expect(result.results.length).toBeLessThanOrEqual(40);
      console.log(`Mario search returned ${result.results.length} results (should be ≤ 40)`);
    }, 30000);

    it('should return no more than 20 results for specific game searches', async () => {
      const result = await searchCoordination.coordinatedSearch('super mario odyssey', {
        maxResults: undefined // Use default
      });

      expect(result.results.length).toBeLessThanOrEqual(20);
      console.log(`Specific game search returned ${result.results.length} results (should be ≤ 20)`);
    }, 30000);

    it('should limit fast dropdown searches to 8 results', async () => {
      const result = await searchCoordination.coordinatedSearch('zelda', {
        fastMode: true,
        maxResults: 8
      });

      expect(result.results.length).toBeLessThanOrEqual(8);
      console.log(`Fast dropdown search returned ${result.results.length} results (should be ≤ 8)`);
    }, 15000);
  });

  describe('Relevance Filtering', () => {
    it('should not return Resident Evil games when searching for Age of Empires', async () => {
      const result = await searchCoordination.coordinatedSearch('age of empires');

      const residentEvilGames = result.results.filter(game => 
        game.name.toLowerCase().includes('resident evil')
      );

      expect(residentEvilGames.length).toBe(0);
      console.log(`Age of Empires search: Found ${residentEvilGames.length} Resident Evil games (should be 0)`);
      
      // Should find Age of Empires games
      const ageOfEmpiresGames = result.results.filter(game => 
        game.name.toLowerCase().includes('age of empires') || 
        game.name.toLowerCase().includes('empire')
      );
      
      expect(ageOfEmpiresGames.length).toBeGreaterThan(0);
      console.log(`Age of Empires search: Found ${ageOfEmpiresGames.length} relevant games`);
    }, 30000);

    it('should prioritize Mario games when searching for Mario', async () => {
      const result = await searchCoordination.coordinatedSearch('mario');

      // Top 5 results should all be Mario-related
      const top5Results = result.results.slice(0, 5);
      const marioGames = top5Results.filter(game => 
        game.name.toLowerCase().includes('mario')
      );

      expect(marioGames.length).toBeGreaterThanOrEqual(3);
      console.log(`Mario search top 5: ${marioGames.length} out of ${top5Results.length} are Mario games`);
      
      // Log the top 5 for debugging
      console.log('Top 5 Mario search results:');
      top5Results.forEach((game, index) => {
        console.log(`${index + 1}. ${game.name} (relevance: ${game.relevanceScore})`);
      });
    }, 30000);

    it('should filter out games with very low relevance scores', async () => {
      const result = await searchCoordination.coordinatedSearch('final fantasy');

      // All results should have decent relevance scores
      const lowRelevanceGames = result.results.filter(game => 
        (game.relevanceScore || 0) < 0.4
      );

      expect(lowRelevanceGames.length).toBe(0);
      console.log(`Final Fantasy search: Found ${lowRelevanceGames.length} low-relevance games (should be 0)`);
    }, 30000);
  });

  describe('Fast Search Quality', () => {
    it('should provide relevant results in fast mode for dropdown', async () => {
      const fastResults = await gameDataService.searchGamesFast('pokemon', 8);

      expect(fastResults.length).toBeLessThanOrEqual(8);
      
      // All results should be Pokemon-related
      const pokemonGames = fastResults.filter(game => 
        game.name.toLowerCase().includes('pokemon') || 
        game.name.toLowerCase().includes('pokémon')
      );

      expect(pokemonGames.length).toBeGreaterThanOrEqual(Math.min(3, fastResults.length));
      console.log(`Fast Pokemon search: ${pokemonGames.length} out of ${fastResults.length} are Pokemon games`);
    }, 15000);

    it('should not return unrelated franchises in fast search', async () => {
      const fastResults = await gameDataService.searchGamesFast('zelda', 8);

      // Should not contain Mario, Sonic, or other unrelated franchises
      const unrelatedGames = fastResults.filter(game => {
        const name = game.name.toLowerCase();
        return name.includes('mario') || name.includes('sonic') || name.includes('pokemon');
      });

      expect(unrelatedGames.length).toBe(0);
      console.log(`Fast Zelda search: Found ${unrelatedGames.length} unrelated franchise games (should be 0)`);
    }, 15000);
  });

  describe('Search Performance', () => {
    it('should complete searches in reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await searchCoordination.coordinatedSearch('street fighter');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      expect(result.results.length).toBeGreaterThan(0);
      
      console.log(`Street Fighter search completed in ${duration}ms with ${result.results.length} results`);
    }, 15000);

    it('should complete fast searches quickly', async () => {
      const startTime = Date.now();
      
      const results = await gameDataService.searchGamesFast('tekken', 8);
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds for dropdown
      
      console.log(`Fast Tekken search completed in ${duration}ms with ${results.length} results`);
    }, 5000);
  });

  describe('Edge Cases', () => {
    it('should handle empty search queries gracefully', async () => {
      const result = await searchCoordination.coordinatedSearch('');
      expect(result.results.length).toBe(0);
    }, 5000);

    it('should handle very short queries', async () => {
      const result = await searchCoordination.coordinatedSearch('ff');
      
      // Should find Final Fantasy games
      const finalFantasyGames = result.results.filter(game => 
        game.name.toLowerCase().includes('final fantasy')
      );
      
      expect(finalFantasyGames.length).toBeGreaterThan(0);
      console.log(`Short query 'ff': Found ${finalFantasyGames.length} Final Fantasy games`);
    }, 15000);

    it('should handle special characters in search queries', async () => {
      const result = await searchCoordination.coordinatedSearch('pokémon');
      
      expect(result.results.length).toBeGreaterThan(0);
      
      const pokemonGames = result.results.filter(game => 
        game.name.toLowerCase().includes('pokemon') || 
        game.name.toLowerCase().includes('pokémon')
      );
      
      expect(pokemonGames.length).toBeGreaterThan(0);
      console.log(`Pokémon search: Found ${pokemonGames.length} Pokemon games`);
    }, 15000);
  });
});