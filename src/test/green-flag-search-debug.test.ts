import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import { filterProtectedContent, filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';

describe('Green Flag Search Debug', () => {
  describe('Content Filter Verification', () => {
    test('filterProtectedContent should preserve green-flagged games', () => {
      const testGames = [
        {
          id: 1,
          name: 'Super Mario Bros. 3',
          greenlight_flag: true,
          redlight_flag: false,
          category: 0, // Main game
          developer: 'Nintendo',
          publisher: 'Nintendo'
        },
        {
          id: 2,
          name: 'Some Fan Game',
          greenlight_flag: false,
          redlight_flag: false,
          category: 5, // Mod - should be filtered
          developer: 'Fan Dev',
          publisher: 'Independent'
        },
        {
          id: 3,
          name: 'Another Green Game',
          greenlight_flag: true,
          redlight_flag: false,
          category: 11, // Port - normally filtered but green flag should override
          developer: 'Test Dev',
          publisher: 'Test Pub'
        }
      ];

      const filtered = filterProtectedContent(testGames);
      
      console.log('Before filtering:', testGames.length, 'games');
      console.log('After filtering:', filtered.length, 'games');
      
      // Should keep green-flagged games regardless of category
      const smb3 = filtered.find(g => g.name === 'Super Mario Bros. 3');
      const greenPort = filtered.find(g => g.name === 'Another Green Game');
      const fanGame = filtered.find(g => g.name === 'Some Fan Game');
      
      expect(smb3).toBeDefined();
      expect(greenPort).toBeDefined(); // Green flag should override port filter
      expect(fanGame).toBeUndefined(); // Should be filtered (mod category, not green-flagged)
      
      console.log('✅ Green-flagged games preserved by filterProtectedContent');
    });

    test('filterFanGamesAndEReaderContent should preserve green-flagged games', () => {
      const testGames = [
        {
          id: 1,
          name: 'Super Mario Bros. 3',
          greenlight_flag: true,
          redlight_flag: false,
          developer: 'Nintendo',
          publisher: 'Nintendo'
        },
        {
          id: 2,
          name: 'Mario Party-e',
          greenlight_flag: false,
          redlight_flag: false,
          developer: 'Nintendo',
          publisher: 'Nintendo'
        },
        {
          id: 3,
          name: 'Pokemon-e Green Version',
          greenlight_flag: true,
          redlight_flag: false,
          developer: 'Nintendo',
          publisher: 'Nintendo'
        }
      ];

      const filtered = filterFanGamesAndEReaderContent(testGames);
      
      console.log('E-reader filter - Before:', testGames.length, 'After:', filtered.length);
      
      const smb3 = filtered.find(g => g.name === 'Super Mario Bros. 3');
      const marioPartyE = filtered.find(g => g.name === 'Mario Party-e');
      const pokemonE = filtered.find(g => g.name === 'Pokemon-e Green Version');
      
      expect(smb3).toBeDefined();
      expect(marioPartyE).toBeUndefined(); // Should be filtered (e-reader)
      expect(pokemonE).toBeDefined(); // Green flag should override e-reader filter
      
      console.log('✅ Green-flagged games preserved by filterFanGamesAndEReaderContent');
    });
  });

  describe('Database Query Verification', () => {
    test('should verify green flag database structure', () => {
      // This test documents what the green flag query should be doing
      const expectedQuery = `
        SELECT * FROM game 
        WHERE greenlight_flag = true 
        AND name ILIKE '%mario%'
        LIMIT 5
      `;
      
      console.log('Expected green flag query:', expectedQuery);
      
      // Verify that the GameDataServiceV2 has the method
      const gameService = new GameDataServiceV2();
      const hasMethod = typeof (gameService as any).searchGreenFlaggedGames === 'function';
      
      expect(hasMethod).toBe(true);
      console.log('✅ searchGreenFlaggedGames method exists');
    });

    test('should verify green flag scoring boost', () => {
      const gameService = new GameDataServiceV2();
      
      const normalGame = {
        id: 1,
        name: 'Mario Party',
        greenlight_flag: false,
        total_rating: 85,
        rating_count: 100,
        igdb_rating: 85,
        totalUserRatings: 10,
        averageUserRating: 4.0
      };
      
      const greenGame = {
        id: 2,
        name: 'Super Mario Bros. 3',
        greenlight_flag: true,
        total_rating: 85,
        rating_count: 100,
        igdb_rating: 85,
        totalUserRatings: 10,
        averageUserRating: 4.0
      };
      
      const calculateScore = (gameService as any).calculateRelevanceScore.bind(gameService);
      
      const normalScore = calculateScore(normalGame, 'mario');
      const greenScore = calculateScore(greenGame, 'mario');
      
      console.log('Normal game score:', normalScore);
      console.log('Green game score:', greenScore);
      console.log('Boost amount:', greenScore - normalScore);
      
      expect(greenScore).toBeGreaterThan(normalScore);
      expect(greenScore - normalScore).toBeGreaterThan(140); // Should be ~150
      
      console.log('✅ Green flag scoring boost working');
    });
  });

  describe('Search Flow Simulation', () => {
    test('should simulate the complete search flow', () => {
      // Simulate what happens during a search
      console.log('🔍 Simulating search flow for "mario"...');
      
      // Step 1: Database search (our green flag search should happen here)
      console.log('1. Database search with green flag priority');
      console.log('   - searchGreenFlaggedGames("mario") called');
      console.log('   - searchByName("mario") called in parallel');
      console.log('   - Results merged with green flag games first');
      
      // Step 2: Advanced coordination (this calls our service)
      console.log('2. Advanced Search Coordination');
      console.log('   - coordinatedSearch() calls gameDataService.searchGames()');
      
      // Step 3: Content filtering (this might filter out our game!)
      console.log('3. Content Protection Filtering');
      console.log('   - filterProtectedContent() checks greenlight_flag');
      console.log('   - filterFanGamesAndEReaderContent() checks greenlight_flag');
      
      // Step 4: Result display
      console.log('4. Results displayed to user');
      
      // The issue might be:
      const possibleIssues = [
        'Green flag search timing out before finding results',
        'Game not actually in database with greenlight_flag = true',
        'Other filtering happening after content protection',
        'Search query not matching the exact name in database',
        'Database connection issues in production vs test environment'
      ];
      
      console.log('🔍 Possible issues:');
      possibleIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
      
      expect(possibleIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Debug Information', () => {
    test('should provide debugging steps', () => {
      const debugSteps = {
        step1: 'Enable DEBUG_GAME_DATA in gameDataServiceV2.ts to see search logs',
        step2: 'Enable DEBUG_FILTERING in contentProtectionFilter.ts to see filter logs',
        step3: 'Check if Super Mario Bros 3 actually exists in database',
        step4: 'Verify the exact name spelling and greenlight_flag value',
        step5: 'Check network timeouts and database connection',
        step6: 'Test with simpler queries like just "mario"'
      };
      
      console.log('🐛 Debug Steps:');
      Object.entries(debugSteps).forEach(([step, description]) => {
        console.log(`${step}: ${description}`);
      });
      
      const enableDebugging = `
        // To enable debugging, set these to true:
        // In gameDataServiceV2.ts:
        const DEBUG_GAME_DATA = true;
        
        // In contentProtectionFilter.ts:
        const DEBUG_FILTERING = true;
      `;
      
      console.log('🔧 Enable debugging:', enableDebugging);
      
      expect(debugSteps.step1).toBeTruthy();
    });
  });
});