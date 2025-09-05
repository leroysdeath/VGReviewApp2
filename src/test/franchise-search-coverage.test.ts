import { describe, it, expect } from '@jest/globals';

// Test data for franchise search coverage analysis
describe('Franchise Search Coverage Analysis', () => {
  // Mock the search relevance function to test current logic
  const mockCalculateSearchRelevance = (game: any, searchQuery: string): number => {
    if (!searchQuery || !searchQuery.trim()) return 1;

    const query = searchQuery.toLowerCase().trim();
    const gameName = (game.name || '').toLowerCase();
    const developer = (game.developer || '').toLowerCase();
    const publisher = (game.publisher || '').toLowerCase();
    const summary = (game.summary || '').toLowerCase();

    let relevanceScore = 0;
    let maxPossibleScore = 0;

    // Exact name match (highest relevance)
    maxPossibleScore += 100;
    if (gameName === query) {
      relevanceScore += 100;
    } else if (gameName.includes(query) || query.includes(gameName)) {
      const matchRatio = Math.min(query.length, gameName.length) / Math.max(query.length, gameName.length);
      relevanceScore += 100 * matchRatio;
    }

    // Query words in name (very high relevance)
    maxPossibleScore += 80;
    const queryWords = query.split(/\s+/);
    const nameWords = gameName.split(/\s+/);
    let nameWordMatches = 0;
    queryWords.forEach(queryWord => {
      if (nameWords.some(nameWord => nameWord.includes(queryWord) || queryWord.includes(nameWord))) {
        nameWordMatches++;
      }
    });
    if (queryWords.length > 0) {
      relevanceScore += 80 * (nameWordMatches / queryWords.length);
    }

    // Developer/Publisher match
    maxPossibleScore += 30;
    queryWords.forEach(queryWord => {
      if (developer.includes(queryWord) || publisher.includes(queryWord)) {
        relevanceScore += 30 / queryWords.length;
      }
    });

    // Summary match
    maxPossibleScore += 20;
    queryWords.forEach(queryWord => {
      if (summary.includes(queryWord)) {
        relevanceScore += 20 / queryWords.length;
      }
    });

    const finalRelevance = maxPossibleScore > 0 ? (relevanceScore / maxPossibleScore) : 0;
    const RELEVANCE_THRESHOLD = 0.15;
    return finalRelevance >= RELEVANCE_THRESHOLD ? finalRelevance : 0;
  };

  const mockFilterByRelevance = (games: any[], searchQuery?: string): any[] => {
    if (!searchQuery || !searchQuery.trim()) {
      return games;
    }
    return games.filter(game => mockCalculateSearchRelevance(game, searchQuery) > 0);
  };

  describe('Mario Franchise Coverage Issues', () => {
    const marioGames = [
      // Games that SHOULD appear for "mario" search
      {
        id: 1,
        name: 'Super Mario World',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Classic platformer featuring Mario'
      },
      {
        id: 2,
        name: 'Super Mario Bros. 3',
        developer: 'Nintendo R&D4',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Third game in Super Mario Bros series'
      },
      {
        id: 3,
        name: 'Mario Kart 64',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Racing game featuring Mario characters'
      },
      {
        id: 4,
        name: 'Super Mario 64',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: '3D platformer featuring Mario'
      },
      {
        id: 5,
        name: 'Mario Party',
        developer: 'Hudson Soft',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Party game featuring Mario characters'
      },
      {
        id: 6,
        name: 'Paper Mario',
        developer: 'Intelligent Systems',
        publisher: 'Nintendo',
        category: 0,
        summary: 'RPG featuring Mario in paper form'
      },
      // Games that should NOT appear (different franchises)
      {
        id: 100,
        name: 'Super Metroid',
        developer: 'Nintendo R&D1',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Space adventure game'
      }
    ];

    it('should identify Mario franchise coverage gaps with current logic', () => {
      const filteredGames = mockFilterByRelevance(marioGames, 'mario');
      
      console.log('🔍 MARIO SEARCH RESULTS:');
      filteredGames.forEach(game => {
        const relevance = mockCalculateSearchRelevance(game, 'mario');
        console.log(`  ✅ "${game.name}" - Relevance: ${(relevance * 100).toFixed(1)}%`);
      });

      const missingGames = marioGames.filter(game => 
        game.name.toLowerCase().includes('mario') && 
        !filteredGames.find(fg => fg.id === game.id)
      );

      console.log('❌ MISSING MARIO GAMES:');
      missingGames.forEach(game => {
        const relevance = mockCalculateSearchRelevance(game, 'mario');
        console.log(`  ❌ "${game.name}" - Relevance: ${(relevance * 100).toFixed(1)}% (below threshold)`);
      });

      // Expect all legitimate Mario games to appear
      const expectedMarioGames = ['Super Mario World', 'Super Mario Bros. 3', 'Mario Kart 64', 'Super Mario 64', 'Mario Party', 'Paper Mario'];
      expectedMarioGames.forEach(expectedName => {
        const found = filteredGames.find(game => game.name === expectedName);
        if (!found) {
          console.log(`🚨 MISSING: ${expectedName} not found in Mario search results`);
        }
      });

      // Should not include unrelated games
      expect(filteredGames.find(game => game.name === 'Super Metroid')).toBe(undefined);
    });
  });

  describe('Pokemon Franchise Coverage Issues', () => {
    const pokemonGames = [
      {
        id: 10,
        name: 'Pokemon Red',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Original Pokemon RPG'
      },
      {
        id: 11,
        name: 'Pokemon Blue',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Original Pokemon RPG companion'
      },
      {
        id: 12,
        name: 'Pokemon Yellow',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Enhanced Pokemon RPG'
      },
      {
        id: 13,
        name: 'Pokemon Gold',
        developer: 'Game Freak',
        publisher: 'The Pokemon Company',
        category: 0,
        summary: 'Second generation Pokemon RPG'
      },
      {
        id: 14,
        name: 'Pokemon Silver',
        developer: 'Game Freak',
        publisher: 'The Pokemon Company',
        category: 0,
        summary: 'Second generation Pokemon RPG'
      },
      {
        id: 15,
        name: 'Pokemon Crystal',
        developer: 'Game Freak',
        publisher: 'The Pokemon Company',
        category: 0,
        summary: 'Enhanced second generation Pokemon RPG'
      },
      {
        id: 16,
        name: 'Pokemon Ruby',
        developer: 'Game Freak',
        publisher: 'The Pokemon Company',
        category: 0,
        summary: 'Third generation Pokemon RPG'
      },
      {
        id: 17,
        name: 'Pokemon Sapphire',
        developer: 'Game Freak',
        publisher: 'The Pokemon Company',
        category: 0,
        summary: 'Third generation Pokemon RPG'
      }
    ];

    it('should identify Pokemon franchise coverage with current logic', () => {
      const filteredGames = mockFilterByRelevance(pokemonGames, 'pokemon');
      
      console.log('🔍 POKEMON SEARCH RESULTS:');
      filteredGames.forEach(game => {
        const relevance = mockCalculateSearchRelevance(game, 'pokemon');
        console.log(`  ✅ "${game.name}" - Relevance: ${(relevance * 100).toFixed(1)}%`);
      });

      const missingGames = pokemonGames.filter(game => 
        !filteredGames.find(fg => fg.id === game.id)
      );

      console.log('❌ MISSING POKEMON GAMES:');
      missingGames.forEach(game => {
        const relevance = mockCalculateSearchRelevance(game, 'pokemon');
        console.log(`  ❌ "${game.name}" - Relevance: ${(relevance * 100).toFixed(1)}% (below threshold)`);
      });

      // All Pokemon games should appear in a Pokemon search
      expect(filteredGames.length).toBeGreaterThan(5);
    });
  });

  describe('Zelda Franchise Coverage Issues', () => {
    const zeldaGames = [
      {
        id: 20,
        name: 'The Legend of Zelda',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Original Zelda adventure'
      },
      {
        id: 21,
        name: 'The Legend of Zelda: A Link to the Past',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Classic Zelda adventure'
      },
      {
        id: 22,
        name: 'The Legend of Zelda: Link\'s Awakening',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Portable Zelda adventure'
      },
      {
        id: 23,
        name: 'The Legend of Zelda: Ocarina of Time',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: '3D Zelda adventure'
      },
      {
        id: 24,
        name: 'The Legend of Zelda: Majora\'s Mask',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Time-based Zelda adventure'
      },
      {
        id: 25,
        name: 'The Legend of Zelda: The Wind Waker',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Cell-shaded Zelda adventure'
      },
      {
        id: 26,
        name: 'The Legend of Zelda: Breath of the Wild',
        developer: 'Nintendo EPD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Open-world Zelda adventure'
      }
    ];

    it('should identify Zelda franchise coverage with current logic', () => {
      const filteredGames = mockFilterByRelevance(zeldaGames, 'zelda');
      
      console.log('🔍 ZELDA SEARCH RESULTS:');
      filteredGames.forEach(game => {
        const relevance = mockCalculateSearchRelevance(game, 'zelda');
        console.log(`  ✅ "${game.name}" - Relevance: ${(relevance * 100).toFixed(1)}%`);
      });

      const missingGames = zeldaGames.filter(game => 
        !filteredGames.find(fg => fg.id === game.id)
      );

      console.log('❌ MISSING ZELDA GAMES:');
      missingGames.forEach(game => {
        const relevance = mockCalculateSearchRelevance(game, 'zelda');
        console.log(`  ❌ "${game.name}" - Relevance: ${(relevance * 100).toFixed(1)}% (below threshold)`);
      });

      // Specific important games that should appear
      const expectedZeldaGames = [
        'The Legend of Zelda: A Link to the Past',
        'The Legend of Zelda: Link\'s Awakening'
      ];

      expectedZeldaGames.forEach(expectedName => {
        const found = filteredGames.find(game => game.name === expectedName);
        if (!found) {
          console.log(`🚨 MISSING: ${expectedName} not found in Zelda search results`);
        }
      });
    });
  });

  describe('Relevance Threshold Analysis', () => {
    const testGames = [
      {
        id: 30,
        name: 'Super Mario World',
        developer: 'Nintendo',
        publisher: 'Nintendo',
        summary: 'Classic Mario platformer'
      },
      {
        id: 31,
        name: 'Mario Kart 8',
        developer: 'Nintendo',
        publisher: 'Nintendo', 
        summary: 'Racing game with Mario characters'
      },
      {
        id: 32,
        name: 'Pokemon Blue',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        summary: 'Original Pokemon adventure'
      }
    ];

    it('should analyze how different thresholds affect coverage', () => {
      const queries = ['mario', 'pokemon'];
      const thresholds = [0.05, 0.10, 0.15, 0.20, 0.25];

      queries.forEach(query => {
        console.log(`\n📊 THRESHOLD ANALYSIS FOR "${query.toUpperCase()}"`);
        
        thresholds.forEach(threshold => {
          const gamesPassingThreshold = testGames.filter(game => {
            const relevance = mockCalculateSearchRelevance(game, query);
            const baseRelevance = relevance > 0 ? relevance / 0.15 : 0; // Normalize to original threshold
            return baseRelevance >= threshold;
          });
          
          console.log(`   Threshold ${(threshold * 100).toFixed(0)}%: ${gamesPassingThreshold.length} games`);
          gamesPassingThreshold.forEach(game => {
            const relevance = mockCalculateSearchRelevance(game, query);
            console.log(`     - "${game.name}" (${(relevance * 100).toFixed(1)}%)`);
          });
        });
      });
    });
  });

  describe('Word Matching Logic Analysis', () => {
    const problematicGames = [
      {
        id: 40,
        name: 'Super Mario World',
        summary: 'Platform game featuring Mario'
      },
      {
        id: 41,
        name: 'The Legend of Zelda: A Link to the Past',
        summary: 'Adventure game in Zelda series'
      }
    ];

    it('should identify word matching issues', () => {
      console.log('\n🔬 WORD MATCHING ANALYSIS:');
      
      const testCases = [
        { query: 'mario', game: problematicGames[0] },
        { query: 'zelda', game: problematicGames[1] }
      ];

      testCases.forEach(({ query, game }) => {
        const queryWords = query.toLowerCase().split(/\s+/);
        const nameWords = game.name.toLowerCase().split(/\s+/);
        
        console.log(`\nQuery: "${query}"`);
        console.log(`Game: "${game.name}"`);
        console.log(`Query words: [${queryWords.join(', ')}]`);
        console.log(`Name words: [${nameWords.join(', ')}]`);
        
        let nameWordMatches = 0;
        queryWords.forEach(queryWord => {
          const matches = nameWords.filter(nameWord => 
            nameWord.includes(queryWord) || queryWord.includes(nameWord)
          );
          if (matches.length > 0) {
            nameWordMatches++;
            console.log(`  ✅ "${queryWord}" matches: [${matches.join(', ')}]`);
          } else {
            console.log(`  ❌ "${queryWord}" has no matches in name words`);
          }
        });
        
        const wordMatchScore = queryWords.length > 0 ? (nameWordMatches / queryWords.length) : 0;
        console.log(`Word match ratio: ${nameWordMatches}/${queryWords.length} = ${(wordMatchScore * 100).toFixed(1)}%`);
        
        const finalRelevance = mockCalculateSearchRelevance(game, query);
        console.log(`Final relevance: ${(finalRelevance * 100).toFixed(1)}%`);
        console.log(`Passes 15% threshold: ${finalRelevance >= 0.15 ? 'YES' : 'NO'}`);
      });
    });
  });
});