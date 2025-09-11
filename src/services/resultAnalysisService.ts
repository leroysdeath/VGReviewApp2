/**
 * Result Analysis Service
 * 
 * Provides detailed analysis of individual search results including:
 * - Filtering decisions and reasons
 * - Sorting scores and ranking factors
 * - Quality metrics and relevance scoring
 * - Pattern identification for algorithm improvement
 */

import type { GameWithCalculatedFields } from '../types/database';
import type { IGDBGame } from './igdbServiceV2';

export interface FilteringDecision {
  passed: boolean;
  reason: string;
  stage: 'content_protection' | 'category' | 'relevance' | 'quality' | 'deduplication';
  score?: number;
  threshold?: number;
  details?: Record<string, any>;
}

export interface SortingScore {
  component: string;
  score: number;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface ResultAnalysis {
  gameId: number;
  gameName: string;
  source: 'database' | 'igdb';
  finalPosition: number;
  
  // Filtering analysis
  filteringDecisions: FilteringDecision[];
  wasFiltered: boolean;
  filteringSummary: string;
  
  // Sorting analysis
  totalSortingScore: number;
  sortingComponents: SortingScore[];
  rankingFactors: {
    relevanceScore: number;
    qualityScore: number;
    popularityScore: number;
    recencyBonus: number;
    penaltyScore: number;
  };
  
  // Quality metrics
  qualityMetrics: {
    hasDescription: boolean;
    hasCover: boolean;
    hasGenres: boolean;
    hasPlatforms: boolean;
    hasRating: boolean;
    completenessScore: number;
  };
  
  // Search relevance
  relevanceBreakdown: {
    nameMatch: {
      type: 'exact' | 'starts_with' | 'contains' | 'word_match' | 'no_match';
      score: number;
      explanation: string;
    };
    summaryMatch: {
      hasMatch: boolean;
      score: number;
      explanation: string;
    };
    genreMatch: {
      matches: string[];
      score: number;
    };
    franchiseMatch: {
      hasMatch: boolean;
      score: number;
      franchiseName?: string;
    };
  };
}

export interface SearchResultsAnalysis {
  query: string;
  totalResults: number;
  filteredCount: number;
  resultAnalyses: ResultAnalysis[];
  
  // Aggregate insights
  filteringInsights: {
    mostCommonFilterReason: string;
    filteringStages: Record<string, number>;
    qualityIssues: string[];
  };
  
  sortingInsights: {
    topScoringFactors: Array<{factor: string; averageContribution: number}>;
    sortingProblems: string[];
    recommendations: string[];
  };
  
  // Pattern detection
  patterns: {
    irrelevantResults: Array<{game: string; reason: string}>;
    missingRelevantTerms: string[];
    sortingAnomalies: Array<{game: string; expectedRank: number; actualRank: number; reason: string}>;
  };
}

export class ResultAnalysisService {
  
  /**
   * Analyze all results from a search with detailed filtering and sorting breakdown
   */
  analyzeSearchResults(
    query: string,
    dbResults: GameWithCalculatedFields[],
    igdbResults: IGDBGame[] = [],
    finalResults: GameWithCalculatedFields[]
  ): SearchResultsAnalysis {
    
    console.log(`🔬 Analyzing search results for query: "${query}"`);
    
    // Combine all initial results for analysis
    const allInitialResults = [
      ...dbResults.map(g => ({ ...g, _source: 'database' as const })),
      ...igdbResults.map(g => this.convertIGDBToAnalysis(g))
    ];
    
    // Analyze each result
    const resultAnalyses: ResultAnalysis[] = [];
    
    allInitialResults.forEach((game, index) => {
      const analysis = this.analyzeIndividualResult(
        game,
        query,
        index,
        finalResults
      );
      resultAnalyses.push(analysis);
    });
    
    // Generate aggregate insights
    const filteringInsights = this.analyzeFilteringPatterns(resultAnalyses);
    const sortingInsights = this.analyzeSortingPatterns(resultAnalyses, query);
    const patterns = this.detectSearchPatterns(resultAnalyses, query);
    
    return {
      query,
      totalResults: allInitialResults.length,
      filteredCount: resultAnalyses.filter(r => r.wasFiltered).length,
      resultAnalyses,
      filteringInsights,
      sortingInsights,
      patterns
    };
  }
  
