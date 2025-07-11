import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Bell, BellOff, DollarSign, Calendar, Star, ArrowDown, ArrowUp, X } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { LazyImage } from './LazyImage';
import { Game } from '../services/igdbApi';
import { useResponsive } from '../hooks/useResponsive';

interface WishlistGame extends Game {
  addedAt: string;
  priceAlert?: number;
  releaseAlert?: boolean;
  notes?: string;
}

interface GameWishlistProps {
  onRemoveFromWishlist?: (gameId: string) => void;
  onSetPriceAlert?: (gameId: string, price: number | null) => void;
  onSetReleaseAlert?: (gameId: string, enabled: boolean) => void;
  onSaveNotes?: (gameId: string, notes: string) => void;
  className?: string;
}

export const GameWishlist: React.FC<GameWishlistProps> = ({
  onRemoveFromWishlist,
  onSetPriceAlert,
  onSetReleaseAlert,
  onSaveNotes,
  className = '',
}) => {
  const [wishlistGames, setWishlistGames] = useState<WishlistGame[]>([]);
  const [sortBy, setSortBy] = useState<'added' | 'name' | 'rating' | 'release'>('added');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const { isMobile } = useResponsive();

  // Load wishlist from localStorage on mount
  useEffect(() => {
    const loadWishlist = () => {
      try {
        const storedWishlist = localStorage.getItem('gameWishlist');
        if (storedWishlist) {
          const parsedWishlist = JSON.parse(storedWishlist);
          setWishlistGames(parsedWishlist);
        }
      } catch (error) {
        console.error('Error loading wishlist:', error);
      }
    };
    
    loadWishlist();
    
    // Add event listener for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'gameWishlist') {
        loadWishlist();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Save wishlist to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('gameWishlist', JSON.stringify(wishlistGames));
    } catch (error) {
      console.error('Error saving wishlist:', error);
    }
  }, [wishlistGames]);

  // Handle drag and drop reordering
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    const items = Array.from(wishlistGames);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setWishlistGames(items);
  };

  // Remove game from wishlist
  const removeFromWishlist = (gameId: string) => {
    setWishlistGames(prev => prev.filter(game => game.id !== gameId));
    
    if (onRemoveFromWishlist) {
      onRemoveFromWishlist(gameId);
    }
  };

  // Set price alert
  const setPriceAlert = (gameId: string, price: number | null) => {
    setWishlistGames(prev => 
      prev.map(game => 
        game.id === gameId
          ? { ...game, priceAlert: price }
          : game
      )
    );
    
    if (onSetPriceAlert) {
      onSetPriceAlert(gameId, price);
    }
  };

  // Toggle release alert
  const toggleReleaseAlert = (gameId: string) => {
    setWishlistGames(prev => 
      prev.map(game => {
        if (game.id === gameId) {
          const newValue = !game.releaseAlert;
          
          if (onSetReleaseAlert) {
            onSetReleaseAlert(gameId, newValue);
          }
          
          return { ...game, releaseAlert: newValue };
        }
        return game;
      })
    );
  };

  // Start editing notes
  const startEditingNotes = (gameId: string, currentNotes?: string) => {
    setEditingNotes(gameId);
    setNoteText(currentNotes || '');
  };

  // Save notes
  const saveNotes = (gameId: string) => {
    setWishlistGames(prev => 
      prev.map(game => 
        game.id === gameId
          ? { ...game, notes: noteText }
          : game
      )
    );
    
    if (onSaveNotes) {
      onSaveNotes(gameId, noteText);
    }
    
    setEditingNotes(null);
  };

  // Toggle sort direction
  const toggleSort = (sortType: 'added' | 'name' | 'rating' | 'release') => {
    if (sortBy === sortType) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(sortType);
      setSortDirection('desc');
    }
  };

  // Sort wishlist games
  const sortedGames = [...wishlistGames].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'added':
        comparison = new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
        break;
      case 'name':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'rating':
        comparison = a.rating - b.rating;
        break;
      case 'release':
        comparison = new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
        break;
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Empty state
  if (wishlistGames.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <Heart className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Your wishlist is empty</h3>
        <p className="text-gray-400 mb-4">
          Add games to your wishlist to keep track of titles you're interested in
        </p>
        <Link
          to="/search"
          className="inline-flex items-center gap-2 px-4 py-2 bg-game-purple text-white rounded-lg hover:bg-game-purple/90 transition-colors"
        >
          Discover Games
        </Link>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500 fill-current" />
            My Wishlist ({wishlistGames.length})
          </h3>
          
          <div className="relative">
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [newSortBy, newSortDirection] = e.target.value.split('-') as [
                  'added' | 'name' | 'rating' | 'release',
                  'asc' | 'desc'
                ];
                setSortBy(newSortBy);
                setSortDirection(newSortDirection);
              }}
              className="appearance-none bg-gray-700 text-white px-3 py-2 pr-8 rounded-lg text-sm focus:outline-none focus:border-game-purple"
            >
              <option value="added-desc">Recently Added</option>
              <option value="added-asc">Oldest Added</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="rating-desc">Highest Rated</option>
              <option value="rating-asc">Lowest Rated</option>
              <option value="release-desc">Newest Releases</option>
              <option value="release-asc">Oldest Releases</option>
            </select>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <ArrowDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          {sortedGames.map((game) => (
            <div
              key={game.id}
              className="bg-gray-700 rounded-lg overflow-hidden"
            >
              <div className="flex gap-3 p-3">
                <Link
                  to={`/game/${game.id}`}
                  className="w-16 h-20 bg-gray-600 rounded overflow-hidden flex-shrink-0"
                >
                  {game.coverImage && (
                    <LazyImage
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </Link>
                
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/game/${game.id}`}
                    className="font-medium text-white hover:text-game-purple transition-colors line-clamp-1"
                  >
                    {game.title}
                  </Link>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span>{game.rating.toFixed(1)}</span>
                    </div>
                    <span>{game.genre}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(game.releaseDate)}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => toggleReleaseAlert(game.id)}
                      className={`p-1.5 rounded-full ${
                        game.releaseAlert
                          ? 'bg-game-green/20 text-game-green'
                          : 'bg-gray-600 text-gray-400'
                      }`}
                      aria-label={game.releaseAlert ? 'Disable release alert' : 'Enable release alert'}
                      title={game.releaseAlert ? 'Release alert enabled' : 'Set release alert'}
                    >
                      {game.releaseAlert ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                    </button>
                    
                    <button
                      onClick={() => removeFromWishlist(game.id)}
                      className="p-1.5 bg-gray-600 text-gray-400 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"
                      aria-label="Remove from wishlist"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Notes section */}
              {(editingNotes === game.id || game.notes) && (
                <div className="p-3 border-t border-gray-600">
                  {editingNotes === game.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add notes about this game..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-game-purple"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-500 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => saveNotes(game.id)}
                          className="px-3 py-1 bg-game-purple text-white rounded-lg text-sm hover:bg-game-purple/90 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative group">
                      <p className="text-sm text-gray-300">{game.notes}</p>
                      <button
                        onClick={() => startEditingNotes(game.id, game.notes)}
                        className="absolute top-0 right-0 p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Edit notes"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {editingNotes !== game.id && !game.notes && (
                <button
                  onClick={() => startEditingNotes(game.id)}
                  className="w-full p-2 border-t border-gray-600 text-sm text-gray-400 hover:text-white transition-colors text-center"
                >
                  Add notes...
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop layout with drag and drop
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Heart className="h-5 w-5 text-red-500 fill-current" />
          My Wishlist ({wishlistGames.length})
        </h2>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-400">
            Drag and drop to reorder
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">Sort by:</span>
            <div className="flex bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => toggleSort('added')}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                  sortBy === 'added'
                    ? 'bg-game-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Added
                {sortBy === 'added' && (
                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </button>
              
              <button
                onClick={() => toggleSort('name')}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                  sortBy === 'name'
                    ? 'bg-game-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Name
                {sortBy === 'name' && (
                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </button>
              
              <button
                onClick={() => toggleSort('rating')}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                  sortBy === 'rating'
                    ? 'bg-game-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Rating
                {sortBy === 'rating' && (
                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </button>
              
              <button
                onClick={() => toggleSort('release')}
                className={`px-3 py-1 rounded text-sm flex items-center gap-1 ${
                  sortBy === 'release'
                    ? 'bg-game-purple text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Release
                {sortBy === 'release' && (
                  sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="wishlist">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-3"
            >
              {sortedGames.map((game, index) => (
                <Draggable key={game.id} draggableId={game.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`bg-gray-700 rounded-lg overflow-hidden ${
                        snapshot.isDragging ? 'shadow-xl ring-2 ring-game-purple' : ''
                      }`}
                    >
                      <div className="flex">
                        {/* Drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className="w-10 flex-shrink-0 flex items-center justify-center bg-gray-600 text-gray-400 hover:text-white cursor-grab active:cursor-grabbing"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="9" cy="12" r="1" />
                            <circle cx="9" cy="5" r="1" />
                            <circle cx="9" cy="19" r="1" />
                            <circle cx="15" cy="12" r="1" />
                            <circle cx="15" cy="5" r="1" />
                            <circle cx="15" cy="19" r="1" />
                          </svg>
                        </div>
                        
                        {/* Game info */}
                        <div className="flex flex-1 p-4">
                          <Link
                            to={`/game/${game.id}`}
                            className="w-20 h-28 bg-gray-600 rounded overflow-hidden flex-shrink-0"
                          >
                            {game.coverImage && (
                              <LazyImage
                                src={game.coverImage}
                                alt={game.title}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </Link>
                          
                          <div className="flex-1 ml-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <Link
                                  to={`/game/${game.id}`}
                                  className="font-medium text-white hover:text-game-purple transition-colors"
                                >
                                  {game.title}
                                </Link>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                                  <div className="flex items-center gap-1">
                                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                    <span>{game.rating.toFixed(1)}</span>
                                  </div>
                                  <span>{game.genre}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => toggleReleaseAlert(game.id)}
                                  className={`p-2 rounded-full ${
                                    game.releaseAlert
                                      ? 'bg-game-green/20 text-game-green'
                                      : 'bg-gray-600 text-gray-400 hover:text-white hover:bg-gray-500'
                                  } transition-colors`}
                                  aria-label={game.releaseAlert ? 'Disable release alert' : 'Enable release alert'}
                                  title={game.releaseAlert ? 'Release alert enabled' : 'Set release alert'}
                                >
                                  {game.releaseAlert ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                                </button>
                                
                                <div className="relative group">
                                  <button
                                    className={`p-2 rounded-full ${
                                      game.priceAlert
                                        ? 'bg-game-green/20 text-game-green'
                                        : 'bg-gray-600 text-gray-400 hover:text-white hover:bg-gray-500'
                                    } transition-colors`}
                                    aria-label={game.priceAlert ? `Price alert: $${game.priceAlert}` : 'Set price alert'}
                                    title={game.priceAlert ? `Price alert: $${game.priceAlert}` : 'Set price alert'}
                                  >
                                    <DollarSign className="h-4 w-4" />
                                  </button>
                                  
                                  <div className="absolute right-0 top-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 w-48 z-10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                                    <div className="text-sm text-white mb-2">Price alert</div>
                                    <div className="flex gap-2">
                                      {[20, 30, 40, 50].map(price => (
                                        <button
                                          key={price}
                                          onClick={() => setPriceAlert(game.id, price)}
                                          className={`flex-1 p-1 rounded text-xs ${
                                            game.priceAlert === price
                                              ? 'bg-game-green text-white'
                                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                          }`}
                                        >
                                          ${price}
                                        </button>
                                      ))}
                                    </div>
                                    <button
                                      onClick={() => setPriceAlert(game.id, null)}
                                      className="w-full mt-2 p-1 text-xs text-gray-400 hover:text-white"
                                    >
                                      Clear alert
                                    </button>
                                  </div>
                                </div>
                                
                                <button
                                  onClick={() => removeFromWishlist(game.id)}
                                  className="p-2 bg-gray-600 text-gray-400 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors"
                                  aria-label="Remove from wishlist"
                                  title="Remove from wishlist"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="mt-2 flex flex-wrap gap-3 text-sm">
                              <div className="flex items-center gap-1 text-gray-400">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDate(game.releaseDate)}</span>
                              </div>
                              
                              <div className="flex items-center gap-1 text-gray-400">
                                <Heart className="h-4 w-4" />
                                <span>Added {formatDate(game.addedAt)}</span>
                              </div>
                            </div>
                            
                            {/* Notes section */}
                            {editingNotes === game.id ? (
                              <div className="mt-3 space-y-2">
                                <textarea
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  placeholder="Add notes about this game..."
                                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:border-game-purple"
                                  rows={3}
                                />
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setEditingNotes(null)}
                                    className="px-3 py-1 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-500 transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() => saveNotes(game.id)}
                                    className="px-3 py-1 bg-game-purple text-white rounded-lg text-sm hover:bg-game-purple/90 transition-colors"
                                  >
                                    Save
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {game.notes ? (
                                  <div className="mt-3 relative group">
                                    <p className="text-sm text-gray-300 bg-gray-750 p-2 rounded">{game.notes}</p>
                                    <button
                                      onClick={() => startEditingNotes(game.id, game.notes)}
                                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                      aria-label="Edit notes"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                      </svg>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => startEditingNotes(game.id)}
                                    className="mt-3 text-sm text-gray-400 hover:text-white transition-colors"
                                  >
                                    Add notes...
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

// Helper function to add a game to wishlist
export const addGameToWishlist = (game: Game) => {
  try {
    // Get existing wishlist
    const storedWishlist = localStorage.getItem('gameWishlist');
    let wishlist: WishlistGame[] = [];
    
    if (storedWishlist) {
      wishlist = JSON.parse(storedWishlist);
    }
    
    // Check if game is already in wishlist
    if (wishlist.some(g => g.id === game.id)) {
      return false; // Game already in wishlist
    }
    
    // Add the game to the beginning of the array with current timestamp
    wishlist.unshift({
      ...game,
      addedAt: new Date().toISOString(),
      releaseAlert: false
    });
    
    // Save to localStorage
    localStorage.setItem('gameWishlist', JSON.stringify(wishlist));
    
    // Dispatch storage event for multi-tab support
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'gameWishlist',
      newValue: JSON.stringify(wishlist)
    }));
    
    return true; // Successfully added
  } catch (error) {
    console.error('Error adding game to wishlist:', error);
    return false;
  }
};

// Helper function to check if a game is in wishlist
export const isGameInWishlist = (gameId: string): boolean => {
  try {
    const storedWishlist = localStorage.getItem('gameWishlist');
    if (!storedWishlist) return false;
    
    const wishlist: WishlistGame[] = JSON.parse(storedWishlist);
    return wishlist.some(game => game.id === gameId);
  } catch (error) {
    console.error('Error checking if game is in wishlist:', error);
    return false;
  }
};

// Helper function to remove a game from wishlist
export const removeGameFromWishlist = (gameId: string): boolean => {
  try {
    const storedWishlist = localStorage.getItem('gameWishlist');
    if (!storedWishlist) return false;
    
    let wishlist: WishlistGame[] = JSON.parse(storedWishlist);
    
    // Check if game is in wishlist
    if (!wishlist.some(g => g.id === gameId)) {
      return false; // Game not in wishlist
    }
    
    // Remove the game
    wishlist = wishlist.filter(game => game.id !== gameId);
    
    // Save to localStorage
    localStorage.setItem('gameWishlist', JSON.stringify(wishlist));
    
    // Dispatch storage event for multi-tab support
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'gameWishlist',
      newValue: JSON.stringify(wishlist)
    }));
    
    return true; // Successfully removed
  } catch (error) {
    console.error('Error removing game from wishlist:', error);
    return false;
  }
};

// Helper function to toggle a game in wishlist
export const toggleGameInWishlist = (game: Game): boolean => {
  if (isGameInWishlist(game.id)) {
    return removeGameFromWishlist(game.id);
  } else {
    return addGameToWishlist(game);
  }
};