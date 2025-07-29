import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Server,
  Zap,
  Clock,
  Eye,
  EyeOff,
  Copy,
  ExternalLink
} from 'lucide-react';

interface HealthCheckResult {
  status: 'idle' | 'checking' | 'success' | 'error';
  timestamp?: Date;
  duration?: number;
  response?: any;
  error?: string;
  httpStatus?: number;
  headers?: Record<string, string>;
}

interface EnvironmentInfo {
  isDevelopment: boolean;
  isProduction: boolean;
  netlifyContext?: string;
  functionUrl: string;
  hasRequiredEnvVars: boolean;
  envVarStatus: {
    clientId: boolean;
    accessToken: boolean;
  };
}

export const NetlifyFunctionHealthCheck: React.FC = () => {
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult>({ status: 'idle' });
  const [showRawResponse, setShowRawResponse] = useState(false);
  const [environmentInfo, setEnvironmentInfo] = useState<EnvironmentInfo | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Check environment status on mount
  useEffect(() => {
    checkEnvironment();
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      runHealthCheck();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const checkEnvironment = () => {
    const env: EnvironmentInfo = {
      isDevelopment: import.meta.env.DEV,
      isProduction: import.meta.env.PROD,
      netlifyContext: import.meta.env.CONTEXT,
      functionUrl: '/.netlify/functions/igdb-search',
      hasRequiredEnvVars: false,
      envVarStatus: {
        clientId: !!import.meta.env.VITE_TWITCH_CLIENT_ID,
        accessToken: !!import.meta.env.VITE_TWITCH_APP_ACCESS_TOKEN
      }
    };

    env.hasRequiredEnvVars = env.envVarStatus.clientId && env.envVarStatus.accessToken;
    setEnvironmentInfo(env);

    console.log('🔧 Environment Info:', env);
  };

  const runHealthCheck = async () => {
    const startTime = Date.now();
    
    setHealthCheck({
      status: 'checking',
      timestamp: new Date()
    });

    console.log('🏥 Starting Netlify function health check...');

    try {
      // Test payload for health check
      const testPayload = {
        searchTerm: 'test',
        limit: 1
      };

      console.log('📤 Sending test request:', testPayload);

      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      const duration = Date.now() - startTime;
      
      console.log('📥 Received response:', {
        status: response.status,
        statusText: response.statusText,
        duration: `${duration}ms`,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Get response headers
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let responseData: any;
      let responseText: string;

      try {
        responseText = await response.text();
        console.log('📄 Raw response text:', responseText.substring(0, 500));
        
        if (responseText) {
          responseData = JSON.parse(responseText);
        } else {
          responseData = { message: 'Empty response' };
        }
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        responseData = { 
          error: 'Parse Error',
          rawResponse: responseText?.substring(0, 500) || 'No response text',
          parseError: parseError instanceof Error ? parseError.message : 'Unknown parse error'
        };
      }

      if (response.ok) {
        console.log('✅ Health check passed');
        setHealthCheck({
          status: 'success',
          timestamp: new Date(),
          duration,
          response: responseData,
          httpStatus: response.status,
          headers: responseHeaders
        });
      } else {
        console.error('❌ Health check failed with HTTP error');
        setHealthCheck({
          status: 'error',
          timestamp: new Date(),
          duration,
          response: responseData,
          error: `HTTP ${response.status}: ${response.statusText}`,
          httpStatus: response.status,
          headers: responseHeaders
        });
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('💥 Health check failed with network error:', errorMessage);
      
      setHealthCheck({
        status: 'error',
        timestamp: new Date(),
        duration,
        error: errorMessage
      });
    }
  };

  const copyHealthCheckData = () => {
    const data = {
      timestamp: healthCheck.timestamp?.toISOString(),
      status: healthCheck.status,
      duration: healthCheck.duration,
      httpStatus: healthCheck.httpStatus,
      error: healthCheck.error,
      response: healthCheck.response,
      headers: healthCheck.headers,
      environment: environmentInfo,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
      .then(() => console.log('📋 Health check data copied to clipboard'))
      .catch(err => console.error('Failed to copy data:', err));
  };

  const getStatusIcon = () => {
    switch (healthCheck.status) {
      case 'checking':
        return <RefreshCw className="h-5 w-5 text-blue-400 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (healthCheck.status) {
      case 'checking':
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-purple-400" />
          <h2 className="text-xl font-bold text-white">Netlify Function Health Check</h2>
        </div>
        
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (30s)
          </label>
          
          <button
            onClick={() => setShowRawResponse(!showRawResponse)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
          >
            {showRawResponse ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            Raw Data
          </button>
        </div>
      </div>

      {/* Environment Status */}
      {environmentInfo && (
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Server className="h-5 w-5" />
            Environment Status
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Mode:</span>
                <span className={`text-sm font-medium ${
                  environmentInfo.isDevelopment ? 'text-yellow-400' : 'text-green-400'
                }`}>
                  {environmentInfo.isDevelopment ? 'Development' : 'Production'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Function URL:</span>
                <code className="text-purple-400 text-sm">{environmentInfo.functionUrl}</code>
              </div>
              
              {environmentInfo.netlifyContext && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-300">Netlify Context:</span>
                  <span className="text-blue-400 text-sm">{environmentInfo.netlifyContext}</span>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Client ID:</span>
                <div className="flex items-center gap-2">
                  {environmentInfo.envVarStatus.clientId ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={environmentInfo.envVarStatus.clientId ? 'text-green-400' : 'text-red-400'}>
                    {environmentInfo.envVarStatus.clientId ? 'Set' : 'Missing'}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Access Token:</span>
                <div className="flex items-center gap-2">
                  {environmentInfo.envVarStatus.accessToken ? (
                    <CheckCircle className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={environmentInfo.envVarStatus.accessToken ? 'text-green-400' : 'text-red-400'}>
                    {environmentInfo.envVarStatus.accessToken ? 'Set' : 'Missing'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {!environmentInfo.hasRequiredEnvVars && (
            <div className="mt-4 p-3 bg-yellow-900 bg-opacity-50 border border-yellow-700 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-yellow-400 font-medium">Missing Environment Variables</span>
              </div>
              <p className="text-yellow-300 text-sm mt-1">
                Some required environment variables are missing. The function may not work properly.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Health Check Status */}
      <div className={`border rounded-lg p-4 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h3 className="text-lg font-semibold text-white">Function Status</h3>
              <p className="text-gray-400 text-sm">
                {healthCheck.status === 'idle' && 'Ready to test'}
                {healthCheck.status === 'checking' && 'Testing function...'}
                {healthCheck.status === 'success' && 'Function is working correctly'}
                {healthCheck.status === 'error' && 'Function has issues'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {healthCheck.duration && (
              <span className="text-gray-400 text-sm flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(healthCheck.duration)}
              </span>
            )}
            
            <button
              onClick={copyHealthCheckData}
              className="p-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
              title="Copy health check data"
            >
              <Copy className="h-4 w-4" />
            </button>
            
            <button
              onClick={runHealthCheck}
              disabled={healthCheck.status === 'checking'}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Zap className="h-4 w-4" />
              {healthCheck.status === 'checking' ? 'Testing...' : 'Test Function'}
            </button>
          </div>
        </div>

        {/* Test Results */}
        {healthCheck.timestamp && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Last Check:</span>
              <span className="text-white">{healthCheck.timestamp.toLocaleString()}</span>
            </div>

            {healthCheck.httpStatus && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">HTTP Status:</span>
                <span className={`font-medium ${
                  healthCheck.httpStatus >= 200 && healthCheck.httpStatus < 300 
                    ? 'text-green-400' 
                    : 'text-red-400'
                }`}>
                  {healthCheck.httpStatus}
                </span>
              </div>
            )}

            {healthCheck.error && (
              <div className="mt-3 p-3 bg-red-900 bg-opacity-50 border border-red-700 rounded">
                <div className="text-red-400 font-medium text-sm">Error:</div>
                <div className="text-red-300 text-sm mt-1">{healthCheck.error}</div>
              </div>
            )}

            {healthCheck.status === 'success' && healthCheck.response && (
              <div className="mt-3 p-3 bg-green-900 bg-opacity-50 border border-green-700 rounded">
                <div className="text-green-400 font-medium text-sm mb-2">Success Response:</div>
                <div className="space-y-1 text-sm">
                  {healthCheck.response.games && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Games Found:</span>
                      <span className="text-white">{healthCheck.response.games.length}</span>
                    </div>
                  )}
                  {healthCheck.response.searchTerm && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Search Term:</span>
                      <span className="text-white">"{healthCheck.response.searchTerm}"</span>
                    </div>
                  )}
                  {healthCheck.response.timestamp && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Function Timestamp:</span>
                      <span className="text-white">{new Date(healthCheck.response.timestamp).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Raw Response Data */}
            {showRawResponse && (healthCheck.response || healthCheck.error) && (
              <details className="mt-3">
                <summary className="text-gray-400 cursor-pointer hover:text-white text-sm">
                  Raw Response Data
                </summary>
                <pre className="mt-2 p-3 bg-gray-900 rounded text-xs text-gray-300 overflow-auto max-h-60">
                  {JSON.stringify({
                    status: healthCheck.status,
                    httpStatus: healthCheck.httpStatus,
                    headers: healthCheck.headers,
                    response: healthCheck.response,
                    error: healthCheck.error,
                    duration: healthCheck.duration
                  }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Development Mode Indicator */}
      {import.meta.env.DEV && (
        <div className="bg-blue-900 bg-opacity-50 border border-blue-700 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            <div>
              <h4 className="text-blue-400 font-medium">Development Mode</h4>
              <p className="text-blue-300 text-sm">
                This health check is running in development mode. 
                For local testing, make sure you're running <code className="bg-gray-800 px-2 py-1 rounded">netlify dev</code>.
              </p>
            </div>
          </div>
          
          <div className="mt-3 flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-blue-400" />
            <a 
              href="http://localhost:8888/.netlify/functions/igdb-search" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Test function directly (localhost:8888)
            </a>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gray-700 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Quick Actions</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              const testInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
              if (testInput) {
                testInput.value = 'zelda';
                testInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
            }}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors text-sm"
          >
            Test Search Component
          </button>
          
          <button
            onClick={() => window.open('/.netlify/functions/igdb-search', '_blank')}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors text-sm"
          >
            Open Function URL
          </button>
          
          <button
            onClick={() => console.log('Health Check State:', { healthCheck, environmentInfo })}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors text-sm"
          >
            Log to Console
          </button>
          
          <button
            onClick={checkEnvironment}
            className="px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors text-sm"
          >
            Refresh Environment
          </button>
        </div>
      </div>
    </div>
  );
};