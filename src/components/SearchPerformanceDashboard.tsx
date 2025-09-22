import React, { useState, useEffect } from 'react';
import { gameSearchService } from '../services/gameSearchService';
import { searchAnalyticsService } from '../services/searchAnalyticsService';
import { searchCacheService } from '../services/searchCacheService';
import { FaSearch, FaChartBar, FaTachometerAlt, FaFire, FaMemory, FaTrash, FaClock } from 'react-icons/fa';

interface PerformanceMetrics {
  avgExecutionTime: number;
  medianExecutionTime: number;
  p95ExecutionTime: number;
  totalSearches: number;
  cacheHitRate: number;
  zeroResultSearches: number;
  errorRate: number;
}

interface CacheStats {
  totalHits: number;
  totalMisses: number;
  totalSearches: number;
  hitRate: number;
  cacheSize: number;
  cachedQueries: number;
}

interface PopularSearch {
  query: string;
  searchCount?: number;
  avgResults?: number;
  avgTimeMs?: number;
}

interface SearchTrend {
  query: string;
  currentCount: number;
  previousCount: number;
  growthRate: number;
}

export const SearchPerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [popularSearches, setPopularSearches] = useState<PopularSearch[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<SearchTrend[]>([]);
  const [timeRange, setTimeRange] = useState<'hour' | 'day' | 'week'>('day');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    loadDashboardData();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 30000);

    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    setRefreshing(true);

    try {
      // Load all data in parallel
      const [perfMetrics, cache, popular, trending] = await Promise.all([
        searchAnalyticsService.getSearchPerformanceMetrics(timeRange),
        Promise.resolve(gameSearchService.getCacheStats()),
        Promise.resolve(gameSearchService.getPopularSearches(10)),
        searchAnalyticsService.getTrendingSearches(5)
      ]);

      setMetrics(perfMetrics);
      setCacheStats(cache);
      setPopularSearches(popular.map(q => ({ query: q })));
      setTrendingSearches(trending);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear the entire search cache?')) {
      gameSearchService.clearCache();
      loadDashboardData();
    }
  };

  const handleWarmCache = async () => {
    if (confirm('Warm cache with popular searches? This may take a few moments.')) {
      setRefreshing(true);
      await gameSearchService.warmCache();
      loadDashboardData();
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <FaChartBar className="text-blue-500" />
            Search Performance Dashboard
          </h1>
          <div className="flex items-center gap-4">
            {refreshing && (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            )}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as 'hour' | 'day' | 'week')}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
            >
              <option value="hour">Last Hour</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last Week</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Cache Hit Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cache Hit Rate</h3>
            <FaMemory className="text-green-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {cacheStats ? formatPercentage(cacheStats.hitRate) : '0%'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {cacheStats?.totalHits || 0} hits / {cacheStats?.totalSearches || 0} total
          </div>
        </div>

        {/* Average Search Time */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Search Time</h3>
            <FaClock className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics?.avgExecutionTime ? `${Math.round(metrics.avgExecutionTime)}ms` : '0ms'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            P95: {metrics?.p95ExecutionTime ? `${Math.round(metrics.p95ExecutionTime)}ms` : '0ms'}
          </div>
        </div>

        {/* Total Searches */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Searches</h3>
            <FaSearch className="text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {metrics?.totalSearches || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {metrics?.zeroResultSearches || 0} with no results
          </div>
        </div>

        {/* Cache Size */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Cache Size</h3>
            <FaTachometerAlt className="text-orange-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {cacheStats ? formatBytes(cacheStats.cacheSize) : '0 B'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {cacheStats?.cachedQueries || 0} cached queries
          </div>
        </div>
      </div>

      {/* Popular and Trending Searches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Popular Searches */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaSearch className="text-blue-500" />
            Popular Searches
          </h3>
          <div className="space-y-3">
            {popularSearches.length > 0 ? (
              popularSearches.map((search, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <span className="text-gray-900 dark:text-white">{search.query}</span>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {search.searchCount && <span>{search.searchCount} searches</span>}
                    {search.avgTimeMs && <span>{search.avgTimeMs}ms avg</span>}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No popular searches yet</p>
            )}
          </div>
        </div>

        {/* Trending Searches */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FaFire className="text-orange-500" />
            Trending Searches
          </h3>
          <div className="space-y-3">
            {trendingSearches.length > 0 ? (
              trendingSearches.map((trend, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <span className="text-gray-900 dark:text-white">{trend.query}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${trend.growthRate > 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trend.growthRate > 0 ? '↑' : '↓'} {Math.abs(trend.growthRate).toFixed(0)}%
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({trend.currentCount} searches)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No trending searches yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Cache Management */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cache Management</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={handleClearCache}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <FaTrash />
            Clear Cache
          </button>
          <button
            onClick={handleWarmCache}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <FaFire />
            Warm Cache
          </button>
          <button
            onClick={() => loadDashboardData()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh Stats
          </button>
        </div>

        {/* Privacy Settings */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={privacyMode}
              onChange={(e) => {
                setPrivacyMode(e.target.checked);
                searchAnalyticsService.setPrivacyMode(e.target.checked);
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-700 dark:text-gray-300">
              Anonymous Analytics Mode (no user tracking)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};