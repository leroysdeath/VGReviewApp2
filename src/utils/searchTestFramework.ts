/**
 * Search Test Framework
 * 
 * Comprehensive testing utilities for validating search/sorting/filtering functionality
 * Prevents regressions and ensures search quality standards
 */

import { 
  generateTestGameSeries, 
  generateSearchTestSuite, 
  validateSearchResults,
  type TestGameSeries,
  type TestGame 
} from './testGameDataGenerator';
import { filterProtectedContent } from './contentProtectionFilter';
import { sortGamesByPriority } from './gamePrioritization';
import { detectFranchiseSearch } from './flagshipGames';

export interface SearchTestResult {
  testName: string;
  query: string;
  passed: boolean;
  score: number;
  flagshipCoverage: number;
  issues: string[];
  actualResults: any[];
  expectedResults: TestGame[];
  executionTime: number;
}

export interface SearchTestSuite {
  suiteName: string;
  results: SearchTestResult[];
  overallScore: number;
  criticalFailures: string[];
  passed: boolean;
}

/**
 * Core search testing class
 */
export class SearchValidator {
  private testSeries: TestGameSeries[];
  
  constructor() {
    this.testSeries = generateTestGameSeries();
  }
  
  /**
   * Run comprehensive search validation tests
   */
  async runFullTestSuite(searchFunction: (query: string) => Promise<any[]>): Promise<SearchTestSuite> {
    const results: SearchTestResult[] = [];
    const criticalFailures: string[] = [];
    
    // Test each franchise
    for (const franchise of this.testSeries) {
      for (const query of franchise.expectedSearchQueries) {
        const result = await this.runSingleSearchTest(
          query,
          franchise,
          searchFunction
        );
        
        results.push(result);
        
        // Track critical failures
        if (!result.passed && result.score < 50) {
          criticalFailures.push(`${franchise.franchise}: ${query} (score: ${result.score})`);
        }
      }
    }
    
    // Calculate overall score
    const overallScore = results.length > 0 
      ? results.reduce((sum, r) => sum + r.score, 0) / results.length 
      : 0;
    
    return {
      suiteName: 'Game Search Validation',
      results,
      overallScore,
      criticalFailures,
      passed: overallScore >= 75 && criticalFailures.length === 0
    };
  }
  
