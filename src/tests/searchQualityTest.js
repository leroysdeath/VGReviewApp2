// Search Quality Analysis for Major Game Series
// Tests coverage of acclaimed games in search results

// Note: This will be run via direct API calls due to module import limitations

// Top 10 game series with their most acclaimed titles (best sellers, highest rated, most talked about)
export const MAJOR_SERIES = {
  'Super Mario': [
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
  
  'The Legend of Zelda': [
    'The Legend of Zelda: Ocarina of Time',
    'The Legend of Zelda: Breath of the Wild',
    'The Legend of Zelda: A Link to the Past',
    'The Legend of Zelda: Majora\'s Mask',
    'The Legend of Zelda: Tears of the Kingdom',
    'The Legend of Zelda: The Wind Waker',
    'The Legend of Zelda: Twilight Princess',
    'The Legend of Zelda: Link\'s Awakening'
  ],
  
  'Pokemon': [
    'Pokemon Red',
    'Pokemon Blue',
    'Pokemon Gold',
    'Pokemon Silver',
    'Pokemon Ruby',
    'Pokemon Sapphire',
    'Pokemon Diamond',
    'Pokemon Pearl',
    'Pokemon Black',
    'Pokemon White'
  ],
  
  'Final Fantasy': [
    'Final Fantasy VII',
    'Final Fantasy VI',
    'Final Fantasy X',
    'Final Fantasy IX',
    'Final Fantasy VIII',
    'Final Fantasy IV',
    'Final Fantasy XII',
    'Final Fantasy XV',
    'Final Fantasy XIII'
  ],
  
  'Grand Theft Auto': [
    'Grand Theft Auto: San Andreas',
    'Grand Theft Auto V',
    'Grand Theft Auto: Vice City',
    'Grand Theft Auto III',
    'Grand Theft Auto IV',
    'Grand Theft Auto: Liberty City Stories',
    'Grand Theft Auto: Vice City Stories'
  ],
  
  'Call of Duty': [
    'Call of Duty: Modern Warfare',
    'Call of Duty: Modern Warfare 2',
    'Call of Duty: Black Ops',
    'Call of Duty: Modern Warfare 3',
    'Call of Duty: Black Ops 2',
    'Call of Duty 4: Modern Warfare',
    'Call of Duty: World at War'
  ],
  
  'Assassin\'s Creed': [
    'Assassin\'s Creed II',
    'Assassin\'s Creed: Brotherhood',
    'Assassin\'s Creed',
    'Assassin\'s Creed: Black Flag',
    'Assassin\'s Creed: Odyssey',
    'Assassin\'s Creed: Origins',
    'Assassin\'s Creed: Revelations'
  ],
  
  'Metal Gear': [
    'Metal Gear Solid',
    'Metal Gear Solid 2: Sons of Liberty',
    'Metal Gear Solid 3: Snake Eater',
    'Metal Gear Solid 4: Guns of the Patriots',
    'Metal Gear Solid V: The Phantom Pain',
    'Metal Gear Solid: Peace Walker',
    'Metal Gear Solid: Ground Zeroes'
  ],
  
  'Halo': [
    'Halo: Combat Evolved',
    'Halo 2',
    'Halo 3',
    'Halo: Reach',
    'Halo 4',
    'Halo 5: Guardians',
    'Halo Infinite'
  ],
  
  'Elder Scrolls': [
    'The Elder Scrolls V: Skyrim',
    'The Elder Scrolls III: Morrowind',
    'The Elder Scrolls IV: Oblivion',
    'The Elder Scrolls II: Daggerfall',
    'The Elder Scrolls: Arena',
    'The Elder Scrolls Online'
  ]
};

// Test search coverage for each series
export async function testSeriesSearchCoverage() {
  const results = {};
  
  for (const [seriesName, acclaimedTitles] of Object.entries(MAJOR_SERIES)) {
    console.log(`\n🎮 Testing ${seriesName} series...`);
    
    try {
      // Extract search term (first word or two)
      const searchTerm = seriesName.toLowerCase().split(' ')[0];
      const searchResults = await igdbService.searchWithSequels(searchTerm, 15);
      
      // Calculate coverage
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
      
      const coverage = (foundCount / acclaimedTitles.length * 100).toFixed(1);
      
      results[seriesName] = {
        searchTerm,
        totalAcclaimed: acclaimedTitles.length,
        foundCount,
        coverage: parseFloat(coverage),
        foundTitles,
        missingTitles,
        rawResults: searchResults.map(g => ({ name: g.name, category: g.category }))
      };
      
      console.log(`📊 Coverage: ${foundCount}/${acclaimedTitles.length} (${coverage}%)`);
      
    } catch (error) {
      console.log(`❌ Error testing ${seriesName}:`, error.message);
      results[seriesName] = { error: error.message };
    }
  }
  
  return results;
}

// Generate comprehensive report
export function generateQualityReport(results) {
  console.log('\n📊 SEARCH QUALITY REPORT');
  console.log('========================');
  
  let totalAcclaimed = 0;
  let totalFound = 0;
  let seriesCount = 0;
  
  Object.entries(results).forEach(([series, data]) => {
    if (data.error) {
      console.log(`\n❌ ${series}: ERROR - ${data.error}`);
      return;
    }
    
    totalAcclaimed += data.totalAcclaimed;
    totalFound += data.foundCount;
    seriesCount++;
    
    console.log(`\n🎮 ${series.toUpperCase()}:`);
    console.log(`   Search term: "${data.searchTerm}"`);
    console.log(`   Coverage: ${data.foundCount}/${data.totalAcclaimed} (${data.coverage}%)`);
    
    if (data.coverage < 50) {
      console.log(`   🚨 LOW COVERAGE - Missing ${data.missingTitles.length} acclaimed titles`);
    } else if (data.coverage < 75) {
      console.log(`   ⚠️ MODERATE COVERAGE - Room for improvement`);
    } else {
      console.log(`   ✅ GOOD COVERAGE`);
    }
  });
  
  const overallCoverage = totalAcclaimed > 0 ? (totalFound / totalAcclaimed * 100).toFixed(1) : 0;
  
  console.log(`\n📈 OVERALL STATISTICS:`);
  console.log(`   Series tested: ${seriesCount}`);
  console.log(`   Total acclaimed games: ${totalAcclaimed}`);
  console.log(`   Games found in search: ${totalFound}`);
  console.log(`   Overall coverage: ${overallCoverage}%`);
  
  return {
    overallCoverage: parseFloat(overallCoverage),
    seriesCount,
    totalAcclaimed,
    totalFound,
    results
  };
}