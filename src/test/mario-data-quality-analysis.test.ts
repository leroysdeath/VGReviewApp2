import { searchDiagnosticService } from '../services/searchDiagnosticService';
import { resultAnalysisService } from '../services/resultAnalysisService';

describe('Mario Search Data Quality Analysis', () => {
  beforeAll(() => {
    // Set test environment variables
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-key';
  });

  test('should analyze Mario search results for IGDB data quality', async () => {
    console.log('\n=== Mario Search Data Quality Analysis ===\n');
    
    try {
      // 1. Perform Mario search using diagnostic service
      const diagnostic = await searchDiagnosticService.analyzeSingleSearch('mario');
      
      console.log(`📊 Database results: ${diagnostic.dbResults.totalCount}`);
      console.log(`🔍 IGDB results: ${diagnostic.igdbResults?.count || 0}`);
      console.log(`⏱️ Total search time: ${diagnostic.performance.totalDuration}ms`);
      
      // 2. Get the actual search results from the resultAnalysis
      const resultAnalysis = diagnostic.resultAnalysis;
      const analysisResults = resultAnalysis.individualResults;
      
      // 3. Identify iconic Mario games we should expect to see
      const expectedMarioGames = [
        'Super Mario Bros',
        'Super Mario World',
        'Super Mario 64',
        'Super Mario Odyssey',
        'Mario Kart 8',
        'Mario Kart Deluxe',
        'Mario Party',
        'Super Mario Galaxy',
        'New Super Mario Bros',
        'Mario Bros'
      ];
      
      console.log('\n🎯 EXPECTED ICONIC MARIO GAMES ANALYSIS:');
      
      const foundIconicGames = [];
      const missingIconicGames = [];
      
      for (const expectedGame of expectedMarioGames) {
        const found = analysisResults.find(analysis => 
          analysis.result.name.toLowerCase().includes(expectedGame.toLowerCase().replace('super ', '').replace('new ', ''))
        );
        
        if (found) {
          foundIconicGames.push({
            expected: expectedGame,
            found: found.result.name,
            position: found.result.finalPosition || 0,
            igdbRating: found.result.igdb_rating,
            totalRatingCount: found.result.total_rating_count,
            follows: found.result.follows,
            relevanceScore: found.scoring?.components?.relevance || 0,
            totalScore: found.scoring?.total || 0
          });
        } else {
          missingIconicGames.push(expectedGame);
        }
      }
      
      console.log('\n✅ FOUND ICONIC GAMES:');
      foundIconicGames
        .sort((a, b) => a.position - b.position)
        .forEach(game => {
          console.log(`#${game.position}: ${game.found}`);
          console.log(`   Expected: ${game.expected}`);
          console.log(`   IGDB Rating: ${game.igdbRating || 'N/A'} (${game.totalRatingCount || 0} votes)`);
          console.log(`   Follows: ${game.follows || 0}`);
          console.log(`   Relevance: ${game.relevanceScore.toFixed(3)}, Total: ${game.totalScore.toFixed(3)}\n`);
        });
      
      console.log('\n❌ MISSING ICONIC GAMES:');
      missingIconicGames.forEach(game => console.log(`   - ${game}`));
      
      // 4. Analyze top 10 results for quality
      console.log('\n📈 TOP 10 RESULTS ANALYSIS:');
      const top10 = analysisResults.slice(0, 10);
      
      top10.forEach((analysis, index) => {
        const result = analysis.result;
        const hasGoodData = (result.igdb_rating || 0) > 0 && (result.total_rating_count || 0) > 10;
        const isRelevant = (analysis.scoring?.components?.relevance || 0) > 0.3;
        const isPopular = (result.follows || 0) > 100;
        
        console.log(`#${index + 1}: ${result.name}`);
        console.log(`   Relevance: ${(analysis.scoring?.components?.relevance || 0).toFixed(3)} ${isRelevant ? '✅' : '⚠️'}`);
        console.log(`   IGDB Rating: ${result.igdb_rating || 'N/A'} (${result.total_rating_count || 0} votes) ${hasGoodData ? '✅' : '⚠️'}`);
        console.log(`   Follows: ${result.follows || 0} ${isPopular ? '✅' : '⚠️'}`);
        console.log(`   Source: ${result.source || 'unknown'}`);
        console.log('');
      });
      
      // 5. IGDB Data Quality Assessment
      const igdbResults = analysisResults.filter(a => a.result.source === 'igdb');
      const withRatings = igdbResults.filter(a => (a.result.igdb_rating || 0) > 0);
      const withGoodSampleSize = igdbResults.filter(a => (a.result.total_rating_count || 0) > 50);
      const withFollows = igdbResults.filter(a => (a.result.follows || 0) > 0);
      const withHypes = igdbResults.filter(a => (a.result.hypes || 0) > 0);
      
      console.log('\n📊 IGDB DATA QUALITY ASSESSMENT:');
      console.log(`Total IGDB results analyzed: ${igdbResults.length}`);
      console.log(`With ratings: ${withRatings.length} (${((withRatings.length/igdbResults.length)*100).toFixed(1)}%)`);
      console.log(`With good sample size (50+ votes): ${withGoodSampleSize.length} (${((withGoodSampleSize.length/igdbResults.length)*100).toFixed(1)}%)`);
      console.log(`With follows data: ${withFollows.length} (${((withFollows.length/igdbResults.length)*100).toFixed(1)}%)`);
      console.log(`With hypes data: ${withHypes.length} (${((withHypes.length/igdbResults.length)*100).toFixed(1)}%)`);
      
      // 6. Rating vs Popularity Analysis
      console.log('\n🎭 RATING vs POPULARITY MISMATCH ANALYSIS:');
      const ratingMismatches = igdbResults
        .filter(a => (a.result.igdb_rating || 0) > 0 && (a.result.follows || 0) > 0)
        .map(a => ({
          name: a.result.name,
          rating: a.result.igdb_rating,
          ratingCount: a.result.total_rating_count || 0,
          follows: a.result.follows,
          popularityToRatingRatio: (a.result.follows || 0) / (a.result.igdb_rating || 1)
        }))
        .sort((a, b) => b.popularityToRatingRatio - a.popularityToRatingRatio);
      
      console.log('\nGames with HIGH FOLLOWS but potentially LOW RATINGS:');
      ratingMismatches.slice(0, 5).forEach(game => {
        console.log(`${game.name}:`);
        console.log(`   Rating: ${game.rating} (${game.ratingCount} votes)`);
        console.log(`   Follows: ${game.follows}`);
        console.log(`   Popularity/Rating Ratio: ${game.popularityToRatingRatio.toFixed(2)}`);
        console.log('');
      });
      
      // 7. Recommendations
      console.log('\n🎯 DATA QUALITY RECOMMENDATIONS:');
      
      if (withGoodSampleSize.length < igdbResults.length * 0.5) {
        console.log('❌ LOW SAMPLE SIZE: Many games have insufficient rating data');
        console.log('   → Implement Bayesian averaging to handle low sample sizes');
      }
      
      if (withFollows.length < igdbResults.length * 0.7) {
        console.log('❌ LIMITED ENGAGEMENT DATA: Missing follows data');
        console.log('   → Ensure IGDB API calls include follows, hypes fields');
      }
      
      if (foundIconicGames.length < expectedMarioGames.length * 0.7) {
        console.log('❌ POOR FRANCHISE COVERAGE: Missing iconic Mario games');
        console.log('   → Implement franchise recognition system');
      }
      
      const topRatedObscure = top10.filter(a => 
        (a.result.igdb_rating || 0) > 85 && 
        (a.result.follows || 0) < 1000 &&
        a.scoring.components.relevance < 0.5
      );
      
      if (topRatedObscure.length > 2) {
        console.log('❌ OBSCURE HIGH-RATED GAMES DOMINATING: Low-relevance games ranking high due to ratings');
        console.log('   → Reduce rating weight, increase relevance/engagement weight');
      }
      
      // Final assessment
      const dataQualityScore = (
        (withRatings.length / igdbResults.length) * 0.2 +
        (withGoodSampleSize.length / igdbResults.length) * 0.3 +
        (withFollows.length / igdbResults.length) * 0.3 +
        (foundIconicGames.length / expectedMarioGames.length) * 0.2
      );
      
      console.log(`\n🏆 OVERALL IGDB DATA QUALITY SCORE: ${(dataQualityScore * 100).toFixed(1)}%`);
      
      if (dataQualityScore > 0.8) {
        console.log('✅ EXCELLENT: IGDB data is sufficient for good sorting');
      } else if (dataQualityScore > 0.6) {
        console.log('⚠️ GOOD: IGDB data works but needs enhancement');
      } else if (dataQualityScore > 0.4) {
        console.log('⚠️ POOR: IGDB data has significant gaps');
      } else {
        console.log('❌ CRITICAL: IGDB data insufficient, need alternative sources');
      }
      
      // Return analysis for test assertions
      return {
        totalResults: searchResults.results.length,
        foundIconicGames: foundIconicGames.length,
        expectedIconicGames: expectedMarioGames.length,
        dataQualityScore,
        igdbDataCoverage: {
          ratings: withRatings.length / igdbResults.length,
          goodSampleSize: withGoodSampleSize.length / igdbResults.length,
          follows: withFollows.length / igdbResults.length
        }
      };
      
    } catch (error) {
      console.error('❌ Analysis failed:', error);
      throw error;
    }
  }, 60000); // 60 second timeout

  test('should identify alternative data sources if IGDB insufficient', async () => {
    console.log('\n=== Alternative Data Sources Research ===\n');
    
    // This test documents potential alternative sources
    const alternativeSources = [
      {
        name: 'Steam API',
        pros: ['Accurate sales data', 'User reviews count', 'Player statistics', 'Wishlist data'],
        cons: ['PC-only', 'Not all games on Steam', 'Rate limits'],
        useCase: 'PC game popularity and sales data'
      },
      {
        name: 'Metacritic API/Scraping',
        pros: ['Professional reviews', 'User scores', 'Cross-platform coverage'],
        cons: ['Limited API access', 'May require scraping', 'Not all games covered'],
        useCase: 'Professional critical reception data'
      },
      {
        name: 'Wikipedia/Wikidata',
        pros: ['Cultural impact data', 'Sales figures', 'Free API', 'Comprehensive coverage'],
        cons: ['Inconsistent data quality', 'Manual curation needed'],
        useCase: 'Historical significance and cultural impact'
      },
      {
        name: 'Our Database + Community',
        pros: ['User engagement metrics', 'Review quality', 'Platform-specific data'],
        cons: ['Limited initial data', 'Requires community growth'],
        useCase: 'Community-driven popularity signals'
      },
      {
        name: 'Google Trends',
        pros: ['Search popularity', 'Geographic data', 'Historical trends'],
        cons: ['Not game-specific', 'Requires careful parsing'],
        useCase: 'Cultural zeitgeist and popularity trends'
      }
    ];
    
    console.log('🔍 POTENTIAL ALTERNATIVE DATA SOURCES:\n');
    
    alternativeSources.forEach((source, index) => {
      console.log(`${index + 1}. ${source.name}`);
      console.log(`   Use Case: ${source.useCase}`);
      console.log(`   Pros: ${source.pros.join(', ')}`);
      console.log(`   Cons: ${source.cons.join(', ')}`);
      console.log('');
    });
    
    console.log('🎯 HYBRID APPROACH RECOMMENDATION:');
    console.log('1. IGDB as primary source for basic game data');
    console.log('2. Steam API for PC game popularity metrics');
    console.log('3. Our database for community engagement signals');
    console.log('4. Wikipedia/Wikidata for cultural impact scores');
    console.log('5. Manual curation for franchise/series relationships');
    
    expect(alternativeSources.length).toBeGreaterThan(3);
  });
});