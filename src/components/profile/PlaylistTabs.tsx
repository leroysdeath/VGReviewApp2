import React, { useState } from 'react';
import { BookOpen, Gift } from 'lucide-react';

interface PlaylistTabsProps {
  userId: string;
  isOwnProfile: boolean;
}

export const PlaylistTabs: React.FC<PlaylistTabsProps> = ({
  userId,
  isOwnProfile
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'collection' | 'wishlist'>('collection');

  return (
    <div>
      {/* Sub-tab Navigation */}
      <div className="flex justify-center gap-6 mb-6 border-b border-gray-700">
        <button
          onClick={() => setActiveSubTab('collection')}
          className={`pb-3 px-1 transition-colors ${
            activeSubTab === 'collection' 
              ? 'border-b-2 border-purple-600 text-white' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Collection
        </button>
        <button
          onClick={() => setActiveSubTab('wishlist')}
          className={`pb-3 px-1 transition-colors ${
            activeSubTab === 'wishlist' 
              ? 'border-b-2 border-purple-600 text-white' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Wishlist
        </button>
      </div>

      {/* Sub-tab Content */}
      {activeSubTab === 'collection' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Game Collection</h3>
          <p className="text-gray-400">
            Your collected games will appear here
          </p>
        </div>
      )}

      {activeSubTab === 'wishlist' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Game Wishlist</h3>
          <p className="text-gray-400">
            Games you want to play will appear here
          </p>
        </div>
      )}
    </div>
  );
};