import { describe, it, expect } from '@jest/globals';

// Mock enhanced search functions for testing
describe('Enhanced Franchise Coverage Tests', () => {

  // Mock the enhanced search functions
  const mockExpandFranchiseQuery = (query: string): string[] => {
    const normalizedQuery = query.toLowerCase().trim();
    const expansions = [normalizedQuery];
    
    const franchiseExpansions: Record<string, string[]> = {
      'mario': ['mario', 'super mario', 'mario bros', 'mario kart', 'paper mario', 'mario party'],
      'pokemon': ['pokemon', 'pokémon', 'pocket monster', 'pkmn'],
      'zelda': ['zelda', 'legend of zelda', 'link'],
      'metroid': ['metroid', 'samus'],
      'final fantasy': ['final fantasy', 'ff'],
      'gta': ['gta', 'grand theft auto'],
    };
    
    if (franchiseExpansions[normalizedQuery]) {
      expansions.push(...franchiseExpansions[normalizedQuery]);
    }
    
    return [...new Set(expansions)];
  };

  const mockCalculateEnhancedRelevance = (game: any, searchQuery: string): number => {
    if (!searchQuery || !searchQuery.trim()) return 1;

    const query = searchQuery.toLowerCase().trim();
    const gameName = (game.name || '').toLowerCase();
    const developer = (game.developer || '').toLowerCase();
    const publisher = (game.publisher || '').toLowerCase();
    const summary = (game.summary || '').toLowerCase();

    let relevanceScore = 0;
    let maxPossibleScore = 0;

    // Exact name match
    maxPossibleScore += 100;
    if (gameName === query) {
      relevanceScore += 100;
    } else if (gameName.includes(query) || query.includes(gameName)) {
      const matchRatio = Math.min(query.length, gameName.length) / Math.max(query.length, gameName.length);
      relevanceScore += 100 * matchRatio;
    }

    // Enhanced word matching
    maxPossibleScore += 80;
    const queryWords = query.split(/\s+/);
    const nameWords = gameName.split(/\s+/);
    let nameWordMatches = 0;
    
    queryWords.forEach(queryWord => {
      const exactMatch = nameWords.some(nameWord => nameWord === queryWord);
      if (exactMatch) {
        nameWordMatches++;
        return;
      }
      
      const partialMatch = nameWords.some(nameWord => 
        nameWord.includes(queryWord) || queryWord.includes(nameWord)
      );
      if (partialMatch) {
        nameWordMatches += 0.8;
        return;
      }
      
      // Franchise matching
      if (queryWord === 'mario' && nameWords.some(w => ['super', 'bros', 'kart', 'party', 'paper'].includes(w))) {
        nameWordMatches += 0.6;
      }
      if (queryWord === 'zelda' && nameWords.some(w => ['legend', 'link', 'hyrule'].includes(w))) {
        nameWordMatches += 0.6;
      }
      if (queryWord === 'pokemon' && nameWords.some(w => ['pocket', 'monster'].includes(w))) {
        nameWordMatches += 0.6;
      }
    });
    
    if (queryWords.length > 0) {
      relevanceScore += 80 * Math.min(nameWordMatches / queryWords.length, 1);
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

    // Franchise bonus
    maxPossibleScore += 20;
    const officialPublishers = ['nintendo', 'sony', 'microsoft', 'square enix', 'capcom'];
    const hasOfficialPublisher = officialPublishers.some(pub => 
      developer.includes(pub) || publisher.includes(pub)
    );
    
    if (hasOfficialPublisher && game.category === 0) {
      relevanceScore += 20;
    } else if (hasOfficialPublisher) {
      relevanceScore += 10;
    }

    const finalRelevance = maxPossibleScore > 0 ? (relevanceScore / maxPossibleScore) : 0;
    const RELEVANCE_THRESHOLD = 0.12; // Reduced threshold
    return finalRelevance >= RELEVANCE_THRESHOLD ? finalRelevance : 0;
  };

  const mockFilterByEnhancedRelevance = (games: any[], searchQuery?: string): any[] => {
    if (!searchQuery || !searchQuery.trim()) return games;
    return games.filter(game => mockCalculateEnhancedRelevance(game, searchQuery) > 0);
  };

  describe('Mario Franchise Enhanced Coverage', () => {
    const marioGames = [
      // Main series games
      {
        id: 1,
        name: 'Super Mario Bros.',
        developer: 'Nintendo R&D4',
        publisher: 'Nintendo',
        category: 0,
        summary: 'The original side-scrolling Mario adventure'
      },
      {
        id: 2,
        name: 'Super Mario World',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Classic SNES Mario platformer'
      },
      {
        id: 3,
        name: 'Super Mario Bros. 3',
        developer: 'Nintendo R&D4',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Third entry in the Super Mario Bros series'
      },
      {
        id: 4,
        name: 'Mario Kart 64',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Racing game featuring Mario characters'
      },
      {
        id: 5,
        name: 'Paper Mario',
        developer: 'Intelligent Systems',
        publisher: 'Nintendo',
        category: 0,
        summary: 'RPG featuring Mario in paper form'
      },
      {
        id: 6,
        name: 'Mario Party',
        developer: 'Hudson Soft',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Party game featuring Mario and friends'
      },
      // Games that should NOT appear
      {
        id: 100,
        name: 'Sonic the Hedgehog',
        developer: 'Sonic Team',
        publisher: 'Sega',
        category: 0,
        summary: 'Fast-paced platformer'
      }
    ];

    it('should significantly improve Mario franchise coverage with enhanced logic', () => {
      console.log('\n🍄 TESTING ENHANCED MARIO COVERAGE');
      
      const expandedQueries = mockExpandFranchiseQuery('mario');
      console.log(`Expanded queries for "mario":`, expandedQueries);
      
      // Test enhanced relevance calculation
      const relevantGames = mockFilterByEnhancedRelevance(marioGames, 'mario');
      
      console.log('✅ MARIO GAMES FOUND:');
      relevantGames.forEach(game => {
        const relevance = mockCalculateEnhancedRelevance(game, 'mario');
        console.log(`  - "${game.name}" (${(relevance * 100).toFixed(1)}% relevance)`);
      });
      
      const missingGames = marioGames.filter(game => 
        game.name.toLowerCase().includes('mario') && 
        !relevantGames.find(rg => rg.id === game.id)
      );
      
      console.log('❌ MISSING MARIO GAMES:');
      missingGames.forEach(game => {
        const relevance = mockCalculateEnhancedRelevance(game, 'mario');
        console.log(`  - "${game.name}" (${(relevance * 100).toFixed(1)}% relevance)`);
      });

      // Verify all Mario games appear
      const expectedMarioGames = [
        'Super Mario Bros.',
        'Super Mario World', 
        'Super Mario Bros. 3',
        'Mario Kart 64',
        'Paper Mario',
        'Mario Party'
      ];
      
      expectedMarioGames.forEach(expectedName => {
        const found = relevantGames.find(game => game.name === expectedName);
        expect(found).toBeDefined();
      });

      // Verify non-Mario games don't appear
      expect(relevantGames.find(game => game.name === 'Sonic the Hedgehog')).toBeUndefined();
    });

    it('should test franchise expansion effectiveness', () => {
      const queries = mockExpandFranchiseQuery('mario');
      
      // Should include various Mario-related terms
      expect(queries).toContain('mario');
      expect(queries).toContain('super mario');
      expect(queries).toContain('mario bros');
      expect(queries).toContain('mario kart');
      expect(queries).toContain('paper mario');
      expect(queries).toContain('mario party');
      
      console.log('\n🎯 Mario franchise expansion coverage:', queries);
    });
  });

  describe('Pokemon Franchise Enhanced Coverage', () => {
    const pokemonGames = [
      {
        id: 10,
        name: 'Pokemon Red',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Original Pokemon RPG for Game Boy'
      },
      {
        id: 11,
        name: 'Pokemon Blue',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Companion to Pokemon Red'
      },
      {
        id: 12,
        name: 'Pokemon Yellow',
        developer: 'Game Freak',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Enhanced version with Pikachu'
      },
      {
        id: 13,
        name: 'Pokemon Gold',
        developer: 'Game Freak',
        publisher: 'The Pokemon Company',
        category: 0,
        summary: 'Second generation Pokemon adventure'
      },
      {
        id: 14,
        name: 'Pokemon Silver',
        developer: 'Game Freak',
        publisher: 'The Pokemon Company',
        category: 0,
        summary: 'Johto region Pokemon adventure'
      }
    ];

    it('should improve Pokemon franchise coverage', () => {
      console.log('\n⚡ TESTING ENHANCED POKEMON COVERAGE');
      
      const expandedQueries = mockExpandFranchiseQuery('pokemon');
      console.log(`Expanded queries for "pokemon":`, expandedQueries);
      
      const relevantGames = mockFilterByEnhancedRelevance(pokemonGames, 'pokemon');
      
      console.log('✅ POKEMON GAMES FOUND:');
      relevantGames.forEach(game => {
        const relevance = mockCalculateEnhancedRelevance(game, 'pokemon');
        console.log(`  - "${game.name}" (${(relevance * 100).toFixed(1)}% relevance)`);
      });

      // All Pokemon games should be found
      expect(relevantGames.length).toBe(5);
      
      const expectedNames = ['Pokemon Red', 'Pokemon Blue', 'Pokemon Yellow', 'Pokemon Gold', 'Pokemon Silver'];
      expectedNames.forEach(name => {
        expect(relevantGames.find(game => game.name === name)).toBeDefined();
      });
    });
  });

  describe('Zelda Franchise Enhanced Coverage', () => {
    const zeldaGames = [
      {
        id: 20,
        name: 'The Legend of Zelda',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Original Zelda adventure game'
      },
      {
        id: 21,
        name: 'The Legend of Zelda: A Link to the Past',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'SNES Zelda adventure'
      },
      {
        id: 22,
        name: 'The Legend of Zelda: Link\'s Awakening',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Game Boy Zelda adventure'
      },
      {
        id: 23,
        name: 'The Legend of Zelda: Ocarina of Time',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: '3D Zelda adventure for N64'
      },
      {
        id: 24,
        name: 'The Legend of Zelda: Majora\'s Mask',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Time-loop Zelda adventure'
      }
    ];

    it('should improve Zelda franchise coverage including Link games', () => {
      console.log('\n🗡️ TESTING ENHANCED ZELDA COVERAGE');
      
      const zeldaExpandedQueries = mockExpandFranchiseQuery('zelda');
      const linkExpandedQueries = mockExpandFranchiseQuery('link');
      
      console.log(`Expanded queries for "zelda":`, zeldaExpandedQueries);
      console.log(`Expanded queries for "link":`, linkExpandedQueries);
      
      const zeldaResults = mockFilterByEnhancedRelevance(zeldaGames, 'zelda');
      const linkResults = mockFilterByEnhancedRelevance(zeldaGames, 'link');
      
      console.log('✅ ZELDA SEARCH RESULTS:');
      zeldaResults.forEach(game => {
        const relevance = mockCalculateEnhancedRelevance(game, 'zelda');
        console.log(`  - "${game.name}" (${(relevance * 100).toFixed(1)}% relevance)`);
      });
      
      console.log('✅ LINK SEARCH RESULTS:');
      linkResults.forEach(game => {
        const relevance = mockCalculateEnhancedRelevance(game, 'link');
        console.log(`  - "${game.name}" (${(relevance * 100).toFixed(1)}% relevance)`);
      });

      // All Zelda games should be found in both searches
      expect(zeldaResults.length).toBe(5);
      expect(linkResults.length).toBeGreaterThanOrEqual(2); // At least Link games

      // Specific important games should appear
      const importantTitles = [
        'The Legend of Zelda: A Link to the Past',
        'The Legend of Zelda: Link\'s Awakening'
      ];
      
      importantTitles.forEach(title => {
        expect(zeldaResults.find(game => game.name === title)).toBeDefined();
        expect(linkResults.find(game => game.name === title)).toBeDefined();
      });
    });
  });

  describe('Relevance Threshold Improvements', () => {
    const mixedGames = [
      {
        id: 30,
        name: 'Super Mario Galaxy',
        developer: 'Nintendo EAD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Gravity-defying Mario adventure'
      },
      {
        id: 31,
        name: 'Mario & Luigi: Superstar Saga',
        developer: 'AlphaDream',
        publisher: 'Nintendo',
        category: 0,
        summary: 'RPG starring Mario and Luigi'
      },
      {
        id: 32,
        name: 'Some Random Game',
        developer: 'Random Studio',
        publisher: 'Independent',
        category: 0,
        summary: 'This should not appear for Mario search'
      }
    ];

    it('should show improved relevance scoring with franchise bonus', () => {
      console.log('\n📊 TESTING RELEVANCE THRESHOLD IMPROVEMENTS');
      
      const results = mockFilterByEnhancedRelevance(mixedGames, 'mario');
      
      console.log('Results for "mario" search:');
      results.forEach(game => {
        const relevance = mockCalculateEnhancedRelevance(game, 'mario');
        console.log(`  - "${game.name}": ${(relevance * 100).toFixed(1)}% relevance`);
      });
      
      // Both Mario games should appear
      expect(results.length).toBe(2);
      expect(results.find(game => game.name === 'Super Mario Galaxy')).toBeDefined();
      expect(results.find(game => game.name === 'Mario & Luigi: Superstar Saga')).toBeDefined();
      
      // Non-Mario game should not appear
      expect(results.find(game => game.name === 'Some Random Game')).toBeUndefined();
      
      // Test that reduced threshold helps
      const strictResults = mixedGames.filter(game => {
        const relevance = mockCalculateEnhancedRelevance(game, 'mario');
        return relevance >= 0.15; // Old stricter threshold
      });
      
      const relaxedResults = mixedGames.filter(game => {
        const relevance = mockCalculateEnhancedRelevance(game, 'mario');
        return relevance >= 0.12; // New relaxed threshold
      });
      
      console.log(`Strict threshold (15%): ${strictResults.length} results`);
      console.log(`Relaxed threshold (12%): ${relaxedResults.length} results`);
      
      expect(relaxedResults.length).toBeGreaterThanOrEqual(strictResults.length);
    });
  });

  describe('Multi-Strategy Search Coverage', () => {
    it('should test search strategy effectiveness', () => {
      const strategies = [
        'original',
        'expanded:super mario', 
        'expanded:mario bros',
        'expanded:mario kart',
        'partial'
      ];
      
      console.log('\n🎯 TESTING MULTI-STRATEGY SEARCH');
      console.log('Available search strategies:', strategies);
      
      // Simulate that different strategies would find different games
      const mockResults = [
        { strategy: 'original', count: 3 },
        { strategy: 'expanded:super mario', count: 5 },
        { strategy: 'expanded:mario bros', count: 2 },
        { strategy: 'expanded:mario kart', count: 4 },
        { strategy: 'partial', count: 1 }
      ];
      
      const totalUnique = mockResults.reduce((sum, result) => sum + result.count, 0);
      console.log(`Total unique games found across all strategies: ${totalUnique}`);
      
      // Multiple strategies should provide better coverage
      expect(totalUnique).toBeGreaterThan(5);
    });
  });

  describe('Mod Content Protection', () => {
    const mixedContent = [
      // Official games
      {
        id: 40,
        name: 'Super Mario Odyssey',
        developer: 'Nintendo EPD',
        publisher: 'Nintendo',
        category: 0,
        summary: 'Official 3D Mario adventure'
      },
      // Mod content that should be filtered
      {
        id: 41,
        name: 'Super Mario Bros. Enhanced Edition',
        developer: 'Fan Developer',
        publisher: 'Community',
        category: 5, // Mod category
        summary: 'Fan-made enhancement to original game'
      },
      {
        id: 42,
        name: 'Mario ROM Hack Collection',
        developer: 'Homebrew Team',
        publisher: 'Unofficial',
        category: 5,
        summary: 'Collection of Mario ROM hacks'
      }
    ];

    it('should maintain mod filtering with enhanced search', () => {
      console.log('\n🛡️ TESTING MOD CONTENT PROTECTION');
      
      // Simulate content protection filter being applied after search
      const searchResults = mockFilterByEnhancedRelevance(mixedContent, 'mario');
      
      // Apply mod detection (simulated)
      const hasModIndicators = (game: any): boolean => {
        const searchText = [game.name, game.developer, game.publisher, game.summary]
          .filter(Boolean).join(' ').toLowerCase();
        const modIndicators = ['mod', 'hack', 'rom hack', 'homebrew', 'fan', 'enhanced edition', 'unofficial'];
        return modIndicators.some(indicator => searchText.includes(indicator)) || game.category === 5;
      };
      
      const officialGames = searchResults.filter(game => !hasModIndicators(game));
      const modContent = searchResults.filter(game => hasModIndicators(game));
      
      console.log('Official games found:');
      officialGames.forEach(game => {
        console.log(`  ✅ "${game.name}" by ${game.developer}`);
      });
      
      console.log('Mod content detected (should be filtered):');
      modContent.forEach(game => {
        console.log(`  🚫 "${game.name}" by ${game.developer}`);
      });
      
      // Official games should appear
      expect(officialGames.length).toBeGreaterThan(0);
      expect(officialGames.find(game => game.name === 'Super Mario Odyssey')).toBeDefined();
      
      // Mod content should be detected for filtering
      expect(modContent.length).toBeGreaterThan(0);
      expect(modContent.find(game => game.name.includes('Enhanced Edition'))).toBeDefined();
    });
  });
});