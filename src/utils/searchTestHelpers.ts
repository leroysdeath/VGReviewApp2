/**
 * Search Test Helpers
 * 
 * Utility functions for creating specific test scenarios and edge cases
 */

import { type TestGame } from './testGameDataGenerator';
import { igdbService } from '../services/igdbService';

/**
 * Generate test games for specific scenarios
 */
export class TestGameBuilder {
  private games: TestGame[] = [];
  private currentId = 1;

  /**
   * Add a flagship game to the test set
   */
  addFlagship(
    name: string, 
    franchise: string, 
    options: Partial<TestGame> = {}
  ): TestGameBuilder {
    this.games.push({
      id: this.currentId++,
      name,
      category: 0, // Main game
      rating: 90,
      metacritic_score: 92,
      user_rating: 4.5,
      user_rating_count: 100000,
      follows: 150000,
      first_release_date: 946684800, // Year 2000
      developer: 'Nintendo',
      publisher: 'Nintendo',
      platforms: [{ name: 'Nintendo Switch' }],
      genres: [{ name: 'Adventure' }],
      summary: `Flagship ${franchise} game.`,
      testReason: `Flagship game for ${franchise}`,
      ...options
    });
    
    return this;
  }

  /**
   * Add a fan-made game that should be filtered
   */
  addFanGame(
    name: string,
    basedOn: string,
    options: Partial<TestGame> = {}
  ): TestGameBuilder {
    this.games.push({
      id: this.currentId++,
      name,
      category: 5, // Mod
      rating: 75,
      developer: 'Fan Developer',
      publisher: 'Homebrew',
      platforms: [{ name: 'PC' }],
      genres: [{ name: 'Platform' }],
      summary: `Fan-made modification of ${basedOn}.`,
      testReason: 'Fan content - should be filtered',
      ...options
    });
    
    return this;
  }

  /**
   * Add a bundle/collection that should be filtered
   */
  addBundle(
    name: string,
    includedGames: string[],
    options: Partial<TestGame> = {}
  ): TestGameBuilder {
    this.games.push({
      id: this.currentId++,
      name,
      category: 3, // Bundle
      rating: 85,
      developer: 'Nintendo',
      publisher: 'Nintendo',
      platforms: [{ name: 'Nintendo Switch' }],
      genres: [{ name: 'Platform' }],
      summary: `Collection including: ${includedGames.join(', ')}.`,
      testReason: 'Bundle - should be filtered',
      ...options
    });
    
    return this;
  }

  /**
   * Add e-reader micro-content that should be filtered
   */
  addEReaderContent(
    name: string,
    baseGame: string,
    options: Partial<TestGame> = {}
  ): TestGameBuilder {
    this.games.push({
      id: this.currentId++,
      name,
      category: 0,
      rating: 70,
      developer: 'Nintendo',
      publisher: 'Nintendo',
      platforms: [{ name: 'Game Boy Advance' }],
      genres: [{ name: 'Platform' }],
      summary: `E-reader card content for ${baseGame}.`,
      testReason: 'E-reader content - should be filtered',
      ...options
    });
    
    return this;
  }

  /**
   * Add seasonal content that should be filtered
   */
  addSeasonalContent(
    name: string,
    baseGame: string,
    options: Partial<TestGame> = {}
  ): TestGameBuilder {
    this.games.push({
      id: this.currentId++,
      name,
      category: 7, // Season
      rating: 78,
      developer: 'Epic Games',
      publisher: 'Epic Games',
      platforms: [{ name: 'PC' }],
      genres: [{ name: 'Shooter' }],
      summary: `Seasonal content for ${baseGame}.`,
      testReason: 'Season content - should be filtered',
      ...options
    });
    
    return this;
  }

  /**
   * Add an edge case game for threshold testing
   */
  addEdgeCase(
    name: string,
    reason: string,
    options: Partial<TestGame> = {}
  ): TestGameBuilder {
    this.games.push({
      id: this.currentId++,
      name,
      category: 0,
      rating: 80,
      metacritic_score: 78,
      developer: 'Studio',
      publisher: 'Publisher',
      platforms: [{ name: 'PC' }],
      genres: [{ name: 'Adventure' }],
      summary: 'Edge case test game.',
      testReason: reason,
      ...options
    });
    
    return this;
  }

  /**
   * Build the final test game array
   */
  build(): TestGame[] {
    return [...this.games];
  }

  /**
   * Reset the builder
   */
  reset(): TestGameBuilder {
    this.games = [];
    this.currentId = 1;
    return this;
  }
}

/**
 * Create Mario test scenario
 */