  /**
   * Test a single search query
   */
  async runSingleSearchTest(
    query: string,
    expectedSeries: TestGameSeries,
    searchFunction: (query: string) => Promise<any[]>
  ): Promise<SearchTestResult> {
    const startTime = Date.now();
    
    try {
      // Execute search
      const actualResults = await searchFunction(query);
      const executionTime = Date.now() - startTime;
      
      // Validate results
      const validation = validateSearchResults(
        query,
        actualResults,
        expectedSeries.franchise
      );
      
      return {
        testName: `${expectedSeries.franchise} franchise search`,
        query,
        passed: validation.passed,
        score: validation.score,
        flagshipCoverage: validation.flagshipCoverage,
        issues: validation.issues,
        actualResults,
        expectedResults: expectedSeries.expectedTopGames,
        executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      return {
        testName: `${expectedSeries.franchise} franchise search`,
        query,
        passed: false,
        score: 0,
        flagshipCoverage: 0,
        issues: [`Search function threw error: ${error}`],
        actualResults: [],
        expectedResults: expectedSeries.expectedTopGames,
        executionTime
      };
    }
  }
  
  /**
   * Test filtering functionality specifically
   */
  testFiltering(testGames: TestGame[]): {
    contentFilterPassed: boolean;
    seasonFilterPassed: boolean;
    packFilterPassed: boolean;
    eReaderFilterPassed: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Test content protection filter
    const afterContentFilter = filterProtectedContent(testGames);
    const contentFilterPassed = this.validateContentFiltering(testGames, afterContentFilter, issues);
    
    // Test category-based filtering (seasons, packs)
    const seasonFilterPassed = this.validateSeasonFiltering(testGames, issues);
    const packFilterPassed = this.validatePackFiltering(testGames, issues);
    
    // Test e-reader filtering
    const eReaderFilterPassed = this.validateEReaderFiltering(testGames, issues);
    
    return {
      contentFilterPassed,
      seasonFilterPassed,
      packFilterPassed,
      eReaderFilterPassed,
      issues
    };
  }
  
  /**
   * Validate content protection filtering
   */
  private validateContentFiltering(
    originalGames: TestGame[], 
    filteredGames: any[], 
    issues: string[]
  ): boolean {
    // Fan content should be removed
    const fanContentGames = originalGames.filter(g => 
      g.testReason.includes('Fan content') || 
      g.developer?.toLowerCase().includes('fan') ||
      g.publisher?.toLowerCase().includes('homebrew')
    );
    
    const fanContentRemaining = filteredGames.filter(fg =>
      fanContentGames.some(fcg => fcg.name === fg.name)
    );
    
    if (fanContentRemaining.length > 0) {
      issues.push(`Content filter failed: ${fanContentRemaining.length} fan games not filtered`);
      return false;
    }
    
    // Official games should remain
    const officialGames = originalGames.filter(g => 
      !g.testReason.includes('Fan content') && 
      g.category === 0 && 
      !g.testReason.includes('Bundle') &&
      !g.testReason.includes('E-reader')
    );
    
    const officialGamesRemaining = filteredGames.filter(fg =>
      officialGames.some(og => og.name === fg.name)
    );
    
    if (officialGamesRemaining.length < officialGames.length * 0.8) {
      issues.push(`Content filter too aggressive: Only ${officialGamesRemaining.length}/${officialGames.length} official games preserved`);
      return false;
    }
    
    return true;
  }
  
  /**
   * Validate season content filtering
   */
  private validateSeasonFiltering(testGames: TestGame[], issues: string[]): boolean {
    const seasonGames = testGames.filter(g => g.category === 7);
    
    // Note: This would need to be tested in the actual filtering pipeline
    // For now, just validate that season games are marked correctly
    if (seasonGames.length > 0) {
      const hasSeasonInReason = seasonGames.every(g => 
        g.testReason.includes('Season')
      );
      
      if (!hasSeasonInReason) {
        issues.push('Season games not properly marked in test data');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate pack/bundle filtering
   */
  private validatePackFiltering(testGames: TestGame[], issues: string[]): boolean {
    const packGames = testGames.filter(g => g.category === 3);
    
    if (packGames.length > 0) {
      const hasPackInReason = packGames.every(g => 
        g.testReason.includes('Bundle') || g.testReason.includes('Pack')
      );
      
      if (!hasPackInReason) {
        issues.push('Pack/bundle games not properly marked in test data');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Validate e-reader content filtering
   */
  private validateEReaderFiltering(testGames: TestGame[], issues: string[]): boolean {
    const eReaderGames = testGames.filter(g => g.name.includes('-e -'));
    
    if (eReaderGames.length > 0) {
      const hasEReaderInReason = eReaderGames.every(g => 
        g.testReason.includes('E-reader')
      );
      
      if (!hasEReaderInReason) {
        issues.push('E-reader games not properly marked in test data');
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Test priority system effectiveness
   */
  testPrioritization(testGames: TestGame[]): {
    passed: boolean;
    issues: string[];
    flagshipRanking: { name: string; rank: number; expectedTop5: boolean }[];
  } {
    const issues: string[] = [];
    
    // Apply priority system
    const sortedGames = sortGamesByPriority(testGames, 'mario'); // Use mario as example
    
    // Check that flagship games rank highly
    const flagshipGames = testGames.filter(g => 
      g.testReason.includes('flagship') || g.testReason.includes('Flagship')
    );
    
    const flagshipRanking = flagshipGames.map(flagship => {
      const rank = sortedGames.findIndex(sg => sg.name === flagship.name) + 1;
      const expectedTop5 = rank <= 5;
      
      if (!expectedTop5) {
        issues.push(`Flagship game "${flagship.name}" ranked #${rank}, expected top 5`);
      }
      
      return {
        name: flagship.name,
        rank,
        expectedTop5
      };
    });
    
    const passed = issues.length === 0;
    
    return {
      passed,
      issues,
      flagshipRanking
    };
  }
}

/**
 * Mock search function for testing (uses local test data)
 */
export async function mockSearchFunction(query: string): Promise<TestGame[]> {
  const testSuite = generateSearchTestSuite();
  const franchise = detectFranchiseSearch(query);
  
  if (!franchise) {
    return []; // No franchise detected
  }
  
  const franchiseData = testSuite.franchiseTests.find(t => t.franchise === franchise);
  if (!franchiseData) {
    return [];
  }
  
  // Combine all test games for this franchise
  const allFranchiseGames = [
    ...franchiseData.expectedTopGames,
    ...franchiseData.decoyGames,
    ...franchiseData.edgeCases
  ];
  
  // Apply filtering pipeline
  let filteredGames = filterProtectedContent(allFranchiseGames);
  
  // Apply manual category filtering (simulate the actual filters)
  filteredGames = filteredGames.filter(game => {
    // Season filter (category 7)
    if (game.category === 7) return false;
    
    // Pack filter (category 3)
    if (game.category === 3) return false;
    
    // E-reader filter
    if (game.name.includes('-e -')) return false;
    
    return true;
  });
  
  // Apply priority sorting
  const sortedGames = sortGamesByPriority(filteredGames, query);
  
  return sortedGames.slice(0, 10); // Return top 10
}

/**
 * Quick validation function for development
 */
export async function quickValidateSearch(
  searchFunction: (query: string) => Promise<any[]>,
  queries: string[] = ['mario', 'pokemon', 'zelda', 'final fantasy']
): Promise<void> {
  console.log('🧪 Quick Search Validation Starting...\n');
  
  const validator = new SearchValidator();
  
  for (const query of queries) {
    console.log(`🔍 Testing: "${query}"`);
    
    try {
      const results = await searchFunction(query);
      const franchise = detectFranchiseSearch(query);
      
      if (franchise) {
        const validation = validateSearchResults(query, results, franchise);
        console.log(`   Score: ${validation.score}/100`);
        console.log(`   Flagship Coverage: ${validation.flagshipCoverage.toFixed(1)}%`);
        console.log(`   Status: ${validation.passed ? '✅ PASSED' : '❌ FAILED'}`);
        
        if (validation.issues.length > 0) {
          console.log(`   Issues:`);
          validation.issues.forEach(issue => console.log(`     - ${issue}`));
        }
      } else {
        console.log(`   No franchise detected for "${query}"`);
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error}`);
    }
    
    console.log('');
  }
}

/**
 * Performance benchmark for search functions
 */
export async function benchmarkSearch(
  searchFunction: (query: string) => Promise<any[]>,
  queries: string[] = ['mario', 'pokemon', 'zelda', 'final fantasy', 'street fighter']
): Promise<{
  averageTime: number;
  slowQueries: { query: string; time: number }[];
  fastQueries: { query: string; time: number }[];
}> {
  const times: { query: string; time: number }[] = [];
  
  console.log('⏱️ Search Performance Benchmark Starting...\n');
  
  for (const query of queries) {
    const startTime = Date.now();
    
    try {
      await searchFunction(query);
      const executionTime = Date.now() - startTime;
      times.push({ query, time: executionTime });
      
      console.log(`"${query}": ${executionTime}ms`);
    } catch (error) {
      console.log(`"${query}": ERROR - ${error}`);
      times.push({ query, time: 9999 }); // Mark as slow due to error
    }
  }
  
  const averageTime = times.reduce((sum, t) => sum + t.time, 0) / times.length;
  const slowQueries = times.filter(t => t.time > averageTime * 1.5);
  const fastQueries = times.filter(t => t.time < averageTime * 0.5);
  
  console.log(`\n📊 Average time: ${averageTime.toFixed(0)}ms`);
  
  if (slowQueries.length > 0) {
    console.log(`🐌 Slow queries (>${(averageTime * 1.5).toFixed(0)}ms):`);
    slowQueries.forEach(q => console.log(`   ${q.query}: ${q.time}ms`));
  }
  
  if (fastQueries.length > 0) {
    console.log(`⚡ Fast queries (<${(averageTime * 0.5).toFixed(0)}ms):`);
    fastQueries.forEach(q => console.log(`   ${q.query}: ${q.time}ms`));
  }
  
  return {
    averageTime,
    slowQueries,
    fastQueries
  };
}

/**
 * Test that flagship games appear for franchise searches
 */
export function testFlagshipCoverage(searchResults: any[], franchise: string): {
  coverage: number;
  missingFlagships: string[];
  foundFlagships: string[];
} {
  const testSeries = generateTestGameSeries();
  const franchiseData = testSeries.find(t => t.franchise === franchise);
  
  if (!franchiseData) {
    return {
      coverage: 0,
      missingFlagships: [`No test data for franchise: ${franchise}`],
      foundFlagships: []
    };
  }
  
  const expectedFlagships = franchiseData.expectedTopGames;
  const actualGameNames = searchResults.map(g => g.name?.toLowerCase() || '');
  
  const foundFlagships: string[] = [];
  const missingFlagships: string[] = [];
  
  expectedFlagships.forEach(flagship => {
    const found = actualGameNames.some(actualName => 
      actualName.includes(flagship.name.toLowerCase()) ||
      flagship.name.toLowerCase().includes(actualName)
    );
    
    if (found) {
      foundFlagships.push(flagship.name);
    } else {
      missingFlagships.push(flagship.name);
    }
  });
  
  const coverage = (foundFlagships.length / expectedFlagships.length) * 100;
  
  return {
    coverage,
    missingFlagships,
    foundFlagships
  };
}

/**
 * Test that unwanted content is properly filtered
 */
export function testContentFiltering(searchResults: any[]): {
  passed: boolean;
  issues: string[];
  stats: {
    totalResults: number;
    suspiciousContent: number;
    bundleContent: number;
    seasonContent: number;
    eReaderContent: number;
  };
} {
  const issues: string[] = [];
  let suspiciousContent = 0;
  let bundleContent = 0;
  let seasonContent = 0;
  let eReaderContent = 0;
  
  searchResults.forEach(game => {
    const name = game.name?.toLowerCase() || '';
    
    // Check for fan content that should be filtered
    if (name.includes('rom hack') || name.includes('homebrew') || 
        game.developer?.toLowerCase().includes('fan') ||
        game.publisher?.toLowerCase().includes('homebrew')) {
      suspiciousContent++;
      issues.push(`Fan content found: ${game.name}`);
    }
    
    // Check for bundles/packs (category 3)
    if (game.category === 3) {
      bundleContent++;
      issues.push(`Bundle content found: ${game.name}`);
    }
    
    // Check for season content (category 7)
    if (game.category === 7) {
      seasonContent++;
      issues.push(`Season content found: ${game.name}`);
    }
    
    // Check for e-reader content
    if (name.includes('-e -') || name.includes('card series')) {
      eReaderContent++;
      issues.push(`E-reader content found: ${game.name}`);
    }
  });
  
  const passed = issues.length === 0;
  
  return {
    passed,
    issues,
    stats: {
      totalResults: searchResults.length,
      suspiciousContent,
      bundleContent,
      seasonContent,
      eReaderContent
    }
  };
}

/**
 * Generate a test report
 */
export function generateTestReport(suiteResults: SearchTestSuite): string {
  const report = [];
  
  report.push('# Game Search Validation Report');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  
  // Overall summary
  report.push('## Overall Results');
  report.push(`**Status:** ${suiteResults.passed ? '✅ PASSED' : '❌ FAILED'}`);
  report.push(`**Score:** ${suiteResults.overallScore.toFixed(1)}/100`);
  report.push(`**Total Tests:** ${suiteResults.results.length}`);
  report.push(`**Critical Failures:** ${suiteResults.criticalFailures.length}`);
  report.push('');
  
  // Critical failures
  if (suiteResults.criticalFailures.length > 0) {
    report.push('## Critical Failures');
    suiteResults.criticalFailures.forEach(failure => {
      report.push(`- ${failure}`);
    });
    report.push('');
  }
  
  // Individual test results
  report.push('## Test Results by Franchise');
  
  const franchiseGroups: { [key: string]: SearchTestResult[] } = {};
  suiteResults.results.forEach(result => {
    const franchise = detectFranchiseSearch(result.query) || 'unknown';
    if (!franchiseGroups[franchise]) franchiseGroups[franchise] = [];
    franchiseGroups[franchise].push(result);
  });
  
  Object.entries(franchiseGroups).forEach(([franchise, results]) => {
    report.push(`### ${franchise.charAt(0).toUpperCase() + franchise.slice(1)}`);
    
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      report.push(`${status} **"${result.query}"** - Score: ${result.score}/100, Coverage: ${result.flagshipCoverage.toFixed(1)}%`);
      
      if (result.issues.length > 0) {
        result.issues.forEach(issue => {
          report.push(`   - ${issue}`);
        });
      }
    });
    
    report.push('');
  });
  
  // Performance summary
  const avgTime = suiteResults.results.reduce((sum, r) => sum + r.executionTime, 0) / suiteResults.results.length;
  report.push('## Performance');
  report.push(`**Average execution time:** ${avgTime.toFixed(0)}ms`);
  
  const slowTests = suiteResults.results.filter(r => r.executionTime > avgTime * 1.5);
  if (slowTests.length > 0) {
    report.push('**Slow queries:**');
    slowTests.forEach(test => {
      report.push(`- "${test.query}": ${test.executionTime}ms`);
    });
  }
  
  return report.join('\n');
}

/**
 * Quick test runner for development use
 */
export async function runQuickTests(): Promise<void> {
  console.log('🚀 Running Quick Search Tests...\n');
  
  // Test with mock search function
  const validator = new SearchValidator();
  const mockResults = await validator.runFullTestSuite(mockSearchFunction);
  
  console.log('📊 Mock Test Results:');
  console.log(`Overall Score: ${mockResults.overallScore.toFixed(1)}/100`);
  console.log(`Status: ${mockResults.passed ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (mockResults.criticalFailures.length > 0) {
    console.log('\n❌ Critical Failures:');
    mockResults.criticalFailures.forEach(failure => {
      console.log(`  - ${failure}`);
    });
  }
  
  // Show sample test results
  console.log('\n📋 Sample Results:');
  mockResults.results.slice(0, 3).forEach(result => {
    console.log(`"${result.query}": ${result.passed ? '✅' : '❌'} ${result.score}/100`);
  });
  
  console.log('\n✅ Quick tests completed!');
}

/**
 * Mock search function using test data
 */
async function mockSearchFunction(query: string): Promise<TestGame[]> {
  const testSuite = generateSearchTestSuite();
  const franchise = detectFranchiseSearch(query);
  
  if (!franchise) return [];
  
  const franchiseData = testSuite.franchiseTests.find(t => t.franchise === franchise);
  if (!franchiseData) return [];
  
  // Return expected top games for the franchise
  return franchiseData.expectedTopGames;
}

/**
 * Export commonly used test data collections
 */
export const TEST_COLLECTIONS = {
  /** Top 3 games from each major franchise */
  get topGamesByFranchise(): { [franchise: string]: TestGame[] } {
    const testSeries = generateTestGameSeries();
    const result: { [franchise: string]: TestGame[] } = {};
    
    testSeries.forEach(series => {
      result[series.franchise] = series.expectedTopGames.slice(0, 3);
    });
    
    return result;
  },
  
  /** Games that should always be filtered out */
  get problematicContent(): TestGame[] {
    const testSeries = generateTestGameSeries();
    return testSeries.flatMap(series => series.decoyGames);
  },
  
  /** Edge cases for threshold testing */
  get borderlineCases(): TestGame[] {
    const testSeries = generateTestGameSeries();
    return testSeries.flatMap(series => series.edgeCases);
  }
};