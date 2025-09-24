/**
 * Search Diagnostic Tool Component
 * Admin interface for analyzing search performance and patterns
 */

import React, { useState, useEffect } from 'react';
import { searchDiagnosticService } from '../services/searchDiagnosticService';
import { AdminKeyManager } from './AdminKeyManager';
import { SearchResultsTable } from './SearchResultsTable';
import { ManualFlaggingPanel } from './ManualFlaggingPanel';
import { DMCAManagementPanel } from './DMCAManagementPanel';

interface DiagnosticResult {
  query: string;
  timestamp: string;
  dbResults: {
    nameSearchCount: number;
    summarySearchCount: number;
    totalCount: number;
    duration: number;
    sampleGames: string[];
  };
  igdbResults?: {
    count: number;
    duration: number;
    sampleGames: string[];
    rateLimited: boolean;
  };
  filterAnalysis: {
    genreDistribution: Record<string, number>;
    platformDistribution: Record<string, number>;
    releaseYearDistribution: Record<string, number>;
    ratingDistribution: Record<string, number>;
  };
  sortingAnalysis: {
    originalOrder: string[];
    sortedByRating: string[];
    sortedByRelevance: string[];
    topRatedGame: string;
    averageRating: number;
  };
  performance: {
    totalDuration: number;
    dbQueryTime: number;
    igdbQueryTime?: number;
    processingTime: number;
  };
}

const COMMON_TEST_QUERIES = [
  'mario', 'zelda', 'pokemon', 'final fantasy', 'call of duty',
  'assassin', 'grand theft auto', 'minecraft', 'fortnite', 'valorant',
  'cyberpunk', 'witcher', 'elder scrolls', 'fallout', 'halo'
];

const GENRE_TEST_QUERIES = [
  'rpg', 'shooter', 'platformer', 'strategy', 'puzzle',
  'racing', 'fighting', 'sports', 'simulation', 'horror'
];

