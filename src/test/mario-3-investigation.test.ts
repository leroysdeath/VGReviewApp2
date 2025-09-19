import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { gameFlagService } from '../services/gameFlagService';
import { supabase } from '../services/supabase';

describe('Super Mario Bros 3 Investigation', () => {
  const gameDataService = new GameDataServiceV2();
  const coordination = new AdvancedSearchCoordination();

  describe('Step 1: Database Existence Check', () => {
    test('should check if Super Mario Bros 3 exists in database', async () => {
      console.log('🔍 STEP 1: Checking database for Super Mario Bros 3...');
      
      try {
        // Check for various name variations
        const nameVariations = [
          'Super Mario Bros. 3',
          'Super Mario Bros 3',
          'Super Mario Brothers 3',
          'Mario Bros. 3',
          'Mario Bros 3'
        ];

        for (const name of nameVariations) {
          console.log(`\n📝 Searching for: "${name}"`);
          
          const { data, error } = await supabase
            .from('game')
            .select('id, name, greenlight_flag, redlight_flag, category, developer, publisher')
            .ilike('name', `%${name}%`)
            .limit(5);

          if (error) {
            console.error(`❌ Error searching for "${name}":`, error);
          } else if (data && data.length > 0) {
            console.log(`✅ Found ${data.length} matches for "${name}":`);
            data.forEach((game: any) => {
              console.log(`  - ID: ${game.id}, Name: "${game.name}"`);
              console.log(`    Green Flag: ${game.greenlight_flag}`);
              console.log(`    Red Flag: ${game.redlight_flag}`);
              console.log(`    Category: ${game.category}`);
              console.log(`    Developer: ${game.developer || 'Unknown'}`);
              console.log(`    Publisher: ${game.publisher || 'Unknown'}`);
              console.log('');
            });
          } else {
            console.log(`❌ No matches found for "${name}"`);
          }
        }

        // Also check for any Nintendo Mario games with "3" in the name
        console.log('\n🎮 Checking for any Nintendo Mario games with "3":');
        const { data: marioGames, error: marioError } = await supabase
          .from('game')
          .select('id, name, greenlight_flag, redlight_flag, category, developer, publisher')
          .ilike('name', '%mario%')
          .ilike('name', '%3%')
          .limit(10);

        if (marioError) {
          console.error('❌ Error searching Mario games:', marioError);
        } else if (marioGames && marioGames.length > 0) {
          console.log(`✅ Found ${marioGames.length} Mario games with "3":`);
          marioGames.forEach((game: any) => {
            console.log(`  - "${game.name}" (Green: ${game.greenlight_flag}, Red: ${game.redlight_flag})`);
          });
        } else {
          console.log('❌ No Mario games with "3" found');
        }

      } catch (error) {
        console.error('💥 Database check failed:', error);
        throw error;
      }
    }, 30000);

    test('should check green-flagged games in database', async () => {
      console.log('\n🟢 CHECKING ALL GREEN-FLAGGED GAMES:');
      
      try {
        const { data, error } = await supabase
          .from('game')
          .select('id, name, greenlight_flag, redlight_flag, category, developer')
          .eq('greenlight_flag', true)
          .limit(20);

        if (error) {
          console.error('❌ Error fetching green-flagged games:', error);
        } else if (data && data.length > 0) {
          console.log(`✅ Found ${data.length} green-flagged games:`);
          data.forEach((game: any) => {
            console.log(`  - "${game.name}" (ID: ${game.id}, Cat: ${game.category})`);
          });
        } else {
          console.log('❌ No green-flagged games found in database');
        }
      } catch (error) {
        console.error('💥 Green flag check failed:', error);
      }
    }, 30000);
  });

  describe('Step 2: Direct Green Flag Search Test', () => {
    test('should test searchGreenFlaggedGames method directly', async () => {
      console.log('\n🔍 STEP 2: Testing direct green flag search...');
      
      const searchQueries = ['mario', 'super mario', 'mario bros', 'mario 3', 'super mario bros'];
      
      for (const query of searchQueries) {
        console.log(`\n📝 Green flag search for: "${query}"`);
        
        try {
          // Access the private method for testing
          const searchMethod = (gameDataService as any).searchGreenFlaggedGames;
          if (typeof searchMethod === 'function') {
            const results = await searchMethod.call(gameDataService, query);
            
            console.log(`✅ Green flag search returned ${results.length} results`);
            if (results.length > 0) {
              results.forEach((game: any) => {
                console.log(`  - "${game.name}" (ID: ${game.id})`);
                console.log(`    Green Flag: ${game.greenlight_flag}`);
                console.log(`    Red Flag: ${game.redlight_flag}`);
              });
            } else {
              console.log('❌ No results from green flag search');
            }
          } else {
            console.error('❌ searchGreenFlaggedGames method not found');
          }
        } catch (error) {
          console.error(`💥 Green flag search failed for "${query}":`, error);
        }
      }
    }, 60000);
  });

  describe('Step 3: Full Search Flow Test', () => {
    test('should test complete search flow with detailed logging', async () => {
      console.log('\n🔍 STEP 3: Testing complete search flow...');
      
      const searchQuery = 'mario';
      
      try {
        console.log(`\n📝 Starting full search for: "${searchQuery}"`);
        console.log('🔄 This will use DEBUG_GAME_DATA = true for detailed logging');
        
        // Test GameDataServiceV2 directly
        console.log('\n--- GameDataServiceV2.searchGames() ---');
        const gameDataResults = await gameDataService.searchGames(searchQuery);
        console.log(`GameDataServiceV2 returned ${gameDataResults.length} results`);
        
        // Test AdvancedSearchCoordination
        console.log('\n--- AdvancedSearchCoordination.coordinatedSearch() ---');
        const coordinationResults = await coordination.coordinatedSearch(searchQuery, {
          maxResults: 20,
          includeMetrics: true
        });
        console.log(`AdvancedSearchCoordination returned ${coordinationResults.results.length} results`);
        
        // Look for any Mario games with "3" in the results
        const allResults = [...gameDataResults, ...coordinationResults.results];
        const mario3Games = allResults.filter(game => 
          game.name.toLowerCase().includes('mario') && 
          (game.name.toLowerCase().includes('3') || game.name.toLowerCase().includes('bros'))
        );
        
        console.log(`\n🎮 Mario games with "3" or "bros" in results: ${mario3Games.length}`);
        mario3Games.forEach(game => {
          console.log(`  - "${game.name}"`);
          console.log(`    Green Flag: ${(game as any).greenlight_flag}`);
          console.log(`    Red Flag: ${(game as any).redlight_flag}`);
          console.log(`    Source: ${(game as any).source || 'database'}`);
        });
        
      } catch (error) {
        console.error('💥 Full search flow failed:', error);
        throw error;
      }
    }, 120000); // 2 minute timeout for comprehensive search
  });

  describe('Step 4: Filter Bypass Verification', () => {
    test('should verify filters are bypassed for green flags', async () => {
      console.log('\n🔍 STEP 4: Testing filter bypass...');
      
      // Create test games that would normally be filtered
      const testGames = [
        {
          id: 999991,
          name: 'Test Green Bundle',
          greenlight_flag: true,
          redlight_flag: false,
          category: 3, // Bundle - normally filtered
          developer: 'Nintendo',
          publisher: 'Nintendo'
        },
        {
          id: 999992,
          name: 'Test Green Port',
          greenlight_flag: true,
          redlight_flag: false,
          category: 11, // Port - normally filtered
          developer: 'Nintendo', 
          publisher: 'Nintendo'
        },
        {
          id: 999993,
          name: 'Test Green E-Reader',
          greenlight_flag: true,
          redlight_flag: false,
          category: 0,
          developer: 'Nintendo',
          publisher: 'Nintendo'
        }
      ];

      const { filterProtectedContent, filterFanGamesAndEReaderContent } = await import('../utils/contentProtectionFilter');

      testGames.forEach(game => {
        console.log(`\n📝 Testing filter bypass for: "${game.name}"`);
        console.log(`  Category: ${game.category}, Green Flag: ${game.greenlight_flag}`);
        
        const contentFiltered = filterProtectedContent([game]);
        const fanGameFiltered = filterFanGamesAndEReaderContent([game]);
        
        console.log(`  Passes Content Filter: ${contentFiltered.length > 0}`);
        console.log(`  Passes Fan Game Filter: ${fanGameFiltered.length > 0}`);
        console.log(`  Overall Result: ${contentFiltered.length > 0 && fanGameFiltered.length > 0 ? '✅ VISIBLE' : '❌ FILTERED'}`);
      });
    });
  });

  describe('Step 5: Diagnostic Summary', () => {
    test('should provide comprehensive diagnostic summary', () => {
      console.log('\n📋 DIAGNOSTIC SUMMARY');
      console.log('====================');
      
      const diagnosticPlan = {
        issues_to_check: [
          {
            issue: 'Game does not exist in database',
            check: 'Step 1 database existence check',
            solution: 'Import game data or add manually'
          },
          {
            issue: 'Game exists but greenlight_flag is false',
            check: 'Step 1 flag status check',
            solution: 'Set greenlight_flag = true in admin tool'
          },
          {
            issue: 'Green flag search method not working',
            check: 'Step 2 direct method test',
            solution: 'Fix searchGreenFlaggedGames implementation'
          },
          {
            issue: 'Search timeout preventing results',
            check: 'Step 3 console logs for timeout errors',
            solution: 'Increase timeout or optimize query'
          },
          {
            issue: 'Filters not respecting green flags',
            check: 'Step 4 filter bypass verification',
            solution: 'Fix filter override logic'
          },
          {
            issue: 'Name mismatch in search queries',
            check: 'Step 1 name variation checks',
            solution: 'Add name aliases or improve search matching'
          }
        ],
        next_steps: [
          'Review console logs from this test for detailed search flow',
          'Check if any timeout/abort errors appear in logs',
          'Verify exact game name and flag status in database',
          'Test with simpler search queries first',
          'Enable DEBUG_FILTERING to see filter decisions'
        ]
      };

      console.log('\n🔍 Issues to investigate:');
      diagnosticPlan.issues_to_check.forEach((item, i) => {
        console.log(`${i + 1}. ${item.issue}`);
        console.log(`   Check: ${item.check}`);
        console.log(`   Solution: ${item.solution}`);
        console.log('');
      });

      console.log('📝 Next steps:');
      diagnosticPlan.next_steps.forEach((step, i) => {
        console.log(`${i + 1}. ${step}`);
      });

      expect(diagnosticPlan.issues_to_check.length).toBeGreaterThan(0);
    });
  });
});