import { gameSearchService } from '../services/gameSearchService';

describe('Phase 2: Enhanced Franchise Detection', () => {
  
  beforeAll(() => {
    console.log('\n🧠 PHASE 2 TESTING: Enhanced franchise detection and character-based search');
    console.log('New features:');
    console.log('- Character-based searches (Luigi, Snake, Ryu)');
    console.log('- Sub-franchise detection (Mega Man X, Metal Gear Solid)'); 
    console.log('- Spin-off pattern matching (Mario Kart → Mario franchise)');
    console.log('- Missing franchise expansions (Mega Man, Metal Gear, Might & Magic)');
  });

  describe('New Franchise Expansions', () => {
    const newFranchises = [
      {
        name: 'mega man',
        expectedGames: ['Mega Man', 'Mega Man X', 'Mega Man Zero', 'Mega Man Legends'],
        minResults: 15
      },
      {
        name: 'metal gear',
        expectedGames: ['Metal Gear Solid', 'Metal Gear', 'Metal Gear Solid 2'],
        minResults: 10
      },
      {
        name: 'might and magic',
        expectedGames: ['Might and Magic', 'Heroes of Might and Magic'],
        minResults: 8
      }
    ];

    newFranchises.forEach(franchise => {
      it(`should find comprehensive results for ${franchise.name} franchise`, async () => {
        console.log(`\n🆕 Testing new franchise: ${franchise.name}`);
        
        const response = await gameSearchService.searchGames(
          { query: franchise.name, orderBy: 'relevance' },
          {} // Use dynamic limits
        );

        const games = response.games;
        console.log(`   Found ${games.length} games for "${franchise.name}"`);
        
        // Check for expected key games
        const foundExpected = franchise.expectedGames.filter(expectedGame =>
          games.some(game => 
            game.name?.toLowerCase().includes(expectedGame.toLowerCase())
          )
        );
        
        console.log(`   Key games found: ${foundExpected.length}/${franchise.expectedGames.length}`);
        foundExpected.forEach(game => console.log(`   ✅ ${game}`));
        
        const missingGames = franchise.expectedGames.filter(expected => 
          !foundExpected.some(found => found.toLowerCase() === expected.toLowerCase())
        );
        if (missingGames.length > 0) {
          console.log(`   Missing games: ${missingGames.join(', ')}`);
        }

        // Should find minimum expected results
        expect(games.length).toBeGreaterThanOrEqual(franchise.minResults);
        
        // Should find at least 50% of expected key games
        expect(foundExpected.length).toBeGreaterThanOrEqual(Math.ceil(franchise.expectedGames.length * 0.5));
      }, 20000);
    });
  });

  describe('Character-Based Search Detection', () => {
    const characterSearches = [
      {
        character: 'luigi',
        expectedFranchise: 'mario',
        expectedGames: ['Luigi\'s Mansion', 'Super Luigi', 'Mario & Luigi'],
        minResults: 5
      },
      {
        character: 'yoshi',
        expectedFranchise: 'mario',
        expectedGames: ['Yoshi\'s Island', 'Yoshi\'s Story', 'Yoshi'],
        minResults: 5
      },
      {
        character: 'snake',
        expectedFranchise: 'metal gear',
        expectedGames: ['Metal Gear Solid', 'Snake Eater'],
        minResults: 3
      },
      {
        character: 'ryu',
        expectedFranchise: 'street fighter',
        expectedGames: ['Street Fighter'],
        minResults: 3
      },
      {
        character: 'sonic',
        expectedFranchise: 'sonic',
        expectedGames: ['Sonic the Hedgehog', 'Sonic 2', 'Sonic Adventure'],
        minResults: 10
      }
    ];

    characterSearches.forEach(test => {
      it(`should expand ${test.character} search to include ${test.expectedFranchise} franchise`, async () => {
        console.log(`\n👤 Testing character search: ${test.character}`);
        
        const response = await gameSearchService.searchGames(
          { query: test.character, orderBy: 'relevance' },
          {}
        );

        const games = response.games;
        console.log(`   Found ${games.length} games for "${test.character}"`);
        
        // Check for franchise expansion
        const franchiseGames = games.filter(game =>
          game.name?.toLowerCase().includes(test.expectedFranchise) ||
          test.expectedGames.some(expected =>
            game.name?.toLowerCase().includes(expected.toLowerCase())
          )
        );

        console.log(`   ${test.expectedFranchise} franchise games: ${franchiseGames.length}`);
        
        // Sample results
        games.slice(0, 5).forEach((game, index) => {
          console.log(`   ${index + 1}. ${game.name}`);
        });

        expect(games.length).toBeGreaterThanOrEqual(test.minResults);
        expect(franchiseGames.length).toBeGreaterThan(0); // Should find some franchise games
      }, 15000);
    });
  });

  describe('Sub-Franchise and Spin-off Detection', () => {
    const subFranchiseTests = [
      {
        query: 'mario kart',
        baseFranchise: 'mario',
        description: 'Mario Kart spin-off should expand to Mario franchise',
        minResults: 15
      },
      {
        query: 'mega man x',
        baseFranchise: 'mega man',
        description: 'Mega Man X sub-series should expand to Mega Man franchise',
        minResults: 10
      },
      {
        query: 'metal gear solid',
        baseFranchise: 'metal gear',
        description: 'Metal Gear Solid should expand to Metal Gear franchise',
        minResults: 8
      },
      {
        query: 'final fantasy vii',
        baseFranchise: 'final fantasy',
        description: 'FF VII should expand to Final Fantasy franchise',
        minResults: 15
      },
      {
        query: 'mario party',
        baseFranchise: 'mario',
        description: 'Mario Party should expand to Mario franchise',
        minResults: 12
      }
    ];

    subFranchiseTests.forEach(test => {
      it(`should detect sub-franchise: ${test.description}`, async () => {
        console.log(`\n🎮 Testing sub-franchise: ${test.query}`);
        
        const response = await gameSearchService.searchGames(
          { query: test.query, orderBy: 'relevance' },
          {}
        );

        const games = response.games;
        console.log(`   Found ${games.length} games for "${test.query}"`);
        
        // Check for base franchise games
        const baseFranchiseGames = games.filter(game =>
          game.name?.toLowerCase().includes(test.baseFranchise) &&
          !game.name?.toLowerCase().includes(test.query.toLowerCase())
        );

        console.log(`   Base ${test.baseFranchise} franchise games: ${baseFranchiseGames.length}`);
        console.log(`   Sample results:`);
        games.slice(0, 5).forEach((game, index) => {
          console.log(`   ${index + 1}. ${game.name}`);
        });

        expect(games.length).toBeGreaterThanOrEqual(test.minResults);
        expect(baseFranchiseGames.length).toBeGreaterThan(0); // Should expand to base franchise
      }, 15000);
    });
  });

  describe('Sequel Number Detection', () => {
    const sequelTests = [
      { query: 'mario 3', expected: 'mario', description: 'Mario 3 → Mario franchise' },
      { query: 'final fantasy vii', expected: 'final fantasy', description: 'FF VII → Final Fantasy franchise' },
      { query: 'mega man x2', expected: 'mega man', description: 'Mega Man X2 → Mega Man franchise' },
      { query: 'metal gear 2', expected: 'metal gear', description: 'Metal Gear 2 → Metal Gear franchise' }
    ];

    sequelTests.forEach(test => {
      it(`should detect sequel pattern: ${test.description}`, async () => {
        console.log(`\n🔢 Testing sequel detection: ${test.query}`);
        
        const response = await gameSearchService.searchGames(
          { query: test.query, orderBy: 'relevance' },
          {}
        );

        const games = response.games;
        console.log(`   Found ${games.length} games for "${test.query}"`);
        
        // Should find both the specific sequel and related franchise games
        const specificGame = games.filter(game =>
          game.name?.toLowerCase().includes(test.query.toLowerCase())
        );
        
        const franchiseGames = games.filter(game =>
          game.name?.toLowerCase().includes(test.expected) &&
          !game.name?.toLowerCase().includes(test.query.toLowerCase())
        );

        console.log(`   Specific game matches: ${specificGame.length}`);
        console.log(`   Franchise expansion games: ${franchiseGames.length}`);

        expect(games.length).toBeGreaterThanOrEqual(5);
        expect(franchiseGames.length).toBeGreaterThan(0); // Should expand to franchise
      }, 15000);
    });
  });

  describe('Quality Assurance - Enhanced Detection', () => {
    it('should maintain search relevance with enhanced detection', async () => {
      const testQueries = ['luigi', 'mega man x', 'metal gear solid'];
      
      for (const query of testQueries) {
        const response = await gameSearchService.searchGames({ query }, {});
        const games = response.games;
        
        // Calculate relevance - games should still be related to the query
        const relevant = games.filter(game => {
          const name = game.name?.toLowerCase() || '';
          const description = game.description?.toLowerCase() || '';
          
          // Check if game contains query terms or known related terms
          return name.includes(query.toLowerCase()) ||
                 description.includes(query.toLowerCase()) ||
                 // For character searches, allow franchise games
                 (query === 'luigi' && (name.includes('mario') || name.includes('luigi'))) ||
                 (query === 'mega man x' && (name.includes('mega man') || name.includes('rockman'))) ||
                 (query === 'metal gear solid' && (name.includes('metal gear') || name.includes('snake')));
        });

        const relevancePercentage = (relevant.length / games.length) * 100;
        console.log(`${query} relevance: ${relevancePercentage.toFixed(1)}% (${relevant.length}/${games.length})`);
        
        // Should maintain good relevance
        expect(relevancePercentage).toBeGreaterThanOrEqual(60); // Slightly lower due to franchise expansion
      }
    });

    it('should still filter out ROM hacks with enhanced detection', async () => {
      const response = await gameSearchService.searchGames({ query: 'mega man' }, {});
      const games = response.games;
      
      const modGames = games.filter(game =>
        game.category === 5 ||
        game.name?.toLowerCase().includes('rom hack') ||
        game.name?.toLowerCase().includes('fan made')
      );

      console.log(`ROM hacks in Mega Man search: ${modGames.length}/${games.length}`);
      expect(modGames.length).toBeLessThan(games.length * 0.1); // Less than 10%
    });
  });

  describe('Performance with Enhanced Detection', () => {
    it('should maintain good performance with enhanced expansions', async () => {
      const testQueries = ['mario', 'luigi', 'mega man x', 'metal gear solid'];
      const responseTimes: number[] = [];

      for (const query of testQueries) {
        const startTime = performance.now();
        await gameSearchService.searchGames({ query }, {});
        const endTime = performance.now();
        const responseTime = (endTime - startTime) / 1000;
        responseTimes.push(responseTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      console.log(`\nAverage response time with enhanced detection: ${avgResponseTime.toFixed(2)}s`);
      
      // Should maintain good performance
      expect(avgResponseTime).toBeLessThan(5); // Allow some margin for enhanced processing
    });
  });

  afterAll(() => {
    console.log('\n📊 PHASE 2 ENHANCEMENT SUMMARY:');
    console.log('✅ Added missing franchise expansions (Mega Man, Metal Gear, Might & Magic)');
    console.log('✅ Implemented character-based search (Luigi, Snake, Ryu, Sonic)');  
    console.log('✅ Added sub-franchise detection (Mario Kart → Mario)');
    console.log('✅ Implemented sequel pattern matching (Mario 3 → Mario)');
    console.log('✅ Enhanced spin-off detection (Mega Man X → Mega Man)');
    console.log('✅ Maintained search relevance and filtering quality');
    console.log('\nPhase 2 should significantly improve franchise coverage!');
  });
});