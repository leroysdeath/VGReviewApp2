/**
 * A/B Test Dashboard Component
 * Admin interface for managing experiments
 * Privacy-compliant experiment management
 */

import React, { useState, useEffect } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { 
  abTestingService, 
  ABTestExperiment, 
  ABTestVariant, 
  ABTestAnalytics 
} from '../../services/abTestingService';

interface ABTestDashboardProps {
  standalone?: boolean;
}

export const ABTestDashboard: React.FC<ABTestDashboardProps> = ({ standalone = true }) => {
  const { isAdmin } = useAdmin();
  const [experiments, setExperiments] = useState<ABTestExperiment[]>([]);
  const [analytics, setAnalytics] = useState<Map<string, ABTestAnalytics>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'draft' | 'completed' | 'create'>('active');
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);

  // New experiment form state
  const [newExperiment, setNewExperiment] = useState({
    name: '',
    description: '',
    targetPercentage: 50,
    variants: [
      { id: 'control', name: 'Control', description: 'Original version', weight: 50, config: {}, isControl: true },
      { id: 'variant_a', name: 'Variant A', description: 'Test version', weight: 50, config: {}, isControl: false }
    ]
  });

  // Load experiments and analytics
  useEffect(() => {
    if (!standalone || (standalone && isAdmin)) {
      loadExperiments();
    }
  }, [standalone, isAdmin, activeTab]);

  const loadExperiments = async () => {
    try {
      setLoading(true);
      setError(null);

      // This would be implemented in the service
      // const experimentsData = await abTestingService.getExperiments(activeTab);
      // setExperiments(experimentsData);

      // For now, show mock data structure
      const mockExperiments: ABTestExperiment[] = [];
      setExperiments(mockExperiments);

      // Load analytics for active experiments
      for (const experiment of mockExperiments) {
        if (experiment.status === 'active') {
          const analyticsData = await abTestingService.getExperimentAnalytics(experiment.id);
          if (analyticsData) {
            setAnalytics(prev => new Map(prev).set(experiment.id, analyticsData));
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load experiments');
    } finally {
      setLoading(false);
    }
  };

  const createExperiment = async () => {
    try {
      const experimentData = {
        name: newExperiment.name,
        description: newExperiment.description,
        status: 'draft' as const,
        startDate: new Date().toISOString(),
        endDate: null,
        targetPercentage: newExperiment.targetPercentage,
        variants: newExperiment.variants,
        metadata: {
          createdBy: 'admin',
          tags: [],
          hypothesis: '',
          successMetrics: []
        }
      };

      await abTestingService.createExperiment(experimentData);
      await loadExperiments();
      setActiveTab('draft');
      
      // Reset form
      setNewExperiment({
        name: '',
        description: '',
        targetPercentage: 50,
        variants: [
          { id: 'control', name: 'Control', description: 'Original version', weight: 50, config: {}, isControl: true },
          { id: 'variant_a', name: 'Variant A', description: 'Test version', weight: 50, config: {}, isControl: false }
        ]
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create experiment');
    }
  };

  const addVariant = () => {
    const variantId = `variant_${String.fromCharCode(65 + newExperiment.variants.length - 1)}`;
    const currentWeight = 100 / (newExperiment.variants.length + 1);
    
    const updatedVariants = [
      ...newExperiment.variants.map(v => ({ ...v, weight: currentWeight })),
      {
        id: variantId,
        name: `Variant ${String.fromCharCode(65 + newExperiment.variants.length - 1)}`,
        description: 'New test variant',
        weight: currentWeight,
        config: {},
        isControl: false
      }
    ];

    setNewExperiment(prev => ({ ...prev, variants: updatedVariants }));
  };

  const removeVariant = (index: number) => {
    if (newExperiment.variants.length <= 2 || newExperiment.variants[index].isControl) {
      return; // Can't remove control or if only 2 variants
    }

    const updatedVariants = newExperiment.variants.filter((_, i) => i !== index);
    const newWeight = 100 / updatedVariants.length;
    
    setNewExperiment(prev => ({
      ...prev,
      variants: updatedVariants.map(v => ({ ...v, weight: newWeight }))
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'draft': return 'text-yellow-400';
      case 'paused': return 'text-orange-400';
      case 'completed': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'draft': return '📝';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      default: return '❓';
    }
  };

  if (!standalone || !isAdmin) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-gray-400">Admin access required</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-center">
        <div className="text-gray-400">Loading A/B tests...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">A/B Test Management</h2>
        <div className="flex space-x-2">
          <button
            onClick={loadExperiments}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {['active', 'draft', 'completed', 'create'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              {tab === 'create' ? '+ Create New' : tab}
              {tab === 'active' && experiments.filter(e => e.status === 'active').length > 0 && (
                <span className="ml-2 bg-green-600 text-white px-2 py-1 rounded-full text-xs">
                  {experiments.filter(e => e.status === 'active').length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {error && (
        <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {activeTab === 'create' ? (
        /* Create New Experiment Form */
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4 text-white">Create New A/B Test</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Experiment Name *
              </label>
              <input
                type="text"
                value={newExperiment.name}
                onChange={(e) => setNewExperiment(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                placeholder="e.g., Homepage CTA Button Test"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={newExperiment.description}
                onChange={(e) => setNewExperiment(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                rows={3}
                placeholder="Describe what this experiment tests and your hypothesis"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Percentage: {newExperiment.targetPercentage}%
              </label>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={newExperiment.targetPercentage}
                onChange={(e) => setNewExperiment(prev => ({ ...prev, targetPercentage: parseInt(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs text-gray-400 mt-1">
                Percentage of users who will participate in this experiment
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-gray-300">
                  Variants ({newExperiment.variants.length})
                </label>
                <button
                  onClick={addVariant}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  + Add Variant
                </button>
              </div>

              <div className="space-y-3">
                {newExperiment.variants.map((variant, index) => (
                  <div key={variant.id} className="bg-gray-700 p-4 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 grid grid-cols-2 gap-3">
                        <div>
                          <input
                            type="text"
                            value={variant.name}
                            onChange={(e) => {
                              const updated = [...newExperiment.variants];
                              updated[index] = { ...updated[index], name: e.target.value };
                              setNewExperiment(prev => ({ ...prev, variants: updated }));
                            }}
                            className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                            placeholder="Variant name"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            value={variant.description}
                            onChange={(e) => {
                              const updated = [...newExperiment.variants];
                              updated[index] = { ...updated[index], description: e.target.value };
                              setNewExperiment(prev => ({ ...prev, variants: updated }));
                            }}
                            className="w-full px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                            placeholder="Description"
                          />
                        </div>
                      </div>
                      {!variant.isControl && newExperiment.variants.length > 2 && (
                        <button
                          onClick={() => removeVariant(index)}
                          className="ml-2 text-red-400 hover:text-red-300 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-400">
                      Weight: {variant.weight.toFixed(1)}% 
                      {variant.isControl && <span className="ml-2 text-blue-400">(Control)</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
              <button
                onClick={() => setActiveTab('active')}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={createExperiment}
                disabled={!newExperiment.name || !newExperiment.description}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Experiment
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Experiments List */
        <div className="space-y-4">
          {experiments.filter(exp => exp.status === activeTab).length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-8 text-center">
              <div className="text-gray-400 mb-4">
                {activeTab === 'active' && '🧪 No active experiments'}
                {activeTab === 'draft' && '📝 No draft experiments'}
                {activeTab === 'completed' && '✅ No completed experiments'}
              </div>
              <div className="text-sm text-gray-500">
                {activeTab === 'active' && 'Create and activate experiments to start A/B testing'}
                {activeTab === 'draft' && 'Draft experiments are created but not yet active'}
                {activeTab === 'completed' && 'Completed experiments will appear here'}
              </div>
            </div>
          ) : (
            experiments
              .filter(exp => exp.status === activeTab)
              .map(experiment => {
                const analytics = analytics.get(experiment.id);
                return (
                  <div key={experiment.id} className="bg-gray-800 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-1">{experiment.name}</h3>
                        <p className="text-gray-400 text-sm mb-2">{experiment.description}</p>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className={`flex items-center space-x-1 ${getStatusColor(experiment.status)}`}>
                            <span>{getStatusIcon(experiment.status)}</span>
                            <span className="capitalize">{experiment.status}</span>
                          </span>
                          <span className="text-gray-400">
                            Target: {experiment.targetPercentage}%
                          </span>
                          <span className="text-gray-400">
                            Variants: {experiment.variants.length}
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedExperiment(
                            selectedExperiment === experiment.id ? null : experiment.id
                          )}
                          className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
                        >
                          {selectedExperiment === experiment.id ? 'Hide Details' : 'View Details'}
                        </button>
                      </div>
                    </div>

                    {/* Analytics Summary */}
                    {analytics && (
                      <div className="mb-4 p-4 bg-gray-700 rounded">
                        <div className="grid grid-cols-4 gap-4 text-center">
                          <div>
                            <div className="text-2xl font-bold text-white">{analytics.totalParticipants}</div>
                            <div className="text-xs text-gray-400">Participants</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">{analytics.duration}</div>
                            <div className="text-xs text-gray-400">Days Running</div>
                          </div>
                          <div>
                            <div className={`text-2xl font-bold ${
                              analytics.status === 'significant_winner' ? 'text-green-400' : 
                              analytics.status === 'insufficient_data' ? 'text-yellow-400' : 
                              'text-gray-400'
                            }`}>
                              {analytics.status === 'significant_winner' ? '✓' : 
                               analytics.status === 'insufficient_data' ? '⏳' : '~'}
                            </div>
                            <div className="text-xs text-gray-400">Significance</div>
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">
                              {(analytics.statisticalPower * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-gray-400">Power</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Expanded Details */}
                    {selectedExperiment === experiment.id && (
                      <div className="border-t border-gray-700 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Variants */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-3">Variants</h4>
                            <div className="space-y-2">
                              {experiment.variants.map(variant => {
                                const variantAnalytics = analytics?.variantResults.find(
                                  r => r.variantId === variant.id
                                );
                                return (
                                  <div key={variant.id} className="bg-gray-700 p-3 rounded">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <div className="font-medium text-white">
                                          {variant.name}
                                          {variant.isControl && (
                                            <span className="ml-2 text-xs text-blue-400">(Control)</span>
                                          )}
                                        </div>
                                        <div className="text-sm text-gray-400">{variant.description}</div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          Weight: {variant.weight}%
                                        </div>
                                      </div>
                                      {variantAnalytics && (
                                        <div className="text-right">
                                          <div className="text-sm text-white">
                                            {(variantAnalytics.metrics.conversionRate * 100).toFixed(1)}%
                                          </div>
                                          <div className="text-xs text-gray-400">
                                            {variantAnalytics.metrics.conversions}/{variantAnalytics.metrics.participants}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Experiment Info */}
                          <div>
                            <h4 className="text-sm font-medium text-gray-300 mb-3">Experiment Details</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Started:</span>
                                <span className="text-white">
                                  {new Date(experiment.startDate).toLocaleDateString()}
                                </span>
                              </div>
                              {experiment.endDate && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Ended:</span>
                                  <span className="text-white">
                                    {new Date(experiment.endDate).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-400">ID:</span>
                                <span className="text-white font-mono text-xs">{experiment.id}</span>
                              </div>
                              {analytics?.winningVariant && (
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Winner:</span>
                                  <span className="text-green-400 font-medium">
                                    {experiment.variants.find(v => v.id === analytics.winningVariant)?.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
};