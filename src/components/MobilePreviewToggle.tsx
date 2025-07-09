import React, { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';

interface MobilePreviewToggleProps {
  onViewChange: (isMobileView: boolean) => void;
}

export const MobilePreviewToggle: React.FC<MobilePreviewToggleProps> = ({ onViewChange }) => {
  const [isMobileView, setIsMobileView] = useState(false);

  const handleToggle = (mobileView: boolean) => {
    setIsMobileView(mobileView);
    onViewChange(mobileView);
  };

  return (
    <div className="fixed top-20 right-4 z-50 bg-gray-800 border border-gray-600 rounded-lg p-2 shadow-lg">
      <div className="flex items-center gap-2">
        <span className="text-gray-300 text-sm font-medium">Preview:</span>
        <div className="flex bg-gray-700 rounded-md p-1">
          <button
            onClick={() => handleToggle(false)}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
              !isMobileView 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Monitor className="h-4 w-4" />
            Desktop
          </button>
          <button
            onClick={() => handleToggle(true)}
            className={`flex items-center gap-1 px-3 py-1 rounded text-sm transition-colors ${
              isMobileView 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-300 hover:text-white'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            Mobile
          </button>
        </div>
      </div>
    </div>
  );
};