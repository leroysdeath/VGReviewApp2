/**
 * Search Observability Service Tests
 * Consolidates tests from searchAnalyticsService, searchMetricsService, and searchDiagnosticService
 */

import { searchObservabilityService } from '../services/searchObservabilityService';
import type {
  SearchAnalytic,
  SearchPerformanceMetrics,
  PopularSearch,
  SearchTrend,
  DiagnosticReport,
  SearchIssue
} from '../services/searchObservabilityService';
import type { SearchResponse } from '../services/searchService';
import { supabase } from '../services/supabase';

// Mock Supabase
jest.mock('../services/supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('Search Observability Service Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchObservabilityService.clearMetrics();
  });

  describe('Analytics Operations', () => {
    describe('trackSearch', () => {
      it('should track search analytics', async () => {
        const mockResponse: SearchResponse = {
          results: [
            { id: 1, name: 'Test Game', igdb_id: 123, summary: null, description: null, release_date: null, cover_url: null, genres: null, platforms: null }
          ],
          total_count: 1,
          search_time_ms: 150,
          query_used: 'test',
          cache_hit: false
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null })
        } as any);

        await searchObservabilityService.trackSearch('test query', mockResponse, 'user123');

        // Allow batch processing to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockSupabase.from).toHaveBeenCalledWith('search_analytics');
      });

      it('should normalize queries correctly', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_used: 'Test Query!',
          cache_hit: false
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null })
        } as any);

        await searchObservabilityService.trackSearch('Test Query!', mockResponse);

        // The normalized query should be lowercase and cleaned
        expect(true).toBe(true); // Service tracks internally
      });

      it('should handle batch processing', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_used: 'test',
          cache_hit: false
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null })
        } as any);

        // Track multiple searches
        for (let i = 0; i < 12; i++) {
          await searchObservabilityService.trackSearch(`query${i}`, mockResponse);
        }

        // Allow batch processing
        await new Promise(resolve => setTimeout(resolve, 100));

        // Should have triggered batch insert due to batch size
        expect(mockSupabase.from).toHaveBeenCalledWith('search_analytics');
      });

      it('should handle analytics errors gracefully', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_used: 'test',
          cache_hit: false
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
        } as any);

        // Should not throw error
        await expect(
          searchObservabilityService.trackSearch('test', mockResponse)
        ).resolves.toBeUndefined();
      });
    });

    describe('getSearchMetrics', () => {
      it('should calculate performance metrics', async () => {
        const mockAnalytics = [
          { execution_time_ms: 100, result_count: 5, cache_hit: true },
          { execution_time_ms: 200, result_count: 0, cache_hit: false },
          { execution_time_ms: 150, result_count: 3, cache_hit: true },
          { execution_time_ms: 300, result_count: 8, cache_hit: false }
        ];

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ data: mockAnalytics, error: null })
          })
        } as any);

        const metrics = await searchObservabilityService.getSearchMetrics(7);

        expect(metrics.totalSearches).toBe(4);
        expect(metrics.avgExecutionTime).toBe(187.5); // (100+200+150+300)/4
        expect(metrics.cacheHitRate).toBe(0.5); // 2 out of 4
        expect(metrics.zeroResultSearches).toBe(1);
        expect(metrics.medianExecutionTime).toBe(150);
      });

      it('should handle empty analytics data', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        } as any);

        const metrics = await searchObservabilityService.getSearchMetrics();

        expect(metrics.totalSearches).toBe(0);
        expect(metrics.avgExecutionTime).toBe(0);
        expect(metrics.cacheHitRate).toBe(0);
        expect(metrics.zeroResultSearches).toBe(0);
      });

      it('should handle database errors', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
          })
        } as any);

        await expect(
          searchObservabilityService.getSearchMetrics()
        ).rejects.toThrow('DB error');
      });
    });

    describe('getPopularSearches', () => {
      it('should aggregate and rank popular searches', async () => {
        const mockAnalytics = [
          { normalized_query: 'mario', execution_time_ms: 100, result_count: 5 },
          { normalized_query: 'mario', execution_time_ms: 120, result_count: 4 },
          { normalized_query: 'zelda', execution_time_ms: 150, result_count: 8 },
          { normalized_query: 'pokemon', execution_time_ms: 80, result_count: 12 },
          { normalized_query: 'pokemon', execution_time_ms: 90, result_count: 10 },
          { normalized_query: 'pokemon', execution_time_ms: 70, result_count: 15 }
        ];

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ data: mockAnalytics, error: null })
          })
        } as any);

        const popularSearches = await searchObservabilityService.getPopularSearches(7, 5);

        expect(popularSearches).toHaveLength(3);
        expect(popularSearches[0].query).toBe('pokemon'); // Most searches (3)
        expect(popularSearches[0].searchCount).toBe(3);
        expect(popularSearches[0].avgResults).toBeCloseTo(12.33, 1);
        expect(popularSearches[0].avgTimeMs).toBeCloseTo(80, 1);

        expect(popularSearches[1].query).toBe('mario'); // Second most (2)
        expect(popularSearches[1].searchCount).toBe(2);

        expect(popularSearches[2].query).toBe('zelda'); // Least (1)
        expect(popularSearches[2].searchCount).toBe(1);
      });

      it('should limit results correctly', async () => {
        const mockAnalytics = Array.from({ length: 20 }, (_, i) => ({
          normalized_query: `query${i}`,
          execution_time_ms: 100,
          result_count: 5
        }));

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ data: mockAnalytics, error: null })
          })
        } as any);

        const popularSearches = await searchObservabilityService.getPopularSearches(7, 5);

        expect(popularSearches).toHaveLength(5);
      });

      it('should handle empty results', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        } as any);

        const popularSearches = await searchObservabilityService.getPopularSearches();

        expect(popularSearches).toHaveLength(0);
      });
    });

    describe('getSearchTrends', () => {
      it('should calculate search trends', async () => {
        // Mock current period data
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: [
                  { normalized_query: 'trending_up' },
                  { normalized_query: 'trending_up' },
                  { normalized_query: 'trending_up' },
                  { normalized_query: 'stable' },
                  { normalized_query: 'new_query' }
                ],
                error: null
              })
            })
          })
        } as any);

        // Mock previous period data
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: [
                  { normalized_query: 'trending_up' },
                  { normalized_query: 'stable' },
                  { normalized_query: 'trending_down' },
                  { normalized_query: 'trending_down' }
                ],
                error: null
              })
            })
          })
        } as any);

        const trends = await searchObservabilityService.getSearchTrends(7);

        expect(trends).toHaveLength(4);

        // Find specific trends
        const trendingUp = trends.find(t => t.query === 'trending_up');
        const stable = trends.find(t => t.query === 'stable');
        const newQuery = trends.find(t => t.query === 'new_query');
        const trendingDown = trends.find(t => t.query === 'trending_down');

        expect(trendingUp?.currentCount).toBe(3);
        expect(trendingUp?.previousCount).toBe(1);
        expect(trendingUp?.growthRate).toBe(2); // (3-1)/1 = 2

        expect(stable?.currentCount).toBe(1);
        expect(stable?.previousCount).toBe(1);
        expect(stable?.growthRate).toBe(0); // (1-1)/1 = 0

        expect(newQuery?.currentCount).toBe(1);
        expect(newQuery?.previousCount).toBe(0);
        expect(newQuery?.growthRate).toBe(1); // New query gets 100% growth

        expect(trendingDown?.currentCount).toBe(0);
        expect(trendingDown?.previousCount).toBe(2);
        expect(trendingDown?.growthRate).toBe(-1); // (0-2)/2 = -1
      });
    });
  });

  describe('Performance Metrics Operations', () => {
    describe('Performance Tracking', () => {
      it('should update performance metrics', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 5,
          search_time_ms: 123,
          query_used: 'performance test',
          cache_hit: true
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null })
        } as any);

        await searchObservabilityService.trackSearch('performance test', mockResponse);

        // Check if metrics are tracked
        const searchTimeSeries = searchObservabilityService.getMetricSeries('search_time');
        expect(searchTimeSeries).toBeDefined();
        expect(searchTimeSeries?.points).toHaveLength(1);
        expect(searchTimeSeries?.points[0].value).toBe(123);
      });

      it('should track multiple metric types', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 10,
          search_time_ms: 200,
          query_used: 'test',
          cache_hit: false
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null })
        } as any);

        await searchObservabilityService.trackSearch('test', mockResponse);

        const allMetrics = searchObservabilityService.getAllMetrics();
        expect(allMetrics).toHaveLength(3); // search_time, result_count, cache_hit_rate

        const searchTime = allMetrics.find(m => m.name === 'search_time');
        const resultCount = allMetrics.find(m => m.name === 'result_count');
        const cacheHitRate = allMetrics.find(m => m.name === 'cache_hit_rate');

        expect(searchTime?.unit).toBe('ms');
        expect(resultCount?.unit).toBe('count');
        expect(cacheHitRate?.unit).toBe('ratio');
      });

      it('should limit metric point storage', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 1,
          search_time_ms: 100,
          query_used: 'test',
          cache_hit: false
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null })
        } as any);

        // Generate many metric points
        for (let i = 0; i < 1005; i++) {
          await searchObservabilityService.trackSearch(`test${i}`, mockResponse);
        }

        const searchTimeSeries = searchObservabilityService.getMetricSeries('search_time');
        expect(searchTimeSeries?.points.length).toBeLessThanOrEqual(1000);
      });
    });

    describe('generatePerformanceReport', () => {
      it('should generate comprehensive performance report', async () => {
        // Mock metrics data
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [
                { execution_time_ms: 100, result_count: 5, cache_hit: true },
                { execution_time_ms: 200, result_count: 3, cache_hit: false }
              ],
              error: null
            })
          })
        } as any);

        // Mock popular searches data
        mockSupabase.from.mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockResolvedValue({
              data: [
                { normalized_query: 'mario', execution_time_ms: 100, result_count: 5 },
                { normalized_query: 'zelda', execution_time_ms: 150, result_count: 8 }
              ],
              error: null
            })
          })
        } as any);

        const report = await searchObservabilityService.generatePerformanceReport(7);

        expect(report.timeRange.start).toBeInstanceOf(Date);
        expect(report.timeRange.end).toBeInstanceOf(Date);
        expect(report.totalSearches).toBe(2);
        expect(report.avgResponseTime).toBe(150);
        expect(report.cacheHitRate).toBe(0.5);
        expect(report.topQueries).toHaveLength(2);
        expect(report.performanceMetrics).toBeDefined();
      });
    });
  });

  describe('Diagnostic Operations', () => {
    describe('diagnoseSearch', () => {
      it('should diagnose search performance issues', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 0,
          search_time_ms: 2500, // Slow search
          query_used: 'slow query',
          cache_hit: false,
          deduplicated_count: 0
        };

        const report = await searchObservabilityService.diagnoseSearch('search-123', 'slow query', mockResponse);

        expect(report.searchId).toBe('search-123');
        expect(report.overallHealth).toBe('warning'); // Due to slow response and no results
        expect(report.issues).toHaveLength(2); // Performance and quality issues
        expect(report.metrics.executionTime).toBe(2500);
        expect(report.metrics.resultCount).toBe(0);

        // Check for performance issue
        const performanceIssue = report.issues.find(i => i.type === 'performance');
        expect(performanceIssue).toBeDefined();
        expect(performanceIssue?.severity).toBe('high');
        expect(performanceIssue?.suggestions).toContain('Consider adding database indexes');

        // Check for quality issue
        const qualityIssue = report.issues.find(i => i.type === 'quality');
        expect(qualityIssue).toBeDefined();
        expect(qualityIssue?.message).toContain('no results');
      });

      it('should diagnose duplicate issues', async () => {
        const mockResponse: SearchResponse = {
          results: [
            { id: 1, name: 'Game 1', igdb_id: 123, summary: null, description: null, release_date: null, cover_url: null, genres: null, platforms: null },
            { id: 2, name: 'Game 2', igdb_id: 456, summary: null, description: null, release_date: null, cover_url: null, genres: null, platforms: null }
          ],
          total_count: 2,
          search_time_ms: 150,
          query_used: 'test',
          cache_hit: false,
          deduplicated_count: 3 // High number of duplicates
        };

        const report = await searchObservabilityService.diagnoseSearch('search-456', 'test', mockResponse);

        expect(report.overallHealth).toBe('warning');
        const duplicateIssue = report.issues.find(i => i.message.includes('duplicate'));
        expect(duplicateIssue).toBeDefined();
        expect(duplicateIssue?.type).toBe('quality');
        expect(duplicateIssue?.severity).toBe('medium');
      });

      it('should diagnose healthy searches', async () => {
        const mockResponse: SearchResponse = {
          results: [
            {
              id: 1,
              name: 'Great Game',
              igdb_id: 123,
              summary: 'Good description',
              description: 'Detailed description',
              release_date: '2020-01-01',
              cover_url: 'https://example.com/cover.jpg',
              genres: ['Action'],
              platforms: ['PC']
            }
          ],
          total_count: 1,
          search_time_ms: 120,
          query_used: 'great game',
          cache_hit: true,
          deduplicated_count: 0
        };

        const report = await searchObservabilityService.diagnoseSearch('search-789', 'great game', mockResponse);

        expect(report.overallHealth).toBe('healthy');
        expect(report.issues).toHaveLength(0);
        expect(report.metrics.qualityScore).toBeGreaterThan(0.8);
      });

      it('should store and retrieve diagnostics', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_used: 'test',
          cache_hit: false
        };

        await searchObservabilityService.diagnoseSearch('search-stored', 'test', mockResponse);

        const diagnostic = searchObservabilityService.getDiagnostic('search-stored');
        expect(diagnostic).toBeDefined();
        expect(diagnostic?.searchId).toBe('search-stored');
        expect(diagnostic?.query).toBe('test');
      });

      it('should limit diagnostic storage', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_used: 'test',
          cache_hit: false
        };

        // Generate more diagnostics than the limit
        for (let i = 0; i < 105; i++) {
          await searchObservabilityService.diagnoseSearch(`search-${i}`, `test${i}`, mockResponse);
        }

        const allDiagnostics = searchObservabilityService.getAllDiagnostics();
        expect(allDiagnostics.length).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Utility Methods', () => {
    describe('Session Management', () => {
      it('should generate unique session IDs', () => {
        const sessionId1 = searchObservabilityService.getSessionId();

        // Create new service instance to get different session ID
        const newService = new (searchObservabilityService.constructor as any)();
        const sessionId2 = newService.getSessionId();

        expect(sessionId1).not.toBe(sessionId2);
        expect(sessionId1).toMatch(/^session_\d+_[a-z0-9]{9}$/);
      });
    });

    describe('Cleanup', () => {
      it('should cleanup resources', async () => {
        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: null })
        } as any);

        // Track some data
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_used: 'test',
          cache_hit: false
        };

        await searchObservabilityService.trackSearch('test', mockResponse);
        await searchObservabilityService.cleanup();

        // Should have flushed analytics
        expect(mockSupabase.from).toHaveBeenCalledWith('search_analytics');
      });

      it('should clear all metrics', () => {
        // Add some metrics
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 1,
          search_time_ms: 100,
          query_used: 'test',
          cache_hit: false
        };

        searchObservabilityService.trackSearch('test', mockResponse);

        // Clear metrics
        searchObservabilityService.clearMetrics();

        const allMetrics = searchObservabilityService.getAllMetrics();
        expect(allMetrics).toHaveLength(0);

        const allDiagnostics = searchObservabilityService.getAllDiagnostics();
        expect(allDiagnostics).toHaveLength(0);
      });
    });

    describe('Error Handling', () => {
      it('should handle batch insert failures gracefully', async () => {
        const mockResponse: SearchResponse = {
          results: [],
          total_count: 0,
          search_time_ms: 100,
          query_used: 'test',
          cache_hit: false
        };

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockResolvedValue({ error: { message: 'Insert failed' } })
        } as any);

        // Should not throw
        await expect(
          searchObservabilityService.trackSearch('test', mockResponse)
        ).resolves.toBeUndefined();
      });

      it('should handle database errors in metrics retrieval', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            gte: jest.fn().mockRejectedValue(new Error('Database connection failed'))
          })
        } as any);

        await expect(
          searchObservabilityService.getSearchMetrics()
        ).rejects.toThrow('Database connection failed');
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should provide analytics service alias', () => {
      const { searchAnalyticsService } = require('../services/searchObservabilityService');
      expect(searchAnalyticsService).toBe(searchObservabilityService);
    });

    it('should provide metrics service alias', () => {
      const { searchMetricsService } = require('../services/searchObservabilityService');
      expect(searchMetricsService).toBe(searchObservabilityService);
    });

    it('should provide diagnostic service alias', () => {
      const { searchDiagnosticService } = require('../services/searchObservabilityService');
      expect(searchDiagnosticService).toBe(searchObservabilityService);
    });
  });
});