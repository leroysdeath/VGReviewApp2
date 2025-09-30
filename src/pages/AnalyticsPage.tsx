import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  TrendingUp,
  Users,
  Eye,
  BarChart3,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { trackingService } from '../services/trackingService';
import type {
  AnalyticsSummary,
  CohortAnalysis,
  GamePerformanceTrend,
  SourceAttribution
} from '../services/trackingService';

interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

const DATE_RANGES: DateRange[] = [
  { start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), end: new Date(), label: 'Last 7 Days' },
  { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end: new Date(), label: 'Last 30 Days' },
  { start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), end: new Date(), label: 'Last 90 Days' }
];

export const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState<DateRange>(DATE_RANGES[1]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [cohorts, setCohorts] = useState<CohortAnalysis[]>([]);
  const [trends, setTrends] = useState<GamePerformanceTrend[]>([]);
  const [sources, setSources] = useState<SourceAttribution[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [selectedRange]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const days = Math.floor(
        (selectedRange.end.getTime() - selectedRange.start.getTime()) / (1000 * 60 * 60 * 24)
      );

      const [summaryData, cohortsData, sourcesData] = await Promise.all([
        trackingService.getAnalyticsSummary(days),
        trackingService.getCohortAnalysis(selectedRange.start, selectedRange.end),
        trackingService.getSourceAttribution(selectedRange.start, selectedRange.end)
      ]);

      setSummary(summaryData);
      setCohorts(cohortsData);
      setSources(sourcesData);

      if (summaryData?.topGames) {
        const topGameIds = summaryData.topGames.slice(0, 5).map(g => g.gameId);
        const trendsData = await trackingService.getGamePerformanceTrends(topGameIds, 8);
        setTrends(trendsData);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getTrendIcon = (trend: 'rising' | 'falling' | 'stable') => {
    switch (trend) {
      case 'rising': return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'falling': return <ArrowDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (changePercent: number): string => {
    if (changePercent > 0) return 'text-green-600';
    if (changePercent < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Analytics Dashboard - GameVault</title>
        <meta name="description" content="View comprehensive analytics and insights for GameVault" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics Dashboard</h1>

            <div className="flex gap-2">
              {DATE_RANGES.map((range) => (
                <button
                  key={range.label}
                  onClick={() => setSelectedRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedRange.label === range.label
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {summary && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Total Views</p>
                    <Eye className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(summary.totalViews)}</p>
                  <p className={`text-sm mt-2 ${getTrendColor(summary.periodComparison.changePercent)}`}>
                    {summary.periodComparison.changePercent > 0 ? '+' : ''}
                    {summary.periodComparison.changePercent.toFixed(1)}% from previous period
                  </p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Unique Sessions</p>
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{formatNumber(summary.uniqueSessions)}</p>
                  <p className="text-sm text-gray-500 mt-2">Distinct user sessions</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Avg Views/Session</p>
                    <BarChart3 className="w-5 h-5 text-purple-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">
                    {summary.avgViewsPerSession.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Average engagement</p>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-600">Top Games</p>
                    <TrendingUp className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{summary.topGames.length}</p>
                  <p className="text-sm text-gray-500 mt-2">Tracked this period</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Traffic Sources</h2>
                  <div className="space-y-3">
                    {sources.map((source) => (
                      <div key={source.source} className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-32 text-sm font-medium text-gray-700 capitalize">
                            {source.source}
                          </div>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${source.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 ml-4 w-20 text-right">
                          {formatNumber(source.count)} ({source.percentage.toFixed(1)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Top Performing Games</h2>
                  <div className="space-y-3">
                    {summary.topGames.slice(0, 10).map((game, index) => (
                      <div key={game.gameId} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-400 w-6">#{index + 1}</span>
                          <span className="text-sm text-gray-700">Game ID: {game.gameId}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {formatNumber(game.views)} views
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {trends.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Trends</h2>
                  <div className="space-y-6">
                    {trends.map((trend) => (
                      <div key={trend.gameId} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-medium text-gray-900">Game ID: {trend.gameId}</h3>
                            {getTrendIcon(trend.overallTrend)}
                            <span className="text-sm text-gray-600 capitalize">{trend.overallTrend}</span>
                          </div>
                          <span className="text-sm text-gray-600">
                            Total: {formatNumber(trend.totalViews)} views
                          </span>
                        </div>
                        <div className="flex items-end gap-2 h-32">
                          {trend.weeklyData.map((week, index) => (
                            <div key={week.week} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                                style={{
                                  height: `${(week.views / Math.max(...trend.weeklyData.map(w => w.views))) * 100}%`
                                }}
                                title={`Week ${index + 1}: ${week.views} views`}
                              ></div>
                              <span className="text-xs text-gray-500">W{index + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cohorts.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    User Cohort Analysis
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cohort Date
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Users
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Returning
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Retention Rate
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Avg Views/User
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {cohorts.slice(0, 10).map((cohort) => (
                          <tr key={cohort.cohortDate} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">{cohort.cohortDate}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{cohort.totalUsers}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{cohort.returningUsers}</td>
                            <td className="px-4 py-3 text-sm">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  cohort.retentionRate >= 50
                                    ? 'bg-green-100 text-green-800'
                                    : cohort.retentionRate >= 25
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {cohort.retentionRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {cohort.avgViewsPerUser.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};