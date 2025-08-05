import React, { useState, useEffect } from 'react';
import { 
  Bug, 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Server,
  Globe,
  Clock,
  Zap
} from 'lucide-react';

interface DebugTest {
  id: string;
  name: string;
  searchTerm: string;
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

interface EnvironmentStatus {
  netlifyFunctionUrl: string;
  hasClientId: boolean;
  hasAccessToken: boolean;
  isProduction: boolean;
  netlifyContext?: string;
}

export const IGDBDebug: React.FC = () => {
  const [testResults, setTestResults] = useState<Map<string, TestResult>>(new Map());
  const [showRawResponses, setShowRawResponses] = useState(false);
  const [environmentStatus, setEnvironmentStatus] = useState<EnvironmentStatus | null>(null);
  const [isRunningAllTests, setIsRunningAllTests] = useState(false);

  // Predefined test cases
  const debugTests: DebugTest[] = [
    {
      id: 'popular-game',
      name: 'Popular Game Search',
      searchTerm: 'zelda',
      description: 'Search for a popular game that should return multiple results'
    },
    {
      id: 'specific-game',
      name: 'Specific Game Search',
      searchTerm: 'The Witcher 3',
      description: 'Search for a specific game title'
    },
    {
      id: 'recent-game',
      name: 'Recent Game Search',
      searchTerm: 'cyberpunk',
      description: 'Search for a recent/modern game'
    },
    {
      id: 'indie-game',
      name: 'Indie Game Search',
      searchTerm: 'hollow knight',
      description: 'Search for an indie game'
    },
    {
      id: 'short-query',
      name: 'Short Query Test',
      searchTerm: 'god',
      description: 'Test with a short search term'
    },
    {
      id: 'special-chars',
      name: 'Special Characters',
      searchTerm: 'mario & luigi',
      description: 'Test with special characters in search'
    },
    {
      id: 'empty-query',
      name: 'Empty Query Test',
      searchTerm: '',
      description: 'Test error handling with empty search term'
    }
  ];

  // Check environment status on mount
  useEffect(() => {
    checkEnvironmentStatus();
  }, []);

  const checkEnvironmentStatus = () => {
    const status: EnvironmentStatus = {
      netlifyFunctionUrl: '/.netlify/functions/igdb-search',
      hasClientId: !!import.meta.env.VITE_TWITCH_CLIENT_ID,
      hasAccessToken: !!import.meta.env.VITE_TWITCH_APP_ACCESS_TOKEN,
      isProduction: import.meta.env.PROD,
      netlifyContext: import.meta.env.CONTEXT
    };

    setEnvironmentStatus(status);
    console.log('🔧 Environment Status:', status);
  };

  const runSingleTest = async (test: DebugTest) => {
    const startTime = Date.now();
    
    // Update test status to running
    setTestResults(prev => new Map(prev.set(test.id, {
      testId: test.id,
      status: 'running',
      timestamp: new Date()
    })));

    console.log(`🧪 Starting test: ${test.name} with query: "${test.searchTerm}"`);

    try {
      // Make direct request to Netlify function
      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          searchTerm: test.searchTerm,
          limit: 10
        })
      });

      const duration = Date.now() - startTime;
      console.log(`⏱️ Test ${test.name} took ${duration}ms`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`HTTP ${response.status}: ${errorData.message || errorData.error}`);
      }

      const data = await response.json();
      console.log(`✅ Test ${test.name} succeeded:`, data);

      // Update test status to success
      setTestResults(prev => new Map(prev.set(test.id, {
        testId: test.id,
        status: 'success',
        duration,
        response: data,
        timestamp: new Date()
      })));

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error(`❌ Test ${test.name} failed:`, errorMessage);

      // Update test status to error
      setTestResults(prev => new Map(prev.set(test.id, {
        testId: test.id,
        status: 'error',
        duration,
        error: errorMessage,
        timestamp: new Date()
      })));
    }
  };

  const runAllTests = async () => {
    setIsRunningAllTests(true);
    console.log('🚀 Running all debug tests...');

    for (const test of debugTests) {
      await runSingleTest(test);
      // Add small delay between tests to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunningAllTests(false);
    console.log('🏁 All tests completed');
  };

  const clearResults = () => {
    setTestResults(new Map());
    console.log('🗑️ Cleared all test results');
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="h-4 w-4 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'running':
        return 'border-blue-500 bg-blue-900 bg-opacity-20';
      case 'success':
        return 'border-green-500 bg-green-900 bg-opacity-20';
      case 'error':
        return 'border-red-500 bg-red-900 bg-opacity-20';
      default:
        return 'border-gray-600 bg-gray-800';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bug className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">IGDB Debug Console</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRawResponses(!showRawResponses)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            {showRawResponses ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showRawResponses ? 'Hide' : 'Show'} Raw Data
          </button>
        </div>
      </div>

      {/* Environment Status */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Environment Status
        </h3>
        
        {environmentStatus && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Function URL:</span>
                <code className="text-purple-400 text-sm">{environmentStatus.netlifyFunctionUrl}</code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Environment:</span>
                <span className={`text-sm font-medium ${environmentStatus.isProduction ? 'text-green-400' : 'text-yellow-400'}`}>
                  {environmentStatus.isProduction ? 'Production' : 'Development'}
                </span>
              </div>
              {environmentStatus.netlifyContext && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Netlify Context:</span>
                  <span className="text-blue-400 text-sm">{environmentStatus.netlifyContext}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Client ID:</span>
                <div className="flex items-center gap-2">
                  {environmentStatus.hasClientId ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={environmentStatus.hasClientId ? 'text-green-400' : 'text-red-400'}>
                    {environmentStatus.hasClientId ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Access Token:</span>
                <div className="flex items-center gap-2">
                  {environmentStatus.hasAccessToken ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={environmentStatus.hasAccessToken ? 'text-green-400' : 'text-red-400'}>
                    {environmentStatus.hasAccessToken ? 'Configured' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {environmentStatus && (!environmentStatus.hasClientId || !environmentStatus.hasAccessToken) && (
          <div className="mt-4 p-3 bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Configuration Required</span>
            </div>
            <p className="text-yellow-300 text-sm mt-1">
              Missing environment variables. Check your .env file or Netlify environment settings.
            </p>
          </div>
        )}
      </div>

      {/* Test Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="h-5 w-5" />
          API Tests
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={clearResults}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors text-sm"
          >
            Clear Results
          </button>
          <button
            onClick={runAllTests}
            disabled={isRunningAllTests}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRunningAllTests ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isRunningAllTests ? 'Running Tests...' : 'Run All Tests'}
          </button>
        </div>
      </div>

      {/* Test Cases */}
      <div className="space-y-3">
        {debugTests.map((test) => {
          const result = testResults.get(test.id);
          
          return (
            <div
              key={test.id}
              className={`border rounded-lg p-4 transition-all ${getStatusColor(result?.status || 'idle')}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result?.status || 'idle')}
                  <div>
                    <h4 className="font-medium text-white">{test.name}</h4>
                    <p className="text-gray-400 text-sm">{test.description}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {result?.duration && (
                    <span className="text-gray-400 text-sm">
                      {formatDuration(result.duration)}
                    </span>
                  )}
                  <button
                    onClick={() => runSingleTest(test)}
                    disabled={result?.status === 'running'}
                    className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50 transition-colors text-sm"
                  >
                    {result?.status === 'running' ? 'Running...' : 'Test'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-300">Query:</span>
                <code className="bg-gray-900 px-2 py-1 rounded text-purple-400">
                  "{test.searchTerm || '(empty)'}"
                </code>
                {result?.timestamp && (
                  <span className="text-gray-500">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Results */}
              {result && (
                <div className="mt-3 pt-3 border-t border-gray-600">
                  {result.status === 'success' && result.response && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-green-400">✓ Success</span>
                        <span className="text-gray-300">
                          Found {result.response.games?.length || 0} games
                        </span>
                        <span className="text-gray-300">
                          Total: {result.response.total || 0}
                        </span>
                      </div>
                      
                      {showRawResponses && (
                        <details className="mt-2">
                          <summary className="text-gray-400 cursor-pointer hover:text-white">
                            Raw Response Data
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-40">
                            {JSON.stringify(result.response, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}

                  {result.status === 'error' && (
                    <div className="space-y-2">
                      <div className="text-red-400 text-sm">✗ Error: {result.error}</div>
                      
                      {showRawResponses && result.error && (
                        <details className="mt-2">
                          <summary className="text-gray-400 cursor-pointer hover:text-white">
                            Error Details
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-red-300 overflow-auto max-h-40">
                            {result.error}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Instructions */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Testing Instructions
        </h3>
        
        <div className="space-y-3 text-sm text-gray-300">
          <div>
            <h4 className="font-medium text-white mb-1">Local Development:</h4>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Install Netlify CLI: <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">npm install -g netlify-cli</code></li>
              <li>Run local dev server: <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">netlify dev</code></li>
              <li>Functions will be available at <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">http://localhost:8888/.netlify/functions/igdb-search</code></li>
              <li>Check function logs in the terminal running <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">netlify dev</code></li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-1">Environment Variables:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Create <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">.env</code> file in project root</li>
              <li>Add: <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">TWITCH_CLIENT_ID=your_client_id</code></li>
              <li>Add: <code className="bg-gray-800 px-2 py-1 rounded text-purple-400">TWITCH_APP_ACCESS_TOKEN=your_token</code></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-1">Debugging Tips:</h4>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Check browser Network tab for function requests</li>
              <li>Look for console logs in browser developer tools</li>
              <li>Check Netlify function logs in dashboard or CLI</li>
              <li>Verify IGDB credentials at <a href="https://dev.twitch.tv/console/apps" className="text-purple-400 hover:text-purple-300">Twitch Developer Console</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};