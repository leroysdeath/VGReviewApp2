/**
 * Search System Analysis Tests
 * Deep dive into search filtering and relevance scoring issues
 */

import { fuzzyMatchScore } from '../utils/fuzzySearch';

describe('Search Filtering Pipeline Analysis', () => {
  
  test('should identify why popular games get filtered out', () => {
    // Mock the filtering pipeline stages
    const rawIGDBResults = [
      { name: 'Mario Kart Tour: Mario Bros. Tour', category: 7 }, // Season
      { name: 'Mario & Sonic at the Olympic Winter Games', category: 0 },
      { name: 'Super Mario All-Stars: Limited Edition', category: 3 }, // Bundle
      { name: 'Mario & Sonic at the Olympic Games Tokyo 2020', category: 0 },
      { name: 'Super Mario Advance 4: Super Mario Bros. 3-e - Para Beetle Challenge', category: 13 }, // E-reader
      { name: 'Mario Bros.', category: 11 } // Version
    ];

    console.log('\n🎮 Raw IGDB Results for "mario" search:');
    rawIGDBResults.forEach((game, i) => {
      console.log(`${i + 1}. ${game.name} [Category ${game.category}]`);
    });

    // Stage 1: Season filtering (category 7)
    const afterSeasonFilter = rawIGDBResults.filter(game => {
      if (game.category === 7) {
        console.log(`🚫 Season filtered: ${game.name}`);
        return false;
      }
      return true;
    });

    // Stage 2: Bundle filtering (category 3)  
    const afterBundleFilter = afterSeasonFilter.filter(game => {
      if (game.category === 3) {
        console.log(`🚫 Bundle filtered: ${game.name}`);
        return false;
      }
      return true;
    });

    // Stage 3: E-reader filtering
    const afterEReaderFilter = afterBundleFilter.filter(game => {
      if (/-e\s*-\s*.+/i.test(game.name)) {
        console.log(`🚫 E-reader filtered: ${game.name}`);
        return false;
      }
      return true;
    });

    console.log(`\n📊 Filtering Results:`);
    console.log(`Original: ${rawIGDBResults.length} games`);
    console.log(`After season filter: ${afterSeasonFilter.length} games`);
    console.log(`After bundle filter: ${afterBundleFilter.length} games`);
    console.log(`After e-reader filter: ${afterEReaderFilter.length} games`);

    console.log('\n🎯 Remaining games:');
    afterEReaderFilter.forEach((game, i) => {
      console.log(`${i + 1}. ${game.name}`);
    });

    // The issue: After filtering, we're left with mostly Olympic games, not core Mario games
    const hasCoreMario = afterEReaderFilter.some(game => 
      game.name.includes('Super Mario Bros.') || 
      game.name.includes('Super Mario 64') ||
      game.name.includes('Super Mario World')
    );

    expect(hasCoreMario).toBe(true); // This will likely fail, showing the filtering issue
  });

  test('should analyze relevance threshold impact', () => {
    const query = 'mario';
    const testGames = [
      'Super Mario Galaxy',
      'Super Mario Sunshine', 
      'Mario & Sonic at the Olympic Games',
      'Mario Kart Tour'
    ];

    const relevanceScores = testGames.map(game => ({
      name: game,
      score: fuzzyMatchScore(query, game)
    }));

    console.log('\n📊 Relevance Scores for "mario" query:');
    relevanceScores
      .sort((a, b) => b.score - a.score)
      .forEach(({ name, score }) => {
        const threshold08 = score >= 0.08 ? '✅' : '❌';
        const threshold12 = score >= 0.12 ? '✅' : '❌'; 
        console.log(`${name}: ${score.toFixed(3)} (0.08: ${threshold08}, 0.12: ${threshold12})`);
      });

    // Test current thresholds
    const passesLowThreshold = relevanceScores.filter(game => game.score >= 0.08);
    const passesHighThreshold = relevanceScores.filter(game => game.score >= 0.12);

    console.log(`\nGames passing 0.08 threshold: ${passesLowThreshold.length}`);
    console.log(`Games passing 0.12 threshold: ${passesHighThreshold.length}`);

    // Popular games should pass the lower threshold used for franchise searches
    const popularGames = relevanceScores.filter(game => 
      game.name.includes('Galaxy') || game.name.includes('Sunshine')
    );
    
    popularGames.forEach(game => {
      expect(game.score).toBeGreaterThan(0.08); // Should pass franchise threshold
    });
  });
});

