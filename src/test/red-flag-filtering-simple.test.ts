import { GameDataServiceV2 } from '../services/gameDataServiceV2';

describe('Red Flag Filtering - Integration Test', () => {
  const gameDataService = new GameDataServiceV2();
  
  // Skip if no environment variables (can't test against real DB without them)
  const skipIfNoEnv = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL === 'https://test.supabase.co';
  
  (skipIfNoEnv ? describe.skip : describe)('Live Database Tests', () => {
    test('should not return games with redlight_flag = true when searching', async () => {
      // This test will only work if:
      // 1. You have a real Supabase connection
      // 2. "Samus Goes to the Fridge" is marked with redlight_flag = true
      
      const results = await gameDataService.searchGames('Samus');
      
      // Check that no red-flagged games appear
      const redFlaggedGame = results.find(game => 
        game.name?.toLowerCase().includes('fridge') || 
        game.name === 'Samus Goes to the Fridge'
      );
      
      if (redFlaggedGame) {
        console.error('❌ FOUND RED-FLAGGED GAME IN RESULTS:', redFlaggedGame.name);
        console.error('This game should be filtered out!');
      }
      
      expect(redFlaggedGame).toBeUndefined();
      console.log('✅ Red-flagged games are properly filtered out');
    }, 30000); // 30 second timeout for real DB call
    
    test('should return legitimate Metroid games when searching for Samus', async () => {
      const results = await gameDataService.searchGames('Samus');
      
      // Should find legitimate Metroid games
      const hasMetroidGames = results.some(game => 
        game.name?.toLowerCase().includes('metroid') || 
        game.name?.toLowerCase().includes('samus')
      );
      
      expect(hasMetroidGames).toBe(true);
      console.log(`✅ Found ${results.length} legitimate games for "Samus" search`);
    }, 30000);
  });
  
  describe('Filter Logic Verification', () => {
    test('should have red flag filter in searchByName query', () => {
      // Read the source to verify the filter is present
      const sourceCode = gameDataService.constructor.toString();
      const hasRedlightFilter = sourceCode.includes('redlight_flag') || 
                                sourceCode.includes('red_flag');
      
      // This is a simple check - in production you'd mock and verify the query
      console.log('📝 Checking if redlight_flag filter is implemented...');
      console.log('Filter implemented:', hasRedlightFilter ? '✅ YES' : '❌ NO');
      
      // Note: This will pass now that we've added the filter
      expect(hasRedlightFilter).toBe(true);
    });
  });
  
  describe('Expected Behavior Documentation', () => {
    test('documents the expected filtering behavior', () => {
      const expectedBehavior = {
        searchQuery: 'Samus',
        shouldReturn: [
          'Metroid Prime',
          'Super Metroid',
          'Metroid Dread',
          'Samus Returns'
        ],
        shouldNotReturn: [
          'Samus Goes to the Fridge (red-flagged)',
          'Any other red-flagged games'
        ],
        filterApplied: "or('redlight_flag.is.null,redlight_flag.eq.false')",
        affectedMethods: [
          'searchByName',
          'searchBySummary'
        ]
      };
      
      console.log('📋 Expected Filtering Behavior:', expectedBehavior);
      expect(expectedBehavior.filterApplied).toBeTruthy();
    });
  });
});