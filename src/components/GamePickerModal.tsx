import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Star, Gamepad2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface Game {
  id: string;
  name: string;
  pic_url: string;
  genre: string;
}

interface RatedGame {
  game: Game;
  rating: number;
}

interface GamePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gameId: string) => void;
  userId: string;
  excludeGameIds?: string[];
  title?: string;
  position?: number;
}

export const GamePickerModal: React.FC<GamePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  userId,
  excludeGameIds = [],
  title,
  position
}) => {
  const [games, setGames] = useState<RatedGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch user's reviewed games
  useEffect(() => {
    if (!isOpen || !userId) return;

    const fetchGames = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Build the query
        let query = supabase
          .from('rating')
          .select(`
            game:game_id (
              id,
              name,
              pic_url,
              genre
            ),
            rating
          `)
          .eq('user_id', parseInt(userId))
          .not('rating', 'is', null)
          .order('rating', { ascending: false });

        // Exclude already selected games if any
        if (excludeGameIds.length > 0) {
          query = query.not('game_id', 'in', `(${excludeGameIds.join(',')})`);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Filter out any entries without game data
        const validGames = (data || [])
          .filter(item => item.game)
          .map(item => ({
            game: {
              id: item.game.id.toString(),
              name: item.game.name || 'Unknown Game',
              pic_url: item.game.pic_url || '/default-cover.png',
              genre: item.game.genre || ''
            },
            rating: item.rating
          }));

        setGames(validGames);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError('Failed to load games');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, [isOpen, userId, excludeGameIds]);

  // Filter games based on search query
  const filteredGames = useMemo(() => {
    if (!searchQuery.trim()) return games;
    
    const query = searchQuery.toLowerCase();
    return games.filter(({ game }) => 
      game.name.toLowerCase().includes(query) ||
      game.genre.toLowerCase().includes(query)
    );
  }, [games, searchQuery]);

  // Handle game selection
  const handleSelect = (gameId: string) => {
    onSelect(gameId);
    onClose();
  };

  // Render star rating
  const renderRating = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-3 w-3 ${
              i < fullStars 
                ? 'fill-yellow-500 text-yellow-500' 
                : hasHalfStar && i === fullStars
                ? 'fill-yellow-500/50 text-yellow-500'
                : 'text-gray-600'
            }`}
          />
        ))}
        <span className="text-xs text-gray-400 ml-1">({rating})</span>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-h-[90vh] flex flex-col max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {title || `Select Game for Top 5${position ? ` - Position #${position}` : ''}`}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by game title or genre..."
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            /* Loading State */
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : filteredGames.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <Gamepad2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {searchQuery 
                  ? 'No games found matching your search'
                  : games.length === 0 
                    ? 'No reviewed games available to select'
                    : 'All your reviewed games are already in your Top 5'
                }
              </p>
            </div>
          ) : (
            /* Games Grid */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredGames.map(({ game, rating }) => (
                <div
                  key={game.id}
                  className="bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
                >
                  <div className="relative aspect-[3/4]">
                    <img
                      src={game.pic_url}
                      alt={game.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/default-cover.png';
                      }}
                    />
                  </div>
                  
                  <div className="p-3">
                    <h3 className="text-white font-medium text-sm line-clamp-2 mb-1">
                      {game.name}
                    </h3>
                    
                    <p className="text-gray-400 text-xs mb-2 line-clamp-1">
                      {game.genre || 'Unknown Genre'}
                    </p>
                    
                    <div className="mb-3">
                      {renderRating(rating)}
                    </div>
                    
                    <button
                      onClick={() => handleSelect(game.id)}
                      className="w-full py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                    >
                      Select
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};