export function createMarioTestScenario(): TestGame[] {
  return new TestGameBuilder()
    .addFlagship('Super Mario Bros. 3', 'mario', {
      rating: 94,
      metacritic_score: 97,
      first_release_date: 591840000,
      platforms: [{ name: 'Nintendo Entertainment System' }]
    })
    .addFlagship('Super Mario 64', 'mario', {
      rating: 93,
      metacritic_score: 94,
      first_release_date: 835747200,
      platforms: [{ name: 'Nintendo 64' }]
    })
    .addFlagship('Super Mario Odyssey', 'mario', {
      rating: 91,
      metacritic_score: 97,
      first_release_date: 1506816000,
      platforms: [{ name: 'Nintendo Switch' }]
    })
    .addBundle('Super Mario All-Stars', ['SMB1', 'SMB2', 'SMB3', 'Lost Levels'])
    .addFanGame('Super Mario Bros. 3 ROM Hack', 'Super Mario Bros. 3')
    .addEReaderContent('Super Mario Bros. 3-e - Goomba Challenge', 'Super Mario Bros. 3')
    .addEdgeCase('Mario Kart 8 Deluxe', 'Related franchise - should rank lower than platformers', {
      genres: [{ name: 'Racing' }]
    })
    .build();
}

/**
 * Create Pokemon test scenario
 */
export function createPokemonTestScenario(): TestGame[] {
  return new TestGameBuilder()
    .addFlagship('Pokemon Red', 'pokemon', {
      rating: 89,
      metacritic_score: 82,
      first_release_date: 835747200,
      platforms: [{ name: 'Game Boy' }],
      developer: 'Game Freak',
      publisher: 'Nintendo'
    })
    .addFlagship('Pokemon Blue', 'pokemon', {
      rating: 89,
      metacritic_score: 82,
      first_release_date: 835747200,
      platforms: [{ name: 'Game Boy' }],
      developer: 'Game Freak',
      publisher: 'Nintendo'
    })
    .addFlagship('Pokemon Gold', 'pokemon', {
      rating: 91,
      metacritic_score: 84,
      first_release_date: 946684800,
      platforms: [{ name: 'Game Boy Color' }],
      developer: 'Game Freak',
      publisher: 'The Pokemon Company'
    })
    .addFanGame('Pokemon Crystal Clear', 'Pokemon Crystal', {
      developer: 'ShockSlayer',
      publisher: 'RomHack Community'
    })
    .addBundle('Pokemon Dual Pack', ['Pokemon Red', 'Pokemon Blue'])
    .addEdgeCase('Pokemon Stadium', 'Spin-off - should rank lower than main series', {
      genres: [{ name: 'Fighting' }],
      developer: 'HAL Laboratory'
    })
    .build();
}

/**
 * Create filtering stress test
 */
export function createFilteringStressTest(): TestGame[] {
  return new TestGameBuilder()
    // Official games that should pass
    .addFlagship('Super Mario World', 'mario')
    .addFlagship('Pokemon Silver', 'pokemon')
    .addFlagship('The Legend of Zelda: A Link to the Past', 'zelda')
    
    // Fan content that should be filtered
    .addFanGame('Super Mario World ROM Hack Ultimate', 'Super Mario World')
    .addFanGame('Pokemon Light Platinum', 'Pokemon Ruby/Sapphire')
    .addFanGame('Zelda Parallel Worlds', 'A Link to the Past')
    
    // Bundles that should be filtered
    .addBundle('Nintendo All-Stars Collection', ['Multiple Nintendo Games'])
    .addBundle('Pokemon Generation 1 Bundle', ['Red', 'Blue', 'Yellow'])
    
    // E-reader content that should be filtered
    .addEReaderContent('Super Mario Advance 4: SMB3-e - Para Beetle', 'SMB3')
    .addEReaderContent('Mario vs. Donkey Kong-e - Level 1-1', 'Mario vs DK')
    
    // Season content that should be filtered
    .addSeasonalContent('Fortnite: Mario Season', 'Fortnite', {
      developer: 'Epic Games',
      publisher: 'Epic Games'
    })
    
    // Edge cases
    .addEdgeCase('New Super Mario Bros.', 'Good but not flagship - should appear but rank below flagships')
    .addEdgeCase('Pokemon Legends: Arceus', 'Modern but different style - should appear')
    
    .build();
}

/**
 * Integration test with real search service
 */