  /**
   * Analyze an individual search result
   */
  private analyzeIndividualResult(
    game: any,
    query: string,
    originalPosition: number,
    finalResults: GameWithCalculatedFields[]
  ): ResultAnalysis {
    
    const finalPosition = finalResults.findIndex(fr => 
      fr.id === game.id || fr.igdb_id === game.igdb_id
    );
    
    const wasFiltered = finalPosition === -1;
    
    // Simulate filtering decisions (in real implementation, this would be tracked during actual filtering)
    const filteringDecisions = this.simulateFilteringDecisions(game, query);
    
    // Calculate sorting scores
    const sortingComponents = this.calculateSortingComponents(game, query);
    const totalSortingScore = sortingComponents.reduce((sum, comp) => sum + comp.contribution, 0);
    
    // Analyze quality metrics
    const qualityMetrics = this.analyzeQualityMetrics(game);
    
    // Analyze relevance
    const relevanceBreakdown = this.analyzeRelevance(game, query);
    
    // Calculate ranking factors
    const rankingFactors = this.calculateRankingFactors(game, query, relevanceBreakdown);
    
    return {
      gameId: game.id || game.igdb_id,
      gameName: game.name,
      source: game._source,
      finalPosition: finalPosition === -1 ? -1 : finalPosition,
      
      filteringDecisions,
      wasFiltered,
      filteringSummary: this.generateFilteringSummary(filteringDecisions),
      
      totalSortingScore,
      sortingComponents,
      rankingFactors,
      
      qualityMetrics,
      relevanceBreakdown
    };
  }
  
  /**
   * Simulate filtering decisions (in production, this should be tracked during actual filtering)
   */
  private simulateFilteringDecisions(game: any, query: string): FilteringDecision[] {
    const decisions: FilteringDecision[] = [];
    
    // Content protection filter
    const hasAdultContent = this.checkAdultContent(game);
    decisions.push({
      passed: !hasAdultContent,
      reason: hasAdultContent ? 'Contains adult content keywords' : 'Passed content protection',
      stage: 'content_protection',
      details: { hasAdultContent }
    });
    
    // Category filter
    const categoryCheck = this.checkCategoryFilter(game);
    decisions.push({
      passed: categoryCheck.passed,
      reason: categoryCheck.reason,
      stage: 'category',
      details: categoryCheck.details
    });
    
    // Relevance filter
    const relevanceScore = this.calculateRelevanceScore(game, query);
    const relevanceThreshold = this.isFranchiseQuery(query) ? 0.08 : 0.12;
    decisions.push({
      passed: relevanceScore >= relevanceThreshold,
      reason: relevanceScore >= relevanceThreshold 
        ? `Relevance score ${relevanceScore.toFixed(3)} meets threshold`
        : `Relevance score ${relevanceScore.toFixed(3)} below threshold ${relevanceThreshold}`,
      stage: 'relevance',
      score: relevanceScore,
      threshold: relevanceThreshold
    });
    
    // Quality filter
    const qualityScore = this.calculateQualityScore(game);
    const qualityThreshold = 0.3;
    decisions.push({
      passed: qualityScore >= qualityThreshold,
      reason: qualityScore >= qualityThreshold
        ? `Quality score ${qualityScore.toFixed(3)} acceptable`
        : `Quality score ${qualityScore.toFixed(3)} too low`,
      stage: 'quality',
      score: qualityScore,
      threshold: qualityThreshold
    });
    
    return decisions;
  }
  
  /**
   * Calculate detailed sorting components
   */
  private calculateSortingComponents(game: any, query: string): SortingScore[] {
    const components: SortingScore[] = [];
    
    // Relevance component
    const relevanceScore = this.calculateRelevanceScore(game, query);
    components.push({
      component: 'Relevance',
      score: relevanceScore,
      weight: 0.4,
      contribution: relevanceScore * 0.4,
      explanation: `How well the game matches "${query}"`
    });
    
    // Quality component
    const qualityScore = this.calculateQualityScore(game);
    components.push({
      component: 'Quality',
      score: qualityScore,
      weight: 0.3,
      contribution: qualityScore * 0.3,
      explanation: 'Completeness of game data (description, cover, etc.)'
    });
    
    // Popularity component
    const popularityScore = this.calculatePopularityScore(game);
    components.push({
      component: 'Popularity',
      score: popularityScore,
      weight: 0.2,
      contribution: popularityScore * 0.2,
      explanation: 'IGDB rating and user engagement metrics'
    });
    
    // Recency bonus
    const recencyScore = this.calculateRecencyScore(game);
    components.push({
      component: 'Recency',
      score: recencyScore,
      weight: 0.1,
      contribution: recencyScore * 0.1,
      explanation: 'Bonus for recently released games'
    });
    
    return components;
  }
  
