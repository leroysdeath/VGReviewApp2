/**
 * Search Filtering System Tests
 * Tests each filtering layer to identify where popular games are being lost
 */

describe('Content Protection Filter Testing', () => {
  
  test('should not over-filter official Nintendo games', () => {
    const officialNintendoGames = [
      { name: 'Super Mario Bros. 3', developer: 'Nintendo', publisher: 'Nintendo' },
      { name: 'Super Mario 64', developer: 'Nintendo EAD', publisher: 'Nintendo' },
      { name: 'The Legend of Zelda: Ocarina of Time', developer: 'Nintendo EAD', publisher: 'Nintendo' },
      { name: 'Pokemon Red', developer: 'Game Freak', publisher: 'Nintendo' }
    ];

    // Mock the content protection filter logic
    const shouldFilterContent = (game: any) => {
      // Simplified version of actual filter logic
      const franchises = ['mario', 'zelda', 'pokemon'];
      const gameText = `${game.name} ${game.developer} ${game.publisher}`.toLowerCase();
      
      const hasProtectedFranchise = franchises.some(franchise => gameText.includes(franchise));
      
      if (!hasProtectedFranchise) return false;
      
      // Check if authorized publisher/developer
      const nintendoCompanies = ['nintendo', 'game freak', 'hal laboratory'];
      const isAuthorized = nintendoCompanies.some(company => 
        game.developer?.toLowerCase().includes(company) || 
        game.publisher?.toLowerCase().includes(company)
      );
      
      return !isAuthorized; // Filter if not authorized
    };

    console.log('\n🛡️ Testing content protection on official Nintendo games:');
    officialNintendoGames.forEach(game => {
      const wouldFilter = shouldFilterContent(game);
      const status = wouldFilter ? '❌ FILTERED' : '✅ ALLOWED';
      console.log(`${status}: ${game.name} (${game.developer}/${game.publisher})`);
      
      // Official Nintendo games should NOT be filtered
      expect(wouldFilter).toBe(false);
    });
  });

  test('should filter unauthorized Nintendo fan content', () => {
    const fanContent = [
      { name: 'Super Mario Bros. ROM Hack', developer: 'Fan Developer', publisher: 'Homebrew' },
      { name: 'Mario Kart Unlimited', developer: 'Modding Community', publisher: 'Fan Made' },
      { name: 'Zelda Randomizer', developer: 'Community', publisher: 'Open Source' }
    ];

    const shouldFilterContent = (game: any) => {
      const franchises = ['mario', 'zelda', 'pokemon'];
      const gameText = `${game.name} ${game.developer} ${game.publisher}`.toLowerCase();
      
      const hasProtectedFranchise = franchises.some(franchise => gameText.includes(franchise));
      
      if (!hasProtectedFranchise) return false;
      
      const nintendoCompanies = ['nintendo', 'game freak', 'hal laboratory'];
      const isAuthorized = nintendoCompanies.some(company => 
        game.developer?.toLowerCase().includes(company) || 
        game.publisher?.toLowerCase().includes(company)
      );
      
      return !isAuthorized;
    };

    console.log('\n🚫 Testing content protection on fan content:');
    fanContent.forEach(game => {
      const wouldFilter = shouldFilterContent(game);
      const status = wouldFilter ? '✅ FILTERED' : '❌ ALLOWED';
      console.log(`${status}: ${game.name} (${game.developer}/${game.publisher})`);
      
      // Fan content should BE filtered
      expect(wouldFilter).toBe(true);
    });
  });
});