export async function testRealSearchIntegration(
  query: string,
  expectedFlagships: string[]
): Promise<{
  passed: boolean;
  foundFlagships: string[];
  missingFlagships: string[];
  unexpectedContent: string[];
  totalResults: number;
}> {
  try {
    // Use real search service
    const results = await igdbService.searchWithSequels(query, 10);
    
    const foundFlagships: string[] = [];
    const missingFlagships: string[] = [];
    const unexpectedContent: string[] = [];
    
    // Check for expected flagship games
    expectedFlagships.forEach(expectedName => {
      const found = results.some(game => {
        const gameName = game.name?.toLowerCase() || '';
        const expectedLower = expectedName.toLowerCase();
        return gameName.includes(expectedLower) || expectedLower.includes(gameName);
      });
      
      if (found) {
        foundFlagships.push(expectedName);
      } else {
        missingFlagships.push(expectedName);
      }
    });
    
    // Check for unexpected problematic content
    results.forEach(game => {
      const name = game.name?.toLowerCase() || '';
      
      if (name.includes('rom hack') || name.includes('-e -') || 
          name.includes('homebrew') || game.category === 3 || game.category === 7) {
        unexpectedContent.push(game.name);
      }
    });
    
    const flagshipCoverage = foundFlagships.length / expectedFlagships.length;
    const passed = flagshipCoverage >= 0.6 && unexpectedContent.length === 0;
    
    return {
      passed,
      foundFlagships,
      missingFlagships,
      unexpectedContent,
      totalResults: results.length
    };
    
  } catch (error) {
    return {
      passed: false,
      foundFlagships: [],
      missingFlagships: expectedFlagships,
      unexpectedContent: [`Search error: ${error}`],
      totalResults: 0
    };
  }
}

/**
 * Create test data for specific reported issues
 */
export function createRegressionTestData(): { [testCase: string]: TestGame[] } {
  return {
    'mario-party-superstars': new TestGameBuilder()
      .addFlagship('Mario Party Superstars', 'mario party', {
        developer: 'NDcube',
        publisher: 'Nintendo',
        platforms: [{ name: 'Nintendo Switch' }],
        genres: [{ name: 'Strategy' }]
      })
      .addFlagship('Super Mario Party', 'mario party', {
        developer: 'NDcube',
        publisher: 'Nintendo'
      })
      .build(),
      
    'zelda-switch-priority': new TestGameBuilder()
      .addFlagship('The Legend of Zelda: Breath of the Wild', 'zelda', {
        platforms: [{ name: 'Nintendo Switch' }],
        first_release_date: 1506816000
      })
      .addFlagship('The Legend of Zelda: Tears of the Kingdom', 'zelda', {
        platforms: [{ name: 'Nintendo Switch' }],
        first_release_date: 1672531200
      })
      .addEdgeCase('The Legend of Zelda: Breath of the Wild (Wii U)', 'Same game different platform', {
        platforms: [{ name: 'Wii U' }],
        first_release_date: 1506816000
      })
      .build(),
      
    'pokemon-publisher-variations': new TestGameBuilder()
      .addFlagship('Pokemon Red', 'pokemon', {
        developer: 'Game Freak',
        publisher: 'Nintendo'
      })
      .addFlagship('Pokemon Gold', 'pokemon', {
        developer: 'Game Freak',
        publisher: 'The Pokemon Company'
      })
      .addFlagship('Pokemon Crystal', 'pokemon', {
        developer: 'Game Freak',
        publisher: 'Pokemon Company International'
      })
      .build(),
      
    'forza-microsoft-games': new TestGameBuilder()
      .addFlagship('Forza Motorsport', 'forza', {
        developer: 'Turn 10 Studios',
        publisher: 'Microsoft',
        platforms: [{ name: 'Xbox' }],
        genres: [{ name: 'Racing' }]
      })
      .addFlagship('Forza Horizon 4', 'forza', {
        developer: 'Playground Games',
        publisher: 'Microsoft',
        platforms: [{ name: 'Xbox One' }],
        genres: [{ name: 'Racing' }]
      })
      .build()
  };
}

/**
 * Run regression tests for specific reported issues
 */
export async function runRegressionTests(): Promise<{
  testName: string;
  passed: boolean;
  details: string;
}[]> {
  const regressionData = createRegressionTestData();
  const results: { testName: string; passed: boolean; details: string; }[] = [];
  
  // Test Mario Party Superstars issue
  try {
    const marioPartyResults = await igdbService.searchWithSequels('mario party', 10);
    const hasSuperstars = marioPartyResults.some(g => 
      g.name?.toLowerCase().includes('superstars')
    );
    
    results.push({
      testName: 'Mario Party Superstars Search',
      passed: hasSuperstars,
      details: hasSuperstars 
        ? 'Mario Party Superstars found in search results'
        : 'Mario Party Superstars missing from search results'
    });
  } catch (error) {
    results.push({
      testName: 'Mario Party Superstars Search',
      passed: false,
      details: `Search failed: ${error}`
    });
  }
  
  // Test Pokemon search (was previously broken)
  try {
    const pokemonResults = await igdbService.searchWithSequels('pokemon', 10);
    const hasClassicPokemon = pokemonResults.some(g => 
      g.name?.toLowerCase().includes('pokemon red') ||
      g.name?.toLowerCase().includes('pokemon blue')
    );
    
    results.push({
      testName: 'Pokemon Search Restoration',
      passed: hasClassicPokemon && pokemonResults.length > 0,
      details: hasClassicPokemon 
        ? `Pokemon search working, found ${pokemonResults.length} results`
        : 'Pokemon search not returning classic games'
    });
  } catch (error) {
    results.push({
      testName: 'Pokemon Search Restoration',
      passed: false,
      details: `Pokemon search failed: ${error}`
    });
  }
  
  // Test Forza search (was reported as broken)
  try {
    const forzaResults = await igdbService.searchWithSequels('forza', 10);
    
    results.push({
      testName: 'Forza Search Functionality',
      passed: forzaResults.length > 0,
      details: forzaResults.length > 0 
        ? `Forza search working, found ${forzaResults.length} results`
        : 'Forza search returning no results'
    });
  } catch (error) {
    results.push({
      testName: 'Forza Search Functionality',
      passed: false,
      details: `Forza search failed: ${error}`
    });
  }
  
  return results;
}