  /**
   * Analyze quality metrics for a game
   */
  private analyzeQualityMetrics(game: any) {
    const hasDescription = !!(game.summary && game.summary.length > 20);
    const hasCover = !!game.cover_url;
    const hasGenres = !!(game.genres && game.genres.length > 0);
    const hasPlatforms = !!(game.platforms && game.platforms.length > 0);
    const hasRating = !!(game.igdb_rating && game.igdb_rating > 0);
    
    const completenessScore = [hasDescription, hasCover, hasGenres, hasPlatforms, hasRating]
      .filter(Boolean).length / 5;
    
    return {
      hasDescription,
      hasCover,
      hasGenres,
      hasPlatforms,
      hasRating,
      completenessScore
    };
  }
  
  /**
   * Analyze search relevance breakdown
   */
  private analyzeRelevance(game: any, query: string) {
    const name = (game.name || '').toLowerCase();
    const q = query.toLowerCase();
    
    // Name match analysis
    let nameMatch: any = { type: 'no_match', score: 0, explanation: 'No match found' };
    
    if (name === q) {
      nameMatch = { type: 'exact', score: 1.0, explanation: 'Exact name match' };
    } else if (name.startsWith(q)) {
      nameMatch = { type: 'starts_with', score: 0.8, explanation: 'Name starts with query' };
    } else if (name.includes(q)) {
      nameMatch = { type: 'contains', score: 0.6, explanation: 'Name contains query' };
    } else {
      const queryWords = q.split(/\s+/);
      const nameWords = name.split(/\s+/);
      const matchedWords = queryWords.filter(qw => 
        nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
      );
      if (matchedWords.length > 0) {
        const score = (matchedWords.length / queryWords.length) * 0.4;
        nameMatch = { 
          type: 'word_match', 
          score, 
          explanation: `${matchedWords.length}/${queryWords.length} words match` 
        };
      }
    }
    
    // Summary match
    const summary = (game.summary || '').toLowerCase();
    const summaryMatch = {
      hasMatch: summary.includes(q),
      score: summary.includes(q) ? 0.3 : 0,
      explanation: summary.includes(q) ? 'Query found in description' : 'No description match'
    };
    
    // Genre match
    const genres = game.genres || [];
    const genreMatches = genres.filter((genre: string) => 
      genre.toLowerCase().includes(q) || q.includes(genre.toLowerCase())
    );
    const genreMatch = {
      matches: genreMatches,
      score: genreMatches.length > 0 ? 0.2 : 0
    };
    
    // Franchise match
    const franchiseName = game.franchise?.name || game.collection?.name;
    const franchiseMatch = {
      hasMatch: !!(franchiseName && franchiseName.toLowerCase().includes(q)),
      score: franchiseName && franchiseName.toLowerCase().includes(q) ? 0.25 : 0,
      franchiseName
    };
    
    return {
      nameMatch,
      summaryMatch,
      genreMatch,
      franchiseMatch
    };
  }
  
  /**
   * Calculate ranking factors
   */
  private calculateRankingFactors(game: any, query: string, relevanceBreakdown: any) {
    return {
      relevanceScore: relevanceBreakdown.nameMatch.score + 
                     relevanceBreakdown.summaryMatch.score + 
                     relevanceBreakdown.genreMatch.score + 
                     relevanceBreakdown.franchiseMatch.score,
      qualityScore: this.calculateQualityScore(game),
      popularityScore: this.calculatePopularityScore(game),
      recencyBonus: this.calculateRecencyScore(game),
      penaltyScore: this.calculatePenalties(game, query)
    };
  }
  
  // Helper methods for scoring
  private calculateRelevanceScore(game: any, query: string): number {
    const q = query.toLowerCase();
    const name = (game.name || '').toLowerCase();
    
    let score = 0;
    
    if (name === q) return 1.0;
    if (name.startsWith(q)) score += 0.8;
    else if (name.includes(q)) score += 0.6;
    
    const queryWords = q.split(/\s+/);
    const nameWords = name.split(/\s+/);
    const matchedWords = queryWords.filter(qw => 
      nameWords.some(nw => nw.includes(qw) || qw.includes(nw))
    );
    score += (matchedWords.length / queryWords.length) * 0.3;
    
    // Summary bonus
    if (game.summary && game.summary.toLowerCase().includes(q)) {
      score += 0.1;
    }
    
    // Franchise bonus
    const franchiseName = game.franchise?.name || game.collection?.name;
    if (franchiseName && franchiseName.toLowerCase().includes(q)) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }
  
  private calculateQualityScore(game: any): number {
    let score = 0;
    
    if (game.summary && game.summary.length > 20) score += 0.25;
    if (game.cover_url) score += 0.25;
    if (game.genres && game.genres.length > 0) score += 0.2;
    if (game.platforms && game.platforms.length > 0) score += 0.15;
    if (game.igdb_rating && game.igdb_rating > 0) score += 0.15;
    
    return score;
  }
  
