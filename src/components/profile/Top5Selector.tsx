import React, { useState, useEffect } from 'react';
import { Plus, X, GripVertical, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GameSelectionModal } from './GameSelectionModal';
import {
  getUserTopGames,
  addGameToTopPosition,
  removeGameFromTop,
  updateTopGamesOrder,
  TopGame,
} from '../../services/userTopGames';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../services/supabase';

interface Top5SelectorProps {
  userId: string;
  isOwnProfile: boolean;
}

interface GameSlot {
  position: number;
  game?: {
    id: string;
    title: string;
    cover: string;
    rating?: number;
  };
}

// Sortable Game Card Component
const SortableGameCard: React.FC<{
  id: string;
  game: GameSlot['game'];
  position: number;
  isEditing: boolean;
  onRemove: () => void;
}> = ({ id, game, position, isEditing, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!game) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="relative aspect-[3/4] bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center group hover:border-purple-500 transition-colors cursor-pointer"
      >
        <div className="text-center">
          <Plus className="h-8 w-8 text-gray-500 group-hover:text-purple-400 mx-auto mb-2" />
          <span className="text-gray-500 group-hover:text-purple-400 text-sm">
            Add Game #{position}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      {/* Drag Handle */}
      {isEditing && (
        <div
          {...attributes}
          {...listeners}
          className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-gray-700 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
        >
          <GripVertical className="h-4 w-4 text-gray-400" />
        </div>
      )}

      {/* Remove Button */}
      {isEditing && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all z-10"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Game Card */}
      <Link
        to={`/game/${game.id}`}
        className="block relative hover:scale-105 transition-transform"
        onClick={(e) => isEditing && e.preventDefault()}
      >
        <img
          src={game.cover}
          alt={game.title}
          className="w-full aspect-[3/4] object-cover rounded-lg shadow-lg"
          onError={(e) => {
            e.currentTarget.src = '/default-cover.png';
          }}
        />
        
        {/* Rating Badge */}
        {game.rating && (
          <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-90 text-white px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-bold">{game.rating}</span>
          </div>
        )}
        
        {/* Position Badge */}
        <div className="absolute bottom-2 left-2 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
          {position}
        </div>
      </Link>
      
      {/* Game Title */}
      <h3 className="mt-2 text-white text-sm font-medium line-clamp-2">
        {game.title}
      </h3>
    </div>
  );
};

