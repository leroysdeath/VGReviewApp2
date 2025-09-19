/**
 * Admin Key Manager Component
 * Simple interface for managing admin access keys
 */

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';

export const AdminKeyManager: React.FC = () => {
  const { isAdmin } = useAdmin();
  const [newKey, setNewKey] = useState('');
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    // Load generated keys from localStorage
    const saved = localStorage.getItem('generatedAdminKeys');
    if (saved) {
      setGeneratedKeys(JSON.parse(saved));
    }
  }, []);

  const generateRandomKey = () => {
    const adjectives = ['search', 'diagnostic', 'admin', 'debug', 'test', 'user'];
    const nouns = ['key', 'access', 'pass', 'token', 'code'];
    const numbers = Math.floor(Math.random() * 9999);
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    
    return `${adjective}-${noun}-${numbers}`;
  };

  const createNewKey = () => {
    if (newKey.trim()) {
      const key = newKey.trim();
      const updated = [...generatedKeys, key];
      setGeneratedKeys(updated);
      localStorage.setItem('generatedAdminKeys', JSON.stringify(updated));
      setNewKey('');
    }
  };

  const generateKey = () => {
    const key = generateRandomKey();
    const updated = [...generatedKeys, key];
    setGeneratedKeys(updated);
    localStorage.setItem('generatedAdminKeys', JSON.stringify(updated));
  };

  const removeKey = (keyToRemove: string) => {
    const updated = generatedKeys.filter(k => k !== keyToRemove);
    setGeneratedKeys(updated);
    localStorage.setItem('generatedAdminKeys', JSON.stringify(updated));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      // Could add a toast notification here
      console.log('Admin key copied to clipboard:', key);
    });
  };

  if (!isAdmin) {
    return null;
  }

  const defaultKeys = [
    'vg-search-admin-2024',
    'debug',
    'diagnostic-tool',
    'tommy-admin',
    'search-diagnostic',
    'vg-admin'
  ];

  return (
    <div className="bg-gray-800 p-6 rounded-lg mb-6">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        🔐 Admin Key Manager
        <button
          onClick={() => setShowKeys(!showKeys)}
          className="ml-3 text-sm bg-gray-700 px-3 py-1 rounded"
        >
          {showKeys ? 'Hide Keys' : 'Show Keys'}
        </button>
      </h3>

      {showKeys && (
        <>
          {/* Default Keys */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-green-400">Default Admin Keys</h4>
            <div className="grid gap-2">
              {defaultKeys.map(key => (
                <div key={key} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                  <code className="text-sm text-green-300">{key}</code>
                  <button
                    onClick={() => copyToClipboard(key)}
                    className="text-xs bg-green-600 hover:bg-green-700 px-2 py-1 rounded"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Keys */}
          <div className="mb-6">
            <h4 className="font-semibold mb-2 text-blue-400">Custom Admin Keys</h4>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Enter custom admin key"
                className="flex-1 p-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                onKeyDown={(e) => e.key === 'Enter' && createNewKey()}
              />
              <button
                onClick={createNewKey}
                disabled={!newKey.trim()}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm"
              >
                Add Key
              </button>
              <button
                onClick={generateKey}
                className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm"
              >
                Generate
              </button>
            </div>

            {generatedKeys.length > 0 ? (
              <div className="grid gap-2">
                {generatedKeys.map(key => (
                  <div key={key} className="flex items-center justify-between bg-gray-700 p-2 rounded">
                    <code className="text-sm text-blue-300">{key}</code>
                    <div className="flex gap-2">
                      <button
                        onClick={() => copyToClipboard(key)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => removeKey(key)}
                        className="text-xs bg-red-600 hover:bg-red-700 px-2 py-1 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No custom keys created yet.</p>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-gray-700 p-4 rounded">
            <h4 className="font-semibold mb-2 text-yellow-400">How to Share Access</h4>
            <ol className="text-sm space-y-1 text-gray-300">
              <li>1. Copy any admin key from above</li>
              <li>2. Share the key with users who need diagnostic access</li>
              <li>3. Users go to <code className="bg-gray-800 px-1 rounded">/admin/diagnostic</code></li>
              <li>4. Users enter the admin key when prompted</li>
              <li>5. Access is saved in their browser session</li>
            </ol>
          </div>

          {/* Environment Variable Info */}
          <div className="mt-4 bg-blue-900/30 p-4 rounded border border-blue-700">
            <h4 className="font-semibold mb-2 text-blue-400">💡 Pro Tip: Environment Variable</h4>
            <p className="text-sm text-gray-300 mb-2">
              You can set custom admin keys via environment variable:
            </p>
            <code className="block bg-gray-800 p-2 rounded text-xs text-blue-300">
              VITE_ADMIN_KEYS="your-key-1,your-key-2,another-key"
            </code>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminKeyManager;