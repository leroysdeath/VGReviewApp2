import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Download, Users, TrendingUp, DollarSign, BarChart3, LogOut, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { AdminAuth } from '../components/admin/AdminAuth';
import { adminService, DashboardMetrics, CodeMetrics } from '../services/adminService';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('all');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    if (adminService.isAuthenticated()) {
      setIsAuthenticated(true);
      loadMetrics();
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!isAuthenticated || !autoRefresh) return;

    const interval = setInterval(() => {
      loadMetrics();
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefresh]);

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate date range
      let dateRange;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      switch (timeRange) {
        case 'today':
          dateRange = { start: today, end: now };
          break;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          dateRange = { start: weekAgo, end: now };
          break;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          dateRange = { start: monthAgo, end: now };
          break;
        default:
          dateRange = undefined;
      }

      const data = await adminService.getDashboardMetrics(dateRange);
      setMetrics(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading metrics:', err);
      setError('Failed to load metrics. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    loadMetrics();
  };

  const handleLogout = () => {
    adminService.logout();
    setIsAuthenticated(false);
    navigate('/');
  };

  const handleExport = () => {
    if (!metrics) return;

    const exportData = metrics.codeMetrics.map(code => ({
      'Referral Code': code.code,
      'Owner': code.ownerName,
      'Signups': code.signups,
      '% of Referrals': code.percentageOfReferrals.toFixed(1),
      'Email Verified': code.emailVerified,
      'Profile Completed': code.profileCompleted,
      'First Review': code.firstReview,
      'Paid Conversions': code.paidConversions,
      'Revenue': `$${code.revenue.toFixed(2)}`,
      'Conversion Rate': `${code.conversionRate.toFixed(1)}%`
    }));

    adminService.exportToCSV(exportData, 'sales_metrics');
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (!isAuthenticated) {
    return <AdminAuth onSuccess={handleAuthSuccess} />;
  }

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Sales Team Performance</h1>
              <p className="text-gray-400 text-sm">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Time Range Selector */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="all">All Time</option>
              </select>

              {/* Auto-refresh Toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${
                  autoRefresh ? 'bg-purple-600' : 'bg-gray-600'
                }`}>
                  <div className={`w-4 h-4 bg-white rounded-full transition-transform mt-1 ${
                    autoRefresh ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </div>
                <span className="text-sm">Auto-refresh</span>
              </label>

              {/* Manual Refresh */}
              <button
                onClick={loadMetrics}
                disabled={loading}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Export */}
              <button
                onClick={handleExport}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
              >
                <Download className="h-5 w-5" />
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg text-red-400">
            {error}
          </div>
        )}

        {metrics && (
          <>
            {/* Team Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-8 w-8 text-blue-500" />
                  <span className="text-2xl font-bold">{metrics.totalUsers.toLocaleString()}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Total Users</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Via Referral:</span>
                    <span className="text-green-400">
                      {metrics.referralUsers} ({formatPercentage(metrics.referralPercentage)})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Organic:</span>
                    <span>{metrics.organicUsers} ({formatPercentage(100 - metrics.referralPercentage)})</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <span className="text-2xl font-bold">{metrics.referralUsers}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Total Referrals</h3>
                <p className="text-gray-400 text-sm">
                  {formatPercentage(metrics.referralPercentage)} of all users
                </p>
                <div className="mt-2 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${metrics.referralPercentage}%` }}
                  />
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="h-8 w-8 text-purple-500" />
                  <span className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">Total Revenue</h3>
                <p className="text-gray-400 text-sm">
                  From referred users
                </p>
              </div>
            </div>

            {/* Referral Breakdown Table */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 mb-8">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-purple-500" />
                  Referral Breakdown
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Owner
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Signups
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        % of Referrals
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Verified
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Profile
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Review
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Paid
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Conv. Rate
                      </th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {metrics.codeMetrics.map((code) => (
                      <React.Fragment key={code.code}>
                        <tr className="hover:bg-gray-700/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-purple-400">{code.code}</td>
                          <td className="px-6 py-4">{code.ownerName}</td>
                          <td className="px-6 py-4 text-center font-semibold">{code.signups}</td>
                          <td className="px-6 py-4 text-center">{formatPercentage(code.percentageOfReferrals)}</td>
                          <td className="px-6 py-4 text-center text-sm">
                            {code.emailVerified}/{code.signups}
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            {code.profileCompleted}/{code.signups}
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            {code.firstReview}/{code.signups}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-sm">
                              {code.paidConversions}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold">
                            {formatCurrency(code.revenue)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-1 rounded text-sm ${
                              code.conversionRate > 10 ? 'bg-green-900/30 text-green-400' :
                              code.conversionRate > 5 ? 'bg-yellow-900/30 text-yellow-400' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {formatPercentage(code.conversionRate)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => setExpandedCode(expandedCode === code.code ? null : code.code)}
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              {expandedCode === code.code ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                            </button>
                          </td>
                        </tr>
                        {expandedCode === code.code && (
                          <tr>
                            <td colSpan={11} className="px-6 py-4 bg-gray-900/50">
                              <div className="text-sm text-gray-400">
                                Detailed user list would go here (to be implemented)
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}

                    {/* Totals Row */}
                    <tr className="bg-gray-900/50 font-semibold">
                      <td className="px-6 py-4" colSpan={2}>Total</td>
                      <td className="px-6 py-4 text-center">{metrics.referralUsers}</td>
                      <td className="px-6 py-4 text-center">100%</td>
                      <td className="px-6 py-4 text-center" colSpan={3}>-</td>
                      <td className="px-6 py-4 text-center">
                        {metrics.codeMetrics.reduce((sum, c) => sum + c.paidConversions, 0)}
                      </td>
                      <td className="px-6 py-4 text-right">{formatCurrency(metrics.totalRevenue)}</td>
                      <td className="px-6 py-4 text-center">
                        {formatPercentage(
                          metrics.referralUsers > 0
                            ? (metrics.codeMetrics.reduce((sum, c) => sum + c.paidConversions, 0) / metrics.referralUsers) * 100
                            : 0
                        )}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
              <h2 className="text-xl font-semibold mb-6">Conversion Funnel (All Referrals)</h2>
              <div className="space-y-4">
                {metrics.conversionFunnel.map((stage, index) => (
                  <div key={stage.stage}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{stage.stage}</span>
                      <span className="text-sm text-gray-400">
                        {stage.count} ({formatPercentage(stage.percentage)})
                      </span>
                    </div>
                    <div className="h-8 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          index === 0 ? 'bg-blue-500' :
                          index === metrics.conversionFunnel.length - 1 ? 'bg-green-500' :
                          'bg-purple-500'
                        }`}
                        style={{ width: `${stage.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};