/**
 * Search Diagnostic Service
 * 
 * IGDB API Compliance:
 * - Rate limit: 4 requests per second
 * - Max 500 requests per day for non-commercial use
 * - Must include proper attribution
 * - Cache results to minimize API calls
 */

import { supabase } from './supabase';
import { gameDataServiceV2 } from './gameDataServiceV2';
import { igdbServiceV2 } from './igdbServiceV2';
import { resultAnalysisService, type SearchResultsAnalysis } from './resultAnalysisService';
import { AdvancedSearchCoordination } from './advancedSearchCoordination';
import type { GameWithCalculatedFields } from '../types/database';

interface SearchDiagnostic {
  query: string;
  timestamp: string;
  
  // Database results
  dbResults: {
    nameSearchCount: number;
    summarySearchCount: number;
    totalCount: number;
    duration: number;
    sampleGames: string[];
  };
  
  // IGDB results (when used)
  igdbResults?: {
    count: number;
    duration: number;
    sampleGames: string[];
    rateLimited: boolean;
  };
  
  // Filter analysis
  filterAnalysis: {
    genreDistribution: Record<string, number>;
    platformDistribution: Record<string, number>;
    releaseYearDistribution: Record<string, number>;
    ratingDistribution: {
      '0-20': number;
      '21-40': number;
      '41-60': number;
      '61-80': number;
      '81-100': number;
    };
    // New metrics analysis
    totalRatingDistribution: {
      '0-20': number;
      '21-40': number;
      '41-60': number;
      '61-80': number;
      '81-100': number;
    };
    popularityDistribution: {
      'viral': number; // >80k
      'mainstream': number; // 50k-80k
      'popular': number; // 10k-50k
      'known': number; // 1k-10k
      'niche': number; // <1k
    };
    flagAnalysis: {
      total: number;
      greenlight: number;
      redlight: number;
      unflagged: number;
    };
  };
  
  // Sorting analysis
  sortingAnalysis: {
    originalOrder: string[];
    sortedByRating: string[];
    sortedByRelevance: string[];
    topRatedGame: string;
    averageRating: number;
  };
  
  // Performance metrics
  performance: {
    totalDuration: number;
    dbQueryTime: number;
    igdbQueryTime?: number;
    processingTime: number;
  };
  
  // Detailed result analysis
  resultAnalysis?: SearchResultsAnalysis;
}

interface BulkTestResult {
  testQueries: string[];
  results: SearchDiagnostic[];
  patterns: {
    commonFilters: string[];
    performanceBottlenecks: string[];
    qualityIssues: string[];
    recommendations: string[];
  };
  igdbUsageStats: {
    totalRequests: number;
    remainingQuota: number;
    rateLimitHits: number;
  };
}

/**
 * IGDB Rate Limiter - Compliant with ToS
 */
class IGDBRateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequestsPerSecond = 4;
  private readonly maxRequestsPerDay = 450; // Conservative limit
  private dailyRequestCount = 0;
  private lastResetDate = new Date().toDateString();
  
  async canMakeRequest(): Promise<boolean> {
    const now = Date.now();
    const today = new Date().toDateString();
    
    // Reset daily counter if new day
    if (today !== this.lastResetDate) {
      this.dailyRequestCount = 0;
      this.lastResetDate = today;
    }
    
    // Check daily limit
    if (this.dailyRequestCount >= this.maxRequestsPerDay) {
      console.warn('🚫 IGDB daily request limit reached');
      return false;
    }
    
    // Remove old requests (older than 1 second)
    this.requestTimes = this.requestTimes.filter(time => now - time < 1000);
    
    // Check rate limit
    if (this.requestTimes.length >= this.maxRequestsPerSecond) {
      console.warn('🚫 IGDB rate limit hit, waiting...');
      return false;
    }
    
    return true;
  }
  
  async makeRequest<T>(requestFn: () => Promise<T>): Promise<T | null> {
    if (!(await this.canMakeRequest())) {
      return null;
    }
    
    const now = Date.now();
    this.requestTimes.push(now);
    this.dailyRequestCount++;
    
    try {
      return await requestFn();
    } catch (error) {
      console.error('IGDB request failed:', error);
      return null;
    }
  }
  
  getStats() {
    return {
      dailyRequestCount: this.dailyRequestCount,
      remainingQuota: this.maxRequestsPerDay - this.dailyRequestCount,
      currentRateLimit: this.requestTimes.length
    };
  }
}

export class SearchDiagnosticService {
  private rateLimiter = new IGDBRateLimiter();
  private advancedSearchCoordination = new AdvancedSearchCoordination();
  
