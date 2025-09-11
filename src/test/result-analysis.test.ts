/**
 * Unit Tests for Result Analysis Service
 * 
 * Tests comprehensive search result analysis including:
 * - Individual result filtering and scoring
 * - Pattern detection and anomaly identification
 * - Sorting algorithm debugging and optimization
 */

import { ResultAnalysisService } from '../services/resultAnalysisService';
import type { GameWithCalculatedFields } from '../types/database';

// Mock data for testing
const mockDatabaseGame: GameWithCalculatedFields = {
  id: 1,
  igdb_id: 1001,
  name: 'Super Mario Bros.',
  slug: 'super-mario-bros',
  summary: 'Classic platformer game featuring Mario jumping on enemies',
  release_date: '1985-09-13',
  cover_url: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1234.jpg',
  genres: ['Platformer', 'Adventure'],
  platforms: ['NES', 'Switch'],
  developer: 'Nintendo',
  publisher: 'Nintendo',
  igdb_rating: 85,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  averageUserRating: 4.5,
  totalUserRatings: 100
};

const mockIGDBGame = {
  id: 1002,
  name: 'Mario Kart 8 Deluxe',
  summary: 'Racing game with Mario characters on various tracks',
  first_release_date: 1490918400, // March 30, 2017
  rating: 88,
  total_rating: 92,
  total_rating_count: 150,
  follows: 5000,
  hypes: 200,
  category: 0, // Main game
  cover: {
    id: 5678,
    url: '//images.igdb.com/igdb/image/upload/t_thumb/co5678.jpg'
  },
  genres: [
    { id: 10, name: 'Racing' },
    { id: 13, name: 'Simulator' }
  ],
  platforms: [
    { id: 130, name: 'Nintendo Switch' }
  ],
  involved_companies: [
    {
      company: { name: 'Nintendo EPD' },
      developer: true,
      publisher: false
    }
  ],
  alternative_names: [
    { id: 1, name: 'MK8DX' }
  ],
  franchise: {
    id: 100,
    name: 'Mario Kart'
  }
};

const mockLowQualityGame: GameWithCalculatedFields = {
  id: 3,
  igdb_id: 1003,
  name: 'Unknown Racing Game',
  slug: 'unknown-racing-game',
  summary: '', // No description
  release_date: null,
  cover_url: null, // No cover
  genres: [], // No genres
  platforms: [], // No platforms
  developer: '',
  publisher: '',
  igdb_rating: 0, // No rating
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  averageUserRating: 0,
  totalUserRatings: 0
};

const mockAdultContentGame: GameWithCalculatedFields = {
  id: 4,
  igdb_id: 1004,
  name: 'Adult Content Game',
  slug: 'adult-content-game',
  summary: 'This game contains mature adult themes and content',
  release_date: '2020-01-01',
  cover_url: 'https://example.com/cover.jpg',
  genres: ['Action'],
  platforms: ['PC'],
  developer: 'Developer',
  publisher: 'Publisher',
  igdb_rating: 70,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  averageUserRating: 3.5,
  totalUserRatings: 50
};

