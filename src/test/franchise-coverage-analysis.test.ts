import { describe, it, expect, beforeAll } from '@jest/globals';
import { gameDataService } from '../services/gameDataService';

// Popular games for each franchise (most iconic/highest-rated entries)
const FRANCHISE_POPULAR_GAMES = {
  'Resident Evil': [
    'Resident Evil 2',
    'Resident Evil 4',
    'Resident Evil 7',
    'Resident Evil',
    'Resident Evil 3',
    'Resident Evil Village'
  ],
  'Metal Gear Solid': [
    'Metal Gear Solid',
    'Metal Gear Solid 2',
    'Metal Gear Solid 3',
    'Metal Gear Solid V',
    'Metal Gear Solid 4'
  ],
  'Forza': [
    'Forza Horizon 4',
    'Forza Horizon 5',
    'Forza Motorsport 7',
    'Forza Horizon 3',
    'Forza Motorsport 4'
  ],
  'Gran Turismo': [
    'Gran Turismo 3',
    'Gran Turismo 4',
    'Gran Turismo 7',
    'Gran Turismo Sport',
    'Gran Turismo 2'
  ],
  'Monster Hunter': [
    'Monster Hunter World',
    'Monster Hunter Rise',
    'Monster Hunter 4 Ultimate',
    'Monster Hunter Freedom Unite',
    'Monster Hunter Generations Ultimate'
  ],
  'Pokémon': [
    'Pokémon Red',
    'Pokémon Blue',
    'Pokémon Gold',
    'Pokémon Silver',
    'Pokémon Ruby',
    'Pokémon Sapphire',
    'Pokémon Diamond',
    'Pokémon Pearl',
    'Pokémon Black',
    'Pokémon White'
  ],
  'Call of Duty': [
    'Call of Duty 4: Modern Warfare',
    'Call of Duty: Modern Warfare 2',
    'Call of Duty: Black Ops',
    'Call of Duty: Modern Warfare 3',
    'Call of Duty: World at War'
  ],
  'Battlefield': [
    'Battlefield 3',
    'Battlefield 4',
    'Battlefield 1',
    'Battlefield Bad Company 2',
    'Battlefield 2'
  ],
  'Medal of Honor': [
    'Medal of Honor: Allied Assault',
    'Medal of Honor: Frontline',
    'Medal of Honor: European Assault',
    'Medal of Honor',
    'Medal of Honor: Airborne'
  ],
  'Guitar Hero': [
    'Guitar Hero III: Legends of Rock',
    'Guitar Hero II',
    'Guitar Hero: World Tour',
    'Guitar Hero',
    'Guitar Hero 5'
  ],
  'FIFA': [
    'FIFA 23',
    'FIFA 22',
    'FIFA 21',
    'FIFA 20',
    'FIFA 19'
  ],
  'Madden': [
    'Madden NFL 23',
    'Madden NFL 22',
    'Madden NFL 21',
    'Madden NFL 2005',
    'Madden NFL 2004'
  ],
  'Farming Simulator': [
    'Farming Simulator 22',
    'Farming Simulator 19',
    'Farming Simulator 17',
    'Farming Simulator 15',
    'Farming Simulator 2013'
  ],
  'Hitman': [
    'Hitman 3',
    'Hitman 2',
    'Hitman: Blood Money',
    'Hitman: Contracts',
    'Hitman: Silent Assassin'
  ],
  'Prince of Persia': [
    'Prince of Persia: The Sands of Time',
    'Prince of Persia: Warrior Within',
    'Prince of Persia: The Two Thrones',
    'Prince of Persia (2008)',
    'Prince of Persia'
  ],
  'Assassin\'s Creed': [
    'Assassin\'s Creed II',
    'Assassin\'s Creed: Brotherhood',
    'Assassin\'s Creed IV: Black Flag',
    'Assassin\'s Creed: Origins',
    'Assassin\'s Creed: Odyssey'
  ],
  'Tom Clancy': [
    'Tom Clancy\'s Rainbow Six Siege',
    'Tom Clancy\'s Splinter Cell',
    'Tom Clancy\'s Ghost Recon',
    'Tom Clancy\'s The Division',
    'Tom Clancy\'s Rainbow Six'
  ],
  'Kingdom Hearts': [
    'Kingdom Hearts',
    'Kingdom Hearts II',
    'Kingdom Hearts III',
    'Kingdom Hearts: Birth by Sleep',
    'Kingdom Hearts: Chain of Memories'
  ],
  'Final Fantasy': [
    'Final Fantasy VII',
    'Final Fantasy X',
    'Final Fantasy VI',
    'Final Fantasy IV',
    'Final Fantasy IX',
    'Final Fantasy VIII'
  ],
  'Tekken': [
    'Tekken 3',
    'Tekken 7',
    'Tekken 5',
    'Tekken Tag Tournament',
    'Tekken 2'
  ],
  'Marvel vs Capcom': [
    'Marvel vs. Capcom 2',
    'Marvel vs. Capcom 3',
    'Marvel vs. Capcom: Infinite',
    'Marvel vs. Capcom',
    'Ultimate Marvel vs. Capcom 3'
  ],
  'Fight Night': [
    'Fight Night Champion',
    'Fight Night Round 4',
    'Fight Night Round 3',
    'Fight Night 2004',
    'Fight Night Round 2'
  ],
  'Xenoblade': [
    'Xenoblade Chronicles',
    'Xenoblade Chronicles 2',
    'Xenoblade Chronicles 3',
    'Xenoblade Chronicles X',
    'Xenoblade Chronicles: Future Connected'
  ],
  'Mario': [
    'Super Mario Bros.',
    'Super Mario 64',
    'Super Mario World',
    'Super Mario Galaxy',
    'Super Mario Odyssey',
    'Super Mario Bros. 3'
  ],
  'Zelda': [
    'The Legend of Zelda: Ocarina of Time',
    'The Legend of Zelda: Breath of the Wild',
    'The Legend of Zelda: A Link to the Past',
    'The Legend of Zelda: Majora\'s Mask',
    'The Legend of Zelda: Wind Waker'
  ],
  'Star Fox': [
    'Star Fox 64',
    'Star Fox',
    'Star Fox Zero',
    'Star Fox Command',
    'Star Fox Adventures'
  ],
  'Virtua Fighter': [
    'Virtua Fighter 2',
    'Virtua Fighter 4',
    'Virtua Fighter 5',
    'Virtua Fighter',
    'Virtua Fighter 3'
  ],
  'Silent Hill': [
    'Silent Hill 2',
    'Silent Hill',
    'Silent Hill 3',
    'Silent Hill 4: The Room',
    'Silent Hill: Shattered Memories'
  ],
  'Dino Crisis': [
    'Dino Crisis',
    'Dino Crisis 2',
    'Dino Crisis 3'
  ],
  'Dynasty Warriors': [
    'Dynasty Warriors 3',
    'Dynasty Warriors 4',
    'Dynasty Warriors 5',
    'Dynasty Warriors 7',
    'Dynasty Warriors 8'
  ],
  'Elder Scrolls': [
    'The Elder Scrolls V: Skyrim',
    'The Elder Scrolls IV: Oblivion',
    'The Elder Scrolls III: Morrowind',
    'The Elder Scrolls Online',
    'The Elder Scrolls: Arena'
  ],
  'Fallout': [
    'Fallout: New Vegas',
    'Fallout 3',
    'Fallout 4',
    'Fallout',
    'Fallout 2'
  ]
};

