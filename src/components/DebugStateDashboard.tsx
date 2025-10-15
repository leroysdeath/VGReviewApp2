import { useState, useEffect } from 'react';
import { stateLogger } from '../utils/stateLogger';
import { useAuth } from '../hooks/useAuth';

export function DebugStateDashboard() {
  const { user, dbUserId, loading, dbUserIdLoading } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [visible, setVisible] = useState(false);
  const [minimized, setMinimized] = useState(false);

  // Only show if DEBUG_STATE is enabled
  useEffect(() => {
    const isDebug = typeof window !== 'undefined' && localStorage.getItem('DEBUG_STATE') === 'true';
    setVisible(isDebug);
  }, []);

  // Update logs every second
  useEffect(() => {
    if (!visible) return;

    const interval = setInterval(() => {
      setLogs(stateLogger.getRecentLogs(15));
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  if (!visible) return null;

  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-4 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-mono hover:bg-gray-800 transition"
      >
        🐛 Debug
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-gray-900 text-white shadow-2xl z-50 flex flex-col border-l border-t border-gray-700">
      {/* Header */}
      <div className="flex justify-between items-center p-3 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐛</span>
          <h3 className="font-bold text-sm">State Debug Dashboard</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMinimized(true)}
            className="text-gray-400 hover:text-white px-2 py-1 text-xs"
          >
            _
          </button>
          <button
            onClick={() => {
              localStorage.removeItem('DEBUG_STATE');
              setVisible(false);
            }}
            className="text-red-400 hover:text-red-300 px-2 py-1 text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {/* State Summary */}
      <div className="p-3 bg-gray-850 border-b border-gray-700 text-xs font-mono space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Auth User:</span>
          <span className={user ? 'text-green-400' : 'text-red-400'}>
            {user ? `✓ ${user.email}` : '✗ Not authenticated'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">DB User ID:</span>
          <span className={dbUserId ? 'text-green-400' : 'text-yellow-400'}>
            {dbUserId ? `✓ ${dbUserId}` : dbUserIdLoading ? '⏳ Loading...' : '✗ Null'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Loading:</span>
          <span className={loading ? 'text-yellow-400' : 'text-green-400'}>
            {loading ? '⏳ Yes' : '✓ No'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">DB ID Loading:</span>
          <span className={dbUserIdLoading ? 'text-yellow-400' : 'text-green-400'}>
            {dbUserIdLoading ? '⏳ Yes' : '✓ No'}
          </span>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs font-mono">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No logs yet. Interact with the app to see state changes.
          </div>
        ) : (
          logs.map((log, i) => {
            const color = getEventColor(log.event);
            const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              fractionalSecondDigits: 3
            });

            return (
              <div key={`${log.timestamp}-${i}`} className="bg-gray-800 rounded p-2 border border-gray-700">
                <div className="flex items-start justify-between mb-1">
                  <span className={`font-semibold ${color}`}>
                    {log.event}
                  </span>
                  <span className="text-gray-500 text-[10px]">{timeStr}</span>
                </div>
                {Object.keys(log.data).length > 0 && (
                  <pre className="text-[10px] text-gray-400 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Actions */}
      <div className="p-3 bg-gray-800 border-t border-gray-700 flex gap-2">
        <button
          onClick={async () => {
            const success = await stateLogger.copyToClipboard();
            if (success) {
              alert('Logs copied to clipboard! Share them for debugging.');
            } else {
              alert('Failed to copy logs. Check console.');
            }
          }}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium transition"
        >
          📋 Copy Logs
        </button>
        <button
          onClick={() => {
            if (confirm('Clear all logs?')) {
              stateLogger.clear();
              setLogs([]);
            }
          }}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-medium transition"
        >
          🗑️ Clear
        </button>
      </div>
    </div>
  );
}

function getEventColor(event: string): string {
  if (event.includes('error') || event.includes('failed')) return 'text-red-400';
  if (event.includes('success') || event.includes('set') || event.includes('complete')) return 'text-green-400';
  if (event.includes('start') || event.includes('fetch') || event.includes('called')) return 'text-blue-400';
  if (event.includes('cache')) return 'text-purple-400';
  if (event.includes('wait') || event.includes('loading')) return 'text-yellow-400';
  return 'text-gray-300';
}
