import React from 'react';
import { MobileUserPage } from '../components/mobile/MobileUserPage';

export const MobileUserPreview: React.FC = () => {
  return (
    <div className="flex justify-center items-start min-h-screen bg-gray-100 p-4">
      {/* iPhone 16 Frame */}
      <div className="relative bg-black rounded-[3rem] p-2 shadow-2xl">
        {/* iPhone 16 Screen */}
        <div 
          className="bg-gray-900 rounded-[2.5rem] overflow-hidden relative"
          style={{ width: '393px', height: '852px' }}
        >
          {/* Status Bar */}
          <div className="bg-gray-900 h-12 flex items-center justify-between px-6 text-white text-sm font-medium z-50 relative">
            <span>9:41</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-2 border border-white rounded-sm">
                <div className="w-3 h-1 bg-white rounded-sm m-0.5"></div>
              </div>
            </div>
          </div>

          {/* Mobile Navbar */}
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 bg-purple-400 rounded"></div>
                <span className="text-lg font-bold text-white">GameVault</span>
              </div>
              <div className="h-6 w-6 bg-gray-600 rounded"></div>
            </div>
          </div>

          {/* Mobile User Page Content */}
          <div className="h-full overflow-y-auto">
            <MobileUserPage />
          </div>
        </div>

        {/* iPhone 16 Home Indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full opacity-60"></div>
      </div>

      {/* Device Info */}
      <div className="ml-8 mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">iPhone 16 - Mobile User Page</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Dimensions: 393px × 852px</p>
          <p>Mobile-optimized user profile</p>
          <p>Reordered layout sections:</p>
          <div className="ml-4 space-y-1">
            <p>1. Profile Info (top)</p>
            <p>2. Profile Data (middle)</p>
            <p>3. Profile Details (bottom)</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">Layout Changes:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Profile info moved to top section</li>
            <li>• Profile data in scrollable middle</li>
            <li>• Stats moved to bottom section</li>
            <li>• Enhanced mobile navigation</li>
            <li>• Touch-optimized interface</li>
            <li>• Sticky tab navigation</li>
          </ul>
        </div>
      </div>
    </div>
  );
};