describe('ResultAnalysisService', () => {
  let analysisService: ResultAnalysisService;

  beforeEach(() => {
    analysisService = new ResultAnalysisService();
  });

  describe('Individual Result Analysis', () => {
    test('should analyze exact name match correctly', () => {
      const dbResults = [mockDatabaseGame];
      const igdbResults = [];
      const finalResults = [mockDatabaseGame];

      const analysis = analysisService.analyzeSearchResults(
        'Super Mario Bros.',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.gameName).toBe('Super Mario Bros.');
      expect(result.finalPosition).toBe(0);
      expect(result.wasFiltered).toBe(false);
      expect(result.relevanceBreakdown.nameMatch.type).toBe('exact');
      expect(result.relevanceBreakdown.nameMatch.score).toBe(1.0);
      expect(result.rankingFactors.relevanceScore).toBeGreaterThan(0.9);
    });

    test('should identify partial name matches', () => {
      const dbResults = [mockDatabaseGame];
      const igdbResults = [];
      const finalResults = [mockDatabaseGame];

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.relevanceBreakdown.nameMatch.type).toBe('contains');
      expect(result.relevanceBreakdown.nameMatch.score).toBe(0.6);
      expect(result.rankingFactors.relevanceScore).toBeGreaterThan(0.5);
    });

    test('should detect word-based matches', () => {
      const dbResults = [mockDatabaseGame];
      const igdbResults = [];
      const finalResults = [mockDatabaseGame];

      const analysis = analysisService.analyzeSearchResults(
        'super bros',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.relevanceBreakdown.nameMatch.type).toBe('word_match');
      expect(result.relevanceBreakdown.nameMatch.score).toBeGreaterThan(0);
      expect(result.relevanceBreakdown.nameMatch.explanation).toContain('words match');
    });
  });

  describe('Quality Metrics Analysis', () => {
    test('should identify high-quality game data', () => {
      const dbResults = [mockDatabaseGame];
      const igdbResults = [];
      const finalResults = [mockDatabaseGame];

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.qualityMetrics.hasDescription).toBe(true);
      expect(result.qualityMetrics.hasCover).toBe(true);
      expect(result.qualityMetrics.hasGenres).toBe(true);
      expect(result.qualityMetrics.hasPlatforms).toBe(true);
      expect(result.qualityMetrics.hasRating).toBe(true);
      expect(result.qualityMetrics.completenessScore).toBe(1.0);
    });

    test('should identify low-quality game data', () => {
      const dbResults = [mockLowQualityGame];
      const igdbResults = [];
      const finalResults = [];

      const analysis = analysisService.analyzeSearchResults(
        'unknown',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.qualityMetrics.hasDescription).toBe(false);
      expect(result.qualityMetrics.hasCover).toBe(false);
      expect(result.qualityMetrics.hasGenres).toBe(false);
      expect(result.qualityMetrics.hasPlatforms).toBe(false);
      expect(result.qualityMetrics.hasRating).toBe(false);
      expect(result.qualityMetrics.completenessScore).toBe(0.0);
    });

    test('should calculate partial quality scores correctly', () => {
      const partialQualityGame: GameWithCalculatedFields = {
        ...mockLowQualityGame,
        summary: 'Has description',
        genres: ['Racing'],
        igdb_rating: 75
      };

      const dbResults = [partialQualityGame];
      const igdbResults = [];
      const finalResults = [partialQualityGame];

      const analysis = analysisService.analyzeSearchResults(
        'racing',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.qualityMetrics.completenessScore).toBe(0.6); // 3/5 criteria met
      expect(result.qualityMetrics.hasDescription).toBe(true);
      expect(result.qualityMetrics.hasGenres).toBe(true);
      expect(result.qualityMetrics.hasRating).toBe(true);
    });
  });

  describe('Filtering Analysis', () => {
    test('should detect content protection filtering', () => {
      const dbResults = [mockAdultContentGame];
      const igdbResults = [];
      const finalResults = [];

      const analysis = analysisService.analyzeSearchResults(
        'adult game',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.wasFiltered).toBe(true);
      
      const contentFilter = result.filteringDecisions.find(d => d.stage === 'content_protection');
      expect(contentFilter).toBeDefined();
      expect(contentFilter?.passed).toBe(false);
      expect(contentFilter?.reason).toContain('adult content');
    });

    test('should pass content protection for clean games', () => {
      const dbResults = [mockDatabaseGame];
      const igdbResults = [];
      const finalResults = [mockDatabaseGame];

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      const contentFilter = result.filteringDecisions.find(d => d.stage === 'content_protection');
      expect(contentFilter?.passed).toBe(true);
    });

    test('should detect relevance filtering', () => {
      const irrelevantGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        name: 'Completely Unrelated Game Title',
        summary: 'Nothing to do with the search query'
      };

      const dbResults = [irrelevantGame];
      const igdbResults = [];
      const finalResults = [];

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      const relevanceFilter = result.filteringDecisions.find(d => d.stage === 'relevance');
      expect(relevanceFilter?.passed).toBe(false);
      expect(relevanceFilter?.score).toBeLessThan(0.12);
    });

    test('should detect category filtering for problematic categories', () => {
      const seasonGame = {
        ...mockIGDBGame,
        category: 7 // Season
      };

      const dbResults = [];
      const igdbResults = [seasonGame];
      const finalResults = [];

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      const categoryFilter = result.filteringDecisions.find(d => d.stage === 'category');
      expect(categoryFilter?.passed).toBe(false);
      expect(categoryFilter?.reason).toContain('Season');
    });
  });

  describe('Sorting Analysis', () => {
    test('should calculate sorting components correctly', () => {
      const dbResults = [mockDatabaseGame];
      const igdbResults = [];
      const finalResults = [mockDatabaseGame];

      const analysis = analysisService.analyzeSearchResults(
        'Super Mario Bros.',
        dbResults,
        igdbResults,
        finalResults
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.sortingComponents).toHaveLength(4);
      
      const relevanceComponent = result.sortingComponents.find(c => c.component === 'Relevance');
      expect(relevanceComponent).toBeDefined();
      expect(relevanceComponent?.score).toBeGreaterThan(0.8); // High for exact match
      expect(relevanceComponent?.weight).toBe(0.4);
      
      const qualityComponent = result.sortingComponents.find(c => c.component === 'Quality');
      expect(qualityComponent?.score).toBe(1.0); // Perfect quality
      
      expect(result.totalSortingScore).toBeGreaterThan(0.8);
    });

    test('should identify sorting anomalies', () => {
      // Exact match game that should be ranked higher
      const exactMatchGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        name: 'Mario Kart'
      };

      // Low relevance game that gets high position due to popularity
      const popularButIrrelevantGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        id: 2,
        name: 'Popular Unrelated Game',
        summary: 'Nothing about mario or kart',
        igdb_rating: 95 // Very high rating
      };

      const dbResults = [exactMatchGame, popularButIrrelevantGame];
      const igdbResults = [];
      // Simulate wrong order in final results
      const finalResults = [popularButIrrelevantGame, exactMatchGame];

      const analysis = analysisService.analyzeSearchResults(
        'Mario Kart',
        dbResults,
        igdbResults,
        finalResults
      );

      // Should detect that exact match is not first
      expect(analysis.patterns.sortingAnomalies).toHaveLength(1);
      expect(analysis.patterns.sortingAnomalies[0].reason).toContain('Exact match should be ranked higher');
    });

    test('should identify irrelevant results in top positions', () => {
      const irrelevantGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        name: 'Totally Different Game',
        summary: 'Nothing related to search'
      };

      const dbResults = [irrelevantGame];
      const igdbResults = [];
      const finalResults = [irrelevantGame]; // Somehow this made it to position 1

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        dbResults,
        igdbResults,
        finalResults
      );

      expect(analysis.patterns.irrelevantResults.length).toBeGreaterThan(0);
      expect(analysis.patterns.irrelevantResults[0].reason).toContain('Low relevance');
    });
  });

  describe('Pattern Detection', () => {
    test('should detect franchise queries', () => {
      const analysisService = new ResultAnalysisService();
      
      // Access private method for testing
      const isFranchiseQuery = (analysisService as any).isFranchiseQuery;
      
      expect(isFranchiseQuery('mario')).toBe(true);
      expect(isFranchiseQuery('Super Mario Bros')).toBe(true);
      expect(isFranchiseQuery('pokemon')).toBe(true);
      expect(isFranchiseQuery('final fantasy')).toBe(true);
      expect(isFranchiseQuery('zelda')).toBe(true);
      
      expect(isFranchiseQuery('obscure indie game')).toBe(false);
      expect(isFranchiseQuery('random title')).toBe(false);
    });

    test('should calculate appropriate relevance thresholds for franchise vs specific queries', () => {
      const analysisService = new ResultAnalysisService();
      
      const franchiseGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        name: 'Mario Party 10',
      };

      const specificGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        name: 'Specific Indie Title',
      };

      // Franchise query should have lower threshold
      const franchiseAnalysis = analysisService.analyzeSearchResults(
        'mario',
        [franchiseGame],
        [],
        [franchiseGame]
      );

      // Specific query should have higher threshold
      const specificAnalysis = analysisService.analyzeSearchResults(
        'specific indie game',
        [specificGame],
        [],
        []
      );

      const franchiseRelevanceFilter = franchiseAnalysis.resultAnalyses[0].filteringDecisions
        .find(d => d.stage === 'relevance');
      const specificRelevanceFilter = specificAnalysis.resultAnalyses[0].filteringDecisions
        .find(d => d.stage === 'relevance');

      expect(franchiseRelevanceFilter?.threshold).toBe(0.08);
      expect(specificRelevanceFilter?.threshold).toBe(0.12);
    });

    test('should identify missing relevant terms', () => {
      const dbResults = [mockDatabaseGame];
      const igdbResults = [];
      const finalResults = [];

      const analysis = analysisService.analyzeSearchResults(
        'mario luigi brothers',
        dbResults,
        igdbResults,
        finalResults
      );

      // Should identify that 'luigi' wasn't found in any results
      expect(analysis.patterns.missingRelevantTerms).toContain('luigi');
    });

    test('should aggregate filtering insights correctly', () => {
      const games = [
        mockAdultContentGame, // Should be filtered for adult content
        mockLowQualityGame,   // Should be filtered for low quality
        { ...mockLowQualityGame, id: 5, name: 'Another Low Quality' }
      ];

      const analysis = analysisService.analyzeSearchResults(
        'test query',
        games,
        [],
        []
      );

      expect(analysis.filteringInsights.mostCommonFilterReason).toBeDefined();
      expect(analysis.filteringInsights.qualityIssues.length).toBeGreaterThan(0);
      expect(analysis.filteredCount).toBe(3); // All should be filtered
    });
  });

  describe('Sorting Algorithm Debugging', () => {
    test('should provide recommendations for sorting improvements', () => {
      // Create scenario where popularity is overriding relevance
      const irrelevantButPopularGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        name: 'Completely Different Game',
        summary: 'Nothing to do with mario',
        igdb_rating: 98 // Very high rating
      };

      const relevantGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        id: 2,
        name: 'Super Mario World',
        summary: 'Mario platformer game',
        igdb_rating: 85
      };

      const dbResults = [irrelevantButPopularGame, relevantGame];
      const igdbResults = [];
      // Simulate popular game ranking higher despite low relevance
      const finalResults = [irrelevantButPopularGame, relevantGame];

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        dbResults,
        igdbResults,
        finalResults
      );

      // Should recommend reducing popularity weight
      expect(analysis.sortingInsights.recommendations).toContain(
        expect.stringContaining('popularity weight')
      );
    });

    test('should identify exact match boost needs', () => {
      const exactMatchGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        name: 'Mario Kart',
        igdb_rating: 80
      };

      const partialMatchGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        id: 2,
        name: 'Some Mario Game',
        igdb_rating: 95
      };

      const dbResults = [exactMatchGame, partialMatchGame];
      const igdbResults = [];
      // Exact match not first due to lower rating
      const finalResults = [partialMatchGame, exactMatchGame];

      const analysis = analysisService.analyzeSearchResults(
        'Mario Kart',
        dbResults,
        igdbResults,
        finalResults
      );

      expect(analysis.sortingInsights.recommendations).toContain(
        expect.stringContaining('exact match')
      );
    });

    test('should track sorting factor contributions', () => {
      const dbResults = [mockDatabaseGame];
      const igdbResults = [];
      const finalResults = [mockDatabaseGame];

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        dbResults,
        igdbResults,
        finalResults
      );

      const topFactors = analysis.sortingInsights.topScoringFactors;
      
      expect(topFactors).toHaveLength(4);
      expect(topFactors[0].averageContribution).toBeGreaterThan(0);
      
      // Should be sorted by contribution (descending)
      for (let i = 1; i < topFactors.length; i++) {
        expect(topFactors[i-1].averageContribution).toBeGreaterThanOrEqual(topFactors[i].averageContribution);
      }
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle empty search results', () => {
      const analysis = analysisService.analyzeSearchResults(
        'nonexistent game',
        [],
        [],
        []
      );

      expect(analysis.totalResults).toBe(0);
      expect(analysis.filteredCount).toBe(0);
      expect(analysis.resultAnalyses).toHaveLength(0);
      expect(analysis.patterns.irrelevantResults).toHaveLength(0);
    });

    test('should handle games with missing data gracefully', () => {
      const incompleteGame: GameWithCalculatedFields = {
        id: 1,
        igdb_id: null,
        name: 'Incomplete Game',
        slug: 'incomplete-game',
        summary: null,
        release_date: null,
        cover_url: null,
        genres: null as any,
        platforms: null as any,
        developer: null,
        publisher: null,
        igdb_rating: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        averageUserRating: 0,
        totalUserRatings: 0
      };

      const analysis = analysisService.analyzeSearchResults(
        'incomplete',
        [incompleteGame],
        [],
        []
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.gameName).toBe('Incomplete Game');
      expect(result.qualityMetrics.completenessScore).toBe(0);
      expect(result.filteringDecisions).toHaveLength(4); // All filter stages should run
    });

    test('should handle very long search queries', () => {
      const longQuery = 'super ultra mega awesome fantastic incredible amazing mario brothers platformer adventure game deluxe edition';
      
      const analysis = analysisService.analyzeSearchResults(
        longQuery,
        [mockDatabaseGame],
        [],
        [mockDatabaseGame]
      );

      const result = analysis.resultAnalyses[0];
      
      expect(result.relevanceBreakdown.nameMatch.type).toBe('word_match');
      expect(result.relevanceBreakdown.nameMatch.score).toBeGreaterThan(0);
    });

    test('should handle duplicate games from different sources', () => {
      const dbGame: GameWithCalculatedFields = {
        ...mockDatabaseGame,
        id: 1,
        igdb_id: 1001
      };

      const sameGameFromIGDB = {
        ...mockIGDBGame,
        id: 1001,
        name: 'Super Mario Bros.' // Same game, different source
      };

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        [dbGame],
        [sameGameFromIGDB],
        [dbGame]
      );

      // Should handle both sources but recognize them as the same game
      expect(analysis.totalResults).toBe(2);
      expect(analysis.resultAnalyses).toHaveLength(2);
      
      const sources = analysis.resultAnalyses.map(r => r.source);
      expect(sources).toContain('database');
      expect(sources).toContain('igdb');
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle large result sets efficiently', () => {
      const largeResultSet: GameWithCalculatedFields[] = [];
      for (let i = 0; i < 100; i++) {
        largeResultSet.push({
          ...mockDatabaseGame,
          id: i,
          name: `Game ${i}`,
          slug: `game-${i}`
        });
      }

      const startTime = Date.now();
      
      const analysis = analysisService.analyzeSearchResults(
        'game',
        largeResultSet,
        [],
        largeResultSet.slice(0, 50) // First 50 made it through
      );

      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(analysis.resultAnalyses).toHaveLength(100);
      expect(analysis.filteredCount).toBe(50); // 50 were filtered out
    });

    test('should provide meaningful insights even with limited data', () => {
      const singleGame: GameWithCalculatedFields = {
        ...mockDatabaseGame
      };

      const analysis = analysisService.analyzeSearchResults(
        'mario',
        [singleGame],
        [],
        [singleGame]
      );

      expect(analysis.filteringInsights.mostCommonFilterReason).toBeDefined();
      expect(analysis.sortingInsights.topScoringFactors).toHaveLength(4);
      expect(analysis.patterns).toBeDefined();
    });
  });
});