  private calculatePopularityScore(game: any): number {
    const rating = game.igdb_rating || 0;
    const userRatings = game.totalUserRatings || 0;
    
    let score = 0;
    
    // IGDB rating contribution (0-1 scale)
    score += (rating / 100) * 0.7;
    
    // User ratings contribution
    if (userRatings > 0) {
      const normalizedUserRatings = Math.min(userRatings / 100, 1);
      score += normalizedUserRatings * 0.3;
    }
    
    return Math.min(score, 1.0);
  }
  
  private calculateRecencyScore(game: any): number {
    if (!game.release_date) return 0;
    
    const releaseDate = new Date(game.release_date);
    const now = new Date();
    const ageInYears = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    
    // Recent games get a bonus, older games get less
    if (ageInYears < 1) return 1.0;
    if (ageInYears < 2) return 0.8;
    if (ageInYears < 5) return 0.6;
    if (ageInYears < 10) return 0.4;
    return 0.2;
  }
  
  private calculatePenalties(game: any, query: string): number {
    let penalty = 0;
    
    // Penalty for very old games (unless specifically searched)
    if (game.release_date) {
      const releaseDate = new Date(game.release_date);
      const ageInYears = (new Date().getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (ageInYears > 20) penalty += 0.1;
    }
    
    // Penalty for incomplete data
    if (!game.summary) penalty += 0.05;
    if (!game.cover_url) penalty += 0.03;
    if (!game.genres || game.genres.length === 0) penalty += 0.02;
    
    return penalty;
  }
  
  // Content and category checking methods
  private checkAdultContent(game: any): boolean {
    const adultKeywords = ['adult', 'mature', 'nsfw', 'erotic', 'porn'];
    const name = (game.name || '').toLowerCase();
    const summary = (game.summary || '').toLowerCase();
    
    return adultKeywords.some(keyword => 
      name.includes(keyword) || summary.includes(keyword)
    );
  }
  
  private checkCategoryFilter(game: any) {
    // IGDB category filtering logic
    if (game.category === 7) {
      return { passed: false, reason: 'Season content filtered', details: { category: 7 } };
    }
    
    if (game.category === 14) {
      return { passed: false, reason: 'Update/patch filtered', details: { category: 14 } };
    }
    
    if (game.category === 3) {
      const name = (game.name || '').toLowerCase();
      const isActualBundle = name.includes('bundle') || 
                            name.includes('collection') ||
                            name.includes('anthology');
      
      if (isActualBundle && !name.includes('edition')) {
        return { passed: false, reason: 'Bundle/collection filtered', details: { category: 3, name } };
      }
    }
    
    return { passed: true, reason: 'Category acceptable', details: { category: game.category } };
  }
  
  private isFranchiseQuery(query: string): boolean {
    const term = query.toLowerCase();
    const franchises = [
      'mario', 'zelda', 'pokemon', 'final fantasy', 'call of duty',
      'assassin', 'grand theft auto', 'mega man', 'sonic', 'halo'
    ];
    
    return franchises.some(f => term.includes(f));
  }
  
  private generateFilteringSummary(decisions: FilteringDecision[]): string {
    const failedDecisions = decisions.filter(d => !d.passed);
    
    if (failedDecisions.length === 0) {
      return 'Passed all filters';
    }
    
    const reasons = failedDecisions.map(d => d.reason).join('; ');
    return `Filtered: ${reasons}`;
  }
  
  private convertIGDBToAnalysis(igdbGame: IGDBGame): any {
    return {
      id: -(igdbGame.id || 0),
      igdb_id: igdbGame.id,
      name: igdbGame.name,
      summary: igdbGame.summary,
      genres: igdbGame.genres?.map(g => g.name) || [],
      platforms: igdbGame.platforms?.map(p => p.name) || [],
      igdb_rating: igdbGame.rating,
      release_date: igdbGame.first_release_date 
        ? new Date(igdbGame.first_release_date * 1000).toISOString().split('T')[0]
        : null,
      cover_url: igdbGame.cover?.url,
      franchise: igdbGame.franchise,
      collection: igdbGame.collection,
      category: igdbGame.category,
      _source: 'igdb' as const
    };
  }
  
  // Analysis aggregation methods
  private analyzeFilteringPatterns(analyses: ResultAnalysis[]) {
    const filterReasons: Record<string, number> = {};
    const stageStats: Record<string, number> = {};
    const qualityIssues: string[] = [];
    
    analyses.forEach(analysis => {
      analysis.filteringDecisions.forEach(decision => {
        if (!decision.passed) {
          filterReasons[decision.reason] = (filterReasons[decision.reason] || 0) + 1;
          stageStats[decision.stage] = (stageStats[decision.stage] || 0) + 1;
        }
      });
      
      // Identify quality issues
      if (analysis.qualityMetrics.completenessScore < 0.5) {
        qualityIssues.push(`${analysis.gameName}: Low completeness (${(analysis.qualityMetrics.completenessScore * 100).toFixed(0)}%)`);
      }
    });
    
    const mostCommonFilterReason = Object.entries(filterReasons)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'No filtering';
    
    return {
      mostCommonFilterReason,
      filteringStages: stageStats,
      qualityIssues: qualityIssues.slice(0, 10) // Top 10 issues
    };
  }
  
  private analyzeSortingPatterns(analyses: ResultAnalysis[], query: string) {
    const factorContributions: Record<string, number[]> = {};
    const problems: string[] = [];
    const recommendations: string[] = [];
    
    analyses.forEach(analysis => {
      analysis.sortingComponents.forEach(component => {
        if (!factorContributions[component.component]) {
          factorContributions[component.component] = [];
        }
        factorContributions[component.component].push(component.contribution);
      });
      
      // Identify sorting problems
      if (analysis.relevanceBreakdown.nameMatch.type === 'exact' && analysis.finalPosition > 5) {
        problems.push(`${analysis.gameName}: Exact match ranked at position ${analysis.finalPosition + 1}`);
      }
      
      if (analysis.rankingFactors.relevanceScore < 0.1 && analysis.finalPosition <= 10) {
        problems.push(`${analysis.gameName}: Low relevance (${analysis.rankingFactors.relevanceScore.toFixed(3)}) but high ranking`);
      }
    });
    
    // Calculate average contributions
    const topScoringFactors = Object.entries(factorContributions)
      .map(([factor, contributions]) => ({
        factor,
        averageContribution: contributions.reduce((sum, c) => sum + c, 0) / contributions.length
      }))
      .sort((a, b) => b.averageContribution - a.averageContribution);
    
    // Generate recommendations
    if (topScoringFactors[0]?.factor === 'Popularity' && topScoringFactors[0].averageContribution > 0.5) {
      recommendations.push('Consider reducing popularity weight to improve relevance ranking');
    }
    
    if (problems.some(p => p.includes('Exact match'))) {
      recommendations.push('Boost exact match scores to ensure they appear first');
    }
    
    return {
      topScoringFactors,
      sortingProblems: problems.slice(0, 10),
      recommendations
    };
  }
  
  private detectSearchPatterns(analyses: ResultAnalysis[], query: string) {
    const irrelevantResults: Array<{game: string; reason: string}> = [];
    const sortingAnomalies: Array<{game: string; expectedRank: number; actualRank: number; reason: string}> = [];
    const missingRelevantTerms: string[] = [];
    
    analyses.forEach((analysis, index) => {
      // Detect irrelevant results in top positions
      if (analysis.finalPosition !== -1 && analysis.finalPosition < 10 && 
          analysis.rankingFactors.relevanceScore < 0.15) {
        irrelevantResults.push({
          game: analysis.gameName,
          reason: `Low relevance (${analysis.rankingFactors.relevanceScore.toFixed(3)}) but ranked #${analysis.finalPosition + 1}`
        });
      }
      
      // Detect sorting anomalies
      if (analysis.relevanceBreakdown.nameMatch.type === 'exact') {
        if (analysis.finalPosition > 3) {
          sortingAnomalies.push({
            game: analysis.gameName,
            expectedRank: 1,
            actualRank: analysis.finalPosition + 1,
            reason: 'Exact match should be ranked higher'
          });
        }
      }
    });
    
    // Detect missing relevant terms (basic implementation)
    const queryWords = query.toLowerCase().split(/\s+/);
    const foundWords = analyses.flatMap(a => 
      a.relevanceBreakdown.nameMatch.type !== 'no_match' ? queryWords : []
    );
    const uniqueFoundWords = [...new Set(foundWords)];
    
    queryWords.forEach(word => {
      if (!uniqueFoundWords.includes(word) && word.length > 2) {
        missingRelevantTerms.push(word);
      }
    });
    
    return {
      irrelevantResults: irrelevantResults.slice(0, 10),
      missingRelevantTerms: missingRelevantTerms.slice(0, 5),
      sortingAnomalies: sortingAnomalies.slice(0, 10)
    };
  }
}

export const resultAnalysisService = new ResultAnalysisService();