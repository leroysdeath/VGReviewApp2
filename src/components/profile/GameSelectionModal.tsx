import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, TrendingUp, TrendingDown, Clock, History, Check } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useResponsive } from '../../hooks/useResponsive';

interface Game {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCover: string;
  rating: number;
  reviewText: string;
  postDate: string;
}

interface GameSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (game: Game) => void;
  userId: string;
  selectedGameIds: string[];
  slotPosition: number;
}

export const GameSelectionModal: React.FC<GameSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectGame,
  userId,
  selectedGameIds,
  slotPosition
}) => {
  const [activeTab, setActiveTab] = useState<'highest' | 'lowest' | 'recent' | 'oldest'>('highest');
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isMobile } = useResponsive();

  // Load games based on active tab
  const loadGames = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('rating')
        .select(`
          id,
          rating,
          review,
          post_date_time,
          game:game_id (
            id,
            name,
            pic_url
          )
        `)
        .eq('user_id', parseInt(userId))
        .not('review', 'is', null)
        .not('review', 'eq', '');

      // Apply sorting based on active tab
      switch (activeTab) {
        case 'highest':
          query = query.order('rating', { ascending: false });
          break;
        case 'lowest':
          query = query.order('rating', { ascending: true });
          break;
        case 'recent':
          query = query.order('post_date_time', { ascending: false });
          break;
        case 'oldest':
          query = query.order('post_date_time', { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      const gamesData = (data || [])
        .filter(item => item.game && item.review)
        .map(item => ({
          id: item.id.toString(),
          gameId: item.game.id.toString(),
          gameTitle: item.game.name || 'Unknown Game',
          gameCover: item.game.pic_url || '/default-cover.png',
          rating: item.rating || 0,
          reviewText: item.review,
          postDate: item.post_date_time
        }));

      setGames(gamesData);
    } catch (error) {
      console.error('Error loading games:', error);
      setError('Failed to load games');
      setGames([]);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab]);

  // Load data when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      loadGames();
    }
  }, [isOpen, activeTab, loadGames]);

  if (!isOpen) return null;

  const handleGameSelect = (game: Game) => {
    onSelectGame(game);
    onClose();
  };

  const isGameSelected = (gameId: string) => selectedGameIds.includes(gameId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-800 rounded-lg w-full max-h-[90vh] flex flex-col ${
        isMobile ? 'max-w-sm' : 'max-w-4xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Select Game for Position {slotPosition}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('highest')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'highest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className={isMobile ? 'text-sm' : ''}>Highest Rating</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('lowest')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'lowest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="h-4 w-4" />
              <span className={isMobile ? 'text-sm' : ''}>Lowest Rating</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'recent'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={isMobile ? 'text-sm' : ''}>Recent</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('oldest')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'oldest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <History className="h-4 w-4" />
              <span className={isMobile ? 'text-sm' : ''}>Oldest</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                <p className="text-red-300 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : games.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No reviewed games found</p>
            </div>
          ) : (
            /* Games Grid */
            <div className={`grid gap-4 ${
              isMobile ? 'grid-cols-2' : 'grid-cols-4'
            }`}>
              {games.map((game) => {
                const isSelected = isGameSelected(game.gameId);
                return (
                  <button
                    key={game.id}
                    onClick={() => !isSelected && handleGameSelect(game)}
                    disabled={isSelected}
                    className={`relative group transition-all ${
                      isSelected 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'hover:scale-105 cursor-pointer'
                    }`}
                  >
                    <div className="relative">
                      <img
                        src={game.gameCover}
                        alt={game.gameTitle}
                        className="w-full aspect-[3/4] object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = '/default-cover.png';
                        }}
                      />
                      
                      {/* Already Selected Indicator */}
                      {isSelected && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 rounded flex items-center justify-center">
                          <div className="bg-green-600 text-white p-2 rounded-full">
                            <Check className="h-6 w-6" />
                          </div>
                        </div>
                      )}
                      
                      {/* Rating Badge */}
                      <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-90 text-white px-2 py-1 rounded-full flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-xs font-bold">{game.rating}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <h3 className={`text-sm font-medium line-clamp-2 ${
                        isSelected ? 'text-gray-500' : 'text-white group-hover:text-purple-400'
                      } transition-colors`}>
                        {game.gameTitle}
                      </h3>
                      {isSelected && (
                        <p className="text-xs text-green-500 mt-1">Already in Top 5</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
