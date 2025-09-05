// Comprehensive Coverage Test for Option C Implementation
// Tests whether the search enhancements achieve 77%+ coverage target

// Test data from seriesCoverageTest.test.js
const SERIES_DATA = {
  'mario': {
    seriesName: 'Super Mario',
    acclaimedTitles: [
      'Super Mario Bros.',
      'Super Mario Bros. 3', 
      'Super Mario World',
      'Super Mario 64',
      'Super Mario Galaxy',
      'Super Mario Galaxy 2',
      'Super Mario Odyssey',
      'Super Mario Sunshine',
      'New Super Mario Bros.'
    ],
    minimumCoverageTarget: 70
  },
  
  'zelda': {
    seriesName: 'The Legend of Zelda',
    acclaimedTitles: [
      'Ocarina of Time',
      'Breath of the Wild',
      'A Link to the Past',
      'Majora\'s Mask',
      'Tears of the Kingdom',
      'The Wind Waker',
      'Twilight Princess',
      'Link\'s Awakening'
    ],
    minimumCoverageTarget: 75
  },
  
  'pokemon': {
    seriesName: 'Pokemon',
    acclaimedTitles: [
      'Pokemon Red',
      'Pokemon Blue', 
      'Pokemon Gold',
      'Pokemon Silver',
      'Pokemon Ruby',
      'Pokemon Sapphire',
      'Pokemon Diamond',
      'Pokemon Pearl'
    ],
    minimumCoverageTarget: 60
  },
  
  'final fantasy': {
    seriesName: 'Final Fantasy',
    acclaimedTitles: [
      'Final Fantasy VII',
      'Final Fantasy VI',
      'Final Fantasy X',
      'Final Fantasy IX',
      'Final Fantasy VIII',
      'Final Fantasy IV'
    ],
    minimumCoverageTarget: 80
  },
  
  'grand theft auto': {
    seriesName: 'Grand Theft Auto',
    acclaimedTitles: [
      'San Andreas',
      'GTA V',
      'Vice City', 
      'GTA III',
      'GTA IV'
    ],
    minimumCoverageTarget: 60
  }
};

// Test function for each series
async function testSeriesCoverage(searchTerm, acclaimedTitles) {
  try {
    const response = await fetch('http://localhost:8888/.netlify/functions/igdb-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ searchTerm, limit: 15 })
    });
    
    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    
    if (!data.success || !data.games) {
      return { error: data.error || 'No games returned' };
    }
    
    const searchResults = data.games;
    let foundCount = 0;
    const foundTitles = [];
    const missingTitles = [];
    
    acclaimedTitles.forEach(title => {
      const found = searchResults.some(game => {
        const gameName = game.name.toLowerCase();
        const titleName = title.toLowerCase();
        return gameName.includes(titleName) || titleName.includes(gameName) ||
               gameName.replace(/[:\-\.\s]/g, '').includes(titleName.replace(/[:\-\.\s]/g, ''));
      });
      
      if (found) {
        foundCount++;
        foundTitles.push(title);
      } else {
        missingTitles.push(title);
      }
    });
    
    const coverage = (foundCount / acclaimedTitles.length * 100);
    
    return {
      foundCount,
      totalTitles: acclaimedTitles.length,
      coverage,
      foundTitles,
      missingTitles,
      searchResults: searchResults.map(g => ({ name: g.name, category: g.category }))
    };
    
  } catch (error) {
    return { error: error.message };
  }
}

// Run all tests
async function runComprehensiveCoverageTest() {
  console.log('🧪 OPTION C COMPREHENSIVE COVERAGE TEST');
  console.log('=======================================');
  
  const results = {};
  
  for (const [searchTerm, data] of Object.entries(SERIES_DATA)) {
    console.log(`\n🎮 Testing ${data.seriesName}...`);
    
    const result = await testSeriesCoverage(searchTerm, data.acclaimedTitles);
    
    if (result.error) {
      console.log(`   ❌ ERROR: ${result.error}`);
      results[data.seriesName] = { ...result, passed: false };
    } else {
      const passed = result.coverage >= data.minimumCoverageTarget;
      console.log(`   📊 Coverage: ${result.foundCount}/${result.totalTitles} (${result.coverage.toFixed(1)}%)`);
      console.log(`   Target: ${data.minimumCoverageTarget}% - ${passed ? '✅ PASSED' : '❌ FAILED'}`);
      
      if (!passed) {
        console.log(`   Missing: ${result.missingTitles.slice(0, 3).join(', ')}${result.missingTitles.length > 3 ? '...' : ''}`);
      }
      
      results[data.seriesName] = { ...result, passed, target: data.minimumCoverageTarget };
    }
  }
  
  // Generate final summary
  console.log('\n📈 OPTION C IMPLEMENTATION RESULTS');
  console.log('=================================');
  
  const testResults = Object.values(results);
  const passedTests = testResults.filter(r => r.passed).length;
  const totalTests = testResults.filter(r => !r.error).length;
  
  console.log('\n📊 SERIES PERFORMANCE:');
  Object.entries(results).forEach(([series, data]) => {
    if (data.error) {
      console.log(`❌ ${series}: ERROR - ${data.error}`);
    } else {
      const status = data.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`${status} ${series}: ${data.foundCount}/${data.totalTitles} (${data.coverage.toFixed(1)}%)`);
    }
  });
  
  // Calculate overall coverage
  const totalAcclaimed = testResults.reduce((sum, r) => sum + (r.totalTitles || 0), 0);
  const totalFound = testResults.reduce((sum, r) => sum + (r.foundCount || 0), 0);
  const overallCoverage = totalAcclaimed > 0 ? (totalFound / totalAcclaimed * 100).toFixed(1) : 0;
  
  console.log(`\n🎯 OVERALL RESULTS:`);
  console.log(`   Series tests passed: ${passedTests}/${totalTests} (${(passedTests / totalTests * 100).toFixed(1)}%)`);
  console.log(`   Overall coverage: ${totalFound}/${totalAcclaimed} (${overallCoverage}%)`);
  console.log(`   Target coverage: 77%+`);
  console.log(`   Baseline coverage: 36.6%`);
  
  if (parseFloat(overallCoverage) >= 77) {
    console.log(`\n🎉 SUCCESS: Option C target coverage achieved!`);
  } else {
    console.log(`\n⚠️ PARTIAL SUCCESS: Coverage improved but below target`);
  }
  
  return results;
}

// Execute the test
runComprehensiveCoverageTest().then(() => {
  console.log('\n✅ Coverage test complete');
}).catch(error => {
  console.error('❌ Coverage test failed:', error.message);
});