import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X, GripVertical } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { GamePickerModal } from '../GamePickerModal';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { getGameUrl } from '../../utils/gameUrls';
import { SortableGameCard } from './SortableGameCard';

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

interface TopGamesProps {
  userId: string;
  limit: 5 | 10;
  editable?: boolean;
}

export const TopGames: React.FC<TopGamesProps> = ({ userId, limit, editable = false }) => {
  const navigate = useNavigate();
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [userTopGames, setUserTopGames] = useState<UserTopGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditingTop5, setIsEditingTop5] = useState(false);
  const [showGamePicker, setShowGamePicker] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null);
  const [isLoadingUserGames, setIsLoadingUserGames] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const isTop5 = limit === 5;

  // Mobile detection and orientation handling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
      // Reset drag state on resize/orientation change
      if (isDragging) {
        setIsDragging(false);
        setActiveId(null);
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDragging]);

  // Configure drag and drop sensors with mobile support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: isMobile ? 10 : 8, // Slightly more distance on mobile
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Press and hold for 250ms
        tolerance: 5, // 5px movement tolerance
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch top games based on user's ratings
  const fetchTopGames = async (gameLimit: number) => {
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
        .limit(gameLimit);

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
      setError('Failed to load top games');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's manually curated Top 5 (only for limit === 5)
  const fetchUserTopGames = async () => {
    if (!userId || !isTop5) return;
    
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
      setError('Failed to load your Top 5');
    } finally {
      setIsLoadingUserGames(false);
    }
  };

  // Save top games to database
  const saveTopGames = async (games: UserTopGame[]): Promise<boolean> => {
    if (!userId || isSaving) return false;
    
    setIsSaving(true);
    try {
      // Delete existing top games
      const { error: deleteError } = await supabase
        .from('user_top_games')
        .delete()
        .eq('user_id', parseInt(userId));

      if (deleteError) throw deleteError;

      // Insert new top games (only non-null games)
      const gamesToInsert = games
        .filter(item => item.game)
        .map(item => ({
          user_id: parseInt(userId),
          game_id: item.game!.id,
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
      console.error('Error saving top games:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handler functions
  const handleAddGame = async (position: number, gameId: string) => {
    if (isSaving) return;
    
    const previousState = [...userTopGames];
    
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
    
    // Update state optimistically
    const updatedGames = userTopGames.map(item => 
      item.position === position 
        ? { ...item, game: null }
        : item
    );
    
    setUserTopGames(updatedGames);
    
    // Auto-save to database
    const success = await saveTopGames(updatedGames);
    
    if (!success) {
      // Revert on error
      setUserTopGames(previousState);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    // Don't allow drag while saving
    if (isSaving) return;
    
    setActiveId(event.active.id as string);
    setIsDragging(true);
    
    // Haptic feedback on mobile
    if (isMobile && 'vibrate' in navigator) {
      navigator.vibrate(10);
    }
    
    // Prevent scrolling on mobile while dragging
    if (isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    
    // Re-enable scrolling
    if (isMobile) {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const previousState = [...userTopGames];
    
    // Find the games being swapped
    const activeGame = userTopGames.find(g => g.game?.id.toString() === active.id);
    const overGame = userTopGames.find(g => g.game?.id.toString() === over.id);
    
    if (!activeGame || !overGame) {
      setActiveId(null);
      return;
    }

    // Create new array with swapped games
    const updatedGames = userTopGames.map(item => {
      if (item.position === activeGame.position) {
        return { ...item, game: overGame.game };
      }
      if (item.position === overGame.position) {
        return { ...item, game: activeGame.game };
      }
      return item;
    });

    // Update state optimistically
    setUserTopGames(updatedGames);
    setActiveId(null);

    // Save to database
    const success = await saveTopGames(updatedGames);
    
    if (!success) {
      // Revert on error
      setUserTopGames(previousState);
      setError('Failed to save new order. Please try again.');
    }
  };

  // Load data on mount
  useEffect(() => {
    if (userId) {
      fetchTopGames(limit);
      if (isTop5 && editable) {
        fetchUserTopGames();
      }
    }
  }, [userId, limit, isTop5, editable]);

  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {Array.from({ length: limit }).map((_, index) => (
          <div key={index} className="aspect-[3/4] bg-gray-700 rounded-lg animate-pulse"></div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => fetchTopGames(limit)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // Render Top 5 with editing capability
  if (isTop5 && editable) {
    // Get sortable items (only games that exist)
    const sortableItems = userTopGames
      .filter(item => item.game)
      .map(item => item.game!.id.toString());

    // Find active game for drag overlay
    const activeGame = activeId 
      ? userTopGames.find(g => g.game?.id.toString() === activeId)?.game
      : null;

    return (
      <div>
        {/* Edit toggle */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">
            {isEditingTop5 ? 'Edit Your Top 5 (Drag to reorder)' : 'Your Top 5'}
          </h2>
          {/* Only show edit button if all 5 slots are filled and no error */}
          {(() => {
            const emptySlots = Array.from({ length: 5 }).filter((_, index) => {
              const position = index + 1;
              const gameData = userTopGames.find(g => g.position === position);
              return !gameData?.game;
            }).length;
            
            return emptySlots === 0 && !error && (
              <button
                onClick={() => setIsEditingTop5(!isEditingTop5)}
                disabled={isSaving}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? 'Saving...' : isEditingTop5 ? 'Done' : 'Edit'}
              </button>
            );
          })()}
        </div>

        {/* Show error if any */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Show hint for mobile users */}
        {isEditingTop5 && isMobile && !isDragging && (
          <div className="mb-4 p-3 bg-purple-900/20 border border-purple-700 rounded-lg text-purple-300 text-sm text-center">
            Press and hold a game to drag and reorder
          </div>
        )}

        {/* Games grid with drag and drop */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={sortableItems} 
            strategy={isMobile ? verticalListSortingStrategy : rectSortingStrategy}
          >
            <div className={
              isMobile
                ? "flex flex-col items-center space-y-4 max-w-[200px] mx-auto transition-all duration-300"
                : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 transition-all duration-300"
            }>
              {Array.from({ length: 5 }).map((_, index) => {
                const position = index + 1;
                const gameData = userTopGames.find(g => g.position === position);
                
                // Non-editing mode - show as Link
                if (gameData?.game && !isEditingTop5) {
                  return (
                    <div key={position} className="relative group">
                      <Link to={getGameUrl(gameData.game)}>
                        <div className="relative aspect-[3/4]">
                          <img
                            src={gameData.game.cover_url}
                            alt={gameData.game.name}
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = '/default-cover.png';
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-75 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                            {position}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                }

                // Editing mode with game - use SortableGameCard
                if (gameData?.game && isEditingTop5) {
                  return (
                    <SortableGameCard
                      key={gameData.game.id}
                      id={gameData.game.id.toString()}
                      position={position}
                      game={gameData.game}
                      isEditing={isEditingTop5}
                      onRemove={handleRemoveGame}
                      isDragging={activeId === gameData.game.id.toString()}
                      isMobile={isMobile}
                      isSaving={isSaving}
                    />
                  );
                }

                // Empty slot
                return (
                  <div key={`empty-${position}`} className="relative aspect-[3/4] group">
                    <button
                      onClick={() => {
                        setSelectedPosition(position);
                        setShowGamePicker(true);
                      }}
                      className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center hover:border-purple-500 transition-colors"
                      disabled={isSaving || isEditingTop5}
                    >
                      <div className="text-center">
                        <Plus className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-gray-400 text-sm">Add Game</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </SortableContext>

          {/* Drag overlay */}
          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
            }}
          >
            {activeGame && (
              <div 
                className={`relative aspect-[3/4] cursor-grabbing ${
                  isMobile ? 'w-[180px]' : 'w-full'
                } transform scale-105 transition-transform`}
              >
                <img
                  src={activeGame.cover_url}
                  alt={activeGame.name}
                  className="w-full h-full object-cover rounded-lg shadow-2xl"
                  draggable={false}
                />
                <div className="absolute inset-0 bg-purple-600/30 rounded-lg animate-pulse" />
                <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-90 text-white px-2 py-1 rounded text-xs font-bold">
                  Moving...
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* Game Picker Modal */}
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
            setShowGamePicker(false);
            setSelectedPosition(null);
          }}
          userId={userId}
          mode="top-games"
          excludeGameIds={userTopGames
            .filter(item => item.game?.id)
            .map(item => item.game!.id.toString())}
        />
      </div>
    );
  }

  // Render standard top games (Top 10 or non-editable Top 5)
  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">
        {limit === 5 ? 'Top 5 Favorites' : `Top ${limit} Highest Ranked`}
      </h2>
      
      {topGames.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400">
            No games rated yet. Start rating games to see your top {limit}!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {Array.from({ length: limit }).map((_, index) => {
            const game = topGames[index];
            const position = index + 1;
            
            // If we have a game for this position, render it
            if (game) {
              return (
                <Link
                  key={game.id}
                  to={getGameUrl(game)}
                  className="group relative hover:scale-105 transition-transform"
                >
                  <div className="relative">
                    <img
                      src={game.cover_url}
                      alt={game.name}
                      className="w-full aspect-[3/4] object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.src = '/default-cover.png';
                      }}
                    />
                    <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-75 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                      {position}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
                      <div className="text-center">
                        <span className="text-white text-sm font-bold">
                          {game.rating === 10 ? '10' : game.rating.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            }
            
            // Render empty placeholder card
            return (
              <div 
                key={`empty-${position}`}
                className="relative aspect-[3/4] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700"
              >
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-2xl font-normal">
                    #{position}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Show Rate More Games button when there are less than 10 games */}
      {limit === 10 && topGames.length > 0 && topGames.length < 10 && (
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/search')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
          >
            Rate More Games
          </button>
        </div>
      )}
    </div>
  );
};