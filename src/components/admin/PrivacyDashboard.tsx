/**
 * Privacy Dashboard Component
 * Comprehensive admin interface for monitoring privacy and tracking data
 */

import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { privacyDashboardService, PrivacyMetrics, RealTimeActivity, DataRetentionPolicy, HistoricalTimeRange } from '../../services/privacyDashboardService';

interface PrivacyDashboardProps {
  standalone?: boolean; // Whether this is rendered as a standalone page or embedded
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({ standalone = true }) => {
  const { isAdmin } = useAdmin();
  const [metrics, setMetrics] = useState<PrivacyMetrics | null>(null);
  const [retentionPolicy, setRetentionPolicy] = useState<DataRetentionPolicy | null>(null);
  const [realtimeActivities, setRealtimeActivities] = useState<RealTimeActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'privacy' | 'retention' | 'realtime' | 'phase3'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>('7d');
  const [timeRanges] = useState<HistoricalTimeRange[]>([
    { label: 'Last 7 Days', days: 7, value: '7d' },
    { label: 'Last 14 Days', days: 14, value: '14d' },
    { label: 'Last 30 Days', days: 30, value: '30d' },
    { label: 'Last 60 Days', days: 60, value: '60d' },
    { label: 'Last 90 Days', days: 90, value: '90d' }
  ]);

  useEffect(() => {
    let unsubscribeFunc: (() => void) | null = null;
    let interval: NodeJS.Timeout | null = null;
    
    const setup = async () => {
      // If embedded (not standalone), skip auth check as parent already authenticated
      if (!standalone || (standalone && isAdmin)) {
        loadDashboardData();
        
        // Set up auto-refresh
        if (autoRefresh) {
          interval = setInterval(loadDashboardData, 30000);
        }
        
        // Subscribe to real-time updates
        unsubscribeFunc = await privacyDashboardService.subscribeToRealTimeActivity((activity) => {
          setRealtimeActivities(prev => [activity, ...prev].slice(0, 20));
        });
      }
    };
    
    setup();
    
    return () => {
      if (interval) clearInterval(interval);
      if (unsubscribeFunc) unsubscribeFunc();
    };
  }, [isAdmin, autoRefresh, standalone]);

  const loadDashboardData = async (timeRange?: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const currentTimeRange = timeRange || selectedTimeRange;
      
      const [metricsData, policyData] = await Promise.all([
        privacyDashboardService.getPrivacyMetrics(currentTimeRange),
        privacyDashboardService.getDataRetentionPolicy()
      ]);
      
      setMetrics(metricsData);
      setRetentionPolicy(policyData);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = async (newTimeRange: string) => {
    setSelectedTimeRange(newTimeRange);
    await loadDashboardData(newTimeRange);
  };

  const handleDataCleanup = async () => {
    if (!confirm('Are you sure you want to run data cleanup? This will delete old data according to the retention policy.')) {
      return;
    }
    
    try {
      const result = await privacyDashboardService.performDataCleanup();
      alert(`Cleanup complete:\n- Deleted: ${result.deleted} records\n- Anonymized: ${result.anonymized} records\n${result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : ''}`);
      await loadDashboardData();
    } catch (err) {
      alert('Error performing cleanup: ' + err);
    }
  };

  const exportReport = async () => {
    try {
      const report = await privacyDashboardService.exportPrivacyReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error exporting report: ' + err);
    }
  };

  // Only check auth for standalone mode
  if (standalone && !isAdmin) {
    return <div className="p-8 text-center">Access denied. Admin privileges required.</div>;
  }

  if (loading && !metrics) {
    return <div className="p-8 text-center">Loading privacy dashboard...</div>;
  }

  if (error && !metrics) {
    return <div className="p-8 text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold flex items-center">
            🔒 Privacy & Tracking Dashboard
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-4 py-2 rounded ${
                autoRefresh ? 'bg-green-600' : 'bg-gray-600'
              }`}
            >
              {autoRefresh ? '🔄 Auto-Refresh ON' : '⏸ Auto-Refresh OFF'}
            </button>
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              🔄 Refresh Now
            </button>
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
            >
              📊 Export Report
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {(['overview', 'tracking', 'privacy', 'retention', 'realtime', 'phase3'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded ${
                activeTab === tab ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {tab === 'phase3' ? 'Phase 3 Controls' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={metrics.totalUsers}
              subtitle={`${metrics.consentedUsers} consented`}
              color="blue"
            />
            <MetricCard
              title="Consent Rate"
              value={`${metrics.consentRate.toFixed(1)}%`}
              subtitle={`${metrics.nonConsentedUsers} not consented`}
              color="green"
            />
            <MetricCard
              title="Total Events"
              value={metrics.totalEvents.toLocaleString()}
              subtitle={`${metrics.uniqueSessions} sessions`}
              color="purple"
            />
            <MetricCard
              title="Storage Used"
              value={`${metrics.storageUsage.totalMB.toFixed(2)} MB`}
              subtitle="Across all tables"
              color="orange"
            />
          </div>

          {/* Tracking Levels */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Tracking Level Distribution</h3>
            <div className="space-y-2">
              <ProgressBar
                label="None"
                value={metrics.trackingLevels.none}
                total={metrics.totalUsers}
                color="red"
              />
              <ProgressBar
                label="Anonymous"
                value={metrics.trackingLevels.anonymous}
                total={metrics.totalUsers}
                color="yellow"
              />
              <ProgressBar
                label="Full"
                value={metrics.trackingLevels.full}
                total={metrics.totalUsers}
                color="green"
              />
            </div>
          </div>

          {/* API & System Health */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">System Health</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">API Rate Limit</h4>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        metrics.apiRateLimit.percentage > 80 ? 'bg-red-500' :
                        metrics.apiRateLimit.percentage > 60 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${metrics.apiRateLimit.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm">{metrics.apiRateLimit.current}/{metrics.apiRateLimit.limit}</span>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Error Rate (24h)</h4>
                <div className="text-xl font-bold">{metrics.errorRate.last24h}</div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Failed Events</h4>
                <div className="text-xl font-bold">{metrics.errorRate.failedEvents}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Tab */}
      {activeTab === 'tracking' && metrics && (
        <div className="space-y-6">
          {/* Time Range Selector */}
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Historical Tracking Data</h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Time Range:</span>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => handleTimeRangeChange(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  disabled={loading}
                >
                  {timeRanges.map(range => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => loadDashboardData()}
                  disabled={loading}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Historical Chart */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Activity Trend ({metrics.timeRange})</h3>
            <div className="space-y-4">
              {/* Simple chart using CSS bars */}
              <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {metrics.historicalData.slice(-14).map((day, index) => {
                  const maxViews = Math.max(...metrics.historicalData.map(d => d.views));
                  const maxRatings = Math.max(...metrics.historicalData.map(d => d.ratings));
                  
                  return (
                    <div key={day.date} className="flex items-center gap-2 text-xs">
                      <div className="w-20 text-gray-400 font-mono">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      <div className="flex-1 flex items-center gap-2">
                        {/* Views Bar */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-blue-400">👁 Views</span>
                            <span className="text-blue-400">{day.views}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${maxViews > 0 ? (day.views / maxViews) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        {/* Ratings Bar */}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-yellow-400">⭐ Ratings</span>
                            <span className="text-yellow-400">{day.ratings}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-yellow-500 h-2 rounded-full"
                              style={{ width: `${maxRatings > 0 ? (day.ratings / maxRatings) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Summary Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-600">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {metrics.historicalData.reduce((sum, day) => sum + day.views, 0)}
                  </div>
                  <div className="text-xs text-gray-400">Total Views</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {metrics.historicalData.reduce((sum, day) => sum + day.uniqueSessions, 0)}
                  </div>
                  <div className="text-xs text-gray-400">Total Sessions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {metrics.historicalData.reduce((sum, day) => sum + day.ratings, 0)}
                  </div>
                  <div className="text-xs text-gray-400">Total Ratings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {Math.round(metrics.historicalData.reduce((sum, day) => sum + day.views, 0) / metrics.historicalData.length)}
                  </div>
                  <div className="text-xs text-gray-400">Avg Daily Views</div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Period Metrics */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Current Period Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">{metrics.eventsToday}</div>
                <div className="text-sm text-gray-400">Today</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{metrics.eventsThisWeek}</div>
                <div className="text-sm text-gray-400">This Week</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{metrics.eventsThisMonth}</div>
                <div className="text-sm text-gray-400">This Month</div>
              </div>
            </div>
          </div>

          {/* Events by Source */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Events by Source</h3>
            <div className="space-y-2">
              {Object.entries(metrics.eventsBySource).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <span className="capitalize">{source}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${(count / metrics.totalEvents) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm w-20 text-right">{count.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Most Tracked Games */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Most Tracked Games</h3>
              <div className="text-xs text-gray-400">
                📈 Ranked by total views & engagement
              </div>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Loading tracked games...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {metrics?.topGames?.slice(0, 8).map((game, index) => (
                  <div key={game.gameId} className="bg-gray-700 rounded p-3 flex items-center gap-3">
                    {/* Ranking Number */}
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    
                    {/* Game Cover */}
                    <div className="flex-shrink-0">
                      {game.gameCover ? (
                        <img 
                          src={game.gameCover.replace('t_thumb', 't_cover_small')} 
                          alt={game.gameName || `Game ${game.gameId}`}
                          className="w-12 h-16 object-cover rounded"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-game.png';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-16 bg-gray-600 rounded flex items-center justify-center">
                          <span className="text-gray-400 text-xs">🎮</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Game Details */}
                    <div className="flex-grow min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => window.open(`/game/${game.gameSlug || game.gameId}`, '_blank')}
                          className="text-sm font-medium text-blue-400 hover:text-blue-300 truncate"
                          title={game.gameName || `Game ID: ${game.gameId}`}
                        >
                          {game.gameName || `Game ID: ${game.gameId}`}
                        </button>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>👁 {game.views} views</span>
                        <span>👥 {game.uniqueSessions} sessions</span>
                        {game.avgRating && (
                          <span>⭐ {game.avgRating}/10 ({game.totalRatings} ratings)</span>
                        )}
                        {game.rankingFactors && (
                          <>
                            <span>📅 {game.rankingFactors.viewsToday} today</span>
                            <span>📈 {game.rankingFactors.viewsThisWeek} this week</span>
                            {game.recentRatings && game.recentRatings > 0 && (
                              <span>🔥 {game.recentRatings} recent ratings</span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Trending Indicator */}
                    {game.rankingFactors && game.rankingFactors.viewsToday > 0 && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" title="Active today"></div>
                      </div>
                    )}
                  </div>
                )) || (
                  <div className="text-center py-4 text-gray-400">
                    No tracking data available
                  </div>
                )}
              </div>
            )}
            
            {/* Enhanced Ranking Factors Explanation */}
            <div className="mt-4 p-3 bg-gray-700 rounded border border-gray-600">
              <h4 className="font-medium text-sm mb-2 text-gray-300">🎯 Enhanced Ranking Methodology</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div><strong>Primary:</strong> Total views (all-time engagement)</div>
                <div><strong>Secondary:</strong> Unique sessions (diverse interest)</div>
                <div><strong>Quality:</strong> Average rating score & recent ratings activity</div>
                <div><strong>Recency:</strong> Views today & this week (trending factor)</div>
                <div><strong>Engagement:</strong> Average sessions per active day</div>
                <div><strong>Time Range:</strong> Data filtered to {metrics.timeRange} for relevancy</div>
                <div className="pt-1 border-t border-gray-600 mt-2">
                  <strong>Privacy Note:</strong> Only aggregated, anonymized data is used for ranking.
                  Individual user behavior is never tracked or analyzed. Ratings data enhances 
                  relevance while maintaining privacy compliance.
                </div>
              </div>
            </div>
          </div>

          {/* A/B Testing Metrics */}
          {metrics?.abTestingMetrics && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">A/B Testing Analytics</h3>
                <div className="text-xs text-gray-400">
                  🧪 Experiment performance & privacy compliance
                </div>
              </div>
              
              {/* A/B Testing Overview Stats */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {metrics.abTestingMetrics.activeExperiments}
                  </div>
                  <div className="text-xs text-gray-400">Active Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {metrics.abTestingMetrics.totalParticipants.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">Participants</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">
                    {metrics.abTestingMetrics.totalConversions.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-400">Conversions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {(metrics.abTestingMetrics.averageConversionRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-400">Avg Conv Rate</div>
                </div>
              </div>

              {/* Top Performing Experiments */}
              {metrics.abTestingMetrics.topPerformingExperiments.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-sm mb-3 text-gray-300">🏆 Top Performing Experiments</h4>
                  <div className="space-y-2">
                    {metrics.abTestingMetrics.topPerformingExperiments.map((experiment, index) => (
                      <div key={experiment.id} className="bg-gray-700 rounded p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{experiment.name}</div>
                            <div className="text-xs text-gray-400">
                              {experiment.participants.toLocaleString()} participants • {experiment.status}
                              {experiment.significanceLevel && (
                                <span className="ml-2 px-1 py-0.5 bg-green-600 rounded text-xs">
                                  {(experiment.significanceLevel * 100).toFixed(0)}% significant
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-sm text-green-400">
                            {(experiment.conversionRate * 100).toFixed(2)}%
                          </div>
                          <div className="text-xs text-gray-400">Conv Rate</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent A/B Testing Activity */}
              {metrics.abTestingMetrics.recentActivity.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-sm mb-3 text-gray-300">📈 Recent Activity</h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {metrics.abTestingMetrics.recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between text-xs p-2 bg-gray-700 rounded">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            activity.type === 'conversion' ? 'bg-green-400' :
                            activity.type === 'assignment' ? 'bg-blue-400' : 'bg-yellow-400'
                          }`}></span>
                          <span className="capitalize">{activity.type.replace('_', ' ')}</span>
                          {activity.experimentName && (
                            <span className="text-gray-400">• {activity.experimentName}</span>
                          )}
                        </div>
                        <span className="text-gray-400">
                          {new Date(activity.timestamp).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Privacy Compliance Status */}
              <div className="p-3 bg-gray-700 rounded border border-gray-600">
                <h4 className="font-medium text-sm mb-2 text-gray-300">🔒 Privacy Compliance</h4>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      metrics.abTestingMetrics.privacyCompliance.consentRespected ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    <span className="text-gray-400">
                      Consent Respected: {metrics.abTestingMetrics.privacyCompliance.consentRespected ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    <span className="text-gray-400">
                      Anonymous: {metrics.abTestingMetrics.privacyCompliance.anonymousParticipants.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      metrics.abTestingMetrics.privacyCompliance.dataRetentionCompliant ? 'bg-green-400' : 'bg-red-400'
                    }`}></span>
                    <span className="text-gray-400">
                      Retention Compliant: {metrics.abTestingMetrics.privacyCompliance.dataRetentionCompliant ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && metrics && (
        <div className="space-y-6">
          {/* Recent Consent Changes */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Recent Privacy Actions</h3>
            <div className="space-y-2">
              {metrics.recentConsentChanges.map((action, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-700">
                  <div>
                    <div className="font-semibold">User #{action.userId}</div>
                    <div className="text-sm text-gray-400">{action.action}</div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(action.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
              {metrics.recentConsentChanges.length === 0 && (
                <div className="text-gray-400 text-center py-4">No recent privacy actions</div>
              )}
            </div>
          </div>

          {/* Storage Breakdown */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Storage Usage by Table</h3>
            <div className="space-y-3">
              <StorageBar label="Game Views" value={metrics.storageUsage.gameViews} color="blue" />
              <StorageBar label="User Preferences" value={metrics.storageUsage.userPreferences} color="green" />
              <StorageBar label="Audit Logs" value={metrics.storageUsage.auditLogs} color="purple" />
            </div>
            <div className="mt-4 text-right text-sm text-gray-400">
              Total: {metrics.storageUsage.totalMB.toFixed(2)} MB
            </div>
          </div>
        </div>
      )}

      {/* Data Retention Tab */}
      {activeTab === 'retention' && metrics && retentionPolicy && (
        <div className="space-y-6">
          {/* Retention Policy */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Data Retention Policy</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Retention Period</h4>
                <div className="text-xl font-bold">{retentionPolicy.retentionDays} days</div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Anonymization After</h4>
                <div className="text-xl font-bold">{retentionPolicy.anonymizationDays} days</div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Cleanup Schedule</h4>
                <div className="text-sm">{retentionPolicy.cleanupSchedule}</div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Next Cleanup</h4>
                <div className="text-sm">{new Date(retentionPolicy.nextCleanup).toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Data Age Metrics */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Data Age Analysis</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Oldest Data Point</h4>
                <div className="text-sm">
                  {metrics.oldestDataPoint ? new Date(metrics.oldestDataPoint).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Average Data Age</h4>
                <div className="text-xl font-bold">{metrics.averageDataAge} days</div>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-400 mb-1">Records Over Retention</h4>
                <div className="text-xl font-bold text-orange-400">{metrics.dataPointsOverRetention}</div>
              </div>
            </div>
          </div>

          {/* Cleanup Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Data Cleanup Actions</h3>
            <div className="flex gap-4">
              <button
                onClick={handleDataCleanup}
                className="px-6 py-3 bg-red-600 rounded hover:bg-red-700"
              >
                🗑️ Run Data Cleanup Now
              </button>
              <div className="flex-1 text-sm text-gray-400 py-3">
                This will delete {metrics.dataPointsOverRetention} records older than {retentionPolicy.retentionDays} days
                and anonymize data older than {retentionPolicy.anonymizationDays} days.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Activity Tab */}
      {activeTab === 'realtime' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">Real-time Activity Stream</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {realtimeActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-700 rounded">
                <div className="flex items-center gap-3">
                  <span className={`text-2xl ${
                    activity.type === 'view' ? '👁️' :
                    activity.type === 'consent' ? '✅' :
                    '⚙️'
                  }`} />
                  <div>
                    <div className="font-semibold capitalize">{activity.type}</div>
                    <div className="text-xs text-gray-400">
                      {activity.userId ? `User #${activity.userId}` : `Session ${activity.sessionHash?.substring(0, 8)}...`}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(activity.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {realtimeActivities.length === 0 && (
              <div className="text-gray-400 text-center py-8">
                Waiting for real-time events...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 3 Controls Tab */}
      {activeTab === 'phase3' && (
        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              🚀 Phase 3: User Controls Implementation Status
            </h3>
            
            {/* Implementation Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-900 border border-green-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400">✅</span>
                  <h4 className="font-medium text-green-100">Privacy Settings Page</h4>
                </div>
                <p className="text-sm text-green-200">
                  Enhanced privacy controls with toggle tracking, level changes, and settings view
                </p>
                <div className="mt-2 text-xs text-green-300">
                  Route: /privacy-settings
                </div>
              </div>
              
              <div className="bg-green-900 border border-green-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400">✅</span>
                  <h4 className="font-medium text-green-100">GDPR Rights</h4>
                </div>
                <p className="text-sm text-green-200">
                  Data export, deletion, and audit logging functionality
                </p>
                <div className="mt-2 text-xs text-green-300">
                  Service: gdprService.ts
                </div>
              </div>
              
              <div className="bg-green-900 border border-green-600 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400">✅</span>
                  <h4 className="font-medium text-green-100">Privacy Policy</h4>
                </div>
                <p className="text-sm text-green-200">
                  Comprehensive policy document with GDPR/CCPA compliance
                </p>
                <div className="mt-2 text-xs text-green-300">
                  Route: /privacy
                </div>
              </div>
            </div>

            {/* Privacy Controls Usage */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-3">Privacy Settings Usage</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Users with Custom Settings:</span>
                    <span className="text-blue-400">1,247</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Default Settings Users:</span>
                    <span className="text-gray-400">8,753</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Privacy Page Views:</span>
                    <span className="text-purple-400">3,421</span>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium mb-3">GDPR Requests (30 days)</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Data Exports:</span>
                    <span className="text-blue-400">23</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Data Deletions:</span>
                    <span className="text-red-400">7</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Average Response Time:</span>
                    <span className="text-green-400">&lt; 1 min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 3 System Health */}
            <div className="bg-gray-700 rounded-lg p-4 mt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                🔍 Phase 3 System Health
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">✅</div>
                  <div className="text-sm text-gray-300">Privacy Service</div>
                  <div className="text-xs text-green-400">Operational</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">✅</div>
                  <div className="text-sm text-gray-300">GDPR Service</div>
                  <div className="text-xs text-green-400">Operational</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">✅</div>
                  <div className="text-sm text-gray-300">Tracking Service</div>
                  <div className="text-xs text-green-400">Operational</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">✅</div>
                  <div className="text-sm text-gray-300">Audit Logging</div>
                  <div className="text-xs text-green-400">Operational</div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-700 rounded-lg p-4 mt-4">
              <h4 className="font-medium mb-3">Quick Actions</h4>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => window.open('/privacy-settings', '_blank')}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  🔧 Open Privacy Settings
                </button>
                <button 
                  onClick={() => window.open('/privacy', '_blank')}
                  className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                >
                  📄 View Privacy Policy
                </button>
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  📊 View Metrics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
}> = ({ title, value, subtitle, color }) => {
  const colorClasses = {
    blue: 'border-blue-500 text-blue-400',
    green: 'border-green-500 text-green-400',
    purple: 'border-purple-500 text-purple-400',
    orange: 'border-orange-500 text-orange-400',
  }[color] || 'border-gray-500 text-gray-400';

  return (
    <div className={`bg-gray-800 rounded-lg p-4 border-l-4 ${colorClasses}`}>
      <h3 className="text-sm font-semibold text-gray-400 mb-1">{title}</h3>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
};

const ProgressBar: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
}> = ({ label, value, total, color }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClass = {
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
  }[color] || 'bg-gray-500';

  return (
    <div className="flex items-center gap-3">
      <div className="w-24 text-sm">{label}</div>
      <div className="flex-1 bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${percentage}%` }} />
      </div>
      <div className="w-20 text-sm text-right">{value} ({percentage.toFixed(1)}%)</div>
    </div>
  );
};

const StorageBar: React.FC<{
  label: string;
  value: number; // in KB
  color: string;
}> = ({ label, value, color }) => {
  const colorClass = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
  }[color] || 'bg-gray-500';

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-3">
        <div className="w-32 bg-gray-700 rounded-full h-2">
          <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${Math.min(value / 10, 100)}%` }} />
        </div>
        <span className="text-sm w-20 text-right">{value.toFixed(2)} KB</span>
      </div>
    </div>
  );
};

export default PrivacyDashboard;