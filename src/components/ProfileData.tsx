import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StarRating } from './StarRating';
import { Calendar, ListMusic, Star, Plus, X } from 'lucide-react';
import { supabase } from '../services/supabase';
import { GamePickerModal } from './GamePickerModal';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getGameUrl } from '../utils/gameUrls';

interface Game {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  rating: number;
  description: string;
  developer: string;
  publisher: string;
  hasGameData?: boolean;
  dbId?: string;
}

interface TopGame {
  id: number;
  igdb_id?: number;
  slug?: string;
  name: string;
  cover_url: string;
  genre: string;
  rating: number;
}

interface UserTopGame {
  position: number;
  game: {
    id: number;
    igdb_id?: number;
    slug?: string;
    name: string;
    cover_url: string;
    genre?: string;
  } | null;
}

interface Review {
  id: string;
  userId: string;
  gameId: string;
  rating: number;
  text: string;
  date: string;
  hasText: boolean;
  author: string;
  authorAvatar: string;
}

interface ProfileDataProps {
  activeTab: 'top5' | 'top10' | 'reviews' | 'activity';
  allGames: Game[]; // Keep for other tabs that still need it (temporary)
  sortedReviews: Review[];
  reviewFilter: string;
  onReviewFilterChange: (filter: string) => void;
  isDummy?: boolean;
  userId: string; // Required for direct fetching
  isOwnProfile?: boolean;
}

