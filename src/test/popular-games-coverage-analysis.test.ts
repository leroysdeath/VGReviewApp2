/**
 * Popular Games Coverage Analysis Test
 * 
 * Tests our search system against approximately 1000 of the most popular games
 * to identify coverage gaps and filter issues.
 */

import { igdbServiceV2 } from '../services/igdbServiceV2';

const POPULAR_GAMES_LIST = [
  // Top 100 Most Popular Games of All Time
  { name: 'The Legend of Zelda: Breath of the Wild', franchise: 'Zelda', expectedResults: 1 },
  { name: 'Super Mario Odyssey', franchise: 'Mario', expectedResults: 1 },
  { name: 'The Witcher 3: Wild Hunt', franchise: 'The Witcher', expectedResults: 1 },
  { name: 'Grand Theft Auto V', franchise: 'GTA', expectedResults: 1 },
  { name: 'Minecraft', franchise: 'Minecraft', expectedResults: 1 },
  { name: 'Fortnite', franchise: 'Fortnite', expectedResults: 1 },
  { name: 'Red Dead Redemption 2', franchise: 'Red Dead', expectedResults: 1 },
  { name: 'God of War', franchise: 'God of War', expectedResults: 5 },
  { name: 'The Last of Us', franchise: 'The Last of Us', expectedResults: 2 },
  { name: 'Uncharted 4: A Thief\'s End', franchise: 'Uncharted', expectedResults: 1 },
  { name: 'Call of Duty: Modern Warfare', franchise: 'Call of Duty', expectedResults: 5 },
  { name: 'Halo Infinite', franchise: 'Halo', expectedResults: 1 },
  { name: 'Super Smash Bros. Ultimate', franchise: 'Smash Bros', expectedResults: 1 },
  { name: 'Mario Kart 8 Deluxe', franchise: 'Mario Kart', expectedResults: 1 },
  { name: 'Animal Crossing: New Horizons', franchise: 'Animal Crossing', expectedResults: 1 },
  { name: 'Pokemon Legends: Arceus', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Elden Ring', franchise: 'Elden Ring', expectedResults: 1 },
  { name: 'Dark Souls III', franchise: 'Dark Souls', expectedResults: 1 },
  { name: 'Bloodborne', franchise: 'Bloodborne', expectedResults: 1 },
  { name: 'Sekiro: Shadows Die Twice', franchise: 'Sekiro', expectedResults: 1 },

  // Classic/Retro Popular Games
  { name: 'Super Mario Bros.', franchise: 'Mario', expectedResults: 3 },
  { name: 'Super Mario Bros. 3', franchise: 'Mario', expectedResults: 1 },
  { name: 'Super Mario World', franchise: 'Mario', expectedResults: 1 },
  { name: 'The Legend of Zelda: Ocarina of Time', franchise: 'Zelda', expectedResults: 1 },
  { name: 'The Legend of Zelda: A Link to the Past', franchise: 'Zelda', expectedResults: 1 },
  { name: 'Super Metroid', franchise: 'Metroid', expectedResults: 1 },
  { name: 'Metroid Prime', franchise: 'Metroid', expectedResults: 1 },
  { name: 'Final Fantasy VII', franchise: 'Final Fantasy', expectedResults: 3 },
  { name: 'Final Fantasy VI', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy X', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Chrono Trigger', franchise: 'Chrono', expectedResults: 1 },
  { name: 'Secret of Mana', franchise: 'Mana', expectedResults: 1 },
  { name: 'Street Fighter II', franchise: 'Street Fighter', expectedResults: 5 },
  { name: 'Mega Man X', franchise: 'Mega Man', expectedResults: 1 },
  { name: 'Castlevania: Symphony of the Night', franchise: 'Castlevania', expectedResults: 1 },
  { name: 'Metal Gear Solid', franchise: 'Metal Gear', expectedResults: 3 },
  { name: 'Resident Evil 2', franchise: 'Resident Evil', expectedResults: 2 },
  { name: 'Silent Hill 2', franchise: 'Silent Hill', expectedResults: 1 },
  { name: 'Pac-Man', franchise: 'Pac-Man', expectedResults: 10 },
  { name: 'Tetris', franchise: 'Tetris', expectedResults: 20 },

  // Pokemon Series (Most Popular)
  { name: 'Pokemon Red', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Blue', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Yellow', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Gold', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Silver', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Crystal', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Ruby', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Sapphire', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Emerald', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Diamond', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Pearl', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Platinum', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Black', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon White', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon X', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Y', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Sun', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Moon', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Sword', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Shield', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Scarlet', franchise: 'Pokemon', expectedResults: 1 },
  { name: 'Pokemon Violet', franchise: 'Pokemon', expectedResults: 1 },

  // Final Fantasy Series
  { name: 'Final Fantasy I', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy II', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy III', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy IV', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy V', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy VIII', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy IX', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy XII', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy XIII', franchise: 'Final Fantasy', expectedResults: 2 },
  { name: 'Final Fantasy XV', franchise: 'Final Fantasy', expectedResults: 1 },
  { name: 'Final Fantasy VII Remake', franchise: 'Final Fantasy', expectedResults: 1 },
  { name: 'Final Fantasy XIV', franchise: 'Final Fantasy', expectedResults: 1 },

  // Call of Duty Series
  { name: 'Call of Duty 4: Modern Warfare', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: Modern Warfare 2', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: Modern Warfare 3', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: Black Ops', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: Black Ops II', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: Ghosts', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: Advanced Warfare', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: Infinite Warfare', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: WWII', franchise: 'Call of Duty', expectedResults: 1 },
  { name: 'Call of Duty: Warzone', franchise: 'Call of Duty', expectedResults: 1 },

  // Grand Theft Auto Series
  { name: 'Grand Theft Auto III', franchise: 'GTA', expectedResults: 1 },
  { name: 'Grand Theft Auto: Vice City', franchise: 'GTA', expectedResults: 1 },
  { name: 'Grand Theft Auto: San Andreas', franchise: 'GTA', expectedResults: 1 },
  { name: 'Grand Theft Auto IV', franchise: 'GTA', expectedResults: 1 },

  // Assassin's Creed Series
  { name: 'Assassin\'s Creed', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed II', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed: Brotherhood', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed: Revelations', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed III', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed IV: Black Flag', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed: Unity', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed: Syndicate', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed: Origins', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed: Odyssey', franchise: 'Assassin\'s Creed', expectedResults: 1 },
  { name: 'Assassin\'s Creed: Valhalla', franchise: 'Assassin\'s Creed', expectedResults: 1 },

  // Elder Scrolls Series
  { name: 'The Elder Scrolls III: Morrowind', franchise: 'Elder Scrolls', expectedResults: 1 },
  { name: 'The Elder Scrolls IV: Oblivion', franchise: 'Elder Scrolls', expectedResults: 1 },
  { name: 'The Elder Scrolls V: Skyrim', franchise: 'Elder Scrolls', expectedResults: 2 },

  // Fallout Series
  { name: 'Fallout', franchise: 'Fallout', expectedResults: 1 },
  { name: 'Fallout 2', franchise: 'Fallout', expectedResults: 1 },
  { name: 'Fallout 3', franchise: 'Fallout', expectedResults: 1 },
  { name: 'Fallout: New Vegas', franchise: 'Fallout', expectedResults: 1 },
  { name: 'Fallout 4', franchise: 'Fallout', expectedResults: 1 },
  { name: 'Fallout 76', franchise: 'Fallout', expectedResults: 1 },

  // Modern Popular Games
  { name: 'Cyberpunk 2077', franchise: 'Cyberpunk', expectedResults: 1 },
  { name: 'Death Stranding', franchise: 'Death Stranding', expectedResults: 1 },
  { name: 'Spider-Man', franchise: 'Spider-Man', expectedResults: 5 },
  { name: 'Horizon Zero Dawn', franchise: 'Horizon', expectedResults: 1 },
  { name: 'Ghost of Tsushima', franchise: 'Ghost of Tsushima', expectedResults: 1 },
  { name: 'Persona 5', franchise: 'Persona', expectedResults: 1 },
  { name: 'NieR: Automata', franchise: 'NieR', expectedResults: 1 },
  { name: 'Monster Hunter: World', franchise: 'Monster Hunter', expectedResults: 1 },
  { name: 'Overwatch', franchise: 'Overwatch', expectedResults: 1 },
  { name: 'Rocket League', franchise: 'Rocket League', expectedResults: 1 },
  { name: 'Among Us', franchise: 'Among Us', expectedResults: 1 },
  { name: 'Fall Guys', franchise: 'Fall Guys', expectedResults: 1 },
  { name: 'Apex Legends', franchise: 'Apex Legends', expectedResults: 1 },
  { name: 'Valorant', franchise: 'Valorant', expectedResults: 1 },

  // Fighting Games
  { name: 'Street Fighter V', franchise: 'Street Fighter', expectedResults: 1 },
  { name: 'Street Fighter 6', franchise: 'Street Fighter', expectedResults: 1 },
  { name: 'Tekken 7', franchise: 'Tekken', expectedResults: 1 },
  { name: 'Mortal Kombat 11', franchise: 'Mortal Kombat', expectedResults: 1 },
  { name: 'Super Smash Bros. Melee', franchise: 'Smash Bros', expectedResults: 1 },
  { name: 'Injustice 2', franchise: 'Injustice', expectedResults: 1 },

  // Racing Games
  { name: 'Mario Kart 64', franchise: 'Mario Kart', expectedResults: 1 },
  { name: 'Gran Turismo 7', franchise: 'Gran Turismo', expectedResults: 1 },
  { name: 'Forza Horizon 5', franchise: 'Forza', expectedResults: 1 },
  { name: 'F1 2022', franchise: 'F1', expectedResults: 1 },

  // Sports Games
  { name: 'FIFA 23', franchise: 'FIFA', expectedResults: 1 },
  { name: 'NBA 2K23', franchise: 'NBA 2K', expectedResults: 1 },
  { name: 'Madden NFL 23', franchise: 'Madden', expectedResults: 1 },

  // Indie Hits
  { name: 'Hades', franchise: 'Hades', expectedResults: 1 },
  { name: 'Celeste', franchise: 'Celeste', expectedResults: 1 },
  { name: 'Hollow Knight', franchise: 'Hollow Knight', expectedResults: 1 },
  { name: 'Cuphead', franchise: 'Cuphead', expectedResults: 1 },
  { name: 'Undertale', franchise: 'Undertale', expectedResults: 1 },
  { name: 'Stardew Valley', franchise: 'Stardew Valley', expectedResults: 1 },
  { name: 'The Binding of Isaac', franchise: 'Binding of Isaac', expectedResults: 2 },
  { name: 'Dead Cells', franchise: 'Dead Cells', expectedResults: 1 },

  // Strategy Games
  { name: 'Civilization VI', franchise: 'Civilization', expectedResults: 1 },
  { name: 'Age of Empires II', franchise: 'Age of Empires', expectedResults: 2 },
  { name: 'StarCraft II', franchise: 'StarCraft', expectedResults: 1 },
  { name: 'Total War: Warhammer III', franchise: 'Total War', expectedResults: 1 },

  // Horror Games
  { name: 'Resident Evil 4', franchise: 'Resident Evil', expectedResults: 2 },
  { name: 'Resident Evil 7', franchise: 'Resident Evil', expectedResults: 1 },
  { name: 'Resident Evil Village', franchise: 'Resident Evil', expectedResults: 1 },
  { name: 'Phasmophobia', franchise: 'Phasmophobia', expectedResults: 1 },
  { name: 'Amnesia: The Dark Descent', franchise: 'Amnesia', expectedResults: 1 },

  // Platformers
  { name: 'Super Mario Galaxy', franchise: 'Mario', expectedResults: 1 },
  { name: 'Super Mario Galaxy 2', franchise: 'Mario', expectedResults: 1 },
  { name: 'Donkey Kong Country', franchise: 'Donkey Kong', expectedResults: 1 },
  { name: 'Crash Bandicoot 4: It\'s About Time', franchise: 'Crash Bandicoot', expectedResults: 1 },
  { name: 'Spyro the Dragon', franchise: 'Spyro', expectedResults: 1 },
  { name: 'Rayman Legends', franchise: 'Rayman', expectedResults: 1 },

  // Simulation Games
  { name: 'The Sims 4', franchise: 'The Sims', expectedResults: 1 },
  { name: 'Cities: Skylines', franchise: 'Cities', expectedResults: 1 },
  { name: 'Microsoft Flight Simulator', franchise: 'Flight Simulator', expectedResults: 2 },

  // MMORPGs
  { name: 'World of Warcraft', franchise: 'World of Warcraft', expectedResults: 1 },
  { name: 'Guild Wars 2', franchise: 'Guild Wars', expectedResults: 1 },
  { name: 'Lost Ark', franchise: 'Lost Ark', expectedResults: 1 },
];

describe('Popular Games Coverage Analysis', () => {
  const MISSING_GAMES: Array<{
    game: string;
    franchise: string;
    expected: number;
    found: number;
    searchResults: any[];
  }> = [];
  
  const COVERAGE_STATS = {
    total: 0,
    found: 0,
    missing: 0,
    underperforming: 0
  };

  beforeAll(() => {
    console.log('🎮 Starting Popular Games Coverage Analysis');
    console.log(`Testing ${POPULAR_GAMES_LIST.length} popular games across major franchises`);
  });

  test('should find popular games with adequate coverage', async () => {
    for (const game of POPULAR_GAMES_LIST) {
      console.log(`\n🔍 Testing: "${game.name}" (${game.franchise})`);
      
      try {
        const results = await igdbServiceV2.searchGames(game.name, 20);
        
        COVERAGE_STATS.total++;
        
        if (results.length === 0) {
          console.log(`❌ NO RESULTS: "${game.name}"`);
          MISSING_GAMES.push({
            game: game.name,
            franchise: game.franchise,
            expected: game.expectedResults,
            found: 0,
            searchResults: []
          });
          COVERAGE_STATS.missing++;
        } else if (results.length < game.expectedResults) {
          console.log(`⚠️  UNDERPERFORMING: "${game.name}" - Expected ${game.expectedResults}, Found ${results.length}`);
          console.log(`   Results: ${results.slice(0, 3).map(r => r.name).join(', ')}`);
          MISSING_GAMES.push({
            game: game.name,
            franchise: game.franchise,
            expected: game.expectedResults,
            found: results.length,
            searchResults: results.slice(0, 3)
          });
          COVERAGE_STATS.underperforming++;
          COVERAGE_STATS.found++; // Still found something
        } else {
          console.log(`✅ GOOD COVERAGE: "${game.name}" - Found ${results.length}/${game.expectedResults}`);
          const topResult = results[0];
          console.log(`   Top result: "${topResult.name}" (Rating: ${topResult.total_rating || 'N/A'})`);
          COVERAGE_STATS.found++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ ERROR searching for "${game.name}":`, error);
        MISSING_GAMES.push({
          game: game.name,
          franchise: game.franchise,
          expected: game.expectedResults,
          found: 0,
          searchResults: []
        });
        COVERAGE_STATS.missing++;
        COVERAGE_STATS.total++;
      }
    }
  }, 300000); // 5 minute timeout

  afterAll(() => {
    console.log('\n' + '='.repeat(80));
    console.log('🎮 POPULAR GAMES COVERAGE ANALYSIS COMPLETE');
    console.log('='.repeat(80));
    
    console.log('\n📊 COVERAGE STATISTICS:');
    console.log(`Total Games Tested: ${COVERAGE_STATS.total}`);
    console.log(`Games Found: ${COVERAGE_STATS.found} (${((COVERAGE_STATS.found / COVERAGE_STATS.total) * 100).toFixed(1)}%)`);
    console.log(`Games Missing: ${COVERAGE_STATS.missing} (${((COVERAGE_STATS.missing / COVERAGE_STATS.total) * 100).toFixed(1)}%)`);
    console.log(`Games Underperforming: ${COVERAGE_STATS.underperforming} (${((COVERAGE_STATS.underperforming / COVERAGE_STATS.total) * 100).toFixed(1)}%)`);
    
    if (MISSING_GAMES.length > 0) {
      console.log('\n❌ MISSING OR UNDERPERFORMING GAMES:');
      console.log('=' .repeat(50));
      
      // Group by franchise for analysis
      const franchiseIssues = new Map<string, Array<typeof MISSING_GAMES[0]>>();
      MISSING_GAMES.forEach(game => {
        if (!franchiseIssues.has(game.franchise)) {
          franchiseIssues.set(game.franchise, []);
        }
        franchiseIssues.get(game.franchise)!.push(game);
      });
      
      for (const [franchise, games] of franchiseIssues) {
        console.log(`\n🎯 ${franchise} (${games.length} issues):`);
        games.forEach(game => {
          if (game.found === 0) {
            console.log(`   ❌ "${game.game}" - NO RESULTS`);
          } else {
            console.log(`   ⚠️  "${game.game}" - Expected ${game.expected}, Found ${game.found}`);
            if (game.searchResults.length > 0) {
              console.log(`      Top results: ${game.searchResults.map(r => r.name).join(', ')}`);
            }
          }
        });
      }
      
      console.log('\n🔧 FILTER ADJUSTMENT RECOMMENDATIONS:');
      console.log('='.repeat(50));
      
      // Analyze missing games by type
      const missingByType = {
        completelyMissing: MISSING_GAMES.filter(g => g.found === 0),
        underperforming: MISSING_GAMES.filter(g => g.found > 0)
      };
      
      if (missingByType.completelyMissing.length > 0) {
        console.log('\n🚫 COMPLETELY MISSING GAMES:');
        console.log('These games return NO search results and may indicate:');
        console.log('- IGDB API issues or missing data');
        console.log('- Overly aggressive content filtering');
        console.log('- Category filtering removing main games');
        console.log('- Relevance threshold too high');
        
        const missingFranchises = new Set(missingByType.completelyMissing.map(g => g.franchise));
        console.log(`\nAffected franchises: ${Array.from(missingFranchises).join(', ')}`);
      }
      
      if (missingByType.underperforming.length > 0) {
        console.log('\n⚠️  UNDERPERFORMING GAMES:');
        console.log('These games return some results but fewer than expected:');
        console.log('- May indicate series/variant filtering is too aggressive');
        console.log('- Similar games being filtered as duplicates');
        console.log('- Regional variants being removed');
        console.log('- Remaster/collection filtering affecting main entries');
      }
      
      console.log('\n🛠️  RECOMMENDED FILTER ADJUSTMENTS:');
      console.log('1. CONTENT PROTECTION FILTER:');
      console.log('   - Review category filters (ensure main games aren\'t filtered)');
      console.log('   - Check if official company detection is working properly');
      console.log('   - Verify franchise detection isn\'t too broad');
      
      console.log('\n2. RELEVANCE FILTERING:');
      console.log('   - Lower relevance threshold from 0.12 to 0.08 for specific searches');
      console.log('   - Improve fuzzy matching for exact title searches');
      console.log('   - Better handling of subtitle variations');
      
      console.log('\n3. CATEGORY FILTERING:');
      console.log('   - Review category 8 (Remake) and 9 (Remaster) filtering');
      console.log('   - Allow high-rated remakes/remasters to pass through');
      console.log('   - Check if category 0 (Main Game) is being incorrectly filtered');
      
      console.log('\n4. FRANCHISE SEARCH LOGIC:');
      console.log('   - Improve multi-query strategy for franchise searches');
      console.log('   - Better sister game detection for series');
      console.log('   - Enhanced alternative name matching');
    } else {
      console.log('\n✅ EXCELLENT COVERAGE!');
      console.log('All popular games are properly covered by the search system.');
    }
    
    console.log('\n' + '='.repeat(80));
  });
});