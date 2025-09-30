import { trackingService } from '../services/trackingService';
import { supabase } from '../services/supabase';

jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../services/privacyService', () => ({
  privacyService: {
    shouldTrack: jest.fn().mockResolvedValue({
      allowed: true,
      level: 'full',
      sessionHash: 'test-session-hash'
    }),
    getCurrentSessionHash: jest.fn().mockResolvedValue('test-session-hash')
  }
}));

describe('TrackingService - Advanced Analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCohortAnalysis', () => {
    it('should calculate cohort retention rates correctly', async () => {
      const mockData = [
        { user_id: 1, view_date: '2025-01-01', session_hash: 'session1' },
        { user_id: 2, view_date: '2025-01-01', session_hash: 'session2' },
        { user_id: 1, view_date: '2025-01-02', session_hash: 'session3' },
        { user_id: 3, view_date: '2025-01-02', session_hash: 'session4' }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: mockData, error: null })
            })
          })
        })
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-02');

      const result = await trackingService.getCohortAnalysis(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        cohortDate: '2025-01-01',
        totalUsers: 2,
        returningUsers: 1
      });
      expect(result[0].retentionRate).toBeCloseTo(50, 1);
    });

    it('should handle empty cohort data', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null })
            })
          })
        })
      });

      const result = await trackingService.getCohortAnalysis(new Date(), new Date());
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
            })
          })
        })
      });

      const result = await trackingService.getCohortAnalysis(new Date(), new Date());
      expect(result).toEqual([]);
    });
  });

  describe('getGamePerformanceTrends', () => {
    it('should aggregate weekly performance data correctly', async () => {
      const mockData = [
        { game_id: 1, metric_date: '2025-01-01', total_views: 100, unique_sessions: 50 },
        { game_id: 1, metric_date: '2025-01-02', total_views: 120, unique_sessions: 60 },
        { game_id: 1, metric_date: '2025-01-08', total_views: 150, unique_sessions: 75 }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockData, error: null })
            })
          })
        })
      });

      const result = await trackingService.getGamePerformanceTrends([1], 4);

      expect(result).toHaveLength(1);
      expect(result[0].gameId).toBe(1);
      expect(result[0].weeklyData.length).toBeGreaterThan(0);
      expect(result[0].overallTrend).toMatch(/rising|falling|stable/);
    });

    it('should detect rising trends', async () => {
      const mockData = [
        { game_id: 1, metric_date: '2025-01-01', total_views: 100, unique_sessions: 50 },
        { game_id: 1, metric_date: '2025-01-08', total_views: 200, unique_sessions: 100 },
        { game_id: 1, metric_date: '2025-01-15', total_views: 300, unique_sessions: 150 }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockData, error: null })
            })
          })
        })
      });

      const result = await trackingService.getGamePerformanceTrends([1], 4);

      expect(result[0].overallTrend).toBe('rising');
    });

    it('should handle multiple games', async () => {
      const mockData = [
        { game_id: 1, metric_date: '2025-01-01', total_views: 100, unique_sessions: 50 },
        { game_id: 2, metric_date: '2025-01-01', total_views: 200, unique_sessions: 100 }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: mockData, error: null })
            })
          })
        })
      });

      const result = await trackingService.getGamePerformanceTrends([1, 2], 4);

      expect(result).toHaveLength(2);
      expect(result.map(t => t.gameId)).toContain(1);
      expect(result.map(t => t.gameId)).toContain(2);
    });
  });

  describe('getSourceAttribution', () => {
    it('should aggregate views by source correctly', async () => {
      const mockData = [
        { view_sources: { search: 100, direct: 50 } },
        { view_sources: { search: 80, direct: 60, recommendation: 20 } }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({ data: mockData, error: null })
          })
        })
      });

      const result = await trackingService.getSourceAttribution(new Date(), new Date());

      expect(result).toHaveLength(3);

      const searchAttr = result.find(s => s.source === 'search');
      expect(searchAttr?.count).toBe(180);
      expect(searchAttr?.percentage).toBeCloseTo(58.06, 1);

      const directAttr = result.find(s => s.source === 'direct');
      expect(directAttr?.count).toBe(110);
    });

    it('should sort by count descending', async () => {
      const mockData = [
        { view_sources: { search: 50, direct: 100, recommendation: 75 } }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({ data: mockData, error: null })
          })
        })
      });

      const result = await trackingService.getSourceAttribution(new Date(), new Date());

      expect(result[0].source).toBe('direct');
      expect(result[1].source).toBe('recommendation');
      expect(result[2].source).toBe('search');
    });

    it('should handle empty data', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        })
      });

      const result = await trackingService.getSourceAttribution(new Date(), new Date());
      expect(result).toEqual([]);
    });
  });

  describe('getAnalyticsSummary', () => {
    it('should return comprehensive analytics summary', async () => {
      const mockMetricsData = [
        { total_views: 100, unique_sessions: 50 }
      ];

      const mockTopGamesData = [
        { game_id: 1, total_views: 100 }
      ];

      const mockSourcesData = [
        { view_sources: { search: 60, direct: 40 } }
      ];

      (supabase.from as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({ data: mockMetricsData, error: null })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({ data: mockMetricsData, error: null })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({ data: mockTopGamesData, error: null })
            })
          })
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockResolvedValue({ data: mockSourcesData, error: null })
            })
          })
        });

      const result = await trackingService.getAnalyticsSummary(30);

      expect(result).toBeDefined();
      expect(result?.totalViews).toBe(100);
      expect(result?.uniqueSessions).toBe(50);
      expect(result?.avgViewsPerSession).toBe(2);
      expect(result?.topGames).toHaveLength(1);
      expect(result?.sourceBreakdown).toHaveLength(2);
      expect(result?.periodComparison).toBeDefined();
    });

    it('should calculate period comparison correctly', async () => {
      const currentMetrics = [{ total_views: 150, unique_sessions: 75 }];
      const previousMetrics = [{ total_views: 100, unique_sessions: 50 }];

      let callCount = 0;
      (supabase.from as jest.Mock).mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: callCount++ === 0 ? currentMetrics : previousMetrics,
              error: null
            })
          })
        })
      }));

      const result = await trackingService.getAnalyticsSummary(30);

      expect(result?.periodComparison.current).toBe(150);
      expect(result?.periodComparison.previous).toBe(100);
      expect(result?.periodComparison.changePercent).toBeCloseTo(50, 1);
    });

    it('should handle database errors gracefully', async () => {
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({ data: null, error: new Error('DB error') })
          })
        })
      });

      const result = await trackingService.getAnalyticsSummary(30);
      expect(result).toBeNull();
    });
  });

  describe('Integration: Analytics workflow', () => {
    it('should provide consistent data across all analytics functions', async () => {
      const mockData = [
        {
          game_id: 1,
          user_id: 1,
          view_date: '2025-01-01',
          session_hash: 'session1',
          metric_date: '2025-01-01',
          total_views: 100,
          unique_sessions: 50,
          view_sources: { search: 60, direct: 40 }
        }
      ];

      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: mockData, error: null }),
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockData, error: null })
              })
            }),
            in: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({ data: mockData, error: null })
              })
            })
          })
        })
      });

      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const [cohorts, sources, summary] = await Promise.all([
        trackingService.getCohortAnalysis(startDate, endDate),
        trackingService.getSourceAttribution(startDate, endDate),
        trackingService.getAnalyticsSummary(30)
      ]);

      expect(cohorts).toBeDefined();
      expect(sources).toBeDefined();
      expect(summary).toBeDefined();
    });
  });
});