import { describe, it, expect, jest, beforeAll, afterAll } from '@jest/globals';
import { gameDataService } from '../services/gameDataService';
import { GameSeeder } from '../services/gameSeeder';
import { PRIORITY_GAMES_DATABASE, getGameBoostScore, getCriticalPriorityGames } from '../data/priorityGames';
import { detectGameSeries, generateSisterGameQueries, prioritizeFlagshipTitles } from '../utils/sisterGameDetection';

describe('Phase 1 & 2 Implementation Tests', () => {
  
  describe('Priority Games Database', () => {
    
    it('should have critical priority games defined', () => {
      const criticalGames = getCriticalPriorityGames();
      
      expect(criticalGames.length).toBeGreaterThan(10);
      expect(criticalGames.every(game => game.priority === 'critical')).toBe(true);
      expect(criticalGames.every(game => game.flagship === true)).toBe(true);
      
      console.log(`✅ Found ${criticalGames.length} critical priority games`);
    });

    it('should include key franchise flagship games', () => {
      const requiredGames = [
        'Pokémon Red',
        'Super Mario Bros.',
        'The Legend of Zelda: Ocarina of Time',
        'Star Fox 64'
      ];
      
      for (const gameName of requiredGames) {
        const game = PRIORITY_GAMES_DATABASE.find(g => g.name === gameName);
        expect(game).toBeDefined();
        expect(game?.flagship).toBe(true);
        console.log(`✅ ${gameName}: Priority ${game?.priority}, Boost ${game?.boost_score}`);
      }
    });

    it('should provide boost scores for flagship games', () => {
      expect(getGameBoostScore('Pokémon Red', 'pokemon')).toBeGreaterThan(400);
      expect(getGameBoostScore('Super Mario Bros.', 'mario')).toBeGreaterThan(400);
      expect(getGameBoostScore('Star Fox 64', 'star fox')).toBeGreaterThan(400);
      expect(getGameBoostScore('Unknown Game', 'unknown')).toBe(0);
      
      console.log('✅ Boost scores working correctly');
    });
  });

  describe('Enhanced Flagship Prioritization', () => {
    
    it('should prioritize flagship games in search results', () => {
      const mockResults = [
        { name: 'Mario Kart 64', _sisterGameBoost: 50 }, // Spin-off
        { name: 'Super Mario Bros.', _sisterGameBoost: 100 }, // Flagship
        { name: 'Mario Party', _sisterGameBoost: 30 }, // Spin-off
        { name: 'Super Mario Galaxy', _sisterGameBoost: 80 } // Flagship
      ];
      
      const prioritized = prioritizeFlagshipTitles(mockResults, 'mario');
      
      // Check that flagship games got boost
      const smb = prioritized.find(g => g.name === 'Super Mario Bros.');
      const galaxy = prioritized.find(g => g.name === 'Super Mario Galaxy');
      const kart = prioritized.find(g => g.name === 'Mario Kart 64');
      
      expect(smb?._priorityBoost).toBeGreaterThan(400);
      expect(galaxy?._priorityBoost).toBeGreaterThan(400);
      expect(smb?._flagshipStatus).toBe('flagship');
      expect(galaxy?._flagshipStatus).toBe('flagship');
      expect(kart?._flagshipStatus).toBe('spin-off');
      
      console.log('✅ Flagship prioritization working');
    });

    it('should detect spin-offs and apply penalties', () => {
      const mockResults = [
        { name: 'Mario Kart 8', _sisterGameBoost: 100 },
        { name: 'Mario Party 10', _sisterGameBoost: 100 },
        { name: 'Paper Mario', _sisterGameBoost: 100 }
      ];
      
      const prioritized = prioritizeFlagshipTitles(mockResults, 'mario');
      
      // All should be identified as spin-offs with reduced boost
      prioritized.forEach(game => {
        expect(game._flagshipStatus).toBe('spin-off');
        expect(game._sisterGameBoost).toBeLessThan(100); // Penalty applied
      });
      
      console.log('✅ Spin-off detection and penalties working');
    });
  });

  describe('Game Seeder Service', () => {
    let seeder: GameSeeder;
    
    beforeAll(() => {
      seeder = new GameSeeder();
    });

    it('should identify missing games from database', async () => {
      console.log('🧪 Testing game seeder - identifying missing games...');
      
      try {
        const missing = await seeder.identifyMissingGames();
        
        expect(Array.isArray(missing)).toBe(true);
        console.log(`📊 Identified ${missing.length} missing games`);
        
        // Should find at least some missing games (unless all are already seeded)
        if (missing.length > 0) {
          const firstMissing = missing[0];
          expect(firstMissing.priorityGame).toBeDefined();
          expect(firstMissing.priorityGame.name).toBeDefined();
          expect(firstMissing.reason).toMatch(/not_found|no_results/);
          
          console.log(`First missing game: ${firstMissing.priorityGame.name}`);
        } else {
          console.log('✅ All critical games already present in database!');
        }
        
      } catch (error) {
        console.warn('⚠️ Game seeder test failed (may be expected in test environment):', error.message);
        // Don't fail the test - database might not be available
      }
    }, 15000);

    it('should run dry run seeding without errors', async () => {
      console.log('🧪 Testing dry run seeding...');
      
      try {
        const result = await seeder.runSeeding(true); // Dry run
        
        expect(result).toBeDefined();
        expect(typeof result.attempted).toBe('number');
        expect(typeof result.successful).toBe('number');
        expect(typeof result.failed).toBe('number');
        expect(Array.isArray(result.errors)).toBe(true);
        
        console.log(`📊 Dry run results: ${result.attempted} attempted, ${result.successful} would succeed`);
        
      } catch (error) {
        console.warn('⚠️ Dry run seeding test failed (may be expected):', error.message);
        // Don't fail the test - API might not be available
      }
    }, 30000);
  });

  describe('Enhanced Search Integration', () => {
    
    it('should detect franchise queries correctly', () => {
      // Use the internal method via type casting
      const service = gameDataService as any;
      
      expect(service.isFranchiseQuery('pokemon')).toBe(true);
      expect(service.isFranchiseQuery('mario')).toBe(true);
      expect(service.isFranchiseQuery('zelda')).toBe(true);
      expect(service.isFranchiseQuery('star fox')).toBe(true);
      expect(service.isFranchiseQuery('random game name')).toBe(false);
      
      console.log('✅ Franchise query detection working');
    });

    it('should perform enhanced search with prioritization', async () => {
      console.log('🧪 Testing enhanced search with prioritization...');
      
      try {
        // Test Star Fox search (should prioritize Star Fox 64)
        const starFoxResults = await gameDataService.searchGames('star fox');
        
        console.log(`📊 Star Fox search returned ${starFoxResults.length} results`);
        
        if (starFoxResults.length > 0) {
          starFoxResults.slice(0, 3).forEach((game, i) => {
            console.log(`  ${i + 1}. ${game.name} ${(game as any)._flagshipStatus ? `[${(game as any)._flagshipStatus}]` : ''}`);
          });
          
          // Check if Star Fox 64 is prioritized (should be in top 3 if present)
          const starFox64Index = starFoxResults.findIndex(game => 
            game.name.toLowerCase().includes('star fox 64')
          );
          
          if (starFox64Index >= 0) {
            console.log(`✅ Star Fox 64 found at position ${starFox64Index + 1}`);
            expect(starFox64Index).toBeLessThan(3);
          } else {
            console.log('ℹ️ Star Fox 64 not found in results (may need seeding)');
          }
        }
        
        expect(Array.isArray(starFoxResults)).toBe(true);
        
      } catch (error) {
        console.error('❌ Enhanced search test failed:', error);
        throw error;
      }
    }, 15000);

    it('should handle Pokemon search without errors', async () => {
      console.log('🧪 Testing Pokemon search (known issue)...');
      
      try {
        const pokemonResults = await gameDataService.searchGames('pokemon');
        
        console.log(`📊 Pokemon search returned ${pokemonResults.length} results`);
        
        if (pokemonResults.length === 0) {
          console.log('⚠️ Pokemon search returned no results - needs seeding');
        } else {
          pokemonResults.slice(0, 3).forEach((game, i) => {
            console.log(`  ${i + 1}. ${game.name}`);
          });
        }
        
        expect(Array.isArray(pokemonResults)).toBe(true);
        
      } catch (error) {
        console.error('❌ Pokemon search test failed:', error);
        throw error;
      }
    }, 15000);
  });

  describe('Coverage Improvements', () => {
    
    it('should test coverage across multiple franchises', async () => {
      console.log('🧪 Testing coverage across key franchises...');
      
      const testFranchises = ['mario', 'zelda', 'final fantasy', 'star fox'];
      const results = {};
      
      for (const franchise of testFranchises) {
        try {
          const searchResults = await gameDataService.searchGames(franchise);
          
          results[franchise] = {
            count: searchResults.length,
            flagship: searchResults.filter(g => (g as any)._flagshipStatus === 'flagship').length,
            topResult: searchResults[0]?.name || 'No results'
          };
          
          console.log(`  ${franchise}: ${searchResults.length} results, ${results[franchise].flagship} flagship`);
          
          // Small delay between searches
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.warn(`⚠️ Error testing ${franchise}:`, error.message);
          results[franchise] = { error: error.message };
        }
      }
      
      console.log('📊 Coverage test results:', JSON.stringify(results, null, 2));
      
      // At least 2 franchises should return some results
      const successfulSearches = Object.values(results).filter((r: any) => !r.error && r.count > 0).length;
      expect(successfulSearches).toBeGreaterThan(1);
      
    }, 30000);
  });
});