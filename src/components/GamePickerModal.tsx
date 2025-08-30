import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Star, Gamepad2, BookOpen, Gift, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { igdbService } from '../services/igdbService';
import { collectionWishlistService } from '../services/collectionWishlistService';

interface Game {
  id: string;
  name: string;
  cover_url: string;
  genre: string;
  igdb_id?: number;
}

interface RatedGame {
  game: Game;
  rating: number;
}

export type GamePickerMode = 'top-games' | 'collection' | 'wishlist';

interface GamePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (gameId: string) => void;
  userId: string;
  excludeGameIds?: string[];
  title?: string;
  position?: number;
  mode?: GamePickerMode;
  onGameAdded?: (igdbId: number) => void;
}

export const GamePickerModal: React.FC<GamePickerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  userId,
  excludeGameIds = [],
  title,
  position,
  mode = 'top-games',
  onGameAdded
}) => {
  const [games, setGames] = useState<RatedGame[]>([]);
  const [igdbGames, setIgdbGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Force IGDB search mode for collection/wishlist
  const searchMode = mode === 'top-games' ? 'user-games' : 'igdb';
  const [addingGameId, setAddingGameId] = useState<number | null>(null);
  const [startedFinishedGames, setStartedFinishedGames] = useState<Set<number>>(new Set());


  // Fetch user's reviewed games (for top-games mode or when in user-games search mode)
  useEffect(() => {
    if (!isOpen || !userId) return;
    // Only fetch if in top-games mode or if in user-games search mode for collection/wishlist
    if (mode !== 'top-games' && searchMode !== 'user-games') return;

    const fetchGames = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // If in collection/wishlist mode, fetch started/finished games to exclude them
        let excludedIgdbIds = new Set<number>();
        if (mode === 'collection' || mode === 'wishlist') {
          const { data: progressData } = await supabase
            .from('game_progress')
            .select('game:game_id(igdb_id)')
            .eq('user_id', parseInt(userId))
            .or('started.eq.true,completed.eq.true');
          
          if (progressData) {
            progressData.forEach(item => {
              if (item.game?.igdb_id) {
                excludedIgdbIds.add(item.game.igdb_id);
              }
            });
            setStartedFinishedGames(excludedIgdbIds);
          }
        }
        
        // Build the query
        let query = supabase
          .from('rating')
          .select(`
            game:game_id (
              id,
              igdb_id,
              name,
              cover_url,
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
        
        console.log('[GamePickerModal] Raw API response:', data);
        console.log('[GamePickerModal] ExcludeGameIds:', excludeGameIds);
        console.log('[GamePickerModal] Mode:', mode);

        if (error) throw error;

        // Filter out any entries without game data and started/finished games
        const validGames = (data || [])
          .filter(item => {
            if (!item.game) return false;
            // For collection/wishlist mode, exclude started/finished games
            if ((mode === 'collection' || mode === 'wishlist') && item.game.igdb_id) {
              return !excludedIgdbIds.has(item.game.igdb_id);
            }
            return true;
          })
          .map(item => ({
            game: {
              id: item.game.id.toString(),
              igdb_id: item.game.igdb_id,
              name: item.game.name || 'Unknown Game',
              cover_url: item.game.cover_url || '/default-cover.png',
              genre: item.game.genre || ''
            },
            rating: item.rating
          }));

        console.log('[GamePickerModal] Valid games after filtering:', validGames);
        console.log('[GamePickerModal] Valid games count:', validGames.length);
        setGames(validGames);
      } catch (err) {
        console.error('Error fetching games:', err);
        setError('Failed to load games');
      } finally {
        console.log('[GamePickerModal] Setting loading to false');
        setLoading(false);
      }
    };

    fetchGames();
  }, [isOpen, userId, excludeGameIds, mode, searchMode]);

  // Search IGDB when in collection/wishlist mode
  useEffect(() => {
    if (!isOpen || searchMode !== 'igdb' || !searchQuery.trim()) {
      setIgdbGames([]);
      return;
    }

    const searchIGDB = async () => {
      setLoading(true);
      try {
        let results = await igdbService.searchGames(searchQuery, 20);
        
        // Filter out started/finished games if in collection/wishlist mode
        if (mode === 'collection' || mode === 'wishlist') {
          // Fetch started/finished games if not already loaded
          if (startedFinishedGames.size === 0) {
            const { data: progressData } = await supabase
              .from('game_progress')
              .select('game:game_id(igdb_id)')
              .eq('user_id', parseInt(userId))
              .or('started.eq.true,completed.eq.true');
            
            if (progressData) {
              const excludedIds = new Set<number>();
              progressData.forEach(item => {
                if (item.game?.igdb_id) {
                  excludedIds.add(item.game.igdb_id);
                }
              });
              setStartedFinishedGames(excludedIds);
              results = results.filter(game => !excludedIds.has(game.id));
            }
          } else {
            results = results.filter(game => !startedFinishedGames.has(game.id));
          }
        }
        
        setIgdbGames(results);
      } catch (err) {
        console.error('IGDB search error:', err);
        setError('Failed to search games');
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchIGDB, 300);
    return () => clearTimeout(debounceTimer);
  }, [isOpen, searchMode, searchQuery]);

  // Filter games based on search query
  const filteredGames = useMemo(() => {
    console.log('[GamePickerModal] Filtering - searchMode:', searchMode);
    console.log('[GamePickerModal] Filtering - games array:', games);
    console.log('[GamePickerModal] Filtering - searchQuery:', searchQuery);
    
    // Only filter user's reviewed games when in user-games search mode
    if (searchMode !== 'user-games') return [];
    if (!searchQuery.trim()) return games;
    
    const query = searchQuery.toLowerCase();
    return games.filter(({ game }) => 
      game.name.toLowerCase().includes(query) ||
      (game.genre && game.genre.toLowerCase().includes(query))
    );
  }, [games, searchQuery, searchMode]);

  // Handle game selection
  const handleSelect = (gameId: string) => {
    if (mode === 'top-games') {
      onSelect(gameId);
      onClose();
    }
  };

  // Handle adding game to collection/wishlist
  const handleAddGame = async (igdbId: number, gameData?: any) => {
    // Check if game is started/finished
    if (startedFinishedGames.has(igdbId)) {
      alert('This game has already been started or finished and cannot be added to collection or wishlist.');
      return;
    }
    
    setAddingGameId(igdbId);
    try {
      const gameInfo = gameData ? {
        name: gameData.name,
        cover_url: gameData.cover?.url?.replace('t_thumb', 't_cover_big'),
        genre: gameData.genres?.[0]?.name,
        release_date: gameData.first_release_date 
          ? new Date(gameData.first_release_date * 1000).toISOString()
          : undefined
      } : undefined;

      let result;
      if (mode === 'collection') {
        result = await collectionWishlistService.addToCollection(igdbId, gameInfo);
      } else if (mode === 'wishlist') {
        result = await collectionWishlistService.addToWishlist(igdbId, gameInfo);
      }

      if (result?.success) {
        onGameAdded?.(igdbId);
        // Remove the added game from the IGDB results
        setIgdbGames(prev => prev.filter(g => g.id !== igdbId));
      }
    } catch (err) {
      console.error('Error adding game:', err);
      setError('Failed to add game');
    } finally {
      setAddingGameId(null);
    }
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
      <div className="bg-gray-800 rounded-lg w-full max-h-[90vh] flex flex-col max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-2xl lg:max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {title || (
              mode === 'collection' ? 'Add to Collection' :
              mode === 'wishlist' ? 'Add to Wishlist' :
              `Select Game for Top 5${position ? ` - Position #${position}` : ''}`
            )}
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
              placeholder={
                mode === 'top-games'
                  ? 'Search by game title or genre...'
                  : 'Search for any game...'
              }
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Debug info - remove after fixing */}
          {console.log('[GamePickerModal] Render - loading:', loading)}
          {console.log('[GamePickerModal] Render - searchMode:', searchMode)}
          {console.log('[GamePickerModal] Render - filteredGames:', filteredGames)}
          {console.log('[GamePickerModal] Render - igdbGames:', igdbGames)}
          {/* Info message for collection/wishlist mode */}
          {(mode === 'collection' || mode === 'wishlist') && startedFinishedGames.size > 0 && (
            <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-300">
                Games you've already started or finished are not shown. They cannot be added to {mode === 'collection' ? 'your collection' : 'your wishlist'}.
              </p>
            </div>
          )}
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
          ) : (console.log('[GamePickerModal] Check render - searchMode:', searchMode, 'igdbGames:', igdbGames.length), searchMode === 'igdb' && igdbGames.length > 0) ? (
            /* IGDB Games Grid */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {igdbGames.map((game) => {
                const coverUrl = game.cover?.url?.replace('t_thumb', 't_cover_big') || '/default-cover.png';
                return (
                  <div
                    key={game.id}
                    className="bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
                  >
                    <div className="relative aspect-[3/4]">
                      <img
                        src={coverUrl}
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
                        {game.genres?.[0]?.name || 'Unknown Genre'}
                      </p>
                      
                      {game.first_release_date && (
                        <p className="text-gray-500 text-xs mb-3">
                          {new Date(game.first_release_date * 1000).getFullYear()}
                        </p>
                      )}
                      
                      <button
                        onClick={() => handleAddGame(game.id, game)}
                        disabled={addingGameId === game.id}
                        className="w-full py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {addingGameId === game.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            {mode === 'collection' ? <BookOpen className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                            Add to {mode === 'collection' ? 'Collection' : 'Wishlist'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (console.log('[GamePickerModal] Check render - user-games check, searchMode:', searchMode, 'filteredGames:', filteredGames.length), searchMode === 'user-games' && filteredGames.length > 0) ? (
            /* User's Reviewed Games Grid */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredGames.map(({ game, rating }) => (
                <div
                  key={game.id}
                  className="bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all"
                >
                  <div className="relative aspect-[3/4]">
                    <img
                      src={game.cover_url}
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
                      onClick={() => {
                        if (mode === 'top-games') {
                          handleSelect(game.id);
                        } else {
                          // For collection/wishlist mode with user games
                          const igdbId = game.igdb_id || parseInt(game.id);
                          handleAddGame(igdbId);
                        }
                      }}
                      disabled={mode !== 'top-games' && addingGameId === parseInt(game.id)}
                      className="w-full py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {mode === 'top-games' ? (
                        'Select'
                      ) : addingGameId === parseInt(game.id) ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Adding...
                        </>
                      ) : (
                        <>
                          {mode === 'collection' ? <BookOpen className="h-4 w-4" /> : <Gift className="h-4 w-4" />}
                          Add to {mode === 'collection' ? 'Collection' : 'Wishlist'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="text-center py-12">
              <Gamepad2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                {mode === 'top-games' ? (
                  searchQuery 
                    ? 'No games found matching your search'
                    : games.length === 0 
                      ? 'No reviewed games available to select'
                      : 'All your reviewed games are already in your Top 5'
                ) : (
                  searchQuery
                    ? 'No eligible games found. Try a different search.'
                    : 'Search for games to add (already started/finished games are excluded)'
                )}
              </p>
              {(mode === 'collection' || mode === 'wishlist') && startedFinishedGames.size > 0 && (
                <p className="text-xs text-gray-500 mt-2">
                  {startedFinishedGames.size} game{startedFinishedGames.size !== 1 ? 's' : ''} hidden (already started/finished)
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};