describe('Relevance Scoring Analysis', () => {
  
  test('should analyze why popular games score low', () => {
    const query = 'mario';
    const popularMarioGames = [
      'Super Mario Galaxy',
      'Super Mario Sunshine', 
      'Super Mario Bros. 3',
      'Super Mario World'
    ];

    console.log('\n🎯 Analyzing relevance scores for popular Mario games:');
    
    popularMarioGames.forEach(game => {
      // Calculate relevance using actual algorithm logic
      const calculateRelevance = (searchQuery: string, gameName: string) => {
        if (!searchQuery || !searchQuery.trim()) return 1;

        const query = searchQuery.toLowerCase().trim();
        const name = gameName.toLowerCase();

        let relevanceScore = 0;
        let maxPossibleScore = 0;

        // Exact name match (highest relevance)
        maxPossibleScore += 100;
        if (name === query) {
          relevanceScore += 100;
        } else if (name.includes(query) || query.includes(name)) {
          const matchRatio = Math.min(query.length, name.length) / Math.max(query.length, name.length);
          relevanceScore += 100 * matchRatio;
        }

        // Query words in name (very high relevance) 
        maxPossibleScore += 80;
        const queryWords = query.split(/\s+/);
        const nameWords = name.split(/\s+/);
        let nameWordMatches = 0;
        
        queryWords.forEach(queryWord => {
          if (nameWords.some(nameWord => 
            nameWord.includes(queryWord) || queryWord.includes(nameWord)
          )) {
            nameWordMatches++;
          }
        });
        
        if (queryWords.length > 0) {
          relevanceScore += 80 * (nameWordMatches / queryWords.length);
        }

        const finalRelevance = maxPossibleScore > 0 ? (relevanceScore / maxPossibleScore) : 0;
        return finalRelevance >= 0.08 ? finalRelevance : 0; // Apply franchise threshold
      };

      const relevance = calculateRelevance(query, game);
      const passes = relevance > 0;
      const status = passes ? '✅ PASSES' : '❌ FAILS';
      
      console.log(`${status}: "${game}" - Relevance: ${relevance.toFixed(3)}`);
      
      // Popular Mario games should pass relevance filtering
      expect(relevance).toBeGreaterThan(0.08);
    });
  });

  test('should identify if thresholds are too high', () => {
    const testCases = [
      { query: 'mario', game: 'Super Mario Galaxy', expectedPass: true },
      { query: 'mario', game: 'Super Mario Sunshine', expectedPass: true },
      { query: 'zelda', game: 'The Legend of Zelda: Majora\'s Mask', expectedPass: true },
      { query: 'pokemon', game: 'Pokemon Legends: Arceus', expectedPass: true }
    ];

    console.log('\n🔬 Threshold sensitivity testing:');
    
    testCases.forEach(({ query, game, expectedPass }) => {
      const fuzzyScore = fuzzyMatchScore(query, game);
      
      // Test against different thresholds
      const passes08 = fuzzyScore >= 0.08;
      const passes12 = fuzzyScore >= 0.12;
      const passes15 = fuzzyScore >= 0.15;
      
      console.log(`"${query}" -> "${game}": ${fuzzyScore.toFixed(3)}`);
      console.log(`  Threshold 0.08: ${passes08 ? '✅' : '❌'}`);
      console.log(`  Threshold 0.12: ${passes12 ? '✅' : '❌'}`);  
      console.log(`  Threshold 0.15: ${passes15 ? '✅' : '❌'}`);
      
      if (expectedPass) {
        // Popular games should pass at least the 0.08 franchise threshold
        expect(passes08).toBe(true);
      }
    });
  });
});

describe('Flagship Fallback System Testing', () => {
  
  test('should trigger flagship fallback when needed', () => {
    // Simulate scenario where Mario search returns few quality results
    const poorMarioResults = [
      { name: 'Mario & Sonic at the Olympic Games' },
      { name: 'Mario Kart Tour: Holiday Season' }
    ];

    // Calculate if flagship fallback should trigger
    const qualityMainGames = poorMarioResults.filter(game => 
      game.name.includes('Super Mario') && 
      !game.name.includes('Olympic') &&
      !game.name.includes('Party')
    );

    const shouldTriggerFallback = qualityMainGames.length < 3;

    console.log('\n🏆 Flagship Fallback Analysis:');
    console.log(`Total results: ${poorMarioResults.length}`);
    console.log(`Quality main games: ${qualityMainGames.length}`);
    console.log(`Should trigger fallback: ${shouldTriggerFallback}`);

    if (shouldTriggerFallback) {
      const flagshipPatterns = [
        'Super Mario Bros.',
        'Super Mario Bros. 3', 
        'Super Mario World',
        'Super Mario 64',
        'Super Mario Galaxy',
        'Super Mario Odyssey'
      ];

      console.log('\n🎯 Would search for flagship games:');
      flagshipPatterns.forEach((pattern, i) => {
        console.log(`${i + 1}. "${pattern}"`);
      });
    }

    expect(shouldTriggerFallback).toBe(true); // Should trigger for poor quality results
  });
});

describe('API Call Efficiency Testing', () => {
  
  test('should not make excessive API calls for single search', () => {
    // Mock API call counter
    let apiCallCount = 0;
    const mockAPICall = (searchTerm: string) => {
      apiCallCount++;
      console.log(`API Call ${apiCallCount}: "${searchTerm}"`);
      return Promise.resolve([]);
    };

    // Simulate the search with flagship fallback
    const simulateSearch = async (query: string) => {
      apiCallCount = 0;
      
      // Primary search
      await mockAPICall(query);
      
      // Sequel search
      await mockAPICall(`${query} sequel`);
      await mockAPICall(`${query} series`);
      
      // Flagship fallback (if triggered)
      const flagshipPatterns = ['Super Mario Bros.', 'Super Mario 64', 'Super Mario World'];
      for (const pattern of flagshipPatterns) {
        await mockAPICall(pattern);
      }
      
      // Fuzzy patterns (if triggered)
      const fuzzyPatterns = ['mario game', 'super mario', 'mario bros'];
      for (const pattern of fuzzyPatterns) {
        await mockAPICall(pattern);
      }
      
      return apiCallCount;
    };

    // Test API efficiency
    simulateSearch('mario').then(totalCalls => {
      console.log(`\n📊 Total API calls for "mario" search: ${totalCalls}`);
      
      // Should not exceed reasonable limit
      expect(totalCalls).toBeLessThan(15); // Current concern from user about API limits
    });
  });
});