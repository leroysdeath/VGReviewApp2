import React, { useState, useEffect } from 'react';
import { Shield, Download, Trash2, Info, Check, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { privacyService, UserPreferences, TrackingLevel } from '../../services/privacyService';
import { gdprService } from '../../services/gdprService';
import { useAuth } from '../../hooks/useAuth';

interface PrivacySettingsProps {
  userId: number;
}

export const PrivacySettings: React.FC<PrivacySettingsProps> = ({ userId }) => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [trackingLevel, setTrackingLevel] = useState<TrackingLevel>('anonymous');
  const [analyticsOptedIn, setAnalyticsOptedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteProcessing, setDeleteProcessing] = useState(false);
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadPreferences();
    loadConsentHistory();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const prefs = await privacyService.getUserPreferences(userId);
      if (prefs) {
        setPreferences(prefs);
        setTrackingLevel(prefs.tracking_level);
        setAnalyticsOptedIn(prefs.analytics_opted_in);
      } else {
        // Check local preferences
        const localConsent = privacyService.getLocalConsent();
        if (localConsent) {
          setTrackingLevel(localConsent.trackingLevel);
          setAnalyticsOptedIn(localConsent.analyticsOptedIn);
        }
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load privacy preferences' });
    } finally {
      setLoading(false);
    }
  };

  const loadConsentHistory = async () => {
    try {
      const history = await gdprService.getConsentHistory(userId);
      setConsentHistory(history);
    } catch (error) {
      console.error('Error loading consent history:', error);
    }
  };

  const handleSavePreferences = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const country = await privacyService.getUserCountry();
      const result = await privacyService.saveConsent(
        {
          analyticsOptedIn,
          trackingLevel,
          ipCountry: country || undefined
        },
        userId
      );

      if (result.success) {
        setMessage({ type: 'success', text: 'Privacy preferences updated successfully' });
        loadConsentHistory(); // Refresh history
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save preferences' });
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'An error occurred while saving preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    setMessage(null);
    try {
      const data = await gdprService.exportUserData(userId);
      if (data) {
        // Create and download JSON file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gamevault-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setMessage({ type: 'success', text: 'Your data has been exported successfully' });
      } else {
        setMessage({ type: 'error', text: 'Failed to export data' });
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      setMessage({ type: 'error', text: 'An error occurred while exporting data' });
    }
  };

  const handleDeleteData = async () => {
    setDeleteProcessing(true);
    setMessage(null);
    
    try {
      const result = await gdprService.deleteUserData(userId, {
        deleteReviews: false,
        deleteComments: false,
        anonymizeInstead: true
      });

      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Data deleted successfully. ${result.deletedItems.gameViews} views removed, ${result.anonymizedItems.reviews + result.anonymizedItems.comments} items anonymized.`
        });
        setShowDeleteConfirm(false);
        // Update preferences to reflect deletion
        setAnalyticsOptedIn(false);
        setTrackingLevel('none');
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to delete data' });
      }
    } catch (error) {
      console.error('Error deleting data:', error);
      setMessage({ type: 'error', text: 'An error occurred while deleting data' });
    } finally {
      setDeleteProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-purple-400" />
        <h2 className="text-xl font-bold text-white">Privacy & Data</h2>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-3 rounded-lg flex items-start gap-2 ${
          message.type === 'success' ? 'bg-green-900/50 border border-green-700' :
          message.type === 'error' ? 'bg-red-900/50 border border-red-700' :
          'bg-blue-900/50 border border-blue-700'
        }`}>
          {message.type === 'success' && <Check className="h-5 w-5 text-green-400 mt-0.5" />}
          {message.type === 'error' && <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />}
          {message.type === 'info' && <Info className="h-5 w-5 text-blue-400 mt-0.5" />}
          <p className={`text-sm ${
            message.type === 'success' ? 'text-green-300' :
            message.type === 'error' ? 'text-red-300' :
            'text-blue-300'
          }`}>{message.text}</p>
        </div>
      )}

      {/* Analytics Preferences */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">Analytics Preferences</h3>
        
        <div className="space-y-4">
          {/* Analytics Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Enable Analytics</label>
              <p className="text-sm text-gray-400 mt-1">
                Help improve GameVault by sharing anonymous usage data
              </p>
            </div>
            <button
              onClick={() => setAnalyticsOptedIn(!analyticsOptedIn)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                analyticsOptedIn ? 'bg-purple-600' : 'bg-gray-600'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                analyticsOptedIn ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Tracking Level */}
          {analyticsOptedIn && (
            <div className="space-y-3 pt-4 border-t border-gray-700">
              <label className="text-white font-medium">Tracking Level</label>
              
              <div className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="trackingLevel"
                    value="anonymous"
                    checked={trackingLevel === 'anonymous'}
                    onChange={(e) => setTrackingLevel(e.target.value as TrackingLevel)}
                    className="mt-1 text-purple-600"
                  />
                  <div>
                    <div className="text-white">Anonymous</div>
                    <p className="text-sm text-gray-400">
                      Track game views without linking to your account
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="trackingLevel"
                    value="full"
                    checked={trackingLevel === 'full'}
                    onChange={(e) => setTrackingLevel(e.target.value as TrackingLevel)}
                    className="mt-1 text-purple-600"
                  />
                  <div>
                    <div className="text-white">Full</div>
                    <p className="text-sm text-gray-400">
                      Enable personalized recommendations and view history
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleSavePreferences}
          disabled={saving}
          className="mt-6 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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

      {/* Data Management */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-medium text-white mb-4">Your Data</h3>
        
        <div className="space-y-4">
          {/* Export Data */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-medium">Export My Data</h4>
              <p className="text-sm text-gray-400 mt-1">
                Download all your GameVault data in JSON format
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {/* Delete Data */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div>
              <h4 className="text-white font-medium">Delete Tracking Data</h4>
              <p className="text-sm text-gray-400 mt-1">
                Remove all your tracking data. Reviews and comments will be anonymized.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>

          {/* Consent History */}
          <div className="pt-4 border-t border-gray-700">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showHistory ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showHistory ? 'Hide' : 'Show'} Consent History
            </button>
            
            {showHistory && consentHistory.length > 0 && (
              <div className="mt-4 space-y-2">
                {consentHistory.slice(0, 5).map((item, index) => (
                  <div key={index} className="text-sm text-gray-400">
                    <span className="text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                    {' - '}
                    <span className="text-gray-300">
                      {item.action.replace('_', ' ').charAt(0).toUpperCase() + item.action.slice(1).replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Retention Info */}
      <div className="bg-blue-900/20 border border-blue-800/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="text-sm">
            <p className="text-blue-300 font-medium mb-2">Data Retention Policy</p>
            <ul className="space-y-1 text-blue-200">
              <li>• Game view data is automatically deleted after 90 days</li>
              <li>• Aggregated metrics are kept for 180 days</li>
              <li>• We never store IP addresses, only country for legal compliance</li>
              <li>• You can request data deletion at any time</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4">Confirm Data Deletion</h3>
            <p className="text-gray-300 mb-6">
              This will permanently delete all your tracking data. Your reviews and comments will be anonymized but preserved. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteProcessing}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteData}
                disabled={deleteProcessing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleteProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete My Data
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};