export const SearchDiagnosticTool: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [singleQuery, setSingleQuery] = useState('');
  const [bulkQueries, setBulkQueries] = useState(COMMON_TEST_QUERIES.join('\n'));
  const [singleResult, setSingleResult] = useState<DiagnosticResult | null>(null);
  const [bulkResults, setBulkResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [igdbStats, setIgdbStats] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'single' | 'bulk' | 'patterns' | 'results' | 'flags' | 'dmca'>('single');

  useEffect(() => {
    // Update IGDB stats periodically
    const updateStats = () => {
      setIgdbStats(searchDiagnosticService.getIGDBStats());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleAdminLogin = () => {
    // Simple admin key check with all valid keys
    const validKeys = [
      'vg-search-admin-2024',
      'debug',
      'diagnostic-tool',
      'tommy-admin',
      'search-diagnostic',
      'vg-admin'
    ];
    
    if (validKeys.includes(adminKey)) {
      setIsAuthenticated(true);
      localStorage.setItem('searchDiagnosticAuth', 'true');
      localStorage.setItem('searchDiagnosticKey', adminKey);
    } else {
      alert('Invalid admin key. Please try again.');
    }
  };

  const runSingleSearch = async () => {
    if (!singleQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const result = await searchDiagnosticService.analyzeSingleSearch(singleQuery);
      setSingleResult(result);
    } catch (error) {
      console.error('Single search analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runBulkSearch = async () => {
    const queries = bulkQueries.split('\n').filter(q => q.trim());
    if (queries.length === 0) return;
    
    setIsLoading(true);
    try {
      const result = await searchDiagnosticService.bulkTestQueries(queries);
      setBulkResults(result);
      setSelectedTab('patterns');
    } catch (error) {
      console.error('Bulk search analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPresetQueries = (preset: 'common' | 'genres') => {
    if (preset === 'common') {
      setBulkQueries(COMMON_TEST_QUERIES.join('\n'));
    } else {
      setBulkQueries(GENRE_TEST_QUERIES.join('\n'));
    }
  };

  // Check for existing auth
  useEffect(() => {
    if (localStorage.getItem('searchDiagnosticAuth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6">Search Diagnostic Tool</h1>
          <p className="text-gray-300 mb-4">Admin access required</p>
          
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter admin key"
            className="w-full p-3 bg-gray-700 border border-gray-600 rounded mb-4 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
          />
          
          <button
            onClick={handleAdminLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 p-3 rounded font-semibold"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Diagnostic Tool</h1>
          <p className="text-gray-300">Analyze search performance, filters, and patterns</p>
          
          {/* IGDB Stats */}
          {igdbStats && (
            <div className="mt-4 bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">IGDB API Status</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Daily Requests:</span>
                  <span className="ml-2 font-mono">{igdbStats.dailyRequestCount}/450</span>
                </div>
                <div>
                  <span className="text-gray-400">Remaining Quota:</span>
                  <span className="ml-2 font-mono text-green-400">{igdbStats.remainingQuota}</span>
                </div>
                <div>
                  <span className="text-gray-400">Current Rate:</span>
                  <span className="ml-2 font-mono">{igdbStats.currentRateLimit}/4 req/sec</span>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Admin Key Manager */}
        <AdminKeyManager />

        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-4">
            {(['single', 'bulk', 'patterns', 'results', 'flags', 'dmca'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-2 rounded font-medium ${
                  selectedTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {tab === 'single' && '🔍 Single Search'}
                {tab === 'bulk' && '🧪 Bulk Testing'}
                {tab === 'patterns' && '📊 Pattern Analysis'}
                {tab === 'results' && '📋 Results Table'}
                {tab === 'flags' && '🏷️ Manual Flags'}
                {tab === 'dmca' && '🛡️ DMCA Management'}
              </button>
            ))}
          </div>
        </nav>

        {/* Single Search Tab */}
        {selectedTab === 'single' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Single Search Analysis</h2>
              
              <div className="flex gap-4 mb-4">
                <input
                  type="text"
                  value={singleQuery}
                  onChange={(e) => setSingleQuery(e.target.value)}
                  placeholder="Enter search query (e.g., 'mario', 'pokemon blue')"
                  className="flex-1 p-3 bg-gray-700 border border-gray-600 rounded text-white"
                  onKeyDown={(e) => e.key === 'Enter' && !isLoading && runSingleSearch()}
                />
                
                <button
                  onClick={runSingleSearch}
                  disabled={isLoading || !singleQuery.trim()}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold"
                >
                  {isLoading ? '🔄 Analyzing...' : '🔍 Analyze'}
                </button>
              </div>
              
              {/* Quick test buttons */}
              <div className="flex flex-wrap gap-2">
                {COMMON_TEST_QUERIES.slice(0, 8).map(query => (
                  <button
                    key={query}
                    onClick={() => setSingleQuery(query)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>

            {/* Single Result Display */}
            {singleResult && (
              <>
                <SingleSearchResult result={singleResult} />
                
                {/* Quick link to results table */}
                {singleResult.resultAnalysis && (
                  <div className="bg-blue-900/30 p-4 rounded-lg border border-blue-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-blue-400">🔬 Detailed Analysis Available</h4>
                        <p className="text-sm text-gray-300">
                          View individual result breakdown with filtering reasons and sorting scores
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedTab('results')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
                      >
                        📋 View Results Table
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Bulk Testing Tab */}
        {selectedTab === 'bulk' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Bulk Search Testing</h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Test Queries (one per line):
                </label>
                <textarea
                  value={bulkQueries}
                  onChange={(e) => setBulkQueries(e.target.value)}
                  rows={8}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded text-white font-mono text-sm"
                  placeholder="Enter search queries, one per line..."
                />
              </div>
              
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => loadPresetQueries('common')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Load Common Games
                </button>
                <button
                  onClick={() => loadPresetQueries('genres')}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                >
                  Load Genres
                </button>
              </div>
              
              <button
                onClick={runBulkSearch}
                disabled={isLoading}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded font-semibold"
              >
                {isLoading ? '🔄 Running Bulk Test...' : '🧪 Run Bulk Test'}
              </button>
            </div>
          </div>
        )}

        {/* Pattern Analysis Tab */}
        {selectedTab === 'patterns' && bulkResults && (
          <BulkResultsDisplay results={bulkResults} />
        )}

        {/* Results Table Tab */}
        {selectedTab === 'results' && (
          <div className="space-y-6">
            {singleResult?.resultAnalysis ? (
              <SearchResultsTable analysis={singleResult.resultAnalysis} />
            ) : (
              <div className="bg-gray-800 p-8 rounded-lg text-center">
                <h3 className="text-lg font-semibold mb-4">No Results Analysis Available</h3>
                <p className="text-gray-400 mb-6">
                  Run a single search analysis first to view the detailed results table.
                </p>
                <button
                  onClick={() => setSelectedTab('single')}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                >
                  Go to Single Search
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual Flags Tab */}
        {selectedTab === 'flags' && (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg">
              <h2 className="text-xl font-bold mb-4">Manual Game Flagging</h2>
              <p className="text-gray-300 mb-6">
                Use this panel to manually override the automatic filtering system. 
                Greenlight flags ensure games are never filtered, while redlight flags ensure games are always filtered.
              </p>
              <ManualFlaggingPanel />
            </div>
          </div>
        )}

        {/* DMCA Management Tab */}
        {selectedTab === 'dmca' && (
          <div className="space-y-6">
            <DMCAManagementPanel />
          </div>
        )}
      </div>
    </div>
  );
};

// Single Search Result Component
const SingleSearchResult: React.FC<{ result: DiagnosticResult }> = ({ result }) => {
  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Performance Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total Time"
            value={`${result.performance.totalDuration}ms`}
            color={result.performance.totalDuration > 2000 ? 'text-red-400' : 'text-green-400'}
          />
          <MetricCard
            label="DB Query Time"
            value={`${result.performance.dbQueryTime}ms`}
            color={result.performance.dbQueryTime > 1000 ? 'text-red-400' : 'text-green-400'}
          />
          <MetricCard
            label="DB Results"
            value={result.dbResults.totalCount.toString()}
            color={result.dbResults.totalCount < 5 ? 'text-yellow-400' : 'text-green-400'}
          />
          <MetricCard
            label="IGDB Used"
            value={result.igdbResults ? 'Yes' : 'No'}
            color={result.igdbResults ? 'text-blue-400' : 'text-gray-400'}
          />
        </div>
      </div>

      {/* Search Breakdown */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Search Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Database Search</h4>
            <ul className="space-y-1 text-sm">
              <li>Name matches: <span className="font-mono">{result.dbResults.nameSearchCount}</span></li>
              <li>Summary matches: <span className="font-mono">{result.dbResults.summarySearchCount}</span></li>
              <li>Duration: <span className="font-mono">{result.dbResults.duration}ms</span></li>
            </ul>
          </div>
          
          {result.igdbResults && (
            <div>
              <h4 className="font-semibold mb-2">IGDB Search</h4>
              <ul className="space-y-1 text-sm">
                <li>Results: <span className="font-mono">{result.igdbResults.count}</span></li>
                <li>Duration: <span className="font-mono">{result.igdbResults.duration}ms</span></li>
                <li>Rate Limited: <span className={`font-mono ${result.igdbResults.rateLimited ? 'text-red-400' : 'text-green-400'}`}>
                  {result.igdbResults.rateLimited ? 'Yes' : 'No'}
                </span></li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Filter Analysis */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Filter Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FilterDistribution
            title="Top Genres"
            data={result.filterAnalysis.genreDistribution}
          />
          <FilterDistribution
            title="Top Platforms"
            data={result.filterAnalysis.platformDistribution}
          />
          <div>
            <h4 className="font-semibold mb-2">Rating Distribution</h4>
            <div className="space-y-1 text-sm">
              {Object.entries(result.filterAnalysis.ratingDistribution).map(([range, count]) => (
                <div key={range} className="flex justify-between">
                  <span>{range}</span>
                  <span className="font-mono">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sorting Analysis */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Sorting Analysis</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2">Top Games by Rating</h4>
            <ul className="space-y-1 text-sm">
              {result.sortingAnalysis.sortedByRating.slice(0, 5).map((game, idx) => (
                <li key={idx} className="truncate">#{idx + 1}: {game}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Top Games by Relevance</h4>
            <ul className="space-y-1 text-sm">
              {result.sortingAnalysis.sortedByRelevance.slice(0, 5).map((game, idx) => (
                <li key={idx} className="truncate">#{idx + 1}: {game}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm">
            <strong>Average Rating:</strong> {result.sortingAnalysis.averageRating}/100
          </p>
          <p className="text-sm">
            <strong>Top Rated Game:</strong> {result.sortingAnalysis.topRatedGame}
          </p>
        </div>
      </div>
    </div>
  );
};

// Bulk Results Display Component
const BulkResultsDisplay: React.FC<{ results: any }> = ({ results }) => {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Bulk Test Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Queries Tested"
            value={results.testQueries.length.toString()}
          />
          <MetricCard
            label="IGDB Requests"
            value={results.igdbUsageStats.totalRequests.toString()}
          />
          <MetricCard
            label="Rate Limit Hits"
            value={results.igdbUsageStats.rateLimitHits.toString()}
            color={results.igdbUsageStats.rateLimitHits > 0 ? 'text-red-400' : 'text-green-400'}
          />
          <MetricCard
            label="Remaining Quota"
            value={results.igdbUsageStats.remainingQuota.toString()}
            color={results.igdbUsageStats.remainingQuota < 100 ? 'text-yellow-400' : 'text-green-400'}
          />
        </div>
      </div>

      {/* Pattern Analysis */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Pattern Analysis</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-2 text-green-400">Common Filters</h4>
            <ul className="space-y-1 text-sm">
              {results.patterns.commonFilters.map((filter: string, idx: number) => (
                <li key={idx}>• {filter}</li>
              ))}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2 text-yellow-400">Performance Issues</h4>
            <ul className="space-y-1 text-sm">
              {results.patterns.performanceBottlenecks.length > 0 ? (
                results.patterns.performanceBottlenecks.map((issue: string, idx: number) => (
                  <li key={idx}>• {issue}</li>
                ))
              ) : (
                <li className="text-green-400">• No performance issues detected</li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2 text-red-400">Quality Issues</h4>
            <ul className="space-y-1 text-sm">
              {results.patterns.qualityIssues.length > 0 ? (
                results.patterns.qualityIssues.map((issue: string, idx: number) => (
                  <li key={idx}>• {issue}</li>
                ))
              ) : (
                <li className="text-green-400">• No quality issues detected</li>
              )}
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2 text-blue-400">Recommendations</h4>
            <ul className="space-y-1 text-sm">
              {results.patterns.recommendations.map((rec: string, idx: number) => (
                <li key={idx}>• {rec}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Individual Results Summary */}
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Individual Results</h3>
        <div className="space-y-2">
          {results.results.map((result: DiagnosticResult, idx: number) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-gray-700 rounded">
              <span className="font-medium">{result.query}</span>
              <div className="flex gap-4 text-sm">
                <span>DB: {result.dbResults.totalCount}</span>
                <span>IGDB: {result.igdbResults?.count || 0}</span>
                <span>{result.performance.totalDuration}ms</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{ label: string; value: string; color?: string }> = ({ 
  label, 
  value, 
  color = 'text-white' 
}) => (
  <div className="bg-gray-700 p-3 rounded">
    <div className="text-xs text-gray-400 uppercase tracking-wider">{label}</div>
    <div className={`text-lg font-bold ${color}`}>{value}</div>
  </div>
);

const FilterDistribution: React.FC<{ title: string; data: Record<string, number> }> = ({ 
  title, 
  data 
}) => {
  const sortedData = Object.entries(data)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  return (
    <div>
      <h4 className="font-semibold mb-2">{title}</h4>
      <div className="space-y-1 text-sm">
        {sortedData.map(([item, count]) => (
          <div key={item} className="flex justify-between">
            <span className="truncate">{item}</span>
            <span className="font-mono">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchDiagnosticTool;