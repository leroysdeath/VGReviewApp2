import { gameSearchService } from '../services/gameSearchService';

describe('Phase 1: Result Limit Improvements', () => {
  // Test franchises that should benefit most from increased limits
  const testFranchises = [
    { 
      name: 'mario', 
      expectedBefore: 30, // Previous limit
      expectedAfter: 50,  // New base limit 
      majorFranchise: true 
    },
    { 
      name: 'zelda', 
      expectedBefore: 30, 
      expectedAfter: 50,
      majorFranchise: true 
    },
    { 
      name: 'mega man', 
      expectedBefore: 30, 
      expectedAfter: 50,
      majorFranchise: true 
    },
    { 
      name: 'metal gear', 
      expectedBefore: 30, 
      expectedAfter: 50,
      majorFranchise: true 
    },
    { 
      name: 'pokemon', 
      expectedBefore: 30, 
      expectedAfter: 50,
      majorFranchise: true 
    }
  ];

  let coverageResults: Array<{
    franchise: string;
    resultCount: number;
    isMajorFranchise: boolean;
    dynamicLimitTriggered: boolean;
    responseTime: number;
  }> = [];

  beforeAll(() => {
    console.log('\n🚀 PHASE 1 TESTING: Measuring franchise coverage improvements');
    console.log('Expected improvements:');
    console.log('- Base limit: 30 → 50 games (+66% more results)');
    console.log('- Major franchises: 50 → 75 games (+50% more results)');
  });

  afterAll(() => {
    // Calculate and display Phase 1 improvement statistics
    const majorFranchiseResults = coverageResults.filter(r => r.isMajorFranchise);
    const averageResults = majorFranchiseResults.reduce((sum, r) => sum + r.resultCount, 0) / majorFranchiseResults.length;
    const averageResponseTime = coverageResults.reduce((sum, r) => sum + r.responseTime, 0) / coverageResults.length;
    const dynamicLimitUsage = coverageResults.filter(r => r.dynamicLimitTriggered).length;

    console.log('\n📊 PHASE 1 IMPROVEMENT RESULTS:');
    console.log('='.repeat(50));
    
    coverageResults.forEach(result => {
      const limitUsed = result.dynamicLimitTriggered ? '75 (major)' : '50 (base)';
      console.log(`${result.franchise.toUpperCase()}: ${result.resultCount} games (limit: ${limitUsed}) - ${result.responseTime.toFixed(2)}s`);
    });
    
    console.log('='.repeat(50));
    console.log(`AVERAGE RESULTS: ${averageResults.toFixed(1)} games (target: 40+)`);
    console.log(`AVERAGE RESPONSE TIME: ${averageResponseTime.toFixed(2)}s (target: <3s)`);
    console.log(`DYNAMIC LIMIT USAGE: ${dynamicLimitUsage}/${coverageResults.length} franchises`);
    
    // Phase 1 success criteria
    console.log('\n✅ PHASE 1 SUCCESS CRITERIA:');
    console.log(`- Average results ≥40: ${averageResults >= 40 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- Response time <3s: ${averageResponseTime < 3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`- Major franchises detected: ${dynamicLimitUsage >= 3 ? '✅ PASS' : '❌ FAIL'}`);
  });

  testFranchises.forEach(franchise => {
    it(`should return 40+ results for ${franchise.name} franchise`, async () => {
      console.log(`\n🔍 Testing ${franchise.name} franchise improvements...`);
      
      const startTime = performance.now();
      
      // Test with no explicit limit to use new defaults
      const searchResponse = await gameSearchService.searchGames(
        { query: franchise.name, orderBy: 'relevance' },
        {} // No pagination specified - should use new dynamic defaults
      );
      
      const endTime = performance.now();
      const responseTime = (endTime - startTime) / 1000;

      const games = searchResponse.games;
      const resultCount = games.length;

      console.log(`   Found ${resultCount} games for "${franchise.name}"`);
      console.log(`   Response time: ${responseTime.toFixed(2)}s`);
      console.log(`   Sample results:`);
      games.slice(0, 5).forEach((game, index) => {
        console.log(`   ${index + 1}. ${game.name} (${game.developer || 'Unknown'})`);
      });

      // Check if dynamic limit was likely triggered (more than 50 results suggests 75 limit was used)
      const dynamicLimitTriggered = resultCount > 50;
      if (dynamicLimitTriggered) {
        console.log(`   🎯 Major franchise detection worked! Got ${resultCount} > 50 results`);
      }

      // Store results for final analysis
      coverageResults.push({
        franchise: franchise.name,
        resultCount,
        isMajorFranchise: franchise.majorFranchise,
        dynamicLimitTriggered,
        responseTime
      });

      // Phase 1 should deliver at least 40 results for major franchises
      const minExpected = franchise.majorFranchise ? 40 : 30;
      expect(resultCount).toBeGreaterThanOrEqual(minExpected);
      
      // Performance should remain good
      expect(responseTime).toBeLessThan(5); // Allow some margin for testing environment
    }, 30000);
  });

  describe('Quality Assurance - Filters Still Work', () => {
    it('should maintain ROM hack filtering with increased limits', async () => {
      const response = await gameSearchService.searchGames(
        { query: 'mario' },
        {} // Use new default limits
      );

      const games = response.games;
      const modGames = games.filter(game => 
        game.category === 5 || // Mod category
        game.name?.toLowerCase().includes('rom hack') ||
        game.name?.toLowerCase().includes('fan made')
      );

      console.log(`ROM hacks found: ${modGames.length}/${games.length} in expanded results`);
      
      // Should still filter out most ROM hacks
      expect(modGames.length).toBeLessThan(games.length * 0.1); // Less than 10%
    });

    it('should maintain search relevance with increased limits', async () => {
      const response = await gameSearchService.searchGames(
        { query: 'zelda' },
        {} // Use new default limits
      );

      const games = response.games;
      const relevantGames = games.filter(game => 
        game.name?.toLowerCase().includes('zelda') || 
        game.name?.toLowerCase().includes('link') ||
        game.description?.toLowerCase().includes('zelda') ||
        game.summary?.toLowerCase().includes('zelda')
      );

      const relevancePercentage = (relevantGames.length / games.length) * 100;
      console.log(`Zelda search relevance: ${relevancePercentage.toFixed(1)}% (${relevantGames.length}/${games.length})`);

      // Should maintain good relevance even with more results
      expect(relevancePercentage).toBeGreaterThanOrEqual(70);
    });
  });

  describe('Performance Verification', () => {
    it('should maintain good performance with increased limits', async () => {
      const testQueries = ['mario', 'zelda', 'pokemon'];
      const responseTimes: number[] = [];

      for (const query of testQueries) {
        const startTime = performance.now();
        await gameSearchService.searchGames({ query }, {});
        const endTime = performance.now();
        const responseTime = (endTime - startTime) / 1000;
        responseTimes.push(responseTime);
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      console.log(`Average response time across ${testQueries.length} queries: ${avgResponseTime.toFixed(2)}s`);

      // Should maintain good performance
      expect(avgResponseTime).toBeLessThan(3);
    });
  });
});