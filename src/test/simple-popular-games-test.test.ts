/**
 * Simple Popular Games Test
 * Tests a smaller subset of popular games to identify filtering issues
 */

import { igdbServiceV2 } from '../services/igdbServiceV2';

// Simplified test with just the most essential popular games
const ESSENTIAL_GAMES = [
  { name: 'Mario', franchise: 'Mario', expectedMinResults: 10 },
  { name: 'Zelda', franchise: 'Zelda', expectedMinResults: 5 },
  { name: 'Pokemon', franchise: 'Pokemon', expectedMinResults: 10 },
  { name: 'Final Fantasy', franchise: 'Final Fantasy', expectedMinResults: 10 },
  { name: 'Call of Duty', franchise: 'Call of Duty', expectedMinResults: 5 },
  { name: 'Grand Theft Auto', franchise: 'GTA', expectedMinResults: 3 },
  { name: 'Assassin\'s Creed', franchise: 'Assassin\'s Creed', expectedMinResults: 5 },
  { name: 'Halo', franchise: 'Halo', expectedMinResults: 3 },
  { name: 'God of War', franchise: 'God of War', expectedMinResults: 3 },
  { name: 'Uncharted', franchise: 'Uncharted', expectedMinResults: 3 },
  
  // Specific popular titles
  { name: 'Super Mario Odyssey', franchise: 'Mario', expectedMinResults: 1 },
  { name: 'The Legend of Zelda: Breath of the Wild', franchise: 'Zelda', expectedMinResults: 1 },
  { name: 'Pokemon Legends Arceus', franchise: 'Pokemon', expectedMinResults: 1 },
  { name: 'Final Fantasy VII', franchise: 'Final Fantasy', expectedMinResults: 1 },
  { name: 'Grand Theft Auto V', franchise: 'GTA', expectedMinResults: 1 },
  { name: 'Minecraft', franchise: 'Minecraft', expectedMinResults: 1 },
  { name: 'The Witcher 3', franchise: 'The Witcher', expectedMinResults: 1 },
  { name: 'Elden Ring', franchise: 'Elden Ring', expectedMinResults: 1 },
  { name: 'Cyberpunk 2077', franchise: 'Cyberpunk', expectedMinResults: 1 },
  { name: 'Red Dead Redemption 2', franchise: 'Red Dead', expectedMinResults: 1 },
];

describe('Simple Popular Games Test', () => {
  const RESULTS: Array<{
    game: string;
    franchise: string;
    expected: number;
    found: number;
    status: 'PASS' | 'FAIL' | 'ERROR';
    topResults: string[];
    error?: string;
  }> = [];

  beforeAll(() => {
    console.log('🎮 Testing Essential Popular Games Coverage');
    console.log(`Testing ${ESSENTIAL_GAMES.length} essential games and franchises`);
  });

  test('should find essential popular games', async () => {
    for (const game of ESSENTIAL_GAMES) {
      console.log(`\n🔍 Testing: "${game.name}" (${game.franchise})`);
      
      try {
        const results = await igdbServiceV2.searchGames(game.name, 20);
        
        const status = results.length >= game.expectedMinResults ? 'PASS' : 'FAIL';
        const topResults = results.slice(0, 5).map(r => r.name);
        
        RESULTS.push({
          game: game.name,
          franchise: game.franchise,
          expected: game.expectedMinResults,
          found: results.length,
          status,
          topResults
        });
        
        if (status === 'PASS') {
          console.log(`✅ PASS: Found ${results.length}/${game.expectedMinResults} results`);
          console.log(`   Top results: ${topResults.slice(0, 3).join(', ')}`);
        } else {
          console.log(`❌ FAIL: Found ${results.length}/${game.expectedMinResults} results`);
          if (results.length > 0) {
            console.log(`   Found: ${topResults.join(', ')}`);
          }
        }
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ ERROR searching for "${game.name}":`, error);
        RESULTS.push({
          game: game.name,
          franchise: game.franchise,
          expected: game.expectedMinResults,
          found: 0,
          status: 'ERROR',
          topResults: [],
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }, 120000); // 2 minute timeout

  afterAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('🎮 SIMPLE POPULAR GAMES TEST RESULTS');
    console.log('='.repeat(80));
    
    const passed = RESULTS.filter(r => r.status === 'PASS');
    const failed = RESULTS.filter(r => r.status === 'FAIL');
    const errored = RESULTS.filter(r => r.status === 'ERROR');
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ PASSED: ${passed.length}/${RESULTS.length} (${((passed.length / RESULTS.length) * 100).toFixed(1)}%)`);
    console.log(`❌ FAILED: ${failed.length}/${RESULTS.length} (${((failed.length / RESULTS.length) * 100).toFixed(1)}%)`);
    console.log(`💥 ERRORED: ${errored.length}/${RESULTS.length} (${((errored.length / RESULTS.length) * 100).toFixed(1)}%)`);
    
    if (errored.length > 0) {
      console.log('\n💥 API ERRORS:');
      errored.forEach(result => {
        console.log(`   "${result.game}" - ${result.error}`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ FAILED SEARCHES:');
      failed.forEach(result => {
        console.log(`   "${result.game}" - Expected ${result.expected}, Found ${result.found}`);
        if (result.topResults.length > 0) {
          console.log(`      Results: ${result.topResults.join(', ')}`);
        }
      });
    }
    
    if (passed.length > 0) {
      console.log('\n✅ SUCCESSFUL SEARCHES:');
      passed.forEach(result => {
        console.log(`   "${result.game}" - Found ${result.found} results`);
      });
    }
    
    console.log('\n🔧 ANALYSIS:');
    console.log('='.repeat(50));
    
    if (errored.length > passed.length) {
      console.log('🚨 CRITICAL ISSUE: More API errors than successful searches');
      console.log('   - Check IGDB API credentials and rate limits');
      console.log('   - Verify Netlify functions are working properly');
      console.log('   - Test with real IGDB environment variables');
    } else if (failed.length > passed.length) {
      console.log('⚠️  FILTERING ISSUE: More failed searches than successful ones');
      console.log('   - Content protection filters may be too aggressive');
      console.log('   - Category filters may be removing main games');
      console.log('   - Relevance thresholds may be too high');
    } else if (passed.length === RESULTS.length) {
      console.log('🎉 EXCELLENT: All essential games found successfully');
      console.log('   - Search system is working well for popular titles');
      console.log('   - Filtering is appropriately balanced');
    } else {
      console.log('📈 MIXED RESULTS: Some issues but generally functional');
      console.log('   - Review failed cases for specific filtering improvements');
      console.log('   - Consider adjusting thresholds for edge cases');
    }
    
    console.log('\n' + '='.repeat(80));
  });
});