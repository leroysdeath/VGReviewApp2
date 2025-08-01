import React from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface MobilePreviewToggleProps {
  onViewChange: (forceMobileView: boolean) => void;
}

export const MobilePreviewToggle: React.FC<MobilePreviewToggleProps> = ({
  onViewChange
}) => {
  const [isMobilePreview, setIsMobilePreview] = React.useState(false);
  
  const handleToggle = (isMobile: boolean) => {
    setIsMobilePreview(isMobile);
    onViewChange(isMobile);
  };
  
  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
      <button
        onClick={() => handleToggle(false)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          !isMobilePreview
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        <Monitor className="h-4 w-4" />
        <span className="text-sm">Desktop</span>
      </button>
      <button
        onClick={() => handleToggle(true)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isMobilePreview
            ? 'bg-purple-600 text-white'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }`}
      >
        <Smartphone className="h-4 w-4" />
        <span className="text-sm">Mobile</span>
      </button>
    </div>
  );
};