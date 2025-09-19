import { gameDataService } from '../services/gameDataService';
import { searchDiagnosticService } from '../services/searchDiagnosticService';

describe('Pokemon Search Debug Test', () => {
  test('should debug Pokemon search results in detail', async () => {
    console.log('🔍 POKEMON SEARCH DEBUG TEST');
    console.log('================================');
    
    // Test various Pokemon search terms
    const pokemonSearchTerms = [
      'Pokemon',
      'pokemon', 
      'Pokémon',
      'Pokemon Red',
      'Pokemon Blue',
      'Pokemon Yellow',
      'Pokemon Gold',
      'Pokemon Silver',
      'Pokemon Crystal',
      'Pokemon Ruby',
      'Pokemon Sapphire',
      'Pokemon Emerald',
      'Pokemon Diamond',
      'Pokemon Pearl',
      'Pokemon Platinum',
      'Pokemon Black',
      'Pokemon White',
      'Pokemon X',
      'Pokemon Y',
      'Pokemon Sun',
      'Pokemon Moon',
      'Pokemon Sword',
      'Pokemon Shield',
      'Pokemon Scarlet',
      'Pokemon Violet',
      'Pokemon Legends Arceus'
    ];
    
    for (const searchTerm of pokemonSearchTerms) {
      console.log(`\n📊 Testing: "${searchTerm}"`);
      
      try {
        // Use the main search service
        const mainResults = await gameDataService.searchGames(searchTerm);
        console.log(`   Main Search: ${mainResults.length} results`);
        
        if (mainResults.length > 0) {
          console.log(`   Sample results: ${mainResults.slice(0, 3).map(g => g.name).join(', ')}`);
        }
        
        // Use diagnostic service for deeper analysis
        const diagnostic = await searchDiagnosticService.analyzeSingleSearch(searchTerm);
        console.log(`   DB Name Search: ${diagnostic.dbResults.nameSearchCount} results`);
        console.log(`   DB Summary Search: ${diagnostic.dbResults.summarySearchCount} results`);
        console.log(`   Total DB Results: ${diagnostic.dbResults.totalCount} results`);
        
        if (diagnostic.igdbResults) {
          console.log(`   IGDB Results: ${diagnostic.igdbResults.count} results`);
          console.log(`   Rate Limited: ${diagnostic.igdbResults.rateLimited}`);
        }
        
        // Check result analysis
        if (diagnostic.resultAnalysis) {
          console.log(`   Final Results Count: ${diagnostic.resultAnalysis.finalCount}`);
          console.log(`   Coverage Issues: ${diagnostic.resultAnalysis.coverageAnalysis.issues.join(', ')}`);
        }
        
        console.log(`   Performance: ${diagnostic.performance.totalDuration}ms total`);
        
        if (mainResults.length === 0) {
          console.warn(`   ❌ NO RESULTS for "${searchTerm}"`);
        }
        
      } catch (error) {
        console.error(`   💥 Error searching for "${searchTerm}":`, error);
      }
    }
    
    console.log('\n🎯 POKEMON SEARCH SUMMARY:');
    console.log('============================');
    
    // Test if we can find any Pokemon games directly from database
    const { data: directDbResults, error } = await (global as any).supabase
      .from('game')
      .select('*')
      .ilike('name', '%pokemon%')
      .limit(50);
      
    if (error) {
      console.error('❌ Direct DB query failed:', error);
    } else {
      console.log(`📊 Direct DB query found ${directDbResults?.length || 0} Pokemon games`);
      if (directDbResults && directDbResults.length > 0) {
        console.log('Sample games from DB:', directDbResults.slice(0, 5).map((g: any) => g.name));
      }
    }
    
    // Check IGDB stats
    const igdbStats = searchDiagnosticService.getIGDBStats();
    console.log(`🌐 IGDB Stats - Daily requests: ${igdbStats.dailyRequestCount}, Remaining: ${igdbStats.remainingQuota}`);
    
    expect(true).toBe(true); // Always pass - this is diagnostic
  }, 120000);
});