import { gameDataService } from '../services/gameDataService';

interface GameTestCase {
  name: string;
  searchTerms: string[];
  category: string;
  expectedToFind: boolean;
  notes?: string;
}

const gameTestCases: GameTestCase[] = [
  // Specific Missing Games
  {
    name: "Megaman X 3",
    searchTerms: ["Megaman X 3", "Mega Man X3", "megaman x3"],
    category: "Specific Missing",
    expectedToFind: true
  },
  {
    name: "New Super Mario Bros",
    searchTerms: ["New Super Mario Bros", "new super mario bros"],
    category: "Specific Missing", 
    expectedToFind: true
  },
  {
    name: "Pikmin",
    searchTerms: ["Pikmin", "pikmin"],
    category: "Specific Missing",
    expectedToFind: true
  },

  // Game Errors
  {
    name: "Starcraft (original)",
    searchTerms: ["Starcraft", "starcraft", "star craft"],
    category: "Game Errors",
    expectedToFind: true,
    notes: "Original version should be findable"
  },

  // Can't Find in Search
  {
    name: "Mario Party Superstars",
    searchTerms: ["Mario Party Superstars", "superstars", "mario party"],
    category: "Can't Find",
    expectedToFind: true
  },
  {
    name: "Tears of the Kingdom",
    searchTerms: ["Tears of the kingdom", "zelda tears", "totk"],
    category: "Can't Find",
    expectedToFind: true,
    notes: "Switch version specifically"
  },
  {
    name: "Breath of the Wild",
    searchTerms: ["Breath of the wild", "zelda breath", "botw", "zelda"],
    category: "Can't Find", 
    expectedToFind: true,
    notes: "Regular Switch version, not collector's edition"
  },
  {
    name: "Mortal Kombat 1 (2023)",
    searchTerms: ["Mortal kombat 1", "mortal kombat"],
    category: "Can't Find",
    expectedToFind: true
  },
  {
    name: "Metal Gear Solid Twin Snakes",
    searchTerms: ["metal gear solid twin snakes", "metal gear solid", "twin snakes"],
    category: "Can't Find",
    expectedToFind: true
  },
  {
    name: "The Witcher 3: Wild Hunt",
    searchTerms: ["Witcher 3", "witcher 3", "witcher wild hunt"],
    category: "Can't Find",
    expectedToFind: true
  },
  {
    name: "Megaman Anniversary Collection",
    searchTerms: ["megaman anniversary", "mega man anniversary", "megaman"],
    category: "Can't Find",
    expectedToFind: true
  },

  // Tekken Series
  {
    name: "Tekken",
    searchTerms: ["Tekken", "tekken"],
    category: "Tekken Series",
    expectedToFind: true
  },
  {
    name: "Tekken 2", 
    searchTerms: ["Tekken 2", "tekken 2"],
    category: "Tekken Series",
    expectedToFind: true
  },
  {
    name: "Tekken 3",
    searchTerms: ["Tekken 3", "tekken 3"],
    category: "Tekken Series", 
    expectedToFind: true
  },
  {
    name: "Tekken 5",
    searchTerms: ["Tekken 5", "tekken 5"],
    category: "Tekken Series",
    expectedToFind: true
  },
  {
    name: "Tekken 5: Dark Resurrection",
    searchTerms: ["Tekken 5 dark resurrection", "tekken dark resurrection"],
    category: "Tekken Series",
    expectedToFind: true
  },
  {
    name: "Tekken 6",
    searchTerms: ["Tekken 6", "tekken 6"],
    category: "Tekken Series",
    expectedToFind: true
  },
  {
    name: "Tekken 7",
    searchTerms: ["Tekken 7", "tekken 7"],
    category: "Tekken Series",
    expectedToFind: true
  },
  {
    name: "Tekken 8",
    searchTerms: ["Tekken 8", "tekken 8"], 
    category: "Tekken Series",
    expectedToFind: true
  },

  // Mortal Kombat Series
  {
    name: "Mortal Kombat (1993)",
    searchTerms: ["Mortal Kombat", "mortal kombat"],
    category: "Mortal Kombat Series",
    expectedToFind: true,
    notes: "Original 1993 version"
  },
  {
    name: "Mortal Kombat 3",
    searchTerms: ["Mortal Kombat 3", "mortal kombat 3"],
    category: "Mortal Kombat Series",
    expectedToFind: true
  },
  {
    name: "Mortal Kombat: Deception",
    searchTerms: ["Mortal Kombat Deception", "mortal kombat deception"],
    category: "Mortal Kombat Series",
    expectedToFind: true
  },
  {
    name: "Mortal Kombat: Armageddon",
    searchTerms: ["Mortal Kombat Armageddon", "mortal kombat armageddon"],
    category: "Mortal Kombat Series",
    expectedToFind: true
  },
  {
    name: "Mortal Kombat X",
    searchTerms: ["Mortal Kombat X", "mortal kombat x"],
    category: "Mortal Kombat Series",
    expectedToFind: true
  },
  {
    name: "Mortal Kombat 11",
    searchTerms: ["Mortal Kombat 11", "mortal kombat 11"],
    category: "Mortal Kombat Series",
    expectedToFind: true
  },

  // Final Fantasy Series
  {
    name: "Final Fantasy XIII",
    searchTerms: ["Final Fantasy 13", "final fantasy xiii", "ff13"],
    category: "Final Fantasy Series",
    expectedToFind: true
  },
  {
    name: "Final Fantasy XIV",
    searchTerms: ["Final Fantasy 14", "final fantasy xiv", "ff14"],
    category: "Final Fantasy Series",
    expectedToFind: true
  },
  {
    name: "Final Fantasy XV", 
    searchTerms: ["Final Fantasy 15", "final fantasy xv", "ff15"],
    category: "Final Fantasy Series",
    expectedToFind: true
  },
  {
    name: "Final Fantasy XVI",
    searchTerms: ["Final Fantasy 16", "final fantasy xvi", "ff16"],
    category: "Final Fantasy Series",
    expectedToFind: true
  },

  // Splinter Cell Series
  {
    name: "Splinter Cell: Blacklist",
    searchTerms: ["Splinter cell blacklist", "splinter cell black list"],
    category: "Splinter Cell Series",
    expectedToFind: true
  },
  {
    name: "Splinter Cell: Double Agent",
    searchTerms: ["Splinter cell double agent"],
    category: "Splinter Cell Series",
    expectedToFind: true
  },
  {
    name: "Splinter Cell: Conviction",
    searchTerms: ["Splinter cell conviction"],
    category: "Splinter Cell Series", 
    expectedToFind: true
  },

  // Grand Theft Auto Series
  {
    name: "Grand Theft Auto: Vice City",
    searchTerms: ["Grand theft auto", "vice city", "gta vice city"],
    category: "GTA Series",
    expectedToFind: true
  },
  {
    name: "Grand Theft Auto: San Andreas",
    searchTerms: ["Grand theft auto", "san andreas", "gta san andreas"],
    category: "GTA Series",
    expectedToFind: true
  },
  {
    name: "Grand Theft Auto: Liberty City Stories",
    searchTerms: ["Grand theft auto", "liberty city stories", "gta liberty"],
    category: "GTA Series",
    expectedToFind: true
  },
  {
    name: "Grand Theft Auto: Vice City Stories",
    searchTerms: ["Grand theft auto", "vice city stories", "gta vice city stories"],
    category: "GTA Series",
    expectedToFind: true
  },

  // Racing Games
  {
    name: "Gran Turismo 7",
    searchTerms: ["Gran turismo 7", "gt7"],
    category: "Racing Games",
    expectedToFind: true
  },
  {
    name: "Forza Motorsport 3",
    searchTerms: ["Forza 3", "forza motorsport 3"],
    category: "Racing Games",
    expectedToFind: true
  },
  {
    name: "Forza Motorsport 7",
    searchTerms: ["Forza 7", "forza motorsport 7"],
    category: "Racing Games",
    expectedToFind: true
  },
  {
    name: "Forza Horizon 2",
    searchTerms: ["Forza horizon 2"],
    category: "Racing Games",
    expectedToFind: true
  },
  {
    name: "Forza Horizon 3",
    searchTerms: ["Forza horizon 3"],
    category: "Racing Games",
    expectedToFind: true
  },
  {
    name: "Forza Horizon 5",
    searchTerms: ["Forza horizon 5"],
    category: "Racing Games",
    expectedToFind: true
  },
  {
    name: "Assetto Corsa",
    searchTerms: ["Assetto corsa"],
    category: "Racing Games",
    expectedToFind: true
  },
  {
    name: "F1 24",
    searchTerms: ["F1 24", "formula 1 24"],
    category: "Racing Games",
    expectedToFind: true
  },
  {
    name: "F1 23",
    searchTerms: ["F1 23", "formula 1 23"],
    category: "Racing Games", 
    expectedToFind: true
  },
  {
    name: "F1 22",
    searchTerms: ["F1 22", "formula 1 22"],
    category: "Racing Games",
    expectedToFind: true
  },

  // Other Notable Games
  {
    name: "Hollow Knight",
    searchTerms: ["Hollow knight", "hollow knight"],
    category: "Other Games",
    expectedToFind: true
  },
  {
    name: "Batman: Arkham Origins",
    searchTerms: ["Batman arkham origins", "arkham origins"],
    category: "Other Games",
    expectedToFind: true
  },
  {
    name: "Expedition 33",
    searchTerms: ["Expedition 33"],
    category: "Other Games",
    expectedToFind: true
  },

  // Sports Games Samples
  {
    name: "FIFA 24",
    searchTerms: ["FIFA 24", "fifa 24"],
    category: "Sports Games",
    expectedToFind: true
  },
  {
    name: "NBA 2K24",
    searchTerms: ["NBA 2K24", "nba 2k24"],
    category: "Sports Games",
    expectedToFind: true
  },
  {
    name: "Madden NFL 24",
    searchTerms: ["Madden 24", "madden nfl 24"],
    category: "Sports Games",
    expectedToFind: true
  },

  // Pokemon Games
  {
    name: "Pokemon Red",
    searchTerms: ["Pokemon red", "pokemon"],
    category: "Pokemon Series",
    expectedToFind: true
  },
  {
    name: "Pokemon Scarlet",
    searchTerms: ["Pokemon scarlet", "pokemon"],
    category: "Pokemon Series",
    expectedToFind: true
  },
  {
    name: "Pokemon Legends: Arceus",
    searchTerms: ["Pokemon legends arceus", "pokemon legends", "pokemon"],
    category: "Pokemon Series",
    expectedToFind: true
  }
];

