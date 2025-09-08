import { gameSearchService } from '../services/gameSearchService';

describe('Franchise Coverage - 20+ Results Goal', () => {
  const TARGET_RESULTS = 20;
  
  // Major franchises that should have 20+ games
  const majorFranchises = [
    { name: 'mario', expectedMin: 20, description: 'Super Mario franchise' },
    { name: 'zelda', expectedMin: 20, description: 'Legend of Zelda franchise' },
    { name: 'pokemon', expectedMin: 20, description: 'Pokemon franchise' },
    { name: 'final fantasy', expectedMin: 20, description: 'Final Fantasy franchise' },
    { name: 'sonic', expectedMin: 15, description: 'Sonic franchise' },
    { name: 'metroid', expectedMin: 10, description: 'Metroid franchise' },
    { name: 'mega man', expectedMin: 15, description: 'Mega Man franchise' },
    { name: 'street fighter', expectedMin: 10, description: 'Street Fighter franchise' },
    { name: 'mortal kombat', expectedMin: 10, description: 'Mortal Kombat franchise' },
    { name: 'call of duty', expectedMin: 15, description: 'Call of Duty franchise' }
  ];

  // Track coverage percentages for reporting
  const coverageResults: Array<{
    franchise: string;
    found: number;
    expected: number;
    percentage: number;
    grade: string;
  }> = [];

  function calculateGrade(percentage: number): string {
    if (percentage >= 100) return 'A+';
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B+';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C+';
    if (percentage >= 50) return 'C';
    return 'D';
  }

  beforeAll(() => {
    console.log('🎯 FRANCHISE COVERAGE TEST: Testing 20+ results goal for major franchises');
  });

  afterAll(() => {
    // Calculate and display overall statistics
    const totalExpected = coverageResults.reduce((sum, r) => sum + r.expected, 0);
    const totalFound = coverageResults.reduce((sum, r) => sum + r.found, 0);
    const overallPercentage = (totalFound / totalExpected) * 100;
    const overallGrade = calculateGrade(overallPercentage);

    console.log('\n📊 FRANCHISE COVERAGE REPORT:');
    console.log('='.repeat(50));
    
    coverageResults.forEach(result => {
      console.log(`${result.franchise.toUpperCase()}: ${result.found}/${result.expected} (${result.percentage.toFixed(1)}% - ${result.grade})`);
    });
    
    console.log('='.repeat(50));
    console.log(`OVERALL: ${totalFound}/${totalExpected} (${overallPercentage.toFixed(1)}% - ${overallGrade})`);
    
    // Grade boundaries for reference
    console.log('\nGRADE SCALE:');
    console.log('A+ (100%+) | A (90-99%) | B+ (80-89%) | B (70-79%) | C+ (60-69%) | C (50-59%) | D (<50%)');
  });

  majorFranchises.forEach(franchise => {
    it(`should find at least ${franchise.expectedMin} games for ${franchise.description}`, async () => {
      console.log(`\n🔍 Testing ${franchise.name} franchise coverage...`);
      
      const searchResponse = await gameSearchService.searchGames(
        { query: franchise.name, orderBy: 'relevance' },
        { limit: 50, offset: 0 } // Request more than 20 to see full coverage
      );

      const games = searchResponse.games;
      console.log(`   Found ${games.length} games for "${franchise.name}"`);
      
      // Log first 5 games for verification
      console.log('   Top results:');
      games.slice(0, 5).forEach((game, index) => {
        console.log(`   ${index + 1}. ${game.name} (${game.developer || 'Unknown'})`);
      });

      // Calculate coverage percentage
      const percentage = Math.min((games.length / franchise.expectedMin) * 100, 100);
      const grade = calculateGrade(percentage);
      
      // Store results for final report
      coverageResults.push({
        franchise: franchise.name,
        found: games.length,
        expected: franchise.expectedMin,
        percentage,
        grade
      });

      console.log(`   Coverage: ${games.length}/${franchise.expectedMin} (${percentage.toFixed(1)}% - ${grade})`);

      // Test passes if we get at least the minimum expected
      expect(games.length).toBeGreaterThanOrEqual(franchise.expectedMin);
    }, 30000); // 30 second timeout for each franchise test
  });

  it('should achieve overall B+ grade (80%+ coverage) across all franchises', () => {
    const totalExpected = coverageResults.reduce((sum, r) => sum + r.expected, 0);
    const totalFound = coverageResults.reduce((sum, r) => sum + r.found, 0);
    const overallPercentage = (totalFound / totalExpected) * 100;

    console.log(`\n🎯 OVERALL TARGET: ${overallPercentage.toFixed(1)}% coverage (need 80%+ for B+)`);
    
    expect(overallPercentage).toBeGreaterThanOrEqual(80);
  });

  describe('Search Quality Verification', () => {
    it('should maintain relevance filtering with increased limits', async () => {
      const response = await gameSearchService.searchGames(
        { query: 'mario' },
        { limit: 30 }
      );

      // Verify that results are still relevant and not just bulk games
      const games = response.games;
      const relevantGames = games.filter(game => 
        game.name.toLowerCase().includes('mario') || 
        game.description?.toLowerCase().includes('mario') ||
        game.summary?.toLowerCase().includes('mario')
      );

      const relevancePercentage = (relevantGames.length / games.length) * 100;
      console.log(`Mario search relevance: ${relevancePercentage.toFixed(1)}% (${relevantGames.length}/${games.length})`);

      // At least 70% should be clearly Mario-related
      expect(relevancePercentage).toBeGreaterThanOrEqual(70);
    });

    it('should still filter out ROM hacks and mods with increased limits', async () => {
      const response = await gameSearchService.searchGames(
        { query: 'mario' },
        { limit: 30 }
      );

      const games = response.games;
      const modGames = games.filter(game => 
        game.category === 5 || // Mod category
        game.name.toLowerCase().includes('rom hack') ||
        game.name.toLowerCase().includes('fan made') ||
        game.developer?.toLowerCase().includes('homebrew')
      );

      console.log(`ROM hacks/mods found: ${modGames.length}/${games.length}`);
      
      // Should filter out most ROM hacks and mods
      expect(modGames.length).toBeLessThan(games.length * 0.1); // Less than 10%
    });
  });
});