import React, { useState, useEffect } from 'react';
import { BookOpen, Gift, Plus, X } from 'lucide-react';
import { collectionWishlistService } from '../../services/collectionWishlistService';
import { Link } from 'react-router-dom';
import { GamePickerModal } from '../GamePickerModal';
import { useAuth } from '../../hooks/useAuth';

interface PlaylistTabsProps {
  userId: string;
  isOwnProfile: boolean;
}

interface GameItem {
  id: number;
  igdb_id: number;
  added_at: string;
  priority?: number;
  notes?: string;
  game?: {
    id?: number;
    igdb_id?: number;
    name?: string;
    cover_url?: string;
    cover_url?: string;
    slug?: string;
  };
}

export const PlaylistTabs: React.FC<PlaylistTabsProps> = ({
  userId,
  isOwnProfile
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'collection' | 'wishlist'>('collection');
  const [collectionItems, setCollectionItems] = useState<GameItem[]>([]);
  const [wishlistItems, setWishlistItems] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'collection' | 'wishlist'>('collection');
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        console.error('Invalid userId:', userId);
        return;
      }

      const [collectionResult, wishlistResult] = await Promise.all([
        collectionWishlistService.getCollection(userIdNum),
        collectionWishlistService.getWishlist(userIdNum)
      ]);

      if (collectionResult.success && collectionResult.data) {
        setCollectionItems(collectionResult.data);
      }

      if (wishlistResult.success && wishlistResult.data) {
        setWishlistItems(wishlistResult.data);
      }
    } catch (error) {
      console.error('Error loading collection/wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromCollection = async (igdbId: number) => {
    setRemovingId(igdbId);
    const result = await collectionWishlistService.removeFromCollection(igdbId);
    if (result.success) {
      setCollectionItems(prev => prev.filter(item => item.igdb_id !== igdbId));
    }
    setRemovingId(null);
  };

  const handleRemoveFromWishlist = async (igdbId: number) => {
    setRemovingId(igdbId);
    const result = await collectionWishlistService.removeFromWishlist(igdbId);
    if (result.success) {
      setWishlistItems(prev => prev.filter(item => item.igdb_id !== igdbId));
    }
    setRemovingId(null);
  };

  const renderGameGrid = (items: GameItem[], type: 'collection' | 'wishlist') => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <div className="animate-pulse">
            <div className="w-16 h-16 bg-gray-700 rounded-full mx-auto mb-4"></div>
            <div className="h-6 bg-gray-700 rounded w-48 mx-auto mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-64 mx-auto"></div>
          </div>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            {type === 'collection' ? (
              <BookOpen className="h-8 w-8 text-gray-500" />
            ) : (
              <Gift className="h-8 w-8 text-gray-500" />
            )}
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            {type === 'collection' ? 'Game Collection' : 'Game Wishlist'}
          </h3>
          <p className="text-gray-400">
            {type === 'collection' 
              ? 'Your collected games will appear here'
              : 'Games you want to play will appear here'
            }
          </p>
          {isOwnProfile && (
            <button 
              onClick={() => {
                setPickerMode(type);
                setShowGamePicker(true);
              }}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4 inline mr-2" />
              Add Games
            </button>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.map((item) => {
          const gameSlug = item.game?.slug || `game-${item.igdb_id}`;
          const gameName = item.game?.name || 'Unknown Game';
          const coverUrl = item.game?.cover_url || '/default-cover.png';

          return (
            <div key={item.id} className="relative group">
              <Link 
                to={`/game/${gameSlug}`}
                className="block"
              >
                <div className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden">
                  <img
                    src={coverUrl}
                    alt={gameName}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = '/default-cover.png';
                    }}
                  />
                </div>
                <h3 className="mt-2 text-sm text-gray-300 line-clamp-2">
                  {gameName}
                </h3>
              </Link>
              
              {isOwnProfile && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (type === 'collection') {
                      handleRemoveFromCollection(item.igdb_id);
                    } else {
                      handleRemoveFromWishlist(item.igdb_id);
                    }
                  }}
                  disabled={removingId === item.igdb_id}
                  className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-70 rounded-full 
                           opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title={`Remove from ${type}`}
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              )}
            </div>
          );
        })}
        
        {isOwnProfile && (
          <div 
            onClick={() => {
              setPickerMode(type);
              setShowGamePicker(true);
            }}
            className="aspect-[3/4] bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer border-2 border-dashed border-gray-600"
          >
            <div className="text-center">
              <Plus className="h-8 w-8 text-gray-500 mx-auto mb-2" />
              <span className="text-sm text-gray-500">Add Games</span>
            </div>
          </div>
        )}
      </div>
    );
  };

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
      {activeSubTab === 'collection' && renderGameGrid(collectionItems, 'collection')}
      {activeSubTab === 'wishlist' && renderGameGrid(wishlistItems, 'wishlist')}
      
      {/* Game Picker Modal */}
      {showGamePicker && user && (
        <GamePickerModal
          isOpen={showGamePicker}
          onClose={() => setShowGamePicker(false)}
          onSelect={() => {}} // Not used in collection/wishlist mode
          userId={user.id.toString()}
          mode={pickerMode}
          onGameAdded={() => {
            // Reload the data after adding a game
            loadData();
          }}
        />
      )}
    </div>
  );
};