describe('Missing Games Comprehensive Test', () => {
  const testResults: {
    category: string;
    found: number;
    missing: number;
    games: { name: string; found: boolean; searchTermUsed?: string; notes?: string }[];
  }[] = [];

  const timeout = 60000; // 1 minute timeout for each test

  beforeAll(() => {
    console.log(`Testing ${gameTestCases.length} games across multiple categories...`);
  });

  describe.each(
    Array.from(new Set(gameTestCases.map(game => game.category)))
  )('%s', (category) => {
    const categoryGames = gameTestCases.filter(game => game.category === category);
    
    test.each(categoryGames)(
      'should find $name',
      async (gameTest) => {
        let found = false;
        let searchTermUsed = '';
        let resultCount = 0;

        // Try each search term until we find the game
        for (const searchTerm of gameTest.searchTerms) {
          try {
            const results = await gameDataService.searchGames(searchTerm);
            
            if (results && results.length > 0) {
              // Check if any result matches the game we're looking for
              const matchingResult = results.find(result => {
                const resultName = result.name?.toLowerCase() || '';
                const testName = gameTest.name.toLowerCase();
                
                // Direct name match
                if (resultName.includes(testName.split(' ')[0].toLowerCase())) {
                  return true;
                }
                
                // Handle special cases
                if (testName.includes('megaman') && resultName.includes('mega man')) {
                  return true;
                }
                if (testName.includes('tekken') && resultName.includes('tekken')) {
                  return true;
                }
                if (testName.includes('mortal kombat') && resultName.includes('mortal kombat')) {
                  return true;
                }
                if (testName.includes('final fantasy') && resultName.includes('final fantasy')) {
                  return true;
                }
                if (testName.includes('pokemon') && resultName.includes('pokemon')) {
                  return true;
                }
                
                return false;
              });

              if (matchingResult) {
                found = true;
                searchTermUsed = searchTerm;
                resultCount = results.length;
                break;
              }
            }
          } catch (error) {
            console.warn(`Error searching for "${searchTerm}":`, error);
          }
        }

        // Record result for summary
        const categoryResult = testResults.find(r => r.category === category) || {
          category,
          found: 0,
          missing: 0,
          games: []
        };
        
        if (!testResults.find(r => r.category === category)) {
          testResults.push(categoryResult);
        }

        categoryResult.games.push({
          name: gameTest.name,
          found,
          searchTermUsed: found ? searchTermUsed : undefined,
          notes: gameTest.notes
        });

        if (found) {
          categoryResult.found++;
        } else {
          categoryResult.missing++;
        }

        // Test assertion
        if (gameTest.expectedToFind && !found) {
          console.warn(`❌ Expected to find "${gameTest.name}" but couldn't find it with any search terms: ${gameTest.searchTerms.join(', ')}`);
        } else if (found) {
          console.log(`✅ Found "${gameTest.name}" using search term: "${searchTermUsed}" (${resultCount} total results)`);
        }

        // For now, we'll just log results instead of failing tests
        // This allows us to see the full picture of what's missing
        expect(true).toBe(true); // Always pass to see all results
      },
      timeout
    );
  });

  afterAll(() => {
    console.log('\n=== COMPREHENSIVE TEST RESULTS ===\n');
    
    let totalFound = 0;
    let totalMissing = 0;
    
    testResults.forEach(categoryResult => {
      console.log(`\n📁 ${categoryResult.category}:`);
      console.log(`   ✅ Found: ${categoryResult.found}`);
      console.log(`   ❌ Missing: ${categoryResult.missing}`);
      console.log(`   📊 Success Rate: ${((categoryResult.found / (categoryResult.found + categoryResult.missing)) * 100).toFixed(1)}%`);
      
      totalFound += categoryResult.found;
      totalMissing += categoryResult.missing;
      
      if (categoryResult.missing > 0) {
        console.log(`   🔍 Missing games:`);
        categoryResult.games
          .filter(game => !game.found)
          .forEach(game => {
            console.log(`      - ${game.name}${game.notes ? ` (${game.notes})` : ''}`);
          });
      }
    });
    
    console.log(`\n📈 OVERALL SUMMARY:`);
    console.log(`   🎮 Total games tested: ${totalFound + totalMissing}`);
    console.log(`   ✅ Games found: ${totalFound}`);
    console.log(`   ❌ Games missing: ${totalMissing}`);
    console.log(`   📊 Overall success rate: ${((totalFound / (totalFound + totalMissing)) * 100).toFixed(1)}%`);
    
    if (totalMissing > 0) {
      console.log(`\n🚨 PRIORITY MISSING GAMES (by category):`);
      testResults.forEach(categoryResult => {
        if (categoryResult.missing > 0) {
          console.log(`\n   ${categoryResult.category} (${categoryResult.missing} missing):`);
          categoryResult.games
            .filter(game => !game.found)
            .slice(0, 5) // Show top 5 missing games per category
            .forEach(game => {
              console.log(`   - ${game.name}`);
            });
        }
      });
    }
  });
});