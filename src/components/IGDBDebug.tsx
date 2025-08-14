import React, { useState } from 'react';
import { 
  Bug, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Database,
  Clock,
  Zap
} from 'lucide-react';
import { igdbService } from '../services/igdb';
import { igdbCache } from '../services/igdbCacheService';

interface DebugTest {
  id: string;
  name: string;
  searchTerm?: string;
  gameId?: number;
  description: string;
}

interface TestResult {
  testId: string;
  status: 'idle' | 'running' | 'success' | 'error';
  duration?: number;
  response?: any;
  error?: string;
  timestamp?: Date;
}

export const IGDBDebug: React.FC = () => {
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [showRawResponses, setShowRawResponses] = useState(false);
  const [isRunningAllTests, setIsRunningAllTests] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);

  const debugTests: DebugTest[] = [
    {
      id: 'popular-game',
      searchTerm: 'The Witcher 3',
      name: 'Search Popular Game',
      description: 'Search for a well-known game'
    },
    {
      id: 'indie-game',
      searchTerm: 'Hades',
      name: 'Search Indie Game',
      description: 'Search for an indie game'
    },
    {
      id: 'retro-game',
      searchTerm: 'Super Mario Bros',
      name: 'Search Retro Game',
      description: 'Search for a classic game'
    },
    {
      id: 'get-by-id',
      gameId: 1942,
      name: 'Get Game by ID',
      description: 'Fetch specific game by ID (The Witcher 3)'
    },
    {
      id: 'popular-games',
      name: 'Get Popular Games',
      description: 'Fetch list of popular games'
    }
  ];

  const runTest = async (test: DebugTest) => {
    setTestResults(prev => new Map(prev).set(test.id, {
      testId: test.id,
      status: 'running'
    }));

    const startTime = Date.now();

    try {
      let response;
      
      if (test.searchTerm) {
        response = await igdbService.searchGames(test.searchTerm);
      } else if (test.gameId) {
        response = await igdbService.getGameById(test.gameId);
      } else if (test.id === 'popular-games') {
        response = await igdbService.getPopularGames(10);
      }

      const duration = Date.now() - startTime;

      setTestResults(prev => new Map(prev).set(test.id, {
        testId: test.id,
        status: 'success',
        duration,
        response,
        timestamp: new Date()
      }));
    } catch (error) {
      const duration = Date.now() - startTime;

      setTestResults(prev => new Map(prev).set(test.id, {
        testId: test.id,
        status: 'error',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }));
    }
  };

  const runAllTests = async () => {
    setIsRunningAllTests(true);
    
    for (const test of debugTests) {
      await runTest(test);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsRunningAllTests(false);
  };

  const loadCacheStats = async () => {
    try {
      const stats = await igdbCache.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const clearCache = async () => {
    try {
      await igdbCache.clearExpiredCache();
      await loadCacheStats();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="w-6 h-6 text-purple-500" />
          <h2 className="text-xl font-bold text-white">IGDB Cache Debug Panel</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadCacheStats}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            Load Stats
          </button>
          <button
            onClick={clearCache}
            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Expired
          </button>
          <button
            onClick={() => setShowRawResponses(!showRawResponses)}
            className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-2"
          >
            {showRawResponses ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showRawResponses ? 'Hide' : 'Show'} Raw
          </button>
        </div>
      </div>

      {cacheStats && (
        <div className="bg-gray-800 rounded p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Cache Statistics</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Entries:</span>
              <span className="ml-2 text-white">{cacheStats.totalEntries}</span>
            </div>
            <div>
              <span className="text-gray-400">Active:</span>
              <span className="ml-2 text-green-400">{cacheStats.activeEntries}</span>
            </div>
            <div>
              <span className="text-gray-400">Expired:</span>
              <span className="ml-2 text-red-400">{cacheStats.expiredEntries}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Hits:</span>
              <span className="ml-2 text-blue-400">{cacheStats.totalHits}</span>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-300">Test Suite</h3>
          <button
            onClick={runAllTests}
            disabled={isRunningAllTests}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Run All Tests
          </button>
        </div>

        {debugTests.map(test => {
          const result = testResults.get(test.id);
          
          return (
            <div key={test.id} className="bg-gray-800 rounded p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result?.status || 'idle')}
                  <div>
                    <h4 className="font-semibold text-white">{test.name}</h4>
                    <p className="text-sm text-gray-400">{test.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {result?.duration && (
                    <span className="text-sm text-gray-400">
                      {result.duration}ms
                    </span>
                  )}
                  <button
                    onClick={() => runTest(test)}
                    disabled={result?.status === 'running'}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" />
                    Run
                  </button>
                </div>
              </div>

              {result?.error && (
                <div className="mt-3 p-3 bg-red-900/20 border border-red-800 rounded">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
                    <p className="text-sm text-red-300">{result.error}</p>
                  </div>
                </div>
              )}

              {showRawResponses && result?.response && (
                <div className="mt-3">
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                      Response Data
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-x-auto">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};