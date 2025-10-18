/**
 * Admin Sorting Test Page
 *
 * Interactive interface for testing and configuring search result sorting algorithms
 * Features:
 * - Live side-by-side comparison of sorting configs
 * - Weight adjustment with real-time preview
 * - Save/load/apply configurations
 * - Score breakdown visualization
 * - Safe fallback to default sorting
 */

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { igdbServiceV2, IGDBGame } from '../services/igdbServiceV2';
import {
  sortingConfigService,
  SortingConfig,
  SortingWeights,
  DEFAULT_SORTING_CONFIG
} from '../services/sortingConfigService';
import { advancedSortingService, GameWithScore } from '../services/advancedSortingService';

export const AdminSortingPage: React.FC = () => {
  const { isAdmin, login } = useAdmin();
  const [loginKey, setLoginKey] = useState('');
  const [loginError, setLoginError] = useState('');

  // Configuration management
  const [configs, setConfigs] = useState<SortingConfig[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<SortingConfig | null>(null);
  const [activeConfig, setActiveConfig] = useState<SortingConfig>(DEFAULT_SORTING_CONFIG);

  // Test search
  const [searchQuery, setSearchQuery] = useState('zelda');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IGDBGame[]>([]);

  // Preset test queries
  const PRESET_QUERIES = [
    { name: 'Zelda', query: 'zelda', description: 'Clean franchise baseline' },
    { name: 'Pokemon', query: 'pokemon', description: 'High volume + sister games' },
    { name: 'Dark Souls', query: 'dark souls', description: 'Modern series + editions' }
  ];

  // Sorted results (left = default, right = custom)
  const [defaultSorted, setDefaultSorted] = useState<GameWithScore[]>([]);
  const [customSorted, setCustomSorted] = useState<GameWithScore[]>([]);

  // Custom weights for live testing
  const [customWeights, setCustomWeights] = useState<SortingWeights>(DEFAULT_SORTING_CONFIG.weights);

  // UI state
  const [activeTab, setActiveTab] = useState<'test' | 'configs'>('test');
  const [showScoreDetails, setShowScoreDetails] = useState<Set<number>>(new Set());
  const [notification, setNotification] = useState<{type: 'success' | 'error'; message: string} | null>(null);

  // New config form
  const [newConfigName, setNewConfigName] = useState('');
  const [newConfigDescription, setNewConfigDescription] = useState('');

  // Load configs on mount
  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    const allConfigs = sortingConfigService.getAllConfigs();
    setConfigs(allConfigs);
    setActiveConfig(sortingConfigService.getActiveConfig());
  };

  // Perform test search
  const performSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const results = await igdbServiceV2.searchGames(searchQuery, 20);
      setSearchResults(results);

      // Sort with default weights
      const defaultResults = advancedSortingService.sortGamesWithWeights(
        results,
        searchQuery,
        DEFAULT_SORTING_CONFIG.weights
      );
      setDefaultSorted(defaultResults);

      // Sort with custom weights
      const customResults = advancedSortingService.sortGamesWithWeights(
        results,
        searchQuery,
        customWeights
      );
      setCustomSorted(customResults);
    } catch (error) {
      console.error('Search failed:', error);
      showNotification('error', 'Search failed: ' + (error as Error).message);
    } finally {
      setIsSearching(false);
    }
  };

  // Update custom weights and re-sort
  const updateCustomWeights = (newWeights: Partial<SortingWeights>) => {
    const updated = { ...customWeights, ...newWeights };

    // Auto-normalize if sum isn't 100
    const sum = Object.values(updated).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 100) > 0.1) {
      const factor = 100 / sum;
      Object.keys(updated).forEach(key => {
        updated[key as keyof SortingWeights] *= factor;
      });
    }

    setCustomWeights(updated);

    // Re-sort if we have results
    if (searchResults.length > 0) {
      const customResults = advancedSortingService.sortGamesWithWeights(
        searchResults,
        searchQuery,
        updated
      );
      setCustomSorted(customResults);
    }
  };

  // Save current custom weights as new config
  const saveCurrentAsConfig = () => {
    if (!newConfigName.trim()) {
      showNotification('error', 'Please enter a configuration name');
      return;
    }

    const validation = sortingConfigService.validateWeights(customWeights);
    if (!validation.valid) {
      showNotification('error', validation.error || 'Invalid weights');
      return;
    }

    const id = sortingConfigService.saveConfig({
      name: newConfigName,
      description: newConfigDescription,
      weights: customWeights,
      isActive: false,
      isDefault: false
    });

    loadConfigs();
    setNewConfigName('');
    setNewConfigDescription('');
    showNotification('success', `Saved configuration: ${newConfigName}`);
  };

  // Apply configuration to production
  const applyConfig = (id: string) => {
    const success = sortingConfigService.applyConfig(id);
    if (success) {
      loadConfigs();
      showNotification('success', 'Configuration applied successfully');
    } else {
      showNotification('error', 'Failed to apply configuration');
    }
  };

  // Revert to default
  const revertToDefault = () => {
    sortingConfigService.revertToDefault();
    loadConfigs();
    showNotification('success', 'Reverted to default sorting');
  };

  // Delete configuration
  const deleteConfig = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    const success = sortingConfigService.deleteConfig(id);
    if (success) {
      loadConfigs();
      showNotification('success', 'Configuration deleted');
    } else {
      showNotification('error', 'Cannot delete this configuration');
    }
  };

  // Load config into custom weights for testing
  const loadConfigForTesting = (config: SortingConfig) => {
    setCustomWeights(config.weights);
    setSelectedConfig(config);

    // Re-sort if we have results
    if (searchResults.length > 0) {
      const customResults = advancedSortingService.sortGamesWithWeights(
        searchResults,
        searchQuery,
        config.weights
      );
      setCustomSorted(customResults);
    }
  };

  // Toggle score details
  const toggleScoreDetails = (gameId: number) => {
    const newSet = new Set(showScoreDetails);
    if (newSet.has(gameId)) {
      newSet.delete(gameId);
    } else {
      newSet.add(gameId);
    }
    setShowScoreDetails(newSet);
  };

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle admin login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(loginKey);
    if (success) {
      setLoginError('');
      loadConfigs();
    } else {
      setLoginError('Invalid admin key');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-2">Admin Login Required</h1>
          <p className="text-gray-400 mb-6">Enter admin key to access the sorting test lab</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Admin Key
              </label>
              <input
                type="password"
                value={loginKey}
                onChange={(e) => setLoginKey(e.target.value)}
                placeholder="Enter admin key..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {loginError && (
              <div className="text-red-400 text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-medium"
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Search Sorting Test Lab</h1>
          <p className="text-gray-400">
            Test and configure search result sorting algorithms with live preview
          </p>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mb-4 p-4 rounded ${
            notification.type === 'success' ? 'bg-green-900 border border-green-700' : 'bg-red-900 border border-red-700'
          }`}>
            {notification.message}
          </div>
        )}

        {/* Active Configuration Status */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-lg">
                Active Configuration: <span className="text-blue-400">{activeConfig.name}</span>
              </h3>
              <p className="text-sm text-gray-400">{activeConfig.description}</p>
            </div>
            {!activeConfig.isDefault && (
              <button
                onClick={revertToDefault}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm"
              >
                Revert to Default
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('test')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'test'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              🧪 Test & Compare
            </button>
            <button
              onClick={() => setActiveTab('configs')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configs'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              ⚙️ Saved Configurations ({configs.length})
            </button>
          </nav>
        </div>

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="font-semibold mb-4">Test Search Query</h3>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && performSearch()}
                  placeholder="Enter search query..."
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                />
                <button
                  onClick={performSearch}
                  disabled={isSearching}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
              <div className="flex gap-2 mt-3 flex-wrap">
                {PRESET_QUERIES.map(preset => (
                  <button
                    key={preset.query}
                    onClick={() => setSearchQuery(preset.query)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm border border-gray-600"
                    title={preset.description}
                  >
                    📋 {preset.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Preset test series cover: baseline quality, high volume, and modern edge cases
              </p>
            </div>

            {/* Weight Sliders */}
            <div className="bg-gray-800 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Custom Weights (Test Configuration)</h3>
                <div className="text-sm text-gray-400">
                  Total: {Object.values(customWeights).reduce((a, b) => a + b, 0).toFixed(1)}%
                </div>
              </div>

              <div className="space-y-4">
                {Object.entries(customWeights).map(([key, value]) => (
                  <div key={key}>
                    <div className="flex justify-between mb-2">
                      <label className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </label>
                      <span className="text-sm text-gray-400">{value.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.5"
                      value={value}
                      onChange={(e) =>
                        updateCustomWeights({ [key]: parseFloat(e.target.value) } as Partial<SortingWeights>)
                      }
                      className="w-full"
                    />
                  </div>
                ))}
              </div>

              {/* Save Current Weights */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <h4 className="font-medium mb-3">Save Current Configuration</h4>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newConfigName}
                    onChange={(e) => setNewConfigName(e.target.value)}
                    placeholder="Configuration name..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                  <input
                    type="text"
                    value={newConfigDescription}
                    onChange={(e) => setNewConfigDescription(e.target.value)}
                    placeholder="Description (optional)..."
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                  <button
                    onClick={saveCurrentAsConfig}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-sm"
                  >
                    💾 Save Configuration
                  </button>
                </div>
              </div>
            </div>

            {/* Results Comparison */}
            {searchResults.length > 0 && (
              <div className="grid grid-cols-2 gap-6">
                {/* Default Sorting */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="font-semibold mb-4 text-yellow-400">
                    Default Sorting (Current Production)
                  </h3>
                  <div className="space-y-2">
                    {defaultSorted.slice(0, 10).map((scored, idx) => (
                      <div key={scored.game.id} className="bg-gray-700 p-3 rounded">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400 text-sm w-6">#{idx + 1}</span>
                              <span className="font-medium">{scored.game.name}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                              <div>Score: {scored.totalScore.toFixed(1)}</div>
                              {scored.game.total_rating && (
                                <div className="text-purple-400">
                                  IGDB Rating: {scored.game.total_rating.toFixed(1)}/100
                                </div>
                              )}
                              {scored.game.total_rating_count && (
                                <div className="text-gray-500 text-[10px]">
                                  ({scored.game.total_rating_count} reviews)
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleScoreDetails(scored.game.id)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            {showScoreDetails.has(scored.game.id) ? 'Hide' : 'Details'}
                          </button>
                        </div>
                        {showScoreDetails.has(scored.game.id) && (
                          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-300">
                            {advancedSortingService.getScoreExplanation(scored).map((exp, i) => (
                              <div key={i}>• {exp}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Sorting */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="font-semibold mb-4 text-green-400">
                    Custom Sorting (Test Configuration)
                  </h3>
                  <div className="space-y-2">
                    {customSorted.slice(0, 10).map((scored, idx) => (
                      <div key={scored.game.id} className="bg-gray-700 p-3 rounded">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-400 text-sm w-6">#{idx + 1}</span>
                              <span className="font-medium">{scored.game.name}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 space-y-0.5">
                              <div>Score: {scored.totalScore.toFixed(1)}</div>
                              {scored.game.total_rating && (
                                <div className="text-green-400">
                                  IGDB Rating: {scored.game.total_rating.toFixed(1)}/100
                                </div>
                              )}
                              {scored.game.total_rating_count && (
                                <div className="text-gray-500 text-[10px]">
                                  ({scored.game.total_rating_count} reviews)
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => toggleScoreDetails(scored.game.id)}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            {showScoreDetails.has(scored.game.id) ? 'Hide' : 'Details'}
                          </button>
                        </div>
                        {showScoreDetails.has(scored.game.id) && (
                          <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-300">
                            {advancedSortingService.getScoreExplanation(scored).map((exp, i) => (
                              <div key={i}>• {exp}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Results Summary */}
            {searchResults.length > 0 && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="font-semibold mb-4">Search Results Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 mb-1">Total Results</div>
                    <div className="text-2xl font-bold">{searchResults.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Avg IGDB Rating</div>
                    <div className="text-2xl font-bold">
                      {(searchResults.reduce((sum, g) => sum + (g.total_rating || 0), 0) / searchResults.filter(g => g.total_rating).length).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 mb-1">Games with Ratings</div>
                    <div className="text-2xl font-bold">
                      {searchResults.filter(g => g.total_rating).length} / {searchResults.length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Configurations Tab */}
        {activeTab === 'configs' && (
          <div className="space-y-4">
            {configs.map(config => (
              <div
                key={config.id}
                className={`bg-gray-800 p-6 rounded-lg border-2 ${
                  config.isActive ? 'border-green-500' : 'border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-lg flex items-center space-x-2">
                      <span>{config.name}</span>
                      {config.isActive && <span className="text-green-400 text-sm">(Active)</span>}
                      {config.isDefault && <span className="text-yellow-400 text-sm">(Default)</span>}
                    </h3>
                    <p className="text-sm text-gray-400">{config.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadConfigForTesting(config)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                    >
                      Test
                    </button>
                    {!config.isActive && !config.isDefault && (
                      <button
                        onClick={() => applyConfig(config.id!)}
                        className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                      >
                        Apply
                      </button>
                    )}
                    {!config.isDefault && (
                      <button
                        onClick={() => deleteConfig(config.id!)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Weight Distribution */}
                <div className="grid grid-cols-5 gap-4 text-sm">
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Name Match</div>
                    <div className="font-medium">{config.weights.nameMatch}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Rating</div>
                    <div className="font-medium">{config.weights.rating}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Likes</div>
                    <div className="font-medium">{config.weights.likes}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Buzz</div>
                    <div className="font-medium">{config.weights.buzz}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs mb-1">Franchise</div>
                    <div className="font-medium">{config.weights.franchiseImportance}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