  /**
   * Analyze a single search query with comprehensive diagnostics
   */
  async analyzeSingleSearch(query: string): Promise<SearchDiagnostic> {
    const startTime = Date.now();
    // console.log(`🔍 Starting diagnostic analysis for: "${query}"`);
    
    // Step 1: Analyze database search
    const dbStart = Date.now();
    const dbResults = await this.analyzeDbSearch(query);
    const dbDuration = Date.now() - dbStart;
    
    // Step 2: Determine if IGDB should be queried (following original logic)
    const shouldQueryIGDB = this.shouldUseIGDB(dbResults.games, query);
    let igdbResults: any = undefined;
    let igdbDuration = 0;
    
    if (shouldQueryIGDB) {
      const igdbStart = Date.now();
      igdbResults = await this.analyzeIGDBSearch(query);
      igdbDuration = Date.now() - igdbStart;
    }
    
    // Step 3: Get final results using improved search coordination
    const coordinatedSearchResult = await this.advancedSearchCoordination.coordinatedSearch(query, {
      maxResults: 40,
      includeMetrics: true,
      fastMode: false,
      bypassCache: false,
      useAggressive: false
    });
    
    // Step 4: Analyze filters and sorting on final results
    const finalResults = coordinatedSearchResult.results || [];
    const filterAnalysis = this.analyzeFilters(finalResults);
    const sortingAnalysis = this.analyzeSorting(finalResults, query);
    const resultAnalysis = resultAnalysisService.analyzeSearchResults(
      query,
      dbResults.games,
      igdbResults?.games || [],
      finalResults
    );
    
    const totalDuration = Date.now() - startTime;
    
    return {
      query,
      timestamp: new Date().toISOString(),
      
      dbResults: {
        nameSearchCount: dbResults.nameSearchCount,
        summarySearchCount: dbResults.summarySearchCount,
        totalCount: dbResults.games.length,
        duration: dbDuration,
        sampleGames: dbResults.games.slice(0, 5).map(g => g.name)
      },
      
      igdbResults: igdbResults ? {
        count: igdbResults.games.length,
        duration: igdbDuration,
        sampleGames: igdbResults.games.slice(0, 5).map((g: any) => g.name),
        rateLimited: igdbResults.rateLimited
      } : undefined,
      
      filterAnalysis,
      sortingAnalysis,
      
      performance: {
        totalDuration,
        dbQueryTime: dbDuration,
        igdbQueryTime: igdbResults ? igdbDuration : undefined,
        processingTime: totalDuration - dbDuration - igdbDuration
      },
      
      resultAnalysis
    };
  }
  
  /**
   * Bulk test multiple queries with pattern analysis
   */
  async bulkTestQueries(queries: string[]): Promise<BulkTestResult> {
    console.log(`🧪 Starting bulk test of ${queries.length} queries`);
    
    const results: SearchDiagnostic[] = [];
    const igdbStats = this.rateLimiter.getStats();
    
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`📊 Testing ${i + 1}/${queries.length}: "${query}"`);
      
