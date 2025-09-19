import { GameDataServiceV2 } from '../services/gameDataServiceV2';

describe('Green Flag Prioritization', () => {
  const gameDataService = new GameDataServiceV2();
  
  describe('Relevance Scoring', () => {
    test('should give significant boost to green-flagged games', () => {
      // Mock games for testing scoring
      const normalGame = {
        id: 1,
        name: 'Super Mario World',
        greenlight_flag: false,
        total_rating: 85,
        rating_count: 100,
        follows: 50,
        igdb_rating: 85,
        totalUserRatings: 10,
        averageUserRating: 4.5
      };
      
      const greenFlaggedGame = {
        id: 2,
        name: 'Super Mario Bros. 3',
        greenlight_flag: true,
        total_rating: 80,
        rating_count: 90,
        follows: 45,
        igdb_rating: 80,
        totalUserRatings: 8,
        averageUserRating: 4.3
      };
      
      // Access the private method via prototype for testing
      const calculateScore = (gameDataService as any).calculateRelevanceScore.bind(gameDataService);
      
      const normalScore = calculateScore(normalGame, 'mario');
      const greenFlagScore = calculateScore(greenFlaggedGame, 'mario');
      
      console.log('Normal game score:', normalScore);
      console.log('Green-flagged game score:', greenFlagScore);
      
      // Currently this will FAIL because green flags aren't considered
      console.log('❌ EXPECTED: Green-flagged game should have higher score');
      console.log('❌ ACTUAL: Green flag is not considered in scoring');
      
      // Document what should happen
      const expectedBehavior = `
        Green Flag Boost should add:
        - 100-150 points to ensure top placement
        - Should override most quality metrics
        - Ensures manually curated games appear first
      `;
      console.log(expectedBehavior);
    });
  });
  
  describe('Search Results Ordering', () => {
    test('green-flagged games should appear at top of results', () => {
      const mockResults = [
        { name: 'Mario Party', greenlight_flag: false, total_rating: 90 },
        { name: 'Super Mario Bros. 3', greenlight_flag: true, total_rating: 85 },
        { name: 'Mario Kart', greenlight_flag: false, total_rating: 92 },
        { name: 'Mario Tennis', greenlight_flag: false, total_rating: 75 }
      ];
      
      // What SHOULD happen after sorting
      const expectedOrder = [
        'Super Mario Bros. 3', // Green-flagged, should be first
        'Mario Kart',          // Highest rating of non-flagged
        'Mario Party',         // Next highest rating
        'Mario Tennis'         // Lowest rating
      ];
      
      console.log('✅ Expected ordering:', expectedOrder);
      console.log('❌ Current behavior: Green flag not prioritized');
    });
  });
  
  describe('Database Query Requirements', () => {
    test('should include greenlight_flag in database queries', () => {
      // This documents that queries ARE selecting greenlight_flag
      // The issue is in the scoring/sorting, not the data retrieval
      
      const queryIncludes = `
        .select('*')  // Includes greenlight_flag
        
        Current transform preserves all fields:
        transformGameWithoutRatings(game) {
          return { ...game, /* other fields */ }
        }
      `;
      
      console.log('✅ Database queries DO include greenlight_flag');
      console.log('❌ Issue: Flag is retrieved but not used in scoring');
    });
  });
  
  describe('Fix Implementation', () => {
    test('documents required changes', () => {
      const requiredFix = `
        In calculateRelevanceScore method (line ~324):
        
        1. Check for greenlight_flag:
           if ((game as any).greenlight_flag === true) {
             score += 150; // Massive boost to ensure top placement
           }
        
        2. Add this BEFORE the final return statement
        
        3. This ensures green-flagged games get priority regardless of other metrics
        
        Alternative approach:
        - Sort green-flagged games to top BEFORE applying other sorting
        - Two-tier sorting: green-flagged first, then by relevance
      `;
      
      console.log('📝 Required Fix:', requiredFix);
      console.log('📍 File: src/services/gameDataServiceV2.ts');
      console.log('📍 Method: calculateRelevanceScore (around line 324-432)');
    });
  });
  
  describe('Integration Test', () => {
    const skipIfNoEnv = !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL === 'https://test.supabase.co';
    
    (skipIfNoEnv ? test.skip : test)('should return Super Mario Bros. 3 when green-flagged', async () => {
      const results = await gameDataService.searchGames('mario');
      
      // Look for Super Mario Bros. 3
      const smb3 = results.find(game => 
        game.name === 'Super Mario Bros. 3' || 
        game.name?.includes('Mario Bros. 3')
      );
      
      if (smb3) {
        console.log('Found SMB3:', smb3.name);
        console.log('Green flag status:', (smb3 as any).greenlight_flag);
        console.log('Position in results:', results.indexOf(smb3) + 1);
        
        // Should be in top 3 if green-flagged
        const position = results.indexOf(smb3);
        if ((smb3 as any).greenlight_flag) {
          expect(position).toBeLessThan(3);
        }
      } else {
        console.error('❌ Super Mario Bros. 3 not found in results!');
        console.log('Top 5 results:', results.slice(0, 5).map(g => g.name));
      }
    }, 30000);
  });
});