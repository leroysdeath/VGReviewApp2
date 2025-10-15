import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/userService';
import { stateLogger } from '../utils/stateLogger';

export function StateRecoveryBanner() {
  const { user, dbUserId, requireDbUserId } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    // Show banner if authenticated but missing dbUserId after 5 seconds
    if (user && !dbUserId) {
      const timer = setTimeout(() => {
        setShowBanner(true);
        stateLogger.log('recovery_banner_shown', { userId: user.id });
      }, 5000); // Wait 5 seconds before showing

      return () => clearTimeout(timer);
    } else {
      setShowBanner(false);
    }
  }, [user, dbUserId]);

  const handleQuickFix = async () => {
    setRecovering(true);
    stateLogger.log('quick_recovery_start', {});

    try {
      // Clear caches
      if (userService.clearCache) {
        userService.clearCache();
      }

      // Force fetch dbUserId
      const userId = await requireDbUserId();

      if (userId) {
        stateLogger.log('quick_recovery_success', { dbUserId: userId });
        setShowBanner(false);
      } else {
        stateLogger.log('quick_recovery_failed_null', {});
        alert('Unable to load your profile. Please try the Full Reset option.');
      }
    } catch (error) {
      stateLogger.log('quick_recovery_error', { error: String(error) });
      alert('Recovery failed. Please try signing out and back in.');
    } finally {
      setRecovering(false);
    }
  };

  const handleFullReset = () => {
    if (!confirm('This will sign you out and clear all local data. Continue?')) {
      return;
    }

    stateLogger.log('full_reset_triggered', {});

    // Clear everything except sensitive auth data
    const keysToPreserve = ['sb-'];
    Object.keys(localStorage).forEach(key => {
      if (!keysToPreserve.some(preserve => key.startsWith(preserve))) {
        localStorage.removeItem(key);
      }
    });

    sessionStorage.clear();

    // Reload to fresh state
    window.location.href = '/';
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 shadow-xl z-40 max-w-md animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="text-yellow-600 text-2xl flex-shrink-0">⚠️</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Profile Loading Issue
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            We're having trouble loading your profile data. This is usually caused by cached information.
          </p>

          <div className="space-y-2 mb-3">
            <div className="text-xs text-gray-600 bg-yellow-100 p-2 rounded">
              <strong>Your account is safe.</strong> This is a temporary connection issue, not a data problem.
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleQuickFix}
              disabled={recovering}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {recovering ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Fixing...
                </span>
              ) : (
                'Quick Fix'
              )}
            </button>

            <button
              onClick={handleFullReset}
              disabled={recovering}
              className="flex-1 bg-gray-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition"
            >
              Full Reset
            </button>
          </div>

          <button
            onClick={() => setShowBanner(false)}
            className="mt-2 text-gray-600 hover:text-gray-800 text-xs underline w-full text-center"
          >
            Dismiss for now
          </button>
        </div>
      </div>
    </div>
  );
}
