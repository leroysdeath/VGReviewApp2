import React, { useState, useEffect } from 'react';
import { Shield, X, Settings, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { privacyService, TrackingLevel } from '../../services/privacyService';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

export const PrivacyConsentBanner: React.FC = () => {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [trackingLevel, setTrackingLevel] = useState<TrackingLevel>('anonymous');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check if banner should be shown
    const shouldShow = privacyService.shouldShowConsentBanner();
    if (shouldShow) {
      // Small delay for better UX
      setTimeout(() => setIsVisible(true), 1000);
    }

    // Sync with database if user is authenticated
    if (user?.databaseId) {
      privacyService.syncConsentWithDatabase(user.databaseId);
    }
  }, [user]);

  const handleAcceptAll = async () => {
    setIsProcessing(true);
    try {
      const country = await privacyService.getUserCountry();
      await privacyService.saveConsent(
        {
          analyticsOptedIn: true,
          trackingLevel: 'full',
          ipCountry: country || undefined
        },
        user?.databaseId
      );
      
      privacyService.markConsentBannerShown();
      setShowSuccess(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 500);
    } catch (error) {
      console.error('Error saving consent:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAcceptEssential = async () => {
    setIsProcessing(true);
    try {
      const country = await privacyService.getUserCountry();
      await privacyService.saveConsent(
        {
          analyticsOptedIn: true,
          trackingLevel: 'anonymous',
          ipCountry: country || undefined
        },
        user?.databaseId
      );
      
      privacyService.markConsentBannerShown();
      setShowSuccess(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 500);
    } catch (error) {
      console.error('Error saving consent:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecline = async () => {
    setIsProcessing(true);
    try {
      await privacyService.saveConsent(
        {
          analyticsOptedIn: false,
          trackingLevel: 'none'
        },
        user?.databaseId
      );
      
      privacyService.markConsentBannerShown();
      setIsVisible(false);
    } catch (error) {
      console.error('Error saving consent:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCustomSave = async () => {
    setIsProcessing(true);
    try {
      const country = await privacyService.getUserCountry();
      await privacyService.saveConsent(
        {
          analyticsOptedIn: trackingLevel !== 'none',
          trackingLevel,
          ipCountry: country || undefined
        },
        user?.databaseId
      );
      
      privacyService.markConsentBannerShown();
      setShowSuccess(true);
      setTimeout(() => {
        setIsVisible(false);
      }, 500);
    } catch (error) {
      console.error('Error saving consent:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 sm:right-0 z-50 p-4 bg-gray-900/95 backdrop-blur-lg border-t border-gray-700 shadow-2xl animate-slide-up">
      <div className="max-w-7xl mx-auto sm:max-w-7xl max-w-xs">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-700 rounded-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-400" />
            <span className="text-green-300">Privacy preferences saved successfully!</span>
          </div>
        )}

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left: Message */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-6 w-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Your Privacy Matters</h3>
            </div>
            {/* Mobile: Each sentence on its own line */}
            <div className="text-gray-300 text-sm mb-2 sm:hidden">
              <p className="mb-1">We use minimal analytics.</p>
              <p className="mb-1">We never sell your data.</p>
              <p>You're always in control.</p>
            </div>
            {/* Desktop: Original paragraph */}
            <p className="text-gray-300 text-sm mb-2 hidden sm:block">
              We use minimal analytics to improve your experience. We never sell your data, and you're always in control.
            </p>
            {/* Mobile: Only Privacy Policy and No tracking */}
            <div className="flex items-center gap-4 text-xs text-gray-400 sm:hidden">
              <Link to="/privacy" className="hover:text-purple-400 transition-colors inline-flex items-center">
                Privacy Policy
              </Link>
              <span className="inline-flex items-center">•</span>
              <span className="inline-flex items-center">No tracking without consent</span>
            </div>
            {/* Desktop: All three items */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
              <Link to="/privacy" className="hover:text-purple-400 transition-colors inline-flex items-center">
                Privacy Policy
              </Link>
              <span className="inline-flex items-center">•</span>
              <span className="inline-flex items-center">Data retained for 90 days only</span>
              <span className="inline-flex items-center">•</span>
              <span className="inline-flex items-center">No tracking without consent</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            {/* Mobile order: Accept All, Accept Essential, Customize, X */}
            {/* Desktop order: Customize, Accept Essential, Accept All, X */}
            <button
              onClick={handleAcceptAll}
              disabled={isProcessing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium sm:hidden"
            >
              Accept All
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2 justify-center hidden sm:flex sm:order-1"
            >
              <Settings className="h-4 w-4" />
              Customize
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              onClick={handleAcceptEssential}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 text-sm font-medium sm:order-2"
            >
              Accept Essential
            </button>
            <button
              onClick={handleAcceptAll}
              disabled={isProcessing}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm font-medium hidden sm:block sm:order-3"
            >
              Accept All
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={isProcessing}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2 justify-center sm:hidden"
            >
              <Settings className="h-4 w-4" />
              Customize
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <button
              onClick={handleDecline}
              disabled={isProcessing}
              className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50 sm:order-4"
              aria-label="Decline all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Expanded Options */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-white font-medium mb-3">Choose your privacy level:</h4>
            
            <div className="space-y-3">
              {/* None */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="tracking"
                  value="none"
                  checked={trackingLevel === 'none'}
                  onChange={(e) => setTrackingLevel(e.target.value as TrackingLevel)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">No Tracking</span>
                    <span className="text-xs px-2 py-1 bg-red-900/50 text-red-300 rounded">Most Private</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    No analytics or tracking. You won't contribute to game popularity metrics.
                  </p>
                </div>
              </label>

              {/* Anonymous */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="tracking"
                  value="anonymous"
                  checked={trackingLevel === 'anonymous'}
                  onChange={(e) => setTrackingLevel(e.target.value as TrackingLevel)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Anonymous Analytics</span>
                    <span className="text-xs px-2 py-1 bg-yellow-900/50 text-yellow-300 rounded">Recommended</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Help improve GameVault with anonymous usage data. No personal information stored.
                  </p>
                </div>
              </label>

              {/* Full */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="tracking"
                  value="full"
                  checked={trackingLevel === 'full'}
                  onChange={(e) => setTrackingLevel(e.target.value as TrackingLevel)}
                  className="mt-1 text-purple-600 focus:ring-purple-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Personalized Experience</span>
                    <span className="text-xs px-2 py-1 bg-green-900/50 text-green-300 rounded">Full Features</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Get personalized recommendations and track your viewing history. Data linked to your account.
                  </p>
                </div>
              </label>
            </div>

            {/* Info Box */}
            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-300">
                  <p className="font-medium mb-1">What we track:</p>
                  <ul className="text-xs space-y-1 text-blue-200">
                    <li>• Game pages you view (not timestamps)</li>
                    <li>• Source of navigation (search, direct, etc.)</li>
                    <li>• Session identifier (hashed, not traceable)</li>
                    <li>• Country (for legal compliance only)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCustomSave}
                disabled={isProcessing}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-medium"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};