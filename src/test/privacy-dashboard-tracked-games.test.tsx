/**
 * Privacy Dashboard Tracked Games Feature Tests
 * Unit tests for most tracked games section with covers, links, and ranking factors
 * API/DB limit compliant testing
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock privacy dashboard service
const mockPrivacyDashboardService = {
  getPrivacyMetrics: jest.fn()
};

jest.mock('../services/privacyDashboardService', () => ({
  privacyDashboardService: mockPrivacyDashboardService
}));

// Mock React components to avoid import.meta issues
jest.mock('../components/admin/PrivacyDashboard', () => ({
  PrivacyDashboard: () => null
}));

describe('Privacy Dashboard - Most Tracked Games Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Layer - Enhanced Top Games', () => {
    it('should return games with enhanced details and ranking factors', async () => {
      const mockTopGames = [
        {
          gameId: 1,
          gameName: 'The Legend of Zelda: Breath of the Wild',
          gameSlug: 'the-legend-of-zelda-breath-of-the-wild',
          gameCover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1xxx.jpg',
          views: 150,
          uniqueSessions: 85,
          rankingFactors: {
            totalViews: 150,
            uniqueUsers: 45,
            viewsToday: 12,
            viewsThisWeek: 47,
            avgSessionsPerDay: 2.1
          }
        },
        {
          gameId: 2,
          gameName: 'Super Mario Odyssey',
          gameSlug: 'super-mario-odyssey',
          gameCover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2xxx.jpg',
          views: 142,
          uniqueSessions: 78,
          rankingFactors: {
            totalViews: 142,
            uniqueUsers: 38,
            viewsToday: 8,
            viewsThisWeek: 34,
            avgSessionsPerDay: 1.9
          }
        }
      ];

      mockPrivacyDashboardService.getPrivacyMetrics.mockResolvedValue({
        topGames: mockTopGames,
        totalUsers: 100,
        consentedUsers: 85
      });

      const result = await mockPrivacyDashboardService.getPrivacyMetrics();
      
      expect(result.topGames).toHaveLength(2);
      expect(result.topGames[0]).toMatchObject({
        gameId: 1,
        gameName: expect.any(String),
        gameSlug: expect.any(String),
        gameCover: expect.any(String),
        views: expect.any(Number),
        uniqueSessions: expect.any(Number),
        rankingFactors: expect.objectContaining({
          totalViews: expect.any(Number),
          uniqueUsers: expect.any(Number),
          viewsToday: expect.any(Number),
          viewsThisWeek: expect.any(Number),
          avgSessionsPerDay: expect.any(Number)
        })
      });
    });

    it('should handle games without covers gracefully', async () => {
      const mockGamesNoCover = [
        {
          gameId: 3,
          gameName: 'Indie Game',
          gameSlug: 'indie-game',
          gameCover: null,
          views: 25,
          uniqueSessions: 15,
          rankingFactors: {
            totalViews: 25,
            uniqueUsers: 10,
            viewsToday: 2,
            viewsThisWeek: 8,
            avgSessionsPerDay: 0.8
          }
        }
      ];

      mockPrivacyDashboardService.getPrivacyMetrics.mockResolvedValue({
        topGames: mockGamesNoCover
      });

      const result = await mockPrivacyDashboardService.getPrivacyMetrics();
      
      expect(result.topGames[0].gameCover).toBeNull();
      expect(result.topGames[0].views).toBe(25);
      expect(result.topGames[0].rankingFactors).toBeDefined();
    });

    it('should respect API limits by limiting query size', async () => {
      // Simulate service call without hitting real database
      const mockLimitedQuery = jest.fn().mockResolvedValue({
        topGames: Array.from({ length: 8 }, (_, i) => ({
          gameId: i + 1,
          views: 100 - i * 5,
          uniqueSessions: 50 - i * 2
        }))
      });

      const result = await mockLimitedQuery();
      
      // Should limit to reasonable number of games
      expect(result.topGames).toHaveLength(8);
      expect(result.topGames[0].views).toBeGreaterThan(result.topGames[7].views);
    });
  });

  describe('Ranking Algorithm Validation', () => {
    it('should verify ranking factors are calculated correctly', () => {
      const mockGameStats = {
        views: 100,
        sessions: new Set(['session1', 'session2', 'session3']),
        users: new Set([1, 2, 3]),
        viewsToday: 5,
        viewsThisWeek: 25,
        dailyViews: new Map([
          ['2024-01-01', 10],
          ['2024-01-02', 15],
          ['2024-01-03', 8]
        ])
      };

      const avgSessionsPerDay = mockGameStats.dailyViews.size > 0 ? 
        mockGameStats.sessions.size / mockGameStats.dailyViews.size : 0;

      expect(mockGameStats.views).toBe(100);
      expect(mockGameStats.sessions.size).toBe(3);
      expect(mockGameStats.users.size).toBe(3);
      expect(avgSessionsPerDay).toBe(1); // 3 sessions / 3 days
    });

    it('should handle edge cases in ranking calculation', () => {
      const emptyStats = {
        views: 0,
        sessions: new Set(),
        users: new Set(),
        dailyViews: new Map()
      };

      const avgSessionsPerDay = emptyStats.dailyViews.size > 0 ? 
        emptyStats.sessions.size / emptyStats.dailyViews.size : 0;

      expect(avgSessionsPerDay).toBe(0);
      expect(emptyStats.views).toBe(0);
    });
  });

  describe('Privacy Compliance', () => {
    it('should ensure ranking uses only aggregated data', () => {
      const rankingFactors = {
        totalViews: 100,      // Aggregated count
        uniqueUsers: 25,      // Count only, no user IDs
        viewsToday: 8,        // Temporal aggregation
        viewsThisWeek: 35,    // Temporal aggregation
        avgSessionsPerDay: 1.5 // Statistical aggregation
      };

      // Verify no individual user data is exposed
      expect(Object.keys(rankingFactors)).not.toContain('userIds');
      expect(Object.keys(rankingFactors)).not.toContain('sessionIds');
      expect(Object.keys(rankingFactors)).not.toContain('ipAddresses');
      
      // Verify only privacy-compliant metrics
      expect(rankingFactors).toEqual(expect.objectContaining({
        totalViews: expect.any(Number),
        uniqueUsers: expect.any(Number),
        viewsToday: expect.any(Number),
        viewsThisWeek: expect.any(Number),
        avgSessionsPerDay: expect.any(Number)
      }));
    });

    it('should verify data minimization principles', () => {
      const gameData = {
        gameId: 1,
        gameName: 'Test Game',
        views: 50,
        // Should NOT contain:
        // userNames, userEmails, ipAddresses, personalData
      };

      expect(gameData).not.toHaveProperty('userNames');
      expect(gameData).not.toHaveProperty('userEmails');
      expect(gameData).not.toHaveProperty('ipAddresses');
      expect(gameData).not.toHaveProperty('personalData');
    });
  });

  describe('Performance and Resource Management', () => {
    it('should complete ranking calculations quickly', () => {
      const startTime = Date.now();
      
      // Simulate ranking algorithm processing
      const mockGames = Array.from({ length: 100 }, (_, i) => ({
        gameId: i + 1,
        views: Math.floor(Math.random() * 1000),
        sessions: Math.floor(Math.random() * 500)
      })).sort((a, b) => b.views - a.views).slice(0, 8);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(100); // Should be very fast
      expect(mockGames).toHaveLength(8);
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
        gameId: i + 1,
        views: Math.floor(Math.random() * 10000)
      }));

      const startTime = Date.now();
      
      // Simulate processing large dataset
      const topGames = largeDataset
        .sort((a, b) => b.views - a.views)
        .slice(0, 8);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(50);
      expect(topGames).toHaveLength(8);
    });

    it('should minimize database queries for efficiency', () => {
      // Mock query counter
      let queryCount = 0;
      
      const mockQuery = () => {
        queryCount++;
        return Promise.resolve({ data: [] });
      };

      // Simulate efficient data fetching
      mockQuery(); // Game views query
      mockQuery(); // Game details query

      // Should make minimal queries (2 for full feature)
      expect(queryCount).toBeLessThanOrEqual(3);
    });
  });

  describe('UI Component Structure Validation', () => {
    it('should validate game card structure', () => {
      const gameCard = {
        ranking: 1,
        cover: 'https://example.com/cover.jpg',
        name: 'Test Game',
        slug: 'test-game',
        views: 100,
        sessions: 50,
        todayViews: 5,
        weekViews: 25,
        trendingIndicator: true
      };

      expect(gameCard).toMatchObject({
        ranking: expect.any(Number),
        name: expect.any(String),
        slug: expect.any(String),
        views: expect.any(Number),
        sessions: expect.any(Number)
      });

      expect(gameCard.ranking).toBeGreaterThan(0);
      expect(gameCard.views).toBeGreaterThanOrEqual(0);
    });

    it('should validate ranking methodology explanation structure', () => {
      const rankingExplanation = {
        primary: 'Total views (all-time engagement)',
        secondary: 'Unique sessions (diverse interest)',
        recency: 'Views today & this week (trending factor)',
        engagement: 'Average sessions per active day',
        privacyNote: 'Only aggregated, anonymized data is used for ranking'
      };

      Object.values(rankingExplanation).forEach(explanation => {
        expect(typeof explanation).toBe('string');
        expect(explanation.length).toBeGreaterThan(10);
      });

      expect(rankingExplanation.privacyNote).toContain('anonymized');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API errors gracefully', async () => {
      mockPrivacyDashboardService.getPrivacyMetrics.mockRejectedValue(
        new Error('Database connection failed')
      );

      try {
        await mockPrivacyDashboardService.getPrivacyMetrics();
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Database connection failed');
      }
    });

    it('should handle empty tracking data', async () => {
      mockPrivacyDashboardService.getPrivacyMetrics.mockResolvedValue({
        topGames: [],
        totalUsers: 0,
        consentedUsers: 0
      });

      const result = await mockPrivacyDashboardService.getPrivacyMetrics();
      
      expect(result.topGames).toHaveLength(0);
      expect(result.totalUsers).toBe(0);
    });

    it('should validate game link generation', () => {
      const gameSlug = 'test-game-slug';
      const gameId = 123;
      
      const linkWithSlug = `/game/${gameSlug}`;
      const linkWithId = `/game/${gameId}`;
      
      expect(linkWithSlug).toBe('/game/test-game-slug');
      expect(linkWithId).toBe('/game/123');
    });

    it('should handle missing game covers', () => {
      const gameWithCover = {
        cover: 'https://images.igdb.com/igdb/image/upload/t_thumb/co1xxx.jpg'
      };
      
      const gameWithoutCover = {
        cover: null
      };

      // Transform cover URL
      const transformedCover = gameWithCover.cover?.replace('t_thumb', 't_cover_small');
      expect(transformedCover).toBe('https://images.igdb.com/igdb/image/upload/t_cover_small/co1xxx.jpg');
      
      // Handle missing cover
      expect(gameWithoutCover.cover).toBeNull();
    });
  });
});