describe('Cross-Franchise Search Comparison', () => {
  
  test('should compare search quality across major franchises', () => {
    const franchiseTests = [
      {
        franchise: 'Mario',
        query: 'mario',
        expectedGames: ['Super Mario Bros.', 'Super Mario 64', 'Super Mario World'],
        mockResults: [
          { name: 'Mario & Sonic Olympic Games' },
          { name: 'Mario Kart Tour' },
          { name: 'Super Mario Bros.' }
        ]
      },
      {
        franchise: 'Zelda', 
        query: 'zelda',
        expectedGames: ['The Legend of Zelda', 'Ocarina of Time', 'Breath of the Wild'],
        mockResults: [
          { name: 'The Legend of Zelda' },
          { name: 'Hyrule Warriors' },
          { name: 'Zelda: Wand of Gamelon' }
        ]
      },
      {
        franchise: 'Pokemon',
        query: 'pokemon', 
        expectedGames: ['Pokemon Red', 'Pokemon Blue', 'Pokemon Gold'],
        mockResults: [
          { name: 'Pokemon Stadium' },
          { name: 'Pokemon Mystery Dungeon' },
          { name: 'Pokemon GO' }
        ]
      }
    ];

    const franchiseQuality = [];

    franchiseTests.forEach(({ franchise, query, expectedGames, mockResults }) => {
      let foundCount = 0;
      
      expectedGames.forEach(expectedGame => {
        const found = mockResults.some(result => 
          fuzzyMatchScore(expectedGame, result.name) > 0.5
        );
        if (found) foundCount++;
      });

      const qualityPercentage = (foundCount / expectedGames.length) * 100;
      franchiseQuality.push({ franchise, quality: qualityPercentage, foundCount, total: expectedGames.length });

      console.log(`\n${franchise} franchise quality: ${foundCount}/${expectedGames.length} (${qualityPercentage.toFixed(1)}%)`);
    });

    // Report overall search system health
    const averageQuality = franchiseQuality.reduce((sum, f) => sum + f.quality, 0) / franchiseQuality.length;
    console.log(`\n📈 Overall search quality: ${averageQuality.toFixed(1)}%`);

    // Flag franchises with poor search quality
    const poorQuality = franchiseQuality.filter(f => f.quality < 50);
    if (poorQuality.length > 0) {
      console.log('\n🚨 Franchises with poor search quality:');
      poorQuality.forEach(f => {
        console.log(`- ${f.franchise}: ${f.quality.toFixed(1)}% (${f.foundCount}/${f.total})`);
      });
    }

    expect(averageQuality).toBeGreaterThan(60); // Expect at least 60% average quality
  });
});

describe('Search Threshold Sensitivity Analysis', () => {
  
  test('should test different relevance thresholds', () => {
    const query = 'mario';
    const testCases = [
      'Super Mario Galaxy',
      'Super Mario Sunshine',
      'Mario Party', 
      'Mario & Sonic Olympic Games'
    ];

    const thresholds = [0.05, 0.08, 0.12, 0.15, 0.20];
    
    console.log('\n📊 Threshold Sensitivity Analysis:');
    console.log('Game Title'.padEnd(35) + thresholds.map(t => t.toString().padStart(6)).join(''));
    console.log('-'.repeat(35 + thresholds.length * 6));

    testCases.forEach(gameTitle => {
      const score = fuzzyMatchScore(query, gameTitle);
      const results = thresholds.map(threshold => score >= threshold ? '✅' : '❌');
      
      console.log(gameTitle.padEnd(35) + results.map(r => r.padStart(6)).join(''));
    });

    // Test if current thresholds are too restrictive
    const popularGames = ['Super Mario Galaxy', 'Super Mario Sunshine'];
    popularGames.forEach(game => {
      const score = fuzzyMatchScore(query, game);
      console.log(`\n${game} relevance: ${score.toFixed(3)}`);
      
      // These should pass the franchise threshold (0.08) at minimum
      expect(score).toBeGreaterThan(0.08);
    });
  });
});

describe('Series with Lots of Games Testing', () => {
  
  test('should handle Final Fantasy series search quality', () => {
    const ffGames = [
      'Final Fantasy VII',
      'Final Fantasy X', 
      'Final Fantasy VI',
      'Final Fantasy IX',
      'Final Fantasy IV',
      'Final Fantasy XV',
      'Final Fantasy XIV',
      'Final Fantasy XVI'
    ];

    const mockFFResults = [
      { name: 'Final Fantasy VII' },
      { name: 'Final Fantasy XIV Online' },
      { name: 'Final Fantasy Type-0' },
      { name: 'Dissidia Final Fantasy' }
    ];

    let foundMainline = 0;
    ffGames.forEach(game => {
      const found = mockFFResults.some(result => 
        fuzzyMatchScore(game, result.name) > 0.6
      );
      if (found) foundMainline++;
    });

    console.log(`Final Fantasy mainline found: ${foundMainline}/${ffGames.length}`);
    expect(foundMainline).toBeGreaterThan(1);
  });

  test('should handle Mega Man series search quality', () => {
    const megaManGames = [
      'Mega Man',
      'Mega Man 2',
      'Mega Man 3', 
      'Mega Man X',
      'Mega Man X2',
      'Mega Man Zero',
      'Mega Man Legends'
    ];

    // Test fuzzy matching for numbered series
    megaManGames.forEach(game => {
      const score = fuzzyMatchScore('mega man', game);
      console.log(`"mega man" -> "${game}": ${score.toFixed(3)}`);
      expect(score).toBeGreaterThan(0.5); // Should recognize series entries
    });
  });
});