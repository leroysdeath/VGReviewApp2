/**
 * Enhanced Search Analysis Tool
 * Analyzes search quality with new IGDB metrics integration
 * Tests franchise coverage and validates against real-world rankings
 */

import { supabase } from '../services/supabase';
import { GameDataServiceV2 } from '../services/gameDataServiceV2';

interface SearchAnalysisResult {
  query: string;
  totalResults: number;
  topRatedGames: Array<{
    name: string;
    total_rating: number;
    rating_count: number;
    follows: number;
    hypes: number;
    relevanceScore?: number;
    isTopTierGame?: boolean;
  }>;
  franchiseCoverage: {
    coreEntries: number;
    totalEntries: number;
    coveragePercent: number;
    missingGames: string[];
  };
  qualityMetrics: {
    averageRating: number;
    averageReviewCount: number;
    highAuthorityGames: number; // Games with 100+ reviews
    newHypedGames: number; // Games with 50+ hypes
  };
}

// Real-world franchise data for validation
const FRANCHISE_EXPECTATIONS = {
  'mario': {
    expectedCoreGames: [
      'Super Mario 64',
      'Super Mario Bros.',
      'Super Mario World',
      'Super Mario Galaxy',
      'Super Mario Odyssey',
      'Mario Kart 8',
      'Mario Kart Wii',
      'Mario Party',
      'Mario Bros.'
    ],
    minimumTopRated: 5, // At least 5 games should have 85+ rating
    expectedTotal: 40 // Should find at least 40 Mario games
  },
  'zelda': {
    expectedCoreGames: [
      'The Legend of Zelda: Ocarina of Time',
      'The Legend of Zelda: Breath of the Wild',
      'The Legend of Zelda: Majora\'s Mask',
      'The Legend of Zelda: A Link to the Past',
      'The Legend of Zelda: Wind Waker',
      'The Legend of Zelda: Twilight Princess'
    ],
    minimumTopRated: 4,
    expectedTotal: 25
  },
  'final fantasy': {
    expectedCoreGames: [
      'Final Fantasy VII',
      'Final Fantasy VI',
      'Final Fantasy X',
      'Final Fantasy IX',
      'Final Fantasy IV',
      'Final Fantasy VIII'
    ],
    minimumTopRated: 6,
    expectedTotal: 30
  },
  'pokemon': {
    expectedCoreGames: [
      'Pokémon Red',
      'Pokémon Blue',
      'Pokémon Gold',
      'Pokémon Silver',
      'Pokémon Yellow',
      'Pokémon Crystal',
      'Pokémon Ruby',
      'Pokémon Sapphire'
    ],
    minimumTopRated: 4,
    expectedTotal: 35
  }
};

