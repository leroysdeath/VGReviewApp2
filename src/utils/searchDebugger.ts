// Frontend debugging utilities for testing sister game functionality
// Add this to window for easy browser console testing

interface DebugSearchResult {
  name: string;
  id: number;
  sisterGameBoost?: number;
  sisterGameRelationship?: string;
  searchStrategy?: string;
  genres?: string[];
}

interface SearchDebugInfo {
  query: string;
  totalResults: number;
  sisterGamesFound: number;
  searchStrategies: string[];
  topResults: DebugSearchResult[];
  apiCallsEstimated: number;
}

/**
 * Debug utility to test sister game functionality from browser console
 */
export class SearchDebugger {
  private static enabled = false;
  
  /**
   * Enable debug logging (call from browser console)
   */
  static enable() {
    this.enabled = true;
    console.log('🔧 SEARCH DEBUGGER ENABLED');
    console.log('Available commands:');
    console.log('  - searchDebugger.testPokemon() - Test Pokemon sister games');
    console.log('  - searchDebugger.testFinalFantasy() - Test FF series');
    console.log('  - searchDebugger.testZelda() - Test Zelda series');
    console.log('  - searchDebugger.testCustom("your query") - Test any search');
    console.log('  - searchDebugger.disable() - Turn off debugging');
  }
  
  /**
   * Disable debug logging
   */
  static disable() {
    this.enabled = false;
    console.log('🔧 SEARCH DEBUGGER DISABLED');
  }
  
  /**
   * Test Pokemon series detection and sister games
   */
  static async testPokemon(): Promise<SearchDebugInfo> {
    return this.debugSearch('Pokemon Red', 'Pokemon series test');
  }
  
  /**
   * Test Final Fantasy series detection
   */
  static async testFinalFantasy(): Promise<SearchDebugInfo> {
    return this.debugSearch('Final Fantasy VII', 'Final Fantasy series test');
  }
  
  /**
   * Test Zelda series detection
   */
  static async testZelda(): Promise<SearchDebugInfo> {
    return this.debugSearch('The Legend of Zelda: Ocarina of Time', 'Zelda series test');
  }
  
  /**
   * Test custom search query
   */
  static async testCustom(query: string): Promise<SearchDebugInfo> {
    return this.debugSearch(query, 'Custom search test');
  }
  
  /**
   * Internal debug search method
   */
  private static async debugSearch(query: string, testName: string): Promise<SearchDebugInfo> {
    console.log(`\n🧪 ${testName.toUpperCase()}`);
    console.log(`Query: "${query}"`);
    console.log('⏱️ Starting search...');
    
    try {
      // Import the gameService dynamically
      const { gameService } = await import('../services/gameService');

      const startTime = performance.now();
      const results = await gameService.searchGames(query);
      const endTime = performance.now();
      
      console.log(`✅ Search completed in ${Math.round(endTime - startTime)}ms`);
      
      // Analyze results
      const debugInfo = this.analyzeResults(query, results);
      this.logResults(debugInfo);
      
      return debugInfo;
    } catch (error) {
      console.error('❌ Search failed:', error);
      return {
        query,
        totalResults: 0,
        sisterGamesFound: 0,
        searchStrategies: [],
        topResults: [],
        apiCallsEstimated: 0
      };
    }
  }
  
  /**
   * Analyze search results for debugging info
   */
  private static analyzeResults(query: string, results: any[]): SearchDebugInfo {
    const sisterGames = results.filter(r => r._sisterGameBoost > 0);
    const strategies = [...new Set(results.map(r => r._searchStrategy).filter(Boolean))];
    
    const debugInfo: SearchDebugInfo = {
      query,
      totalResults: results.length,
      sisterGamesFound: sisterGames.length,
      searchStrategies: strategies,
      topResults: results.slice(0, 10).map(r => ({
        name: r.name,
        id: r.id,
        sisterGameBoost: r._sisterGameBoost,
        sisterGameRelationship: r._sisterGameRelationship,
        searchStrategy: r._searchStrategy,
        genres: r.genres
      })),
      apiCallsEstimated: this.estimateApiCalls(strategies)
    };
    
    return debugInfo;
  }
  
  /**
   * Estimate API calls based on search strategies used
   */
  private static estimateApiCalls(strategies: string[]): number {
    let calls = 1; // Original query
    
    strategies.forEach(strategy => {
      if (strategy.startsWith('expanded:')) calls++;
      if (strategy.startsWith('sister:')) calls++;
      if (strategy === 'partial') calls++;
    });
    
    return calls;
  }
  
  /**
   * Log results in a readable format
   */
  private static logResults(info: SearchDebugInfo) {
    console.log(`\n📊 SEARCH ANALYSIS:`);
    console.log(`   Total results: ${info.totalResults}`);
    console.log(`   Sister games found: ${info.sisterGamesFound}`);
    console.log(`   Search strategies: [${info.searchStrategies.join(', ')}]`);
    console.log(`   Estimated API calls: ${info.apiCallsEstimated}`);
    
    if (info.sisterGamesFound > 0) {
      console.log(`\n🎮 SISTER GAMES DETECTED:`);
      info.topResults
        .filter(r => r.sisterGameBoost)
        .forEach(r => {
          console.log(`   • "${r.name}" (+${r.sisterGameBoost} boost, ${r.sisterGameRelationship})`);
        });
    }
    
    console.log(`\n🏆 TOP 5 RESULTS:`);
    info.topResults.slice(0, 5).forEach((r, i) => {
      const boost = r.sisterGameBoost ? ` (+${r.sisterGameBoost})` : '';
      const strategy = r.searchStrategy ? ` [${r.searchStrategy}]` : '';
      console.log(`   ${i + 1}. "${r.name}"${boost}${strategy}`);
    });
  }
  
  /**
   * Monitor search performance and log warnings
   */
  static monitorPerformance() {
    const originalFetch = window.fetch;
    let apiCallCount = 0;
    
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || '';
      if (url.includes('/rest/v1/') || url.includes('search_games_secure')) {
        apiCallCount++;
        if (this.enabled) {
          console.log(`📡 API Call #${apiCallCount}: ${url.split('?')[0]}`);
        }
        
        if (apiCallCount > 20) {
          console.warn(`⚠️ HIGH API USAGE: ${apiCallCount} calls detected`);
        }
      }
      
      return originalFetch(...args);
    };
    
    console.log('📊 Performance monitoring enabled');
  }
  
  /**
   * Quick test of all major series
   */
  static async testAllSeries(): Promise<void> {
    console.log(`\n🎯 TESTING ALL MAJOR SERIES`);
    
    const tests = [
      { name: 'Pokemon', query: 'Pokemon Red' },
      { name: 'Final Fantasy', query: 'Final Fantasy VII' },
      { name: 'Zelda', query: 'Zelda Ocarina of Time' },
      { name: 'Mario', query: 'Super Mario Bros' },
      { name: 'Street Fighter', query: 'Street Fighter II' }
    ];
    
    for (const test of tests) {
      const result = await this.debugSearch(test.query, `${test.name} series test`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Avoid overwhelming API
    }
    
    console.log(`\n✅ ALL SERIES TESTS COMPLETE`);
  }
}

// Add to window for browser console access
declare global {
  interface Window {
    searchDebugger: typeof SearchDebugger;
  }
}

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  window.searchDebugger = SearchDebugger;
  console.log('🔧 Search debugger available at window.searchDebugger');
  console.log('Run searchDebugger.enable() to start debugging');
}