export const Top5Selector: React.FC<Top5SelectorProps> = ({
  userId,
  isOwnProfile,
}) => {
  const [slots, setSlots] = useState<GameSlot[]>([
    { position: 1 },
    { position: 2 },
    { position: 3 },
    { position: 4 },
    { position: 5 },
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load user's Top 5 games on mount
  useEffect(() => {
    loadTopGames();
  }, [userId]);

  const loadTopGames = async () => {
    setLoading(true);
    try {
      const topGames = await getUserTopGames(userId);
      
      const newSlots: GameSlot[] = [
        { position: 1 },
        { position: 2 },
        { position: 3 },
        { position: 4 },
        { position: 5 },
      ];

      topGames.forEach((topGame) => {
        if (topGame.position >= 1 && topGame.position <= 5 && topGame.game) {
          newSlots[topGame.position - 1] = {
            position: topGame.position,
            game: {
              id: topGame.game.id.toString(),
              title: topGame.game.name,
              cover: topGame.game.pic_url,
              rating: topGame.rating,
            },
          };
        }
      });

      setSlots(newSlots);
    } catch (error) {
      console.error('Error loading top games:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSlotClick = (position: number) => {
    if (!isEditing || !isOwnProfile) return;
    
    const slot = slots[position - 1];
    if (!slot.game) {
      setSelectedSlot(position);
      setIsModalOpen(true);
    }
  };

  const handleGameSelect = async (game: any) => {
    setSaving(true);
    try {
      const success = await addGameToTopPosition(
        userId,
        parseInt(game.gameId),
        selectedSlot
      );

      if (success) {
        const newSlots = [...slots];
        newSlots[selectedSlot - 1] = {
          position: selectedSlot,
          game: {
            id: game.gameId,
            title: game.gameTitle,
            cover: game.gameCover,
            rating: game.rating,
          },
        };
        setSlots(newSlots);
      }
    } catch (error) {
      console.error('Error adding game to top 5:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGame = async (position: number) => {
    const slot = slots[position - 1];
    if (!slot.game) return;

    setSaving(true);
    try {
      const success = await removeGameFromTop(userId, parseInt(slot.game.id));

      if (success) {
        const newSlots = [...slots];
        newSlots[position - 1] = { position };
        setSlots(newSlots);
      }
    } catch (error) {
      console.error('Error removing game from top 5:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = slots.findIndex(
        (slot) => slot.game?.id === active.id
      );
      const newIndex = slots.findIndex(
        (slot) => slot.game?.id === over.id
      );

      if (oldIndex !== -1 && newIndex !== -1) {
        const newSlots = arrayMove(slots, oldIndex, newIndex);
        
        // Update positions
        const updatedSlots = newSlots.map((slot, index) => ({
          ...slot,
          position: index + 1,
        }));

        setSlots(updatedSlots);

        // Save to database
        setSaving(true);
        try {
          const gamesToSave = updatedSlots
            .filter((slot) => slot.game)
            .map((slot) => ({
              game_id: parseInt(slot.game!.id),
              position: slot.position,
            }));

          await updateTopGamesOrder(userId, gamesToSave);
        } catch (error) {
          console.error('Error updating game order:', error);
          // Revert on error
          setSlots(slots);
        } finally {
          setSaving(false);
        }
      }
    }
  };

  const getSelectedGameIds = () => {
    return slots
      .filter((slot) => slot.game)
      .map((slot) => slot.game!.id);
  };

  const activeGame = activeId
    ? slots.find((slot) => slot.game?.id === activeId)?.game
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Edit Button */}
      {isOwnProfile && (
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Top 5 Games</h3>
          <button
            onClick={() => setIsEditing(!isEditing)}
            disabled={saving}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isEditing
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isEditing ? 'Done Editing' : 'Edit Top 5'}
          </button>
        </div>
      )}

      {/* Saving Indicator */}
      {saving && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 rounded-lg">
          <div className="bg-gray-800 px-4 py-2 rounded-lg flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
            <span className="text-white text-sm">Saving...</span>
          </div>
        </div>
      )}

      {/* Games Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={slots.filter(s => s.game).map(s => s.game!.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid grid-cols-5 gap-4">
            {slots.map((slot) => {
              if (slot.game) {
                return (
                  <SortableGameCard
                    key={slot.game.id}
                    id={slot.game.id}
                    game={slot.game}
                    position={slot.position}
                    isEditing={isEditing}
                    onRemove={() => handleRemoveGame(slot.position)}
                  />
                );
              } else {
                // Empty slot
                return (
                  <div
                    key={`empty-${slot.position}`}
                    onClick={() => handleSlotClick(slot.position)}
                    className={`relative aspect-[3/4] bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center group transition-colors ${
                      isEditing && isOwnProfile
                        ? 'hover:border-purple-500 cursor-pointer'
                        : ''
                    }`}
                  >
                    <div className="text-center">
                      <Plus className={`h-8 w-8 mx-auto mb-2 ${
                        isEditing && isOwnProfile
                          ? 'text-gray-500 group-hover:text-purple-400'
                          : 'text-gray-600'
                      }`} />
                      <span className={`text-sm ${
                        isEditing && isOwnProfile
                          ? 'text-gray-500 group-hover:text-purple-400'
                          : 'text-gray-600'
                      }`}>
                        {isEditing && isOwnProfile ? `Add Game #${slot.position}` : `Empty Slot`}
                      </span>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </SortableContext>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeGame ? (
            <div className="relative">
              <img
                src={activeGame.cover}
                alt={activeGame.title}
                className="w-32 aspect-[3/4] object-cover rounded-lg shadow-2xl opacity-90"
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Game Selection Modal */}
      <GameSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectGame={handleGameSelect}
        userId={userId}
        selectedGameIds={getSelectedGameIds()}
        slotPosition={selectedSlot}
      />
    </div>
  );
};
