import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { MobileLandingPage } from '../components/mobile/MobileLandingPage';
import { MobileGameSearchPage } from '../components/mobile/MobileGameSearchPage';
import { MobileGamePage } from '../components/mobile/MobileGamePage';
import { MobileUserPage } from '../components/mobile/MobileUserPage';
import { MobileUserSearchPage } from '../components/mobile/MobileUserSearchPage';
import { MobileSearchResultsPage } from '../components/mobile/MobileSearchResultsPage';
import { MobileNavbar } from '../components/mobile/MobileNavbar';
import { MobileLoginModal } from '../components/mobile/MobileLoginModal';

const MobileWebsiteContent: React.FC = () => {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-900">
      <MobileNavbar onLoginClick={() => setIsLoginModalOpen(true)} />
      <Routes>
        <Route path="/" element={<MobileLandingPage />} />
        <Route path="/search" element={<MobileGameSearchPage />} />
        <Route path="/game/:id" element={<MobileGamePage />} />
        <Route path="/user/:id" element={<MobileUserPage />} />
        <Route path="/users" element={<MobileUserSearchPage />} />
        <Route path="/search-results" element={<MobileSearchResultsPage />} />
      </Routes>
      <MobileLoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
};

export const MobileWebsitePage: React.FC = () => {
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

          {/* Mobile Website Content */}
          <div className="h-full overflow-hidden">
            <MobileWebsiteContent />
          </div>
        </div>

        {/* iPhone 16 Home Indicator */}
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-white rounded-full opacity-60"></div>
      </div>

      {/* Device Info */}
      <div className="ml-8 mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">iPhone 16 Interactive Website</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Dimensions: 393px × 852px</p>
          <p>Fully interactive mobile experience</p>
          <p>Complete website navigation</p>
          <p>Touch-optimized interface</p>
        </div>
      </div>
    </div>
  );
};