// Reusable GameCard component for consistent rating display
const GameCard: React.FC<{
  game: Game;
  index: number;
  isDesktop: boolean;
}> = ({ game, index, isDesktop }) => {
  const formatRating = (rating: number) => {
    return rating && typeof rating === 'number' && rating > 0 
      ? rating.toFixed(1) 
      : 'No Rating';
  };

  if (isDesktop) {
    return (
      <Link
        to={getGameUrl(game)}
        className="group relative hover:scale-105 transition-transform"
      >
        <div className="relative">
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-full h-64 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = '/default-cover.png';
            }}
          />
          {/* Standardized rating display */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
            <div className="text-center">
              <span className="text-white text-sm font-bold">
                {formatRating(game.rating)}
              </span>
            </div>
          </div>
          {/* Rank number */}
          <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
          {/* Data quality indicator */}
          {game.hasGameData === false && (
            <div className="absolute top-2 right-2 bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
              <span className="text-xs">!</span>
            </div>
          )}
        </div>
        <div className="mt-2">
          <h3 className="text-white font-medium text-center group-hover:text-purple-400 transition-colors">
            {game.title}
          </h3>
          <p className="text-gray-400 text-sm text-center">{game.genre}</p>
        </div>
      </Link>
    );
  }

  // Mobile version
  return (
    <Link
      to={getGameUrl(game)}
      className="group flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
    >
      <div className="relative flex-shrink-0">
        <img
          src={game.coverImage}
          alt={game.title}
          className="w-16 h-20 object-cover rounded"
          onError={(e) => {
            e.currentTarget.src = '/default-cover.png';
          }}
        />
        {/* Standardized rating display */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-1 py-0.5">
          <div className="text-center">
            <span className="text-white text-xs font-bold">
              {formatRating(game.rating)}
            </span>
          </div>
        </div>
        {/* Rank number for mobile */}
        <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
          {index + 1}
        </div>
        {/* Data quality indicator */}
        {game.hasGameData === false && (
          <div className="absolute top-1 right-1 bg-yellow-600 text-white w-4 h-4 rounded-full flex items-center justify-center">
            <span className="text-xs">!</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
          {game.title}
        </h3>
        <p className="text-gray-400 text-sm">{game.genre}</p>
      </div>
    </Link>
  );
};

export const ProfileData: React.FC<ProfileDataProps> = ({
  activeTab,
  allGames,
  sortedReviews,
  reviewFilter,
  onReviewFilterChange,
  isDummy = false,
  userId,
  isOwnProfile = false
}) => {
  // State for directly fetched top games
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [loading, setLoading] = useState(false);
  
  // State for editable Top 5
  const [userTopGames, setUserTopGames] = useState<UserTopGame[]>([]);
  const [isEditingTop5, setIsEditingTop5] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isLoadingUserGames, setIsLoadingUserGames] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoAction, setUndoAction] = useState<{
    action: string;
    previousState: UserTopGame[];
    timeout: NodeJS.Timeout;
  } | null>(null);
  
  // Direct data fetching for top5/top10 - optimized like modals
  const fetchTopGames = async (limit: number) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rating')
        .select(`
          rating,
          game:game_id (
            id,
            igdb_id,
            slug,
            name,
            cover_url,
            genre
          )
        `)
        .eq('user_id', parseInt(userId))
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const processedGames = (data || [])
        .filter(item => item.game)
        .map(item => ({
          id: item.game.id,
          igdb_id: item.game.igdb_id,
          slug: item.game.slug,
          name: item.game.name,
          cover_url: item.game.cover_url || '/default-cover.png',
          genre: item.game.genre || '',
          rating: item.rating
        }));

      setTopGames(processedGames);
    } catch (error) {
      console.error('Error fetching top games:', error);
      setTopGames([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's top 5 games for editing
  const fetchUserTopGames = async () => {
    if (!userId) return;
    
    setIsLoadingUserGames(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('user_top_games')
        .select(`
          position,
          game:game_id (
            id,
            igdb_id,
            slug,
            name,
            cover_url,
            genre
          )
        `)
        .eq('user_id', parseInt(userId))
        .order('position');

      if (error) throw error;

      // Transform data to fill empty positions with null
      const filledPositions = Array.from({ length: 5 }, (_, index) => {
        const position = index + 1;
        const existingGame = data?.find(item => item.position === position);
        return {
          position,
          game: existingGame?.game || null
        };
      });

      setUserTopGames(filledPositions);
    } catch (error) {
      console.error('Error fetching user top games:', error);
      setError('Failed to load your Top 5 games');
      setUserTopGames(Array.from({ length: 5 }, (_, index) => ({ position: index + 1, game: null })));
    } finally {
      setIsLoadingUserGames(false);
    }
  };

  // Toast notification functions (simple implementation)
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    // Simple toast implementation - could be replaced with react-hot-toast
    const toastDiv = document.createElement('div');
    toastDiv.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium ${
      type === 'success' ? 'bg-green-600' : 'bg-red-600'
    }`;
    toastDiv.textContent = message;
    document.body.appendChild(toastDiv);
    
    setTimeout(() => {
      toastDiv.remove();
    }, 3000);
  };

  // Clear undo action
  const clearUndo = () => {
    if (undoAction?.timeout) {
      clearTimeout(undoAction.timeout);
    }
    setUndoAction(null);
  };

  // Undo last action
  const handleUndo = async () => {
    if (!undoAction) return;
    
    clearTimeout(undoAction.timeout);
    setUserTopGames(undoAction.previousState);
    await saveTopGames(undoAction.previousState);
    setUndoAction(null);
    showToast('Action undone');
  };

  // Check if user has reviewed games for Top 5
  const checkHasReviewedGames = async () => {
    if (!userId) return false;
    
    try {
      const { data, error } = await supabase
        .from('rating')
        .select('id')
        .eq('user_id', parseInt(userId))
        .limit(1);
      
      if (error) throw error;
      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('Error checking reviewed games:', error);
      return false;
    }
  };

  // Handler functions for editing
  const openGamePicker = (position: number) => {
    if (isSaving) return; // Prevent interaction during save
    setSelectedPosition(position);
    setShowGamePicker(true);
  };

  const handleAddGame = async (position: number, gameId: string) => {
    if (isSaving) return;
    
    const previousState = [...userTopGames];
    clearUndo();
    
    // Update userTopGames state optimistically
    const updatedGames = userTopGames.map(item => 
      item.position === position 
        ? { ...item, game: { id: parseInt(gameId), igdb_id: undefined, slug: undefined, name: 'Loading...', cover_url: '' } } 
        : item
    );
    
    setUserTopGames(updatedGames);
    
    // Auto-save to database
    const success = await saveTopGames(updatedGames);
    
    if (success) {
      // Refresh to get full game data
      await fetchUserTopGames();
      showToast('Game added to Top 5!');
      
      // Set up undo action
      const timeout = setTimeout(() => setUndoAction(null), 5000);
      setUndoAction({
        action: 'Added game',
        previousState,
        timeout
      });
    } else {
      // Revert on error
      setUserTopGames(previousState);
    }
  };

  const handleRemoveGame = async (position: number) => {
    if (isSaving) return;
    
    // Show confirmation dialog
    if (!window.confirm('Remove this game from your Top 5?')) {
      return;
    }
    
    const previousState = [...userTopGames];
    clearUndo();
    
    // Update state optimistically
    const updatedGames = userTopGames.map(item => 
      item.position === position 
        ? { ...item, game: null }
        : item
    );
    
    setUserTopGames(updatedGames);
    
    // Auto-save to database
    const success = await saveTopGames(updatedGames);
    
    if (success) {
      showToast('Game removed from Top 5');
      
      // Set up undo action
      const timeout = setTimeout(() => setUndoAction(null), 5000);
      setUndoAction({
        action: 'Removed game',
        previousState,
        timeout
      });
    } else {
      // Revert on error
      setUserTopGames(previousState);
    }
  };

  // Save top games to database
  const saveTopGames = async (games?: UserTopGame[]): Promise<boolean> => {
    if (!userId) return false;
    
    const gamesToSave = games || userTopGames;
    setIsSaving(true);
    
    try {
      // Delete existing records
      const { error: deleteError } = await supabase
        .from('user_top_games')
        .delete()
        .eq('user_id', parseInt(userId));
      
      if (deleteError) throw deleteError;
      
      // Insert new positions for games that exist
      const gamesToInsert = gamesToSave
        .filter(item => item.game && item.game.id)
        .map(item => ({
          user_id: parseInt(userId),
          game_id: item.game.id,
          position: item.position
        }));
      
      if (gamesToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('user_top_games')
          .insert(gamesToInsert);
        
        if (insertError) throw insertError;
      }
      
      return true;
    } catch (error) {
      console.error('Error saving Top 5:', error);
      showToast('Failed to save changes. Please try again.', 'error');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle drag and drop reordering
  const handleDragEnd = async (result: any) => {
    if (!result.destination || isSaving) return;
    
    // Only allow dragging within the same droppable
    if (result.source.droppableId !== result.destination.droppableId) return;
    
    // No change if dropped in same position
    if (result.source.index === result.destination.index) return;
    
    const previousState = [...userTopGames];
    clearUndo();
    
    // Get only games that exist (filter out empty slots)
    const existingGames = userTopGames.filter(item => item.game);
    
    if (existingGames.length === 0) return;
    
    // Create array from existing games
    const items = Array.from(existingGames);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    // Update positions based on new order
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index + 1
    }));
    
    // Fill empty positions
    const fullGamesList = Array.from({ length: 5 }, (_, index) => {
      const position = index + 1;
      const existingGame = updatedItems.find(item => item.position === position);
      return existingGame || { position, game: null };
    });
    
    setUserTopGames(fullGamesList);
    
    // Save to database
    const success = await saveTopGames(fullGamesList);
    
    if (success) {
      showToast('Top 5 reordered successfully!');
      
      // Set up undo action
      const timeout = setTimeout(() => setUndoAction(null), 5000);
      setUndoAction({
        action: 'Reordered games',
        previousState,
        timeout
      });
    } else {
      // Revert on error
      setUserTopGames(previousState);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'top5' && userId) {
      fetchTopGames(5);
      fetchUserTopGames();
    } else if (activeTab === 'top10') {
      fetchTopGames(10);
    }
  }, [activeTab, userId]);

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoAction?.timeout) {
        clearTimeout(undoAction.timeout);
      }
    };
  }, [undoAction]);

  // Skeleton loader component
  const SkeletonCard = () => (
    <div className="relative aspect-[3/4] bg-gray-700 rounded-lg animate-pulse">
      <div className="absolute top-2 left-2 bg-gray-600 w-8 h-8 rounded-full"></div>
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-600 rounded-b-lg"></div>
    </div>
  );

  // Top 5 Tab Content - single implementation, no redundant component
  if (activeTab === 'top5') {
    return (
      <div>
        {/* Error Display */}
        {error && (
          <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Undo Action Bar */}
        {undoAction && (
          <div className="mb-4 bg-blue-900/50 border border-blue-700 rounded-lg p-3 flex items-center justify-between">
            <span className="text-blue-300 text-sm">{undoAction.action}</span>
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Undo
              </button>
              <button
                onClick={clearUndo}
                className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Edit Mode Toggle - Only show for own profile */}
        {isOwnProfile && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              {isSaving && (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                  <span className="text-sm">Saving...</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setIsEditingTop5(!isEditingTop5)}
              disabled={isSaving}
              className={`px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors ${
                isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isEditingTop5 ? 'Done Editing' : 'Edit Top 5'}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoadingUserGames && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4">
            {[1, 2, 3, 4, 5].map((position) => (
              <SkeletonCard key={position} />
            ))}
          </div>
        )}

        {/* No Games State */}
        {!isLoadingUserGames && userTopGames.every(g => !g.game) && (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-white mb-2">Create Your Top 5</h3>
            <p className="text-gray-400 mb-4">
              {isOwnProfile ? 'Review some games first to create your Top 5!' : 'This user hasn\'t created their Top 5 yet.'}
            </p>
          </div>
        )}

        {/* Desktop Grid with Drag and Drop */}
        {!isLoadingUserGames && (
          <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="top5" direction="horizontal">
            {(provided) => (
              <div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {[1, 2, 3, 4, 5].map((position, index) => {
                  const gameData = userTopGames.find(g => g.position === position);
                  
                  if (gameData?.game && isEditingTop5) {
                    const draggableIndex = userTopGames.filter(g => g.game).findIndex(g => g.game.id === gameData.game.id);
                    return (
                      <Draggable key={gameData.game.id} draggableId={gameData.game.id.toString()} index={draggableIndex}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`relative group cursor-move transition-transform ${
                              snapshot.isDragging ? 'opacity-50 shadow-lg scale-105' : ''
                            }`}
                          >
                            <div className="relative aspect-[3/4]">
                              <img
                                src={gameData.game.cover_url}
                                alt={gameData.game.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                              <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                                {position}
                              </div>
                            </div>
                            <h3 className="text-white font-medium text-center mt-2">{gameData.game.name}</h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveGame(position);
                              }}
                              disabled={isSaving}
                              className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30"
                              aria-label={`Remove ${gameData.game.name} from Top 5`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  }
                  
                  if (gameData?.game && !isEditingTop5) {
                    return (
                      <div key={position} className="relative group">
                        <Link to={getGameUrl(gameData.game)}>
                          <div className="relative aspect-[3/4]">
                            <img
                              src={gameData.game.cover_url}
                              alt={gameData.game.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                              {position}
                            </div>
                          </div>
                          <h3 className="text-white font-medium text-center mt-2">{gameData.game.name}</h3>
                        </Link>
                      </div>
                    );
                  }
                  
                  // Empty slot
                  return (
                    <div
                      key={position}
                      className={`relative aspect-[3/4] bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center ${
                        isEditingTop5 && !isSaving ? 'cursor-pointer hover:bg-gray-600 transition-colors' : ''
                      } ${isSaving ? 'opacity-50' : ''}`}
                      onClick={() => isEditingTop5 && !isSaving && openGamePicker(position)}
                      role={isEditingTop5 ? 'button' : undefined}
                      tabIndex={isEditingTop5 && !isSaving ? 0 : -1}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && isEditingTop5 && !isSaving) {
                          e.preventDefault();
                          openGamePicker(position);
                        }
                      }}
                      aria-label={isEditingTop5 ? `Add game to position ${position}` : undefined}
                    >
                      <div className="text-center">
                        {isEditingTop5 && <Plus className="h-8 w-8 text-gray-500 mx-auto mb-2" />}
                        <span className="text-gray-400 text-sm">{isEditingTop5 ? 'Add Game' : ''}</span>
                        <span className="text-gray-500 text-xs block">#{position}</span>
                      </div>
                    </div>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        )}

        {/* Mobile List */}
        <div className="md:hidden space-y-3">
          {[1, 2, 3, 4, 5].map((position) => {
            const gameData = userTopGames.find(g => g.position === position);
            
            if (gameData?.game) {
              return (
                <div key={position} className="relative group">
                  <Link to={getGameUrl(gameData.game)} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <div className="relative flex-shrink-0">
                      <img
                        src={gameData.game.cover_url}
                        alt={gameData.game.name}
                        className="w-16 h-20 object-cover rounded"
                      />
                      <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                        {position}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{gameData.game.name}</h3>
                    </div>
                  </Link>
                  {isEditingTop5 && (
                    <button
                      onClick={() => handleRemoveGame(position)}
                      className="absolute top-3 right-3 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            }
            
            // Empty slot for mobile
            return (
              <div
                key={position}
                className={`p-4 bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center ${
                  isEditingTop5 && !isSaving ? 'cursor-pointer hover:bg-gray-600 transition-colors' : ''
                } ${isSaving ? 'opacity-50' : ''}`}
                onClick={() => isEditingTop5 && !isSaving && openGamePicker(position)}
                role={isEditingTop5 ? 'button' : undefined}
                tabIndex={isEditingTop5 && !isSaving ? 0 : -1}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && isEditingTop5 && !isSaving) {
                    e.preventDefault();
                    openGamePicker(position);
                  }
                }}
                aria-label={isEditingTop5 ? `Add game to position ${position}` : undefined}
              >
                <div className="text-center">
                  {isEditingTop5 && <Plus className="h-6 w-6 text-gray-500 mx-auto mb-2" />}
                  <span className="text-gray-400 text-sm">{isEditingTop5 ? 'Add Game' : `Position #${position}`}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Game Picker Modal */}
        {showGamePicker && selectedPosition && (
          <GamePickerModal
            isOpen={showGamePicker}
            onClose={() => {
              setShowGamePicker(false);
              setSelectedPosition(null);
            }}
            onSelect={(gameId) => {
              if (selectedPosition) {
                handleAddGame(selectedPosition, gameId);
              }
              // Auto-close modal after selection
              setShowGamePicker(false);
              setSelectedPosition(null);
            }}
            userId={userId}
            excludeGameIds={userTopGames.filter(g => g.game).map(g => g.game.id.toString())}
            position={selectedPosition}
            title={`Select Game for Top 5 - Position #${selectedPosition}`}
          />
        )}
      </div>
    );
  }

  // Top 10 Tab Content - Optimized with direct data fetching
  if (activeTab === 'top10') {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    if (topGames.length === 0) {
      return (
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">Top 10 Highest Ranked</h2>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Rated Games Yet</h3>
            <p className="text-gray-400 mb-4">
              Rate some games to see your top 10 highest ranked games here.
            </p>
            {isOwnProfile && (
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Find Games to Rate
              </Link>
            )}
          </div>
        </div>
      );
    }

    // Show partial top list if less than 10 games
    if (topGames.length < 10) {
      return (
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">
            Top {topGames.length} Highest Ranked
          </h2>
          
          {/* Desktop Version - Grid Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
            {topGames.map((game, index) => (
              <Link
                key={game.id}
                to={getGameUrl(game)}
                className="group relative hover:scale-105 transition-transform"
              >
                <div className="relative">
                  <img
                    src={game.cover_url}
                    alt={game.name}
                    className="w-full h-64 object-cover rounded-lg"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = '/default-cover.png';
                    }}
                  />
                  {/* Rating display */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
                    <div className="text-center">
                      <span className="text-white text-sm font-bold">
                        {game.rating && typeof game.rating === 'number' && game.rating > 0 
                          ? game.rating.toFixed(1) 
                          : 'No Rating'}
                      </span>
                    </div>
                  </div>
                  {/* Rank number */}
                  <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-white font-medium text-center group-hover:text-purple-400 transition-colors">
                    {game.name}
                  </h3>
                </div>
              </Link>
            ))}
            {/* Show empty slots for remaining spots */}
            {Array.from({ length: 10 - topGames.length }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="relative aspect-[3/4] bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center"
              >
                <span className="text-gray-500 text-lg font-medium">
                  #{topGames.length + i + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Mobile Version - List format */}
          <div className="md:hidden space-y-3">
            {topGames.map((game, index) => (
              <Link
                key={game.id}
                to={getGameUrl(game)}
                className="group flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={game.cover_url}
                    alt={game.name}
                    className="w-16 h-20 object-cover rounded"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = '/default-cover.png';
                    }}
                  />
                  {/* Rating display for mobile */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-1 py-0.5">
                    <div className="text-center">
                      <span className="text-white text-xs font-bold">
                        {game.rating && typeof game.rating === 'number' && game.rating > 0 
                          ? game.rating.toFixed(1) 
                          : 'No Rating'}
                      </span>
                    </div>
                  </div>
                  {/* Rank number for mobile */}
                  <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
                    {game.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>

          {isOwnProfile && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm mb-4">
                Rate {10 - topGames.length} more game{10 - topGames.length !== 1 ? 's' : ''} to complete your top 10!
              </p>
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Find More Games
              </Link>
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Top 10 Highest Ranked</h2>
        
        {/* Desktop Version - Grid Layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {topGames.map((game, index) => (
            <Link
              key={game.id}
              to={getGameUrl(game)}
              className="group relative hover:scale-105 transition-transform"
            >
              <div className="relative">
                <img
                  src={imageOptimizer.optimizeImage(game.cover_url, { width: 300, height: 400, quality: 85 })}
                  alt={game.name}
                  className="w-full h-64 object-cover rounded-lg"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = '/default-cover.png';
                  }}
                />
                {/* Rating display */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
                  <div className="text-center">
                    <span className="text-white text-sm font-bold">
                      {game.rating && typeof game.rating === 'number' && game.rating > 0 
                        ? game.rating.toFixed(1) 
                        : 'No Rating'}
                    </span>
                  </div>
                </div>
                {/* Rank number */}
                <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-white font-medium text-center group-hover:text-purple-400 transition-colors">
                  {game.name}
                </h3>
              </div>
            </Link>
          ))}
          {/* Show empty slots for remaining spots if less than 10 */}
          {topGames.length < 10 && Array.from({ length: 10 - topGames.length }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="relative aspect-[3/4] bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center"
            >
              <span className="text-gray-500 text-lg font-medium">
                #{topGames.length + i + 1}
              </span>
            </div>
          ))}
        </div>

        {/* Mobile Version - List format */}
        <div className="md:hidden space-y-3">
          {topGames.map((game, index) => (
            <Link
              key={game.id}
              to={getGameUrl(game)}
              className="group flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={imageOptimizer.optimizeImage(game.cover_url, { width: 200, height: 300, quality: 85 })}
                  alt={game.name}
                  className="w-16 h-20 object-cover rounded"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = '/default-cover.png';
                  }}
                />
                {/* Rating display for mobile */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-1 py-0.5">
                  <div className="text-center">
                    <span className="text-white text-xs font-bold">
                      {game.rating && typeof game.rating === 'number' && game.rating > 0 
                        ? game.rating.toFixed(1) 
                        : 'No Rating'}
                    </span>
                  </div>
                </div>
                {/* Rank number for mobile */}
                <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  {game.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Wishlist Tab Content (formerly Reviews)
  if (activeTab === 'reviews') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Playlist/Wishlist
        </h2>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ListMusic className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Wishlist Coming Soon</h3>
          <p className="text-gray-400">
            This feature is under development. Check back soon!
          </p>
        </div>
      </div>
    );
  }
  
  // Activity Tab Content
  if (activeTab === 'activity') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Activity Feed
        </h2>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Activity Coming Soon</h3>
          <p className="text-gray-400">
            This feature is currently under development. Check back soon!
          </p>
        </div>
      </div>
    );
  }
  
  // Lists Tab Content
  if (activeTab === 'lists') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Game Lists
        </h2>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ListMusic className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Lists Coming Soon</h3>
          <p className="text-gray-400">
            Create and share your favorite game lists. This feature is coming soon!
          </p>
        </div>
      </div>
    );
  }

  // Default content for unknown tabs
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-white mb-4">
        {isDummy ? 'Dummy ' : ''}Coming Soon
      </h2>
      <p className="text-gray-400">This feature is coming soon.</p>
    </div>
  );
};