      try {
        const result = await this.analyzeSingleSearch(query);
        results.push(result);
        
        // Add delay between queries to respect rate limits
        await this.delay(250); // 4 requests per second max
        
      } catch (error) {
        console.error(`❌ Failed to test "${query}":`, error);
      }
    }
    
    // Analyze patterns across all results
    const patterns = this.analyzePatterns(results);
    
    const finalIgdbStats = this.rateLimiter.getStats();
    
    return {
      testQueries: queries,
      results,
      patterns,
      igdbUsageStats: {
        totalRequests: finalIgdbStats.dailyRequestCount - igdbStats.dailyRequestCount,
        remainingQuota: finalIgdbStats.remainingQuota,
        rateLimitHits: results.filter(r => r.igdbResults?.rateLimited).length
      }
    };
  }
  
  /**
   * Analyze database search performance and results
   */
  private async analyzeDbSearch(query: string) {
    // Simulate the actual search logic from gameDataServiceV2
    const nameResults = await this.searchByName(query, 30);
    let summaryResults: GameWithCalculatedFields[] = [];
    
    if (nameResults.length < 20) {
      summaryResults = await this.searchBySummary(query, 20);
    }
    
    // Merge results
    const existingIds = new Set(nameResults.map(g => g.id));
    const newSummaryResults = summaryResults.filter(g => !existingIds.has(g.id));
    const allGames = [...nameResults, ...newSummaryResults];
    
    return {
      nameSearchCount: nameResults.length,
      summarySearchCount: newSummaryResults.length,
      games: allGames
    };
  }
  
  /**
   * Analyze IGDB search with rate limiting
   */
  private async analyzeIGDBSearch(query: string) {
    const result = await this.rateLimiter.makeRequest(async () => {
      return await igdbServiceV2.searchGames(query, 15);
    });
    
    if (result === null) {
      return { games: [], rateLimited: true };
    }
    
    return { games: result, rateLimited: false };
  }
  
  /**
   * Analyze filter distributions with new IGDB metrics and manual flags
   */
  private analyzeFilters(games: GameWithCalculatedFields[]) {
    const genreDistribution: Record<string, number> = {};
    const platformDistribution: Record<string, number> = {};
    const releaseYearDistribution: Record<string, number> = {};
    const ratingDistribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };
    
    // New IGDB metrics distributions
    const totalRatingDistribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };
    
    const popularityDistribution = {
      'viral': 0,
      'mainstream': 0,
      'popular': 0,
      'known': 0,
      'niche': 0
    };
    
    const flagAnalysis = {
      total: 0,
      greenlight: 0,
      redlight: 0,
      unflagged: 0
    };
    
    games.forEach(game => {
      // Genres
      if (game.genres && Array.isArray(game.genres)) {
        game.genres.forEach(genre => {
          genreDistribution[genre] = (genreDistribution[genre] || 0) + 1;
        });
      }
      
      // Platforms
      if (game.platforms && Array.isArray(game.platforms)) {
        game.platforms.forEach(platform => {
          platformDistribution[platform] = (platformDistribution[platform] || 0) + 1;
        });
      }
      
      // Release years
      if (game.release_date) {
        const year = new Date(game.release_date).getFullYear().toString();
        releaseYearDistribution[year] = (releaseYearDistribution[year] || 0) + 1;
      }
      
      // Original IGDB ratings
      const rating = game.igdb_rating || 0;
      if (rating <= 20) ratingDistribution['0-20']++;
      else if (rating <= 40) ratingDistribution['21-40']++;
      else if (rating <= 60) ratingDistribution['41-60']++;
      else if (rating <= 80) ratingDistribution['61-80']++;
      else ratingDistribution['81-100']++;
      
      // New total rating distribution
      const totalRating = (game as any).total_rating || 0;
      if (totalRating <= 20) totalRatingDistribution['0-20']++;
      else if (totalRating <= 40) totalRatingDistribution['21-40']++;
      else if (totalRating <= 60) totalRatingDistribution['41-60']++;
      else if (totalRating <= 80) totalRatingDistribution['61-80']++;
      else if (totalRating > 0) totalRatingDistribution['81-100']++;
      
      // Popularity distribution
      const popularityScore = (game as any).popularity_score || 0;
      if (popularityScore > 80000) popularityDistribution['viral']++;
      else if (popularityScore > 50000) popularityDistribution['mainstream']++;
      else if (popularityScore > 10000) popularityDistribution['popular']++;
      else if (popularityScore > 1000) popularityDistribution['known']++;
      else popularityDistribution['niche']++;
      
      // Manual flag analysis
      const greenlight = (game as any).greenlight_flag;
      const redlight = (game as any).redlight_flag;
      
      if (greenlight) {
        flagAnalysis.greenlight++;
        flagAnalysis.total++;
      } else if (redlight) {
        flagAnalysis.redlight++;
        flagAnalysis.total++;
      } else {
        flagAnalysis.unflagged++;
      }
    });
    
    return {
      genreDistribution,
      platformDistribution,
      releaseYearDistribution,
      ratingDistribution,
      totalRatingDistribution,
      popularityDistribution,
      flagAnalysis
    };
  }
  
  /**
   * Analyze sorting effectiveness
   */
  private analyzeSorting(games: GameWithCalculatedFields[], query: string) {
    if (games.length === 0) {
      return {
        originalOrder: [],
        sortedByRating: [],
        sortedByRelevance: [],
        topRatedGame: 'None',
        averageRating: 0
      };
    }
    
    const originalOrder = games.map(g => g.name);
    
    // Sort by new total rating (prioritized) then fallback to old rating
    const sortedByRating = [...games]
      .sort((a, b) => {
        const aRating = (a as any).total_rating || a.igdb_rating || 0;
        const bRating = (b as any).total_rating || b.igdb_rating || 0;
        return bRating - aRating;
      })
      .map(g => g.name);
    
    // Sort by relevance (simple name matching for now)
    const sortedByRelevance = [...games]
      .sort((a, b) => this.calculateRelevanceScore(b, query) - this.calculateRelevanceScore(a, query))
      .map(g => g.name);
    
    const topRatedGame = games.reduce((top, game) => {
      const gameRating = (game as any).total_rating || game.igdb_rating || 0;
      const topRating = (top as any).total_rating || top.igdb_rating || 0;
      return gameRating > topRating ? game : top;
    }).name;
    
    const averageRating = games.reduce((sum, game) => 
      sum + ((game as any).total_rating || game.igdb_rating || 0), 0
    ) / games.length;
    
    return {
      originalOrder,
      sortedByRating,
      sortedByRelevance,
      topRatedGame,
      averageRating: Math.round(averageRating * 100) / 100
    };
  }
  
  /**
   * Calculate relevance score for sorting analysis
   */
  private calculateRelevanceScore(game: GameWithCalculatedFields, query: string): number {
    const name = game.name.toLowerCase();
    const q = query.toLowerCase();
    
    let score = 0;
    
    // Exact match
    if (name === q) score += 100;
    // Starts with
    else if (name.startsWith(q)) score += 80;
    // Contains
    else if (name.includes(q)) score += 60;
    // Word matches
    else {
      const queryWords = q.split(/\s+/);
      const nameWords = name.split(/\s+/);
      const matchedWords = queryWords.filter(qw => 
        nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
      );
      score += (matchedWords.length / queryWords.length) * 40;
    }
    
    // Quality bonuses using new metrics
    const totalRating = (game as any).total_rating || game.igdb_rating || 0;
    const popularity = (game as any).popularity_score || 0;
    
    if (totalRating > 80) score += 15;
    else if (totalRating > 60) score += 10;
    
    if (popularity > 50000) score += 10; // Mainstream/viral games
    else if (popularity > 10000) score += 5; // Popular games
    
    if (game.summary && game.summary.length > 50) score += 5;
    
    return score;
  }
  
  /**
   * Analyze patterns across multiple search results
   */
  private analyzePatterns(results: SearchDiagnostic[]) {
    const commonFilters: string[] = [];
    const performanceBottlenecks: string[] = [];
    const qualityIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze common genres across all searches
    const allGenres: Record<string, number> = {};
    results.forEach(result => {
      Object.entries(result.filterAnalysis.genreDistribution).forEach(([genre, count]) => {
        allGenres[genre] = (allGenres[genre] || 0) + count;
      });
    });
    
    // Most common genres
    const topGenres = Object.entries(allGenres)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre);
    
    commonFilters.push(`Most common genres: ${topGenres.join(', ')}`);
    
    // Performance analysis
    const avgDbTime = results.reduce((sum, r) => sum + r.performance.dbQueryTime, 0) / results.length;
    const avgTotalTime = results.reduce((sum, r) => sum + r.performance.totalDuration, 0) / results.length;
    
    if (avgDbTime > 1000) {
      performanceBottlenecks.push('Database queries averaging over 1 second');
    }
    
    if (avgTotalTime > 2000) {
      performanceBottlenecks.push('Total search time averaging over 2 seconds');
    }
    
    // Quality analysis
    const lowResultQueries = results.filter(r => r.dbResults.totalCount < 5);
    if (lowResultQueries.length > results.length * 0.3) {
      qualityIssues.push(`${lowResultQueries.length} queries returned fewer than 5 results`);
    }
    
    // Recommendations
    if (performanceBottlenecks.length > 0) {
      recommendations.push('Consider implementing database indexing on name and summary columns');
    }
    
    if (qualityIssues.length > 0) {
      recommendations.push('Implement fuzzy search or expand search terms for better coverage');
    }
    
    const igdbUsageCount = results.filter(r => r.igdbResults).length;
    if (igdbUsageCount > results.length * 0.8) {
      recommendations.push('Database coverage is low - consider bulk importing more games');
    }
    
    return {
      commonFilters,
      performanceBottlenecks,
      qualityIssues,
      recommendations
    };
  }
  
  // Helper methods
  private shouldUseIGDB(dbGames: GameWithCalculatedFields[], query: string): boolean {
    // Copy logic from gameDataServiceV2
    if (dbGames.length < 3) return true;
    if (this.isFranchiseQuery(query) && dbGames.length < 10) return true;
    if (dbGames.length < 5) return true;
    return false;
  }
  
  private isFranchiseQuery(query: string): boolean {
    const term = query.toLowerCase();
    const franchises = [
      'mario', 'super mario', 'zelda', 'pokemon', 'final fantasy', 'ff',
      'call of duty', 'cod', 'assassin', 'grand theft auto', 'gta'
    ];
    return franchises.some(franchise => term.includes(franchise));
  }
  
  private async searchByName(query: string, limit: number): Promise<GameWithCalculatedFields[]> {
    const { data, error } = await supabase
      .from('game')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(limit);
    
    if (error) return [];
    return (data || []).map(game => ({
      ...game,
      averageUserRating: 0,
      totalUserRatings: 0
    }));
  }
  
  private async searchBySummary(query: string, limit: number): Promise<GameWithCalculatedFields[]> {
    const { data, error } = await supabase
      .from('game')
      .select('*')
      .ilike('summary', `%${query}%`)
      .limit(limit);
    
    if (error) return [];
    return (data || []).map(game => ({
      ...game,
      averageUserRating: 0,
      totalUserRatings: 0
    }));
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get rate limiter statistics
   */
  getIGDBStats() {
    return this.rateLimiter.getStats();
  }
}

export const searchDiagnosticService = new SearchDiagnosticService();