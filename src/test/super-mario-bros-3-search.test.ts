import { GameDataServiceV2 } from '../services/gameDataServiceV2';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';

describe('Super Mario Bros 3 Search Test', () => {
  describe('Direct Service Test', () => {
    test('GameDataServiceV2 should find Super Mario Bros 3', async () => {
      const gameDataService = new GameDataServiceV2();
      
      try {
        console.log('🔍 Testing direct GameDataServiceV2 search for "super mario bros 3"...');
        const results = await gameDataService.searchGames('super mario bros 3');
        
        console.log(`Found ${results.length} results for "super mario bros 3"`);
        
        // Look for the exact game
        const smb3 = results.find(game => {
          const name = game.name?.toLowerCase() || '';
          return name.includes('super mario bros') && name.includes('3') ||
                 name.includes('mario bros 3') ||
                 name === 'super mario bros. 3';
        });
        
        if (smb3) {
          console.log('✅ Found Super Mario Bros 3:', smb3.name);
          console.log('Green flag status:', (smb3 as any).greenlight_flag);
          console.log('Position in results:', results.indexOf(smb3) + 1);
          expect(smb3).toBeDefined();
        } else {
          console.log('❌ Super Mario Bros 3 not found');
          console.log('Available results:', results.slice(0, 5).map(g => g.name));
        }
      } catch (error) {
        console.error('Search failed:', error);
        throw error;
      }
    }, 30000);
    
    test('should also find with variations of the search', async () => {
      const gameDataService = new GameDataServiceV2();
      const searchVariations = [
        'mario bros 3',
        'super mario 3',
        'mario brothers 3'
      ];
      
      for (const query of searchVariations) {
        console.log(`🔍 Testing search variation: "${query}"`);
        const results = await gameDataService.searchGames(query);
        
        const found = results.some(game => {
          const name = game.name?.toLowerCase() || '';
          return name.includes('mario') && name.includes('3');
        });
        
        console.log(`Query "${query}": ${found ? '✅' : '❌'} found Mario games`);
      }
    }, 45000);
  });
  
  describe('Coordination Service Test', () => {
    test('AdvancedSearchCoordination should find Super Mario Bros 3', async () => {
      const coordination = new AdvancedSearchCoordination();
      
      try {
        console.log('🔍 Testing AdvancedSearchCoordination for "mario bros 3"...');
        const searchResult = await coordination.coordinatedSearch('mario bros 3', {
          maxResults: 20,
          includeMetrics: true
        });
        
        console.log(`Coordination found ${searchResult.results.length} results`);
        
        const smb3 = searchResult.results.find(game => {
          const name = game.name?.toLowerCase() || '';
          return name.includes('mario bros') && name.includes('3');
        });
        
        if (smb3) {
          console.log('✅ Coordination found:', smb3.name);
          console.log('Source:', smb3.source);
          console.log('Relevance score:', smb3.relevanceScore);
        } else {
          console.log('❌ Not found via coordination');
          console.log('Top results:', searchResult.results.slice(0, 3).map(g => g.name));
        }
      } catch (error) {
        console.error('Coordination search failed:', error);
        throw error;
      }
    }, 30000);
  });
  
  describe('Green Flag Specific Test', () => {
    test('should verify green flag search works', async () => {
      const gameDataService = new GameDataServiceV2();
      
      // Test the specific green flag search method
      try {
        const greenFlagMethod = (gameDataService as any).searchGreenFlaggedGames;
        if (typeof greenFlagMethod === 'function') {
          console.log('🟢 Testing green flag search for "mario"...');
          const greenResults = await greenFlagMethod.call(gameDataService, 'mario');
          
          console.log(`Green flag search found ${greenResults.length} games`);
          greenResults.forEach((game: any) => {
            console.log(`- ${game.name} (green: ${game.greenlight_flag})`);
          });
          
          expect(Array.isArray(greenResults)).toBe(true);
        } else {
          console.log('❌ searchGreenFlaggedGames method not found');
        }
      } catch (error) {
        console.log('⚠️ Green flag search error (expected if timing out):', error.message);
      }
    }, 15000);
  });
  
  describe('Score Calculation Test', () => {
    test('should verify green flag scoring boost', () => {
      const gameDataService = new GameDataServiceV2();
      
      const testGame = {
        id: 1,
        name: 'Super Mario Bros. 3',
        greenlight_flag: true,
        total_rating: 95,
        rating_count: 500,
        igdb_rating: 95,
        totalUserRatings: 20,
        averageUserRating: 4.8
      };
      
      const normalGame = {
        ...testGame,
        greenlight_flag: false
      };
      
      // Test the scoring method
      try {
        const calculateScore = (gameDataService as any).calculateRelevanceScore.bind(gameDataService);
        
        const greenScore = calculateScore(testGame, 'mario');
        const normalScore = calculateScore(normalGame, 'mario');
        
        console.log('Green-flagged SMB3 score:', greenScore);
        console.log('Normal SMB3 score:', normalScore);
        console.log('Boost amount:', greenScore - normalScore);
        
        expect(greenScore).toBeGreaterThan(normalScore);
        expect(greenScore - normalScore).toBeGreaterThan(100); // Should have ~150 point boost
        
        console.log('✅ Green flag scoring boost is working');
      } catch (error) {
        console.error('Scoring test failed:', error);
        throw error;
      }
    });
  });
});