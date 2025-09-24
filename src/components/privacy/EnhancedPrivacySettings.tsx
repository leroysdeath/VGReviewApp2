/**
 * Enhanced Privacy Settings Component
 * Improved UI/UX for privacy controls with comprehensive data management
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Download, Trash2, Info, Check, Loader2, AlertCircle, 
  Eye, EyeOff, Clock, FileText, AlertTriangle, ChevronDown, 
  ChevronUp, Database, Globe, User, Activity, MessageCircle
} from 'lucide-react';
import { privacyService, UserPreferences, TrackingLevel } from '../../services/privacyService';
import { gdprService } from '../../services/gdprService';
import { useAuth } from '../../hooks/useAuth';

interface EnhancedPrivacySettingsProps {
  userId: number;
  className?: string;
}

interface DataDeletionConfirmation {
  step: 'initial' | 'confirmation' | 'final-warning' | 'processing' | 'complete';
  deletionType: 'all' | 'tracking-only';
  userInput: string;
  understood: boolean[];
}

interface DataStats {
  gameViews: number;
  reviews: number;
  comments: number;
  activities: number;
  estimatedExportSize: string;
}

export const EnhancedPrivacySettings: React.FC<EnhancedPrivacySettingsProps> = ({ 
  userId, 
  className = '' 
}) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [trackingLevel, setTrackingLevel] = useState<TrackingLevel>('anonymous');
  const [analyticsOptedIn, setAnalyticsOptedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Data export states
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Data deletion states
  const [deletionModal, setDeletionModal] = useState<DataDeletionConfirmation>({
    step: 'initial',
    deletionType: 'tracking-only',
    userInput: '',
    understood: []
  });
  
  // Data statistics
  const [dataStats, setDataStats] = useState<DataStats>({
    gameViews: 0,
    reviews: 0,
    comments: 0,
    activities: 0,
    estimatedExportSize: '0 KB'
  });
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  const [retentionInfo, setRetentionInfo] = useState<any>(null);

  useEffect(() => {
    loadAllData();
  }, [userId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPreferences(),
        loadDataStats(),
        loadConsentHistory(),
        loadRetentionInfo()
      ]);
    } catch (error) {
      console.error('Error loading privacy data:', error);
      setMessage({ type: 'error', text: 'Failed to load privacy settings' });
    } finally {
      setLoading(false);
    }
  };

  const loadPreferences = async () => {
    try {
      const prefs = await privacyService.getUserPreferences(userId);
      if (prefs) {
        setPreferences(prefs);
        setTrackingLevel(prefs.tracking_level);
        setAnalyticsOptedIn(prefs.analytics_opted_in);
      } else {
        const localConsent = privacyService.getLocalConsent();
        if (localConsent) {
          setTrackingLevel(localConsent.trackingLevel);
          setAnalyticsOptedIn(localConsent.analyticsOptedIn);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadDataStats = async () => {
    try {
      // This would typically come from a privacy dashboard API
      // For now, we'll simulate the data
      setDataStats({
        gameViews: Math.floor(Math.random() * 500) + 10,
        reviews: Math.floor(Math.random() * 50) + 1,
        comments: Math.floor(Math.random() * 100) + 5,
        activities: Math.floor(Math.random() * 200) + 20,
        estimatedExportSize: `${Math.floor(Math.random() * 50) + 5} KB`
      });
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };

  const loadConsentHistory = async () => {
    try {
      const history = await gdprService.getConsentHistory(userId);
      setConsentHistory(history.slice(0, 5)); // Show last 5 entries
    } catch (error) {
      console.error('Error loading consent history:', error);
    }
  };

  const loadRetentionInfo = async () => {
    try {
      const info = await gdprService.getDataRetentionInfo(userId);
      setRetentionInfo(info);
    } catch (error) {
      console.error('Error loading retention info:', error);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const country = await privacyService.getUserCountry();
      await privacyService.saveConsent(
        {
          analyticsOptedIn,
          trackingLevel,
          ipCountry: country || undefined
        },
        userId
      );

      setMessage({ type: 'success', text: 'Privacy preferences updated successfully' });
      await loadConsentHistory(); // Refresh history
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setMessage(null);
    
    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const data = await gdprService.exportUserData(userId);
      
      clearInterval(progressInterval);
      setExportProgress(100);

      if (data) {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `privacy-data-${userId}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setMessage({ type: 'success', text: 'Data exported successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to export data' });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage({ type: 'error', text: 'Export failed. Please try again.' });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const startDataDeletion = (type: 'all' | 'tracking-only') => {
    setDeletionModal({
      step: 'initial',
      deletionType: type,
      userInput: '',
      understood: []
    });
  };

  const proceedWithDeletion = () => {
    if (deletionModal.step === 'initial') {
      setDeletionModal(prev => ({ ...prev, step: 'confirmation' }));
    } else if (deletionModal.step === 'confirmation') {
      setDeletionModal(prev => ({ ...prev, step: 'final-warning' }));
    } else if (deletionModal.step === 'final-warning') {
      executeDeletion();
    }
  };

  const executeDeletion = async () => {
    setDeletionModal(prev => ({ ...prev, step: 'processing' }));
    
    try {
      const result = await gdprService.deleteUserData(userId);
      
      if (result.success) {
        setDeletionModal(prev => ({ ...prev, step: 'complete' }));
        setMessage({ 
          type: 'success', 
          text: `Data deletion completed. ${result.deletedItems.gameViews} views deleted, ${result.anonymizedItems.reviews} reviews anonymized.` 
        });
        await loadDataStats(); // Refresh stats
      } else {
        setMessage({ type: 'error', text: result.error || 'Deletion failed' });
        closeDeletionModal();
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      setMessage({ type: 'error', text: 'Deletion failed. Please try again.' });
      closeDeletionModal();
    }
  };

  const closeDeletionModal = () => {
    setDeletionModal({
      step: 'initial',
      deletionType: 'tracking-only',
      userInput: '',
      understood: []
    });
  };

  const canProceedDeletion = () => {
    if (deletionModal.step === 'final-warning') {
      return deletionModal.userInput.toLowerCase() === 'delete my data' && 
             deletionModal.understood.length === 3 && 
             deletionModal.understood.every(Boolean);
    }
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        <span className="ml-2 text-gray-600">Loading privacy settings...</span>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto p-6 space-y-8 ${className}`}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Privacy Settings</h1>
            <p className="text-gray-600">Manage your data and privacy preferences</p>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${
            message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' && <Check className="h-5 w-5" />}
              {message.type === 'error' && <AlertCircle className="h-5 w-5" />}
              {message.type === 'info' && <Info className="h-5 w-5" />}
              <span>{message.text}</span>
            </div>
          </div>
        )}
      </div>

      {/* Data Overview */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Your Data Overview
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600">Game Views</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{dataStats.gameViews}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-600">Reviews</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{dataStats.reviews}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-orange-600" />
              <span className="text-sm text-gray-600">Comments</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{dataStats.comments}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-gray-600">Activities</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{dataStats.activities}</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Estimated export size: {dataStats.estimatedExportSize}</p>
              <p>This includes all your data except sensitive information like passwords.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tracking Preferences */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tracking Preferences</h2>
        
        <div className="space-y-4">
          {/* Toggle for analytics */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h3 className="font-medium text-gray-900">Enable Analytics</h3>
              <p className="text-sm text-gray-600">Allow us to collect anonymous usage data to improve the platform</p>
            </div>
            <button
              onClick={() => setAnalyticsOptedIn(!analyticsOptedIn)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                analyticsOptedIn ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  analyticsOptedIn ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Tracking level selection */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Tracking Level</h3>
            
            {(['none', 'anonymous', 'full'] as TrackingLevel[]).map((level) => (
              <label key={level} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="tracking"
                  value={level}
                  checked={trackingLevel === level}
                  onChange={(e) => setTrackingLevel(e.target.value as TrackingLevel)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 capitalize">{level} Tracking</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      level === 'none' ? 'bg-red-100 text-red-700' :
                      level === 'anonymous' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {level === 'none' ? 'Most Private' : 
                       level === 'anonymous' ? 'Recommended' : 'Full Features'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {level === 'none' && 'No analytics or tracking. You won\'t contribute to game popularity metrics.'}
                    {level === 'anonymous' && 'Help improve GameVault with anonymous usage data. No personal information stored.'}
                    {level === 'full' && 'Get personalized recommendations and track your viewing history. Data linked to your account.'}
                  </p>
                </div>
              </label>
            ))}
          </div>

          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Management</h2>
        
        <div className="space-y-4">
          {/* Export Data */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Export Your Data
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Download all your data in JSON format. This includes your profile, reviews, and activity history.
                </p>
              </div>
              <button
                onClick={handleExportData}
                disabled={isExporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Export
                  </>
                )}
              </button>
            </div>
            
            {isExporting && (
              <div className="mt-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-1">Exporting data... {exportProgress}%</p>
              </div>
            )}
          </div>

          {/* Delete Tracking Data */}
          <div className="border border-orange-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-orange-600" />
                  Delete Tracking Data
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Remove your game views and analytics data. Your reviews and profile will remain.
                </p>
              </div>
              <button
                onClick={() => startDataDeletion('tracking-only')}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Tracking Data
              </button>
            </div>
          </div>

          {/* Delete All Data */}
          <div className="border border-red-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Delete All Data
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Permanently delete all your data. Reviews will be anonymized. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => startDataDeletion('all')}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Delete All Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-xl font-semibold text-gray-900">Advanced Settings</h2>
          {showAdvanced ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        
        {showAdvanced && (
          <div className="mt-6 space-y-6">
            {/* Consent History */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Recent Consent Changes</h3>
              <div className="space-y-2">
                {consentHistory.length > 0 ? (
                  consentHistory.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-900 capitalize">
                        {entry.action.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600">No consent history available</p>
                )}
              </div>
            </div>

            {/* Data Retention Info */}
            {retentionInfo && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Data Retention</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Game Views</h4>
                    <p className="text-sm text-gray-600">{retentionInfo.gameViews.retentionDays} days</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Analytics</h4>
                    <p className="text-sm text-gray-600">{retentionInfo.aggregatedMetrics.retentionDays} days</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">Audit Logs</h4>
                    <p className="text-sm text-gray-600">{retentionInfo.auditLogs.retentionDays} days</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Data Deletion Modal */}
      {deletionModal.step !== 'initial' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            {deletionModal.step === 'confirmation' && (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Data Deletion</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete your {deletionModal.deletionType === 'all' ? 'all' : 'tracking'} data? 
                  This action will remove:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-600 mb-6 space-y-1">
                  <li>Game view history ({dataStats.gameViews} items)</li>
                  <li>Analytics data</li>
                  {deletionModal.deletionType === 'all' && (
                    <>
                      <li>Reviews will be anonymized ({dataStats.reviews} items)</li>
                      <li>Comments will be anonymized ({dataStats.comments} items)</li>
                    </>
                  )}
                </ul>
                <div className="flex gap-3">
                  <button
                    onClick={closeDeletionModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={proceedWithDeletion}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {deletionModal.step === 'final-warning' && (
              <>
                <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Final Warning
                </h3>
                <p className="text-gray-600 mb-6">
                  This action is <strong>irreversible</strong>. Please confirm you understand:
                </p>
                
                <div className="space-y-3 mb-6">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={deletionModal.understood[0] || false}
                      onChange={(e) => {
                        const newUnderstood = [...deletionModal.understood];
                        newUnderstood[0] = e.target.checked;
                        setDeletionModal(prev => ({ ...prev, understood: newUnderstood }));
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">I understand this action cannot be undone</span>
                  </label>
                  
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={deletionModal.understood[1] || false}
                      onChange={(e) => {
                        const newUnderstood = [...deletionModal.understood];
                        newUnderstood[1] = e.target.checked;
                        setDeletionModal(prev => ({ ...prev, understood: newUnderstood }));
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">I have exported my data if needed</span>
                  </label>
                  
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={deletionModal.understood[2] || false}
                      onChange={(e) => {
                        const newUnderstood = [...deletionModal.understood];
                        newUnderstood[2] = e.target.checked;
                        setDeletionModal(prev => ({ ...prev, understood: newUnderstood }));
                      }}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-700">I want to proceed with permanent deletion</span>
                  </label>
                </div>
                
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type "delete my data" to confirm:
                  </label>
                  <input
                    type="text"
                    value={deletionModal.userInput}
                    onChange={(e) => setDeletionModal(prev => ({ ...prev, userInput: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg"
                    placeholder="delete my data"
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={closeDeletionModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={proceedWithDeletion}
                    disabled={!canProceedDeletion()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete My Data
                  </button>
                </div>
              </>
            )}

            {deletionModal.step === 'processing' && (
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Deleting Data...</h3>
                <p className="text-gray-600">Please wait while we process your request.</p>
              </div>
            )}

            {deletionModal.step === 'complete' && (
              <>
                <div className="text-center">
                  <Check className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Deletion Complete</h3>
                  <p className="text-gray-600 mb-6">Your data has been successfully deleted.</p>
                  <button
                    onClick={closeDeletionModal}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};