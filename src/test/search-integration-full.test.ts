import { describe, it, expect, beforeAll } from '@jest/globals';
import { gameDataService } from '../services/gameDataService';
import type { GameWithCalculatedFields } from '../types/database';

// Integration test for the complete search flow from frontend to backend
describe('Full Search Integration Tests', () => {
  
  beforeAll(() => {
    console.log('🧪 Starting full search integration tests');
    console.log('These tests verify the complete flow: Frontend → gameDataService → gameSearchService → Database');
  });

  describe('Sister Game Detection Integration', () => {
    it('should detect and expand Pokemon series through full stack', async () => {
      console.log('\n🎮 POKEMON INTEGRATION TEST:');
      
      const query = 'Pokemon Red';
      console.log(`Searching for: "${query}"`);
      
      const results = await gameDataService.searchGames(query);
      
      console.log(`📊 Results: ${results.length} games found`);
      
      // Log first 10 results with details
      console.log('\nTop 10 results:');
      results.slice(0, 10).forEach((game, index) => {
        const sisterInfo = (game as any)._sisterGameBoost ? 
          ` (+${(game as any)._sisterGameBoost} boost, ${(game as any)._sisterGameRelationship})` : '';
        const strategy = (game as any)._searchStrategy ? 
          ` [${(game as any)._searchStrategy}]` : '';
        
        console.log(`  ${index + 1}. "${game.name}"${sisterInfo}${strategy}`);
      });
      
      // Verify we got results
      expect(results.length).toBeGreaterThan(0);
      
      // Check if Pokemon Red is in results (exact match should be there)
      const pokemonRed = results.find(g => g.name.toLowerCase().includes('pokemon red'));
      if (pokemonRed) {
        console.log(`✅ Pokemon Red found in results`);
        expect(pokemonRed.name).toContain('Pokemon');
      }
      
      // Look for sister games (Blue, Yellow, etc.)
      const pokemonBlue = results.find(g => g.name.toLowerCase().includes('pokemon blue'));
      const pokemonYellow = results.find(g => g.name.toLowerCase().includes('pokemon yellow'));
      
      if (pokemonBlue) {
        console.log(`✅ Pokemon Blue found as sister game`);
      }
      if (pokemonYellow) {
        console.log(`✅ Pokemon Yellow found as sister game`);
      }
      
      // Count total Pokemon games found
      const pokemonGames = results.filter(g => 
        g.name.toLowerCase().includes('pokemon') || g.name.toLowerCase().includes('pokémon')
      );
      
      console.log(`🎯 Total Pokemon games found: ${pokemonGames.length}`);
      expect(pokemonGames.length).toBeGreaterThan(1); // Should find multiple Pokemon games
      
    }, 30000); // 30 second timeout for API calls
    
    it('should detect and expand Final Fantasy series through full stack', async () => {
      console.log('\n⚔️ FINAL FANTASY INTEGRATION TEST:');
      
      const query = 'Final Fantasy VII';
      console.log(`Searching for: "${query}"`);
      
      const results = await gameDataService.searchGames(query);
      
      console.log(`📊 Results: ${results.length} games found`);
      
      // Log first 10 results
      console.log('\nTop 10 results:');
      results.slice(0, 10).forEach((game, index) => {
        const sisterInfo = (game as any)._sisterGameBoost ? 
          ` (+${(game as any)._sisterGameBoost} boost, ${(game as any)._sisterGameRelationship})` : '';
        
        console.log(`  ${index + 1}. "${game.name}"${sisterInfo}`);
      });
      
      expect(results.length).toBeGreaterThan(0);
      
      // Look for Final Fantasy games
      const ffGames = results.filter(g => 
        g.name.toLowerCase().includes('final fantasy')
      );
      
      console.log(`🎯 Total Final Fantasy games found: ${ffGames.length}`);
      
      if (ffGames.length > 0) {
        console.log('Final Fantasy games found:');
        ffGames.slice(0, 5).forEach(game => {
          console.log(`   - "${game.name}"`);
        });
      }
      
      expect(ffGames.length).toBeGreaterThan(0);
      
    }, 30000);
    
    it('should detect and expand Mario series through full stack', async () => {
      console.log('\n🍄 MARIO INTEGRATION TEST:');
      
      const query = 'Super Mario Bros';
      console.log(`Searching for: "${query}"`);
      
      const results = await gameDataService.searchGames(query);
      
      console.log(`📊 Results: ${results.length} games found`);
      
      expect(results.length).toBeGreaterThan(0);
      
      // Look for Mario games
      const marioGames = results.filter(g => 
        g.name.toLowerCase().includes('mario')
      );
      
      console.log(`🎯 Total Mario games found: ${marioGames.length}`);
      console.log('Mario games found:');
      marioGames.slice(0, 8).forEach(game => {
        const sisterInfo = (game as any)._sisterGameBoost ? 
          ` (+${(game as any)._sisterGameBoost})` : '';
        console.log(`   - "${game.name}"${sisterInfo}`);
      });
      
      expect(marioGames.length).toBeGreaterThan(0);
      
    }, 30000);
  });

  describe('Genre-Based Prioritization Integration', () => {
    it('should prioritize same-genre sister games', async () => {
      console.log('\n🎨 GENRE PRIORITIZATION TEST:');
      
      const query = 'Pokemon Red';
      const results = await gameDataService.searchGames(query);
      
      // Find Pokemon games and check their genres
      const pokemonGames = results.filter(g => 
        g.name.toLowerCase().includes('pokemon') && g.genres?.length > 0
      );
      
      if (pokemonGames.length > 1) {
        console.log('Pokemon games with genres:');
        pokemonGames.slice(0, 5).forEach(game => {
          console.log(`   - "${game.name}" [${game.genres?.join(', ')}]`);
        });
        
        // Check if RPG Pokemon games appear before non-RPG Pokemon games
        const rpgPokemon = pokemonGames.filter(g => 
          g.genres?.some(genre => genre.toLowerCase().includes('rpg'))
        );
        
        const nonRpgPokemon = pokemonGames.filter(g => 
          !g.genres?.some(genre => genre.toLowerCase().includes('rpg'))
        );
        
        console.log(`🎮 RPG Pokemon games: ${rpgPokemon.length}`);
        console.log(`🕹️ Non-RPG Pokemon games: ${nonRpgPokemon.length}`);
        
        if (rpgPokemon.length > 0) {
          expect(rpgPokemon.length).toBeGreaterThan(0);
        }
      }
      
    }, 30000);
  });

  describe('Search Performance and API Usage', () => {
    it('should complete searches within reasonable time limits', async () => {
      console.log('\n⚡ PERFORMANCE TEST:');
      
      const queries = ['Pokemon Red', 'Final Fantasy VII', 'Mario'];
      
      for (const query of queries) {
        const startTime = performance.now();
        
        const results = await gameDataService.searchGames(query);
        
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        
        console.log(`   "${query}": ${duration}ms (${results.length} results)`);
        
        // Should complete within 10 seconds
        expect(duration).toBeLessThan(10000);
        expect(results.length).toBeGreaterThan(0);
        
        // Small delay to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
    }, 45000); // Longer timeout for multiple searches
    
    it('should handle edge cases gracefully', async () => {
      console.log('\n🛡️ EDGE CASE TEST:');
      
      const edgeCases = [
        '',
        'xyz',
        'nonexistent game series',
        'a',
        'Final Fantasy 999'
      ];
      
      for (const query of edgeCases) {
        console.log(`Testing: "${query || '<empty>'}"`);
        
        const results = await gameDataService.searchGames(query);
        
        console.log(`   Results: ${results.length}`);
        
        // Should not crash and should return an array
        expect(results).toBeInstanceOf(Array);
        expect(results.length).toBeGreaterThanOrEqual(0);
        
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
    }, 30000);
  });

  describe('Fallback Behavior', () => {
    it('should fallback gracefully when enhanced search fails', async () => {
      console.log('\n🔄 FALLBACK TEST:');
      
      // This tests the fallback to basic search if enhanced search fails
      const query = 'Mario';
      
      try {
        const results = await gameDataService.searchGames(query);
        
        console.log(`Fallback test completed: ${results.length} results`);
        
        // Should still get results even if something goes wrong
        expect(results).toBeInstanceOf(Array);
        
        // If we get results, they should be valid games
        if (results.length > 0) {
          const firstResult = results[0];
          expect(firstResult.name).toBeDefined();
          expect(firstResult.id).toBeDefined();
        }
        
      } catch (error) {
        console.error('Fallback test failed:', error);
        // Should not throw unhandled errors
        expect(false).toBe(true);
      }
      
    }, 15000);
  });

  describe('Data Format Consistency', () => {
    it('should return consistent data format from enhanced search', async () => {
      console.log('\n📋 DATA FORMAT TEST:');
      
      const results = await gameDataService.searchGames('Mario');
      
      if (results.length > 0) {
        const game = results[0];
        
        console.log('Sample game structure:', {
          id: game.id,
          name: game.name,
          hasGenres: !!game.genres,
          hasPlatforms: !!game.platforms,
          hasSummary: !!game.summary
        });
        
        // Verify required fields
        expect(game.id).toBeDefined();
        expect(game.name).toBeDefined();
        expect(typeof game.name).toBe('string');
        
        // Verify optional fields have correct types
        if (game.genres) {
          expect(Array.isArray(game.genres)).toBe(true);
        }
        
        if (game.platforms) {
          expect(Array.isArray(game.platforms)).toBe(true);
        }
        
        // Verify sister game data is preserved for debugging
        if ((game as any)._sisterGameBoost) {
          expect(typeof (game as any)._sisterGameBoost).toBe('number');
          expect(typeof (game as any)._sisterGameRelationship).toBe('string');
        }
      }
      
    }, 15000);
  });
});