/**
 * Performance test for search bottlenecks
 */
export async function runPerformanceTests(): Promise<{
  averageSearchTime: number;
  slowQueries: string[];
  fastQueries: string[];
  recommendations: string[];
}> {
  const testQueries = [
    'mario', 'pokemon', 'zelda', 'final fantasy', 'street fighter',
    'super mario 64', 'pokemon red', 'ocarina of time'
  ];
  
  const times: { query: string; time: number }[] = [];
  const recommendations: string[] = [];
  
  for (const query of testQueries) {
    const start = Date.now();
    
    try {
      await igdbService.searchWithSequels(query, 10);
      const time = Date.now() - start;
      times.push({ query, time });
    } catch (error) {
      times.push({ query, time: 9999 }); // Mark as extremely slow
      recommendations.push(`Query "${query}" failed: ${error}`);
    }
  }
  
  const averageTime = times.reduce((sum, t) => sum + t.time, 0) / times.length;
  const slowQueries = times.filter(t => t.time > 2000).map(t => t.query);
  const fastQueries = times.filter(t => t.time < 500).map(t => t.query);
  
  if (averageTime > 1500) {
    recommendations.push('Average search time is slow (>1.5s) - consider optimizing API calls');
  }
  
  if (slowQueries.length > 0) {
    recommendations.push(`Slow queries detected: ${slowQueries.join(', ')}`);
  }
  
  return {
    averageSearchTime: averageTime,
    slowQueries,
    fastQueries,
    recommendations
  };
}

/**
 * Comprehensive search health check
 */
export async function runSearchHealthCheck(): Promise<void> {
  console.log('🏥 Running Search System Health Check...\n');
  
  // 1. Test flagship coverage
  console.log('🎯 Testing Flagship Coverage...');
  const flagshipTests = ['mario', 'pokemon', 'zelda'];
  
  for (const franchise of flagshipTests) {
    try {
      const results = await igdbService.searchWithSequels(franchise, 10);
      const coverage = testFlagshipCoverage(results, franchise);
      
      console.log(`${franchise}: ${coverage.coverage.toFixed(1)}% flagship coverage`);
      
      if (coverage.missingFlagships.length > 0) {
        console.log(`  Missing: ${coverage.missingFlagships.join(', ')}`);
      }
    } catch (error) {
      console.log(`${franchise}: ERROR - ${error}`);
    }
  }
  
  // 2. Test content filtering
  console.log('\n🛡️ Testing Content Filtering...');
  try {
    const stressTestGames = createFilteringStressTest();
    const filtered = filterProtectedContent(stressTestGames);
    const filterTest = testContentFiltering(filtered);
    
    console.log(`Content Filter: ${filterTest.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Stats: ${filterTest.stats.totalResults} results, ${filterTest.stats.suspiciousContent} suspicious`);
    
    if (filterTest.issues.length > 0) {
      filterTest.issues.forEach(issue => console.log(`  - ${issue}`));
    }
  } catch (error) {
    console.log(`Content filtering test failed: ${error}`);
  }
  
  // 3. Run regression tests
  console.log('\n🔄 Testing Known Regressions...');
  const regressionResults = await runRegressionTests();
  
  regressionResults.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testName}: ${result.details}`);
  });
  
  // 4. Performance check
  console.log('\n⚡ Performance Check...');
  const perfResults = await runPerformanceTests();
  
  console.log(`Average search time: ${perfResults.averageSearchTime.toFixed(0)}ms`);
  
  if (perfResults.slowQueries.length > 0) {
    console.log(`Slow queries: ${perfResults.slowQueries.join(', ')}`);
  }
  
  if (perfResults.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    perfResults.recommendations.forEach(rec => console.log(`  - ${rec}`));
  }
  
  console.log('\n✅ Health check complete!');
}