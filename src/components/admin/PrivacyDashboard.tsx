/**
 * Privacy Dashboard Component
 * Comprehensive admin interface for monitoring privacy and tracking data
 */

import React, { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { privacyDashboardService, PrivacyMetrics, RealTimeActivity, DataRetentionPolicy } from '../../services/privacyDashboardService';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'tracking' | 'privacy' | 'retention' | 'realtime'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);

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

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsData, policyData] = await Promise.all([
        privacyDashboardService.getPrivacyMetrics(),
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
          {(['overview', 'tracking', 'privacy', 'retention', 'realtime'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded ${
                activeTab === tab ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
          {/* Event Timeline */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Event Timeline</h3>
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

          {/* Top Tracked Games */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-bold mb-4">Top Tracked Games</h3>
            <div className="space-y-2">
              {metrics.topGames.map((game, index) => (
                <div key={game.gameId} className="flex items-center justify-between py-2 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-gray-500">#{index + 1}</span>
                    <div>
                      <div className="font-semibold">Game ID: {game.gameId}</div>
                      <div className="text-sm text-gray-400">{game.uniqueSessions} unique sessions</div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-blue-400">{game.views} views</div>
                </div>
              ))}
            </div>
          </div>
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