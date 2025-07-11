import React from 'react';
import { Download, X, Smartphone } from 'lucide-react';
import { usePWA } from '../hooks/usePWA';

export const PWAInstallPrompt: React.FC = () => {
  const { showInstallPrompt, installApp, dismissInstallPrompt, isOnline } = usePWA();

  if (!showInstallPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 shadow-xl backdrop-blur-sm">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-game-purple rounded-lg flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm">Install GameVault</h3>
            <p className="text-gray-400 text-sm mt-1">
              Get the full app experience with offline access and faster loading.
            </p>
            
            <div className="flex space-x-2 mt-3">
              <button
                onClick={installApp}
                className="flex items-center space-x-2 bg-game-purple hover:bg-game-purple/90 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-target"
              >
                <Download className="h-4 w-4" />
                <span>Install</span>
              </button>
              
              <button
                onClick={dismissInstallPrompt}
                className="text-gray-400 hover:text-white px-3 py-2 rounded-lg text-sm transition-colors touch-target"
              >
                Not now
              </button>
            </div>
          </div>
          
          <button
            onClick={dismissInstallPrompt}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors touch-target p-1"
            aria-label="Close install prompt"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const OfflineIndicator: React.FC = () => {
  const { isOnline } = usePWA();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-40 md:left-auto md:right-4 md:max-w-sm">
      <div className="bg-game-orange text-white p-3 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-medium">You're offline</span>
        </div>
        <p className="text-sm opacity-90 mt-1">
          Some features may be limited. We'll sync when you're back online.
        </p>
      </div>
    </div>
  );
};