describe('Enhanced Search Analysis Tool', () => {
  
  /**
   * Analyze search results for a given query
   */
  async function analyzeSearchResults(query: string): Promise<SearchAnalysisResult> {
    console.log(`\\n🔍 Analyzing search results for: "${query}"`);
    
    // Use the actual GameDataServiceV2 to get search results
    const gameService = new GameDataServiceV2();
    const results = await gameService.searchGames(query, {});
    
    console.log(`   Found ${results.length} results`);
    
    const topRatedGames = results?.slice(0, 10).map(game => ({
      name: game.name,
      total_rating: (game as any).total_rating || 0,
      rating_count: (game as any).rating_count || 0,
      follows: (game as any).follows || 0,
      hypes: (game as any).hypes || 0,
      isTopTierGame: ((game as any).total_rating || 0) >= 85
    })) || [];
    
    // Analyze franchise coverage
    const expectedGames = FRANCHISE_EXPECTATIONS[query as keyof typeof FRANCHISE_EXPECTATIONS];
    let franchiseCoverage = {
      coreEntries: 0,
      totalEntries: results?.length || 0,
      coveragePercent: 0,
      missingGames: [] as string[]
    };
    
    if (expectedGames) {
      const foundGameNames = results?.map(g => g.name.toLowerCase()) || [];
      const coreGamesFound = expectedGames.expectedCoreGames.filter(expected => 
        foundGameNames.some(found => 
          found.includes(expected.toLowerCase()) || 
          expected.toLowerCase().includes(found)
        )
      );
      
      franchiseCoverage = {
        coreEntries: coreGamesFound.length,
        totalEntries: results?.length || 0,
        coveragePercent: (coreGamesFound.length / expectedGames.expectedCoreGames.length) * 100,
        missingGames: expectedGames.expectedCoreGames.filter(expected => 
          !foundGameNames.some(found => 
            found.includes(expected.toLowerCase()) || 
            expected.toLowerCase().includes(found)
          )
        )
      };
    }
    
    // Calculate quality metrics
    const validGames = results?.filter(g => ((g as any).total_rating || 0) > 0) || [];
    const qualityMetrics = {
      averageRating: validGames.length > 0 ? validGames.reduce((sum, g) => sum + ((g as any).total_rating || 0), 0) / validGames.length : 0,
      averageReviewCount: validGames.length > 0 ? validGames.reduce((sum, g) => sum + ((g as any).rating_count || 0), 0) / validGames.length : 0,
      highAuthorityGames: validGames.filter(g => ((g as any).rating_count || 0) >= 100).length,
      newHypedGames: validGames.filter(g => ((g as any).hypes || 0) >= 50).length
    };
    
    return {
      query,
      totalResults: results?.length || 0,
      topRatedGames,
      franchiseCoverage,
      qualityMetrics
    };
  }
  
  describe('Franchise Coverage Analysis', () => {
    test('should find core Mario franchise games', async () => {
      const analysis = await analyzeSearchResults('mario');
      
      console.log('📊 Mario Franchise Analysis:');
      console.log(`Total games found: ${analysis.totalResults}`);
      console.log(`Core games coverage: ${analysis.franchiseCoverage.coreEntries}/${FRANCHISE_EXPECTATIONS.mario.expectedCoreGames.length} (${analysis.franchiseCoverage.coveragePercent.toFixed(1)}%)`);
      console.log('Top-rated games:', analysis.topRatedGames.slice(0, 5));
      console.log('Missing core games:', analysis.franchiseCoverage.missingGames);
      
      // Should find substantial number of Mario games
      expect(analysis.totalResults).toBeGreaterThanOrEqual(FRANCHISE_EXPECTATIONS.mario.expectedTotal);
      
      // Should cover at least 60% of core Mario games
      expect(analysis.franchiseCoverage.coveragePercent).toBeGreaterThanOrEqual(60);
      
      // Should have multiple high-rated games
      const topRatedCount = analysis.topRatedGames.filter(g => g.isTopTierGame).length;
      expect(topRatedCount).toBeGreaterThanOrEqual(FRANCHISE_EXPECTATIONS.mario.minimumTopRated);
    }, 30000);
    
    test('should find core Zelda franchise games', async () => {
      const analysis = await analyzeSearchResults('zelda');
      
      console.log('\\n📊 Zelda Franchise Analysis:');
      console.log(`Total games found: ${analysis.totalResults}`);
      console.log(`Core games coverage: ${analysis.franchiseCoverage.coreEntries}/${FRANCHISE_EXPECTATIONS.zelda.expectedCoreGames.length} (${analysis.franchiseCoverage.coveragePercent.toFixed(1)}%)`);
      console.log('Top-rated games:', analysis.topRatedGames.slice(0, 5));
      console.log('Missing core games:', analysis.franchiseCoverage.missingGames);
      
      expect(analysis.totalResults).toBeGreaterThanOrEqual(FRANCHISE_EXPECTATIONS.zelda.expectedTotal);
      expect(analysis.franchiseCoverage.coveragePercent).toBeGreaterThanOrEqual(50);
      
      const topRatedCount = analysis.topRatedGames.filter(g => g.isTopTierGame).length;
      expect(topRatedCount).toBeGreaterThanOrEqual(FRANCHISE_EXPECTATIONS.zelda.minimumTopRated);
    }, 30000);
    
    test('should find core Final Fantasy games', async () => {
      const analysis = await analyzeSearchResults('final fantasy');
      
      console.log('\\n📊 Final Fantasy Franchise Analysis:');
      console.log(`Total games found: ${analysis.totalResults}`);
      console.log(`Core games coverage: ${analysis.franchiseCoverage.coreEntries}/${FRANCHISE_EXPECTATIONS['final fantasy'].expectedCoreGames.length} (${analysis.franchiseCoverage.coveragePercent.toFixed(1)}%)`);
      console.log('Top-rated games:', analysis.topRatedGames.slice(0, 5));
      console.log('Missing core games:', analysis.franchiseCoverage.missingGames);
      
      expect(analysis.totalResults).toBeGreaterThanOrEqual(FRANCHISE_EXPECTATIONS['final fantasy'].expectedTotal);
      expect(analysis.franchiseCoverage.coveragePercent).toBeGreaterThanOrEqual(50);
      
      const topRatedCount = analysis.topRatedGames.filter(g => g.isTopTierGame).length;
      expect(topRatedCount).toBeGreaterThanOrEqual(FRANCHISE_EXPECTATIONS['final fantasy'].minimumTopRated);
    }, 30000);
  });
  
  describe('Quality Metrics Analysis', () => {
    test('should prioritize high-authority games', async () => {
      const analysis = await analyzeSearchResults('mario');
      
      console.log('\\n📈 Quality Metrics for Mario:');
      console.log(`Average rating: ${analysis.qualityMetrics.averageRating.toFixed(1)}/100`);
      console.log(`Average review count: ${analysis.qualityMetrics.averageReviewCount.toFixed(0)}`);
      console.log(`High authority games (100+ reviews): ${analysis.qualityMetrics.highAuthorityGames}`);
      console.log(`New hyped games (50+ hypes): ${analysis.qualityMetrics.newHypedGames}`);
      
      // Mario should have high average quality
      expect(analysis.qualityMetrics.averageRating).toBeGreaterThan(75);
      
      // Should include several well-reviewed games
      expect(analysis.qualityMetrics.highAuthorityGames).toBeGreaterThan(5);
    });
    
    test('should identify trending games with hype', async () => {
      // Test across multiple franchises for hype detection
      const franchises = ['mario', 'zelda', 'pokemon'];
      let totalHypedGames = 0;
      
      for (const franchise of franchises) {
        const analysis = await analyzeSearchResults(franchise);
        totalHypedGames += analysis.qualityMetrics.newHypedGames;
        
        console.log(`${franchise} hyped games: ${analysis.qualityMetrics.newHypedGames}`);
      }
      
      // Should find some games with significant hype across all franchises
      expect(totalHypedGames).toBeGreaterThan(0);
    });
  });
  
  describe('Search Result Distribution', () => {
    test('should show proper rating distribution', async () => {
      const analysis = await analyzeSearchResults('mario');
      
      // Analyze rating distribution
      const ratingBuckets = {
        excellent: analysis.topRatedGames.filter(g => g.total_rating >= 90).length,
        great: analysis.topRatedGames.filter(g => g.total_rating >= 80 && g.total_rating < 90).length,
        good: analysis.topRatedGames.filter(g => g.total_rating >= 70 && g.total_rating < 80).length,
        average: analysis.topRatedGames.filter(g => g.total_rating < 70).length
      };
      
      console.log('\\n📊 Rating Distribution (Top 10):');
      console.log(`Excellent (90+): ${ratingBuckets.excellent}`);
      console.log(`Great (80-89): ${ratingBuckets.great}`);
      console.log(`Good (70-79): ${ratingBuckets.good}`);
      console.log(`Average (<70): ${ratingBuckets.average}`);
      
      // Most top results should be great or excellent
      expect(ratingBuckets.excellent + ratingBuckets.great).toBeGreaterThanOrEqual(6);
    });
  });
  
  describe('Cross-Franchise Validation', () => {
    test('should validate multiple franchises meet quality thresholds', async () => {
      const franchises = Object.keys(FRANCHISE_EXPECTATIONS);
      const results = [];
      
      for (const franchise of franchises) {
        const analysis = await analyzeSearchResults(franchise);
        const expected = FRANCHISE_EXPECTATIONS[franchise as keyof typeof FRANCHISE_EXPECTATIONS];
        
        const passed = {
          franchise,
          totalGames: analysis.totalResults >= expected.expectedTotal,
          coverage: analysis.franchiseCoverage.coveragePercent >= 50,
          quality: analysis.topRatedGames.filter(g => g.isTopTierGame).length >= expected.minimumTopRated,
          avgRating: analysis.qualityMetrics.averageRating
        };
        
        results.push(passed);
        
        console.log(`\\n${franchise.toUpperCase()} Validation:`);
        console.log(`✅ Total games: ${passed.totalGames} (${analysis.totalResults}/${expected.expectedTotal})`);
        console.log(`✅ Coverage: ${passed.coverage} (${analysis.franchiseCoverage.coveragePercent.toFixed(1)}%)`);
        console.log(`✅ Quality: ${passed.quality} (${analysis.topRatedGames.filter(g => g.isTopTierGame).length}/${expected.minimumTopRated})`);
        console.log(`📊 Avg Rating: ${passed.avgRating.toFixed(1)}/100`);
      }
      
      // All major franchises should pass basic thresholds
      const passedAll = results.every(r => r.totalGames && r.coverage && r.quality);
      expect(passedAll).toBe(true);
      
      // Average rating across all franchises should be high
      const overallAvg = results.reduce((sum, r) => sum + r.avgRating, 0) / results.length;
      expect(overallAvg).toBeGreaterThan(75);
    });
  });
});