interface FranchiseAnalysis {
  franchise: string;
  popularGames: string[];
  foundGames: string[];
  coverage: number;
  missingGames: string[];
}

describe('Franchise Coverage Analysis', () => {
  const results: FranchiseAnalysis[] = [];
  
  beforeAll(async () => {
    console.log('🎮 Starting comprehensive franchise coverage analysis...');
    console.log('⚠️ This test will make API calls - monitoring for rate limits');
  });
  
  // Test each franchise
  Object.entries(FRANCHISE_POPULAR_GAMES).forEach(([franchise, popularGames]) => {
    it(`should analyze ${franchise} franchise coverage`, async () => {
      console.log(`\n📊 Analyzing ${franchise} franchise...`);
      
      try {
        // Search for the franchise name to get general results
        const searchResults = await gameDataService.searchGames(franchise);
        
        console.log(`   Found ${searchResults.length} total games for "${franchise}"`);
        
        // Check how many of the popular games are found
        const foundGames: string[] = [];
        const missingGames: string[] = [];
        
        for (const popularGame of popularGames) {
          // Check if this popular game appears in search results (fuzzy match)
          const found = searchResults.some(result => 
            result.name.toLowerCase().includes(popularGame.toLowerCase()) ||
            popularGame.toLowerCase().includes(result.name.toLowerCase()) ||
            // More flexible matching for variations
            fuzzyMatch(result.name.toLowerCase(), popularGame.toLowerCase())
          );
          
          if (found) {
            foundGames.push(popularGame);
          } else {
            missingGames.push(popularGame);
          }
        }
        
        const coverage = (foundGames.length / popularGames.length) * 100;
        
        const analysis: FranchiseAnalysis = {
          franchise,
          popularGames,
          foundGames,
          coverage,
          missingGames
        };
        
        results.push(analysis);
        
        console.log(`   📈 Coverage: ${coverage.toFixed(1)}% (${foundGames.length}/${popularGames.length})`);
        console.log(`   ✅ Found: ${foundGames.join(', ')}`);
        if (missingGames.length > 0) {
          console.log(`   ❌ Missing: ${missingGames.join(', ')}`);
        }
        
        // Basic assertion - we expect at least some coverage for major franchises
        expect(coverage).toBeGreaterThan(0);
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`❌ Error analyzing ${franchise}:`, error);
        throw error;
      }
    }, 15000); // 15 second timeout per franchise
  });
  
  it('should generate comprehensive coverage report', async () => {
    console.log('\n📋 COMPREHENSIVE FRANCHISE COVERAGE REPORT');
    console.log('='.repeat(60));
    
    // Sort results by coverage percentage
    const sortedResults = results.sort((a, b) => b.coverage - a.coverage);
    
    let totalGames = 0;
    let totalFound = 0;
    
    sortedResults.forEach(result => {
      totalGames += result.popularGames.length;
      totalFound += result.foundGames.length;
      
      console.log(`\n${result.franchise}:`);
      console.log(`  Coverage: ${result.coverage.toFixed(1)}% (${result.foundGames.length}/${result.popularGames.length})`);
      
      if (result.coverage < 50) {
        console.log(`  🔴 LOW COVERAGE - Needs attention`);
      } else if (result.coverage < 80) {
        console.log(`  🟡 MODERATE COVERAGE - Could improve`);
      } else {
        console.log(`  🟢 GOOD COVERAGE`);
      }
    });
    
    const overallCoverage = (totalFound / totalGames) * 100;
    console.log(`\n📊 OVERALL STATISTICS:`);
    console.log(`  Total Popular Games Analyzed: ${totalGames}`);
    console.log(`  Total Games Found: ${totalFound}`);
    console.log(`  Overall Coverage: ${overallCoverage.toFixed(1)}%`);
    
    // Identify problem areas
    const lowCoverage = sortedResults.filter(r => r.coverage < 50);
    const moderateCoverage = sortedResults.filter(r => r.coverage >= 50 && r.coverage < 80);
    const goodCoverage = sortedResults.filter(r => r.coverage >= 80);
    
    console.log(`\n🔍 COVERAGE BREAKDOWN:`);
    console.log(`  🟢 Good Coverage (80%+): ${goodCoverage.length} franchises`);
    console.log(`  🟡 Moderate Coverage (50-79%): ${moderateCoverage.length} franchises`);
    console.log(`  🔴 Low Coverage (<50%): ${lowCoverage.length} franchises`);
    
    if (lowCoverage.length > 0) {
      console.log(`\n🚨 PRIORITY FRANCHISES FOR IMPROVEMENT:`);
      lowCoverage.forEach(franchise => {
        console.log(`  - ${franchise.franchise} (${franchise.coverage.toFixed(1)}%)`);
      });
    }
    
    // Store results for further analysis
    (global as any).franchiseCoverageResults = sortedResults;
    
    expect(overallCoverage).toBeGreaterThan(30); // Expect at least 30% overall coverage
  }, 10000);
});

// Helper function for fuzzy string matching
function fuzzyMatch(str1: string, str2: string, threshold: number = 0.6): boolean {
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);
  
  let matches = 0;
  const maxLength = Math.max(words1.length, words2.length);
  
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }
  
  return (matches / maxLength) >= threshold;
}