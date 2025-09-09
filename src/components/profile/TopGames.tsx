import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, X, GripVertical, AlertTriangle } from 'lucide-react';
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
  horizontalListSortingStrategy,
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
  isOwnProfile?: boolean;
}

export const TopGames: React.FC<TopGamesProps> = ({ userId, limit, editable = false, isOwnProfile = false }) => {
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
  const [isDragging, setIsDragging] = useState(false);
  const [layoutType, setLayoutType] = useState<'desktop' | 'tablet' | 'phoneLandscape' | 'phonePortrait'>('desktop');
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [gameToRemove, setGameToRemove] = useState<{ position: number; name: string } | null>(null);

  const isTop5 = limit === 5;

  // Device and orientation detection
  useEffect(() => {
    const checkLayout = () => {
      const width = window.innerWidth;
      let newLayout: 'desktop' | 'tablet' | 'phoneLandscape' | 'phonePortrait';
      
      if (width >= 1024) {
        newLayout = 'desktop'; // lg breakpoint and up
      } else if (width >= 768) {
        newLayout = 'tablet'; // md breakpoint
      } else if (width >= 430) {
        newLayout = 'phoneLandscape'; // landscape phone
      } else {
        newLayout = 'phonePortrait'; // portrait phone
      }
      
      setLayoutType(newLayout);
      
      // Reset drag state on layout change
      if (isDragging) {
        setIsDragging(false);
        setActiveId(null);
        document.body.style.overflow = '';
        document.body.style.touchAction = '';
      }
    };
    
    checkLayout();
    window.addEventListener('resize', checkLayout);
    window.addEventListener('orientationchange', checkLayout);
    
    return () => {
      window.removeEventListener('resize', checkLayout);
      window.removeEventListener('orientationchange', checkLayout);
      // Cleanup on unmount
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isDragging]);

  // Derived states for easier checks
  const isMobile = layoutType === 'phonePortrait' || layoutType === 'phoneLandscape';
  const isPhonePortrait = layoutType === 'phonePortrait';
  const isTabletOrLarger = layoutType === 'tablet' || layoutType === 'desktop';

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

  const handleRemoveGame = (position: number) => {
    if (isSaving) return;
    
    // Find the game being removed
    const gameData = userTopGames.find(g => g.position === position);
    if (gameData?.game) {
      setGameToRemove({ position, name: gameData.game.name });
      setShowRemoveModal(true);
    }
  };

  const confirmRemoveGame = async () => {
    if (!gameToRemove || isSaving) return;
    
    const previousState = [...userTopGames];
    
    // Update state optimistically
    const updatedGames = userTopGames.map(item => 
      item.position === gameToRemove.position 
        ? { ...item, game: null }
        : item
    );
    
    setUserTopGames(updatedGames);
    setShowRemoveModal(false);
    setGameToRemove(null);
    
    // Auto-save to database
    const success = await saveTopGames(updatedGames);
    
    if (!success) {
      // Revert on error
      setUserTopGames(previousState);
      setError('Failed to remove game. Please try again.');
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
    
    // Get the current indices in the array
    const activeIndex = userTopGames.findIndex(g => g.game?.id.toString() === active.id);
    const overIndex = userTopGames.findIndex(g => g.game?.id.toString() === over.id);
    
    if (activeIndex === -1 || overIndex === -1) {
      setActiveId(null);
      return;
    }

    // Use arrayMove to reorder - this shifts items, doesn't swap
    const reordered = arrayMove(userTopGames, activeIndex, overIndex);
    
    // Update positions to match new order (1-5)
    const updatedGames = reordered.map((item, index) => ({
      ...item,
      position: index + 1
    }));

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

  // Handle escape key for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showRemoveModal) {
        setShowRemoveModal(false);
        setGameToRemove(null);
      }
    };
    
    if (showRemoveModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showRemoveModal]);

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
          {/* Show edit button if there's at least 1 game in Top 5 */}
          {(() => {
            const hasGames = userTopGames.some(g => g.game);
            
            return hasGames && !error && (
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
            strategy={
              isPhonePortrait ? rectSortingStrategy :
              (layoutType === 'phoneLandscape' || layoutType === 'tablet') ? horizontalListSortingStrategy :
              rectSortingStrategy
            }
          >
            {/* Container for different layouts */}
            {isPhonePortrait ? (
              // Phone Portrait - 1-4 Layout
              <div className="flex flex-col items-center gap-3 mb-4 transition-all duration-300">
                {/* Top row - 1 game centered */}
                <div className="flex justify-center gap-3">
                  {[1].map((position) => {
                    const gameData = userTopGames.find(g => g.position === position);
                    
                    if (gameData?.game && !isEditingTop5) {
                      return (
                        <div key={position} className="relative group w-[180px]">
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
                    
                    if (gameData?.game && isEditingTop5) {
                      return (
                        <div key={gameData.game.id} className="w-[180px]">
                          <SortableGameCard
                            id={gameData.game.id.toString()}
                            position={position}
                            game={gameData.game}
                            isEditing={isEditingTop5}
                            onRemove={handleRemoveGame}
                            isDragging={activeId === gameData.game.id.toString()}
                            isMobile={isMobile}
                            isSaving={isSaving}
                          />
                        </div>
                      );
                    }
                    
                    return (
                      <div key={`empty-${position}`} className="relative aspect-[3/4] w-[180px] group">
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
                
                {/* Bottom row - 4 games */}
                <div className="grid grid-cols-4 gap-2 px-2">
                  {[2, 3, 4, 5].map((position) => {
                    const gameData = userTopGames.find(g => g.position === position);
                    
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
                              <div className="absolute top-1 left-1 bg-gray-900 bg-opacity-75 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">
                                {position}
                              </div>
                            </div>
                          </Link>
                        </div>
                      );
                    }
                    
                    if (gameData?.game && isEditingTop5) {
                      return (
                        <div key={gameData.game.id}>
                          <SortableGameCard
                            id={gameData.game.id.toString()}
                            position={position}
                            game={gameData.game}
                            isEditing={isEditingTop5}
                            onRemove={handleRemoveGame}
                            isDragging={activeId === gameData.game.id.toString()}
                            isMobile={isMobile}
                            isSaving={isSaving}
                          />
                        </div>
                      );
                    }
                    
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
                            <Plus className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                            <span className="text-gray-400 text-[10px]">Add</span>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // Desktop, Tablet, and Phone Landscape - Grid/Row Layout
              <div className={
                layoutType === 'desktop' 
                  ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 transition-all duration-300"
                  : (layoutType === 'tablet' || layoutType === 'phoneLandscape')
                  ? "flex justify-center gap-3 mb-4 transition-all duration-300"
                  : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 transition-all duration-300"
              }>
              {Array.from({ length: 5 }).map((_, index) => {
                const position = index + 1;
                const gameData = userTopGames.find(g => g.position === position);
                
                // Non-editing mode - show as Link
                if (gameData?.game && !isEditingTop5) {
                  return (
                    <div key={position} className={`relative group ${
                      layoutType === 'phoneLandscape' ? 'w-[150px]' :
                      layoutType === 'tablet' ? 'w-[140px]' :
                      ''
                    }`}>
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
                    <div key={gameData.game.id} className={
                      layoutType === 'phoneLandscape' ? 'w-[150px]' :
                      layoutType === 'tablet' ? 'w-[140px]' :
                      ''
                    }>
                      <SortableGameCard
                        id={gameData.game.id.toString()}
                        position={position}
                        game={gameData.game}
                        isEditing={isEditingTop5}
                        onRemove={handleRemoveGame}
                        isDragging={activeId === gameData.game.id.toString()}
                        isMobile={isMobile}
                        isSaving={isSaving}
                      />
                    </div>
                  );
                }

                // Empty slot
                return (
                  <div key={`empty-${position}`} className={`relative aspect-[3/4] group ${
                    layoutType === 'phoneLandscape' ? 'w-[150px]' :
                    layoutType === 'tablet' ? 'w-[140px]' :
                    ''
                  }`}>
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
            )}
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
                className={`relative aspect-[3/4] cursor-grabbing transform scale-105 transition-transform ${
                  isPhonePortrait ? 'w-[130px]' :
                  layoutType === 'phoneLandscape' ? 'w-[140px]' :
                  layoutType === 'tablet' ? 'w-[160px]' :
                  'w-[180px]'
                }`}
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

        {/* Remove Game Confirmation Modal */}
        {showRemoveModal && gameToRemove && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
              onClick={() => {
                setShowRemoveModal(false);
                setGameToRemove(null);
              }}
            />
            
            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div 
                className="bg-gray-800 rounded-xl p-6 max-w-md w-full max-w-[calc(100vw-2rem)] shadow-2xl pointer-events-auto border border-gray-700"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close button */}
                <button
                  onClick={() => {
                    setShowRemoveModal(false);
                    setGameToRemove(null);
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>

                {/* Content */}
                <div className="flex flex-col items-center text-center">
                  {/* Warning Icon */}
                  <div className="mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-yellow-900/20">
                    <AlertTriangle className="h-6 w-6 text-yellow-500" />
                  </div>

                  {/* Title */}
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-2">
                    Remove from Top 5?
                  </h3>

                  {/* Message */}
                  <p className="text-gray-300 text-sm sm:text-base mb-6">
                    Remove <span className="font-medium text-white">{gameToRemove.name}</span> from your Top 5?
                  </p>

                  {/* Buttons */}
                  <div className="flex gap-3 w-full">
                    <button
                      onClick={() => {
                        setShowRemoveModal(false);
                        setGameToRemove(null);
                      }}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmRemoveGame}
                      disabled={isSaving}
                      className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Removing...' : 'OK'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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
            {limit === 5 
              ? (isOwnProfile 
                  ? 'No games rated yet. Start rating games to select your Top 5!'
                  : 'They haven\'t decided on a Top 5 yet! How sad!')
              : (isOwnProfile
                  ? 'No games rated yet. Start rating games to see your Top 10!'
                  : 'No games rated yet!')
            }
          </p>
        </div>
      ) : (
        // For Top 5 on mobile portrait, use special 1-4 layout
        isTop5 && isPhonePortrait ? (
          <div className="flex flex-col items-center gap-3 mb-4">
            {/* Top row - 1 game centered */}
            <div className="flex justify-center gap-3">
              {[1].map((position) => {
                const game = topGames[position - 1];
                if (game) {
                  return (
                    <Link
                      key={game.id}
                      to={getGameUrl(game)}
                      className="group relative hover:scale-105 transition-transform w-[180px]"
                    >
                      <div className="relative aspect-[3/4]">
                        <img
                          src={game.cover_url}
                          alt={game.name}
                          className="w-full h-full object-cover rounded-lg"
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
                return (
                  <div 
                    key={`empty-${position}`}
                    className="relative aspect-[3/4] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 w-[180px]"
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
            
            {/* Bottom row - 4 games */}
            <div className="flex justify-center gap-3">
              {[2, 3, 4, 5].map((position) => {
                const game = topGames[position - 1];
                if (game) {
                  return (
                    <Link
                      key={game.id}
                      to={getGameUrl(game)}
                      className="group relative hover:scale-105 transition-transform w-[90px]"
                    >
                      <div className="relative aspect-[3/4]">
                        <img
                          src={game.cover_url}
                          alt={game.name}
                          className="w-full h-full object-cover rounded-lg"
                          onError={(e) => {
                            e.currentTarget.src = '/default-cover.png';
                          }}
                        />
                        <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-75 text-white w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs">
                          {position}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
                          <div className="text-center">
                            <span className="text-white text-xs font-bold">
                              {game.rating === 10 ? '10' : game.rating.toFixed(1)}/10
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                }
                return (
                  <div 
                    key={`empty-${position}`}
                    className="relative aspect-[3/4] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 w-[90px]"
                  >
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400 text-xl font-normal">
                        #{position}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
        <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
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
        )
      )}
      
      {/* Show Rate More Games button only for own profile when there are less than 10 games */}
      {limit === 10 && isOwnProfile && topGames.length > 0 && topGames.length < 10 && (
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