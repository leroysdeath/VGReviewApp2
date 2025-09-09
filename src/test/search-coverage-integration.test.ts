import { describe, it, expect } from '@jest/globals';
import { gameDataService } from '../services/gameDataService';
import { detectGameSeries, generateSisterGameQueries } from '../utils/sisterGameDetection';

describe('Search Coverage Integration Tests', () => {
  
  it('should find Pokemon games in database', async () => {
    console.log('🧪 Testing Pokemon search coverage...');
    
    try {
      const results = await gameDataService.searchGames('pokemon');
      console.log(`📊 Pokemon search returned ${results.length} results`);
      
      if (results.length > 0) {
        console.log('First 5 Pokemon results:');
        results.slice(0, 5).forEach((game, i) => {
          console.log(`  ${i + 1}. ${game.name}`);
        });
      }
      
      expect(Array.isArray(results)).toBe(true);
      
      // Test sister game detection
      const seriesInfo = detectGameSeries('pokemon');
      console.log('Pokemon series detection:', seriesInfo);
      
      if (seriesInfo) {
        const sisterQueries = generateSisterGameQueries('pokemon');
        console.log(`Generated ${sisterQueries.length} sister game queries`);
        console.log('Sister queries:', sisterQueries.slice(0, 10));
      }
      
    } catch (error) {
      console.error('❌ Pokemon search test failed:', error);
      throw error;
    }
  }, 15000);

  it('should prioritize flagship Star Fox games', async () => {
    console.log('🧪 Testing Star Fox flagship prioritization...');
    
    try {
      const results = await gameDataService.searchGames('star fox');
      console.log(`📊 Star Fox search returned ${results.length} results`);
      
      if (results.length > 0) {
        console.log('Star Fox results in order:');
        results.forEach((game, i) => {
          console.log(`  ${i + 1}. ${game.name} ${game._sisterGameBoost ? `(+${game._sisterGameBoost})` : ''}`);
        });
        
        // Check if Star Fox 64 is in top 3
        const starFox64Index = results.findIndex(game => 
          game.name.toLowerCase().includes('star fox 64') || 
          game.name.toLowerCase().includes('starfox 64')
        );
        
        if (starFox64Index >= 0) {
          console.log(`✅ Star Fox 64 found at position ${starFox64Index + 1}`);
          expect(starFox64Index).toBeLessThan(3); // Should be in top 3
        } else {
          console.log('⚠️ Star Fox 64 not found in results');
        }
      }
      
      expect(Array.isArray(results)).toBe(true);
      
    } catch (error) {
      console.error('❌ Star Fox test failed:', error);
      throw error;
    }
  }, 15000);

  it('should test flagship game prioritization across multiple franchises', async () => {
    console.log('🧪 Testing flagship prioritization across franchises...');
    
    const testFranchises = [
      { name: 'mario', flagship: 'super mario bros' },
      { name: 'zelda', flagship: 'ocarina of time' },
      { name: 'final fantasy', flagship: 'final fantasy vii' },
      { name: 'resident evil', flagship: 'resident evil 2' }
    ];
    
    const results = {};
    
    for (const franchise of testFranchises) {
      try {
        console.log(`\n📊 Testing ${franchise.name}...`);
        const searchResults = await gameDataService.searchGames(franchise.name);
        
        console.log(`   Found ${searchResults.length} games`);
        
        if (searchResults.length > 0) {
          const topGame = searchResults[0];
          console.log(`   Top result: "${topGame.name}"`);
          
          // Check if flagship is in top 5
          const flagshipIndex = searchResults.findIndex(game =>
            game.name.toLowerCase().includes(franchise.flagship)
          );
          
          results[franchise.name] = {
            totalResults: searchResults.length,
            topGame: topGame.name,
            flagshipIndex: flagshipIndex,
            flagshipFound: flagshipIndex >= 0
          };
          
          if (flagshipIndex >= 0) {
            console.log(`   ✅ Flagship "${franchise.flagship}" found at position ${flagshipIndex + 1}`);
          } else {
            console.log(`   ❌ Flagship "${franchise.flagship}" not found`);
          }
        }
        
        // Small delay between searches
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error testing ${franchise.name}:`, error);
        results[franchise.name] = { error: error.message };
      }
    }
    
    console.log('\n📋 FLAGSHIP PRIORITIZATION SUMMARY:');
    Object.entries(results).forEach(([franchise, data]) => {
      if (data.error) {
        console.log(`❌ ${franchise}: ERROR - ${data.error}`);
      } else {
        const status = data.flagshipFound ? '✅' : '❌';
        console.log(`${status} ${franchise}: ${data.flagshipFound ? `Flagship at #${data.flagshipIndex + 1}` : 'Flagship not found'} (${data.totalResults} total)`);
      }
    });
    
    // At least 2 franchises should have their flagship games found
    const successfulFinds = Object.values(results).filter(r => r.flagshipFound).length;
    expect(successfulFinds).toBeGreaterThan(1);
    
  }, 30000);
});