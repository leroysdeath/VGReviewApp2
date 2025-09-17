// Test for enhanced game details display with copyright info and flag status
import { resultAnalysisService } from '../services/resultAnalysisService';

// Mock the copyright info function
jest.mock('../utils/contentProtectionFilter', () => ({
  getGameCopyrightInfo: jest.fn((game) => ({
    level: game.testCopyrightLevel || 'MODERATE',
    responsibleCompany: game.developer || 'Test Company',
    policyReason: 'Test policy reason',
    levelDescription: 'Test level description'
  }))
}));

describe('Enhanced Game Details Display', () => {
  describe('Copyright Information Integration', () => {
    it('should include copyright information in result analysis', () => {
      const mockDbResults = [
        {
          id: 1,
          name: 'Super Mario Bros.',
          developer: 'Nintendo',
          publisher: 'Nintendo',
          category: 0,
          testCopyrightLevel: 'AGGRESSIVE',
          total_rating: 85,
          follows: 25000
        }
      ];

      const mockFinalResults = [mockDbResults[0]];

      const analysis = resultAnalysisService.analyzeSearchResults(
        'mario',
        mockDbResults,
        [],
        mockFinalResults
      );

      expect(analysis.resultAnalyses).toHaveLength(1);
      
      const result = analysis.resultAnalyses[0];
      expect(result.copyrightInfo).toBeDefined();
      expect(result.copyrightInfo.level).toBe('AGGRESSIVE');
      expect(result.copyrightInfo.responsibleCompany).toBe('Nintendo');
      expect(result.copyrightInfo.policyReason).toBe('Test policy reason');
      expect(result.copyrightInfo.levelDescription).toBe('Test level description');
    });

    it('should handle different copyright levels correctly', () => {
      const mockGames = [
        {
          id: 1,
          name: 'Mario Game',
          developer: 'Nintendo',
          testCopyrightLevel: 'AGGRESSIVE'
        },
        {
          id: 2,
          name: 'Bethesda Game',
          developer: 'Bethesda',
          testCopyrightLevel: 'MOD_FRIENDLY'
        },
        {
          id: 3,
          name: 'Generic Game',
          developer: 'Indie Dev',
          testCopyrightLevel: 'MODERATE'
        }
      ];

      const analysis = resultAnalysisService.analyzeSearchResults(
        'game',
        mockGames,
        [],
        mockGames
      );

      const levels = analysis.resultAnalyses.map(r => r.copyrightInfo.level);
      expect(levels).toContain('AGGRESSIVE');
      expect(levels).toContain('MOD_FRIENDLY');
      expect(levels).toContain('MODERATE');
    });
  });

  describe('Manual Flag Status Integration', () => {
    it('should include flag status in result analysis', () => {
      const mockGame = {
        id: 1,
        name: 'Test Game',
        developer: 'Test Dev',
        greenlight_flag: true,
        redlight_flag: false,
        flag_reason: 'Approved for testing',
        flagged_at: '2024-01-01',
        flagged_by: 'admin'
      };

      const analysis = resultAnalysisService.analyzeSearchResults(
        'test',
        [mockGame],
        [],
        [mockGame]
      );

      const result = analysis.resultAnalyses[0];
      expect(result.flagStatus).toBeDefined();
      expect(result.flagStatus.hasGreenlight).toBe(true);
      expect(result.flagStatus.hasRedlight).toBe(false);
      expect(result.flagStatus.overrideActive).toBe(true);
      expect(result.flagStatus.flagReason).toBe('Approved for testing');
      expect(result.flagStatus.flaggedAt).toBe('2024-01-01');
      expect(result.flagStatus.flaggedBy).toBe('admin');
    });

    it('should handle redlight flags correctly', () => {
      const mockGame = {
        id: 1,
        name: 'Blocked Game',
        developer: 'Test Dev',
        greenlight_flag: false,
        redlight_flag: true,
        flag_reason: 'Contains inappropriate content',
        flagged_at: '2024-01-02',
        flagged_by: 'moderator'
      };

      const analysis = resultAnalysisService.analyzeSearchResults(
        'blocked',
        [mockGame],
        [],
        [mockGame]
      );

      const result = analysis.resultAnalyses[0];
      expect(result.flagStatus.hasGreenlight).toBe(false);
      expect(result.flagStatus.hasRedlight).toBe(true);
      expect(result.flagStatus.overrideActive).toBe(true);
      expect(result.flagStatus.flagReason).toBe('Contains inappropriate content');
    });

    it('should handle games with no manual flags', () => {
      const mockGame = {
        id: 1,
        name: 'Normal Game',
        developer: 'Test Dev',
        greenlight_flag: false,
        redlight_flag: false,
        flag_reason: null,
        flagged_at: null,
        flagged_by: null
      };

      const analysis = resultAnalysisService.analyzeSearchResults(
        'normal',
        [mockGame],
        [],
        [mockGame]
      );

      const result = analysis.resultAnalyses[0];
      expect(result.flagStatus.hasGreenlight).toBe(false);
      expect(result.flagStatus.hasRedlight).toBe(false);
      expect(result.flagStatus.overrideActive).toBe(false);
      expect(result.flagStatus.flagReason).toBeNull();
    });
  });

  describe('IGDB Metrics Integration', () => {
    it('should include IGDB metrics in result analysis', () => {
      const mockGame = {
        id: 1,
        name: 'Popular Game',
        developer: 'Big Studio',
        total_rating: 88.5,
        rating_count: 150,
        follows: 50000,
        hypes: 1000,
        popularity_score: 75000
      };

      const analysis = resultAnalysisService.analyzeSearchResults(
        'popular',
        [mockGame],
        [],
        [mockGame]
      );

      const result = analysis.resultAnalyses[0];
      expect(result.igdbMetrics).toBeDefined();
      expect(result.igdbMetrics.totalRating).toBe(88.5);
      expect(result.igdbMetrics.ratingCount).toBe(150);
      expect(result.igdbMetrics.follows).toBe(50000);
      expect(result.igdbMetrics.hypes).toBe(1000);
      expect(result.igdbMetrics.popularityScore).toBe(75000);
      expect(result.igdbMetrics.popularityTier).toBe('mainstream');
    });

    it('should classify popularity tiers correctly', () => {
      const testCases = [
        { popularity_score: 150000, expectedTier: 'viral' },
        { popularity_score: 75000, expectedTier: 'mainstream' },
        { popularity_score: 30000, expectedTier: 'popular' },
        { popularity_score: 8000, expectedTier: 'known' },
        { popularity_score: 1000, expectedTier: 'niche' }
      ];

      testCases.forEach(({ popularity_score, expectedTier }) => {
        const mockGame = {
          id: 1,
          name: 'Test Game',
          developer: 'Test Dev',
          popularity_score
        };

        const analysis = resultAnalysisService.analyzeSearchResults(
          'test',
          [mockGame],
          [],
          [mockGame]
        );

        expect(analysis.resultAnalyses[0].igdbMetrics.popularityTier).toBe(expectedTier);
      });
    });
  });

  describe('Integration with Search Results Table', () => {
    it('should provide all required fields for table display', () => {
      const mockGame = {
        id: 1,
        name: 'Complete Game',
        developer: 'Test Dev',
        publisher: 'Test Pub',
        category: 0,
        greenlight_flag: true,
        redlight_flag: false,
        flag_reason: 'Approved',
        total_rating: 90,
        follows: 100000,
        popularity_score: 80000,
        testCopyrightLevel: 'MODERATE'
      };

      const analysis = resultAnalysisService.analyzeSearchResults(
        'complete',
        [mockGame],
        [],
        [mockGame]
      );

      const result = analysis.resultAnalyses[0];
      
      // Check all required fields for table display
      expect(result.flagStatus).toBeDefined();
      expect(result.copyrightInfo).toBeDefined();
      expect(result.igdbMetrics).toBeDefined();
      
      // Check specific properties needed for sorting and display
      expect(typeof result.flagStatus.hasGreenlight).toBe('boolean');
      expect(typeof result.flagStatus.hasRedlight).toBe('boolean');
      expect(typeof result.copyrightInfo.level).toBe('string');
      expect(['BLOCK_ALL', 'AGGRESSIVE', 'MODERATE', 'MOD_FRIENDLY']).toContain(result.copyrightInfo.level);
    });
  });
});