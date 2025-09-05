// Test script to verify scoring is being applied to search results
import { igdbService } from './src/services/igdbService.js';

console.log('🧪 Testing Hypothesis 2: Scoring Applied But Results Identical');
console.log('================================================================');

async function testScoringApplication() {
  try {
    console.log('\n🎮 Testing Zelda search with enhanced scoring...');
    const zeldaResults = await igdbService.searchWithSequels('zelda', 10);
    
    console.log('\n📊 ZELDA SEARCH RESULTS:');
    console.log('Total results:', zeldaResults.length);
    
    let gamesWithScoring = 0;
    const scoringProperties = ['_gameTypeBoost', '_platformBoost', '_ratingBoost', '_popularityBoost', '_significanceBoost', '_olympicPartyPenalty'];
    
    zeldaResults.forEach((game, i) => {
      console.log(`${i + 1}. ${game.name}`);
      console.log(`   Category: ${game.category}`);
      
      // Check for scoring properties
      const hasScoring = scoringProperties.some(prop => game.hasOwnProperty(prop));
      if (hasScoring) {
        gamesWithScoring++;
        console.log('   🔧 SCORING PROPERTIES:');
        scoringProperties.forEach(prop => {
          if (game.hasOwnProperty(prop)) {
            console.log(`     ${prop}: ${game[prop]}`);
          }
        });
      } else {
        console.log('   ❌ NO SCORING PROPERTIES');
      }
      
      if (game.priority !== undefined) {
        console.log(`   Priority Score: ${game.priority}`);
      }
      
      console.log('');
    });
    
    console.log('\n📊 SCORING ANALYSIS:');
    console.log(`Games with scoring enhancements: ${gamesWithScoring}/${zeldaResults.length}`);
    
    if (gamesWithScoring === 0) {
      console.log('❌ HYPOTHESIS 2 CONFIRMED: Scoring is NOT being applied');
      console.log('🎯 Possible causes:');
      console.log('   - Scoring functions not being called in search pipeline');
      console.log('   - Dynamic imports failing silently');
      console.log('   - Module resolution issues in igdbService');
      console.log('   - Scoring properties being stripped before return');
    } else {
      console.log('✅ HYPOTHESIS 2 REJECTED: Scoring IS being applied');
      console.log('🎯 Search results unchanged due to other factors');
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

testScoringApplication();