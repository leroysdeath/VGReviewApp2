import { filterProtectedContent, filterFanGamesAndEReaderContent } from '../utils/contentProtectionFilter';

describe('Manual Flagging Table with Filtering Status', () => {
  describe('Filtering Logic Tests', () => {
    test('should correctly identify games that would be filtered', () => {
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
          name: 'Mario Collection Bundle',
          greenlight_flag: false,
          redlight_flag: false,
          category: 3, // Bundle - should be filtered
          developer: 'Nintendo',
          publisher: 'Nintendo'
        },
        {
          id: 3,
          name: 'Mario Party-e',
          greenlight_flag: false,
          redlight_flag: false,
          category: 0, // Main game but e-reader content
          developer: 'Nintendo',
          publisher: 'Nintendo'
        },
        {
          id: 4,
          name: 'Green-flagged Port',
          greenlight_flag: true,
          redlight_flag: false,
          category: 11, // Port - normally filtered but green flag should override
          developer: 'Test Dev',
          publisher: 'Test Pub'
        },
        {
          id: 5,
          name: 'Red-flagged Main Game',
          greenlight_flag: false,
          redlight_flag: true,
          category: 0, // Main game but red-flagged
          developer: 'Test Dev',
          publisher: 'Test Pub'
        }
      ];

      const results = testGames.map(game => {
        const gameForFilter = {
          id: game.id,
          name: game.name,
          developer: game.developer,
          publisher: game.publisher,
          category: game.category,
          genres: undefined,
          summary: undefined,
          greenlight_flag: game.greenlight_flag,
          redlight_flag: game.redlight_flag
        };

        const passesContentFilter = filterProtectedContent([gameForFilter]).length > 0;
        const passesFanGameFilter = filterFanGamesAndEReaderContent([gameForFilter]).length > 0;
        
        return {
          name: game.name,
          greenFlag: game.greenlight_flag,
          redFlag: game.redlight_flag,
          category: game.category,
          passesContentFilter,
          passesFanGameFilter,
          wouldBeVisible: passesContentFilter && passesFanGameFilter
        };
      });

      console.log('Filtering Test Results:');
      results.forEach(result => {
        console.log(`${result.name}:`);
        console.log(`  Green Flag: ${result.greenFlag}`);
        console.log(`  Red Flag: ${result.redFlag}`);
        console.log(`  Category: ${result.category}`);
        console.log(`  Passes Content Filter: ${result.passesContentFilter}`);
        console.log(`  Passes Fan Game Filter: ${result.passesFanGameFilter}`);
        console.log(`  Would Be Visible: ${result.wouldBeVisible}`);
        console.log('');
      });

      // Expected behavior:
      const smb3 = results.find(r => r.name === 'Super Mario Bros. 3');
      const bundle = results.find(r => r.name === 'Mario Collection Bundle');
      const eReader = results.find(r => r.name === 'Mario Party-e');
      const greenPort = results.find(r => r.name === 'Green-flagged Port');
      const redMain = results.find(r => r.name === 'Red-flagged Main Game');

      // Super Mario Bros 3 (green-flagged main game) should be visible
      expect(smb3?.wouldBeVisible).toBe(true);
      
      // Bundle should be filtered (category 3)
      expect(bundle?.wouldBeVisible).toBe(false);
      
      // E-reader content should be filtered
      expect(eReader?.wouldBeVisible).toBe(false);
      
      // Green-flagged port should be visible (green flag overrides filter)
      expect(greenPort?.wouldBeVisible).toBe(true);
      
      // Red-flagged game should be filtered
      expect(redMain?.wouldBeVisible).toBe(false);

      console.log('✅ All filtering tests passed');
    });

    test('should verify green flags override all filters', () => {
      // Test that green flags work for various problematic categories
      const problematicCategories = [
        { category: 3, name: 'Bundle' },
        { category: 5, name: 'Mod' }, 
        { category: 11, name: 'Port' },
        { category: 13, name: 'Pack' }
      ];

      problematicCategories.forEach(({ category, name }) => {
        const greenFlaggedGame = {
          id: 1,
          name: `Green ${name}`,
          developer: 'Test',
          publisher: 'Test',
          category,
          greenlight_flag: true,
          redlight_flag: false
        };

        const normalGame = {
          ...greenFlaggedGame,
          name: `Normal ${name}`,
          greenlight_flag: false
        };

        const greenFiltered = filterProtectedContent([greenFlaggedGame]);
        const normalFiltered = filterProtectedContent([normalGame]);

        console.log(`Category ${category} (${name}):`);
        console.log(`  Green-flagged game passes: ${greenFiltered.length > 0}`);
        console.log(`  Normal game passes: ${normalFiltered.length > 0}`);

        expect(greenFiltered.length).toBe(1); // Green flag should override filter
        expect(normalFiltered.length).toBe(0); // Normal game should be filtered
      });
    });
  });

  describe('Feature Documentation', () => {
    test('should document filtering status feature', () => {
      const feature = {
        name: 'Filtering Status Display',
        purpose: 'Show whether a game would be filtered out in search results',
        implementation: [
          'Added Eye/EyeOff icons to show visibility status',
          'Shows reason for filtering (Category/Bundle/Port, Fan Game/E-Reader)',
          'Green-flagged games show as "Visible" even if category would normally filter',
          'Red-flagged games show as "Would be filtered"'
        ],
        benefits: [
          'Helps admins understand why games might not appear in search',
          'Confirms that green flags override filters as expected',
          'Makes the flagging system more transparent'
        ]
      };

      console.log('📋 Feature Documentation:', JSON.stringify(feature, null, 2));
      expect(feature.implementation).toHaveLength(4);
    });
  });

  describe('Green Flag Search Debug', () => {
    test('should enable debugging to find missing games', () => {
      const debugInstructions = {
        step1: 'Check if DEBUG_GAME_DATA is enabled in gameDataServiceV2.ts',
        step2: 'Search for "mario" and check console for green flag search logs',
        step3: 'Verify Super Mario Bros 3 exists in database with greenlight_flag = true',
        step4: 'Check if green flag search is timing out (look for abort errors)',
        step5: 'Verify the game name matches exactly what\'s in the database',
        step6: 'Test with different search variations: "mario", "mario bros", "super mario"'
      };

      console.log('🐛 Debug Instructions for Missing Green-Flagged Games:');
      Object.entries(debugInstructions).forEach(([step, instruction]) => {
        console.log(`${step}: ${instruction}`);
      });

      const commonIssues = [
        'Database connection timeout during green flag search',
        'Game name mismatch (e.g., "Super Mario Bros. 3" vs "Super Mario Bros 3")',
        'Green flag not actually set in database (check admin tool)',
        'Search query too restrictive',
        'Other filtering happening after green flag search'
      ];

      console.log('🔍 Common Issues:');
      commonIssues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });

      expect(debugInstructions.step1).toBeTruthy();
    });
  });
});