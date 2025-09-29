import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { X, GripVertical } from 'lucide-react';

interface SortableGameCardProps {
  id: string;
  position: number;
  game: {
    id: number;
    name: string;
    cover_url: string;
  };
  isEditing: boolean;
  onRemove: (position: number) => void;
  isDragging?: boolean;
  isMobile?: boolean;
  isSaving?: boolean;
  isPhonePortrait?: boolean;
}

export const SortableGameCard: React.FC<SortableGameCardProps> = ({
  id,
  position,
  game,
  isEditing,
  onRemove,
  isDragging = false,
  isMobile = false,
  isSaving = false,
  isPhonePortrait = false,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ 
    id,
    disabled: !isEditing || isSaving,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isSortableDragging ? undefined : transition,
    opacity: isSortableDragging ? 0.5 : 1,
    cursor: isEditing ? (isSortableDragging ? 'grabbing' : 'grab') : 'pointer',
    zIndex: isSortableDragging ? 1000 : 'auto',
    scale: isSortableDragging && isMobile ? 1.05 : 1,
  };

  // If this card is being dragged, show a placeholder
  if (isDragging && isSortableDragging) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="relative aspect-[3/4] bg-gray-700 rounded-lg border-2 border-dashed border-purple-500"
      >
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-400 text-sm">Drop here</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative aspect-[3/4] group touch-none"
    >
      <div 
        className="relative h-full"
        {...(isEditing ? { ...attributes, ...listeners } : {})}
      >
        <img
          src={game.cover_url}
          alt={game.name}
          className="w-full h-full object-cover rounded-lg select-none"
          onError={(e) => {
            e.currentTarget.src = '/default-cover.png';
          }}
          draggable={false}
        />
        
        {/* Position badge - adjust size for positions 2-5 on phone portrait */}
        <div className={`absolute bg-gray-900 bg-opacity-75 text-white rounded-full flex items-center justify-center font-bold pointer-events-none
          ${isPhonePortrait && position > 1
            ? 'top-1 left-1 w-6 h-6 text-xs'  // Smaller for positions 2-5 on phone portrait
            : 'top-2 left-2 w-8 h-8 text-sm'   // Normal size for position 1 or other layouts
          }`}>
          {position}
        </div>

        {isEditing && (
          <>
            {/* Semi-transparent overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg pointer-events-none" />

            {/* Drag handle visual indicator */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-sm text-white p-2 sm:p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none"
              title="Drag to reorder"
            >
              <GripVertical className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            {/* Remove button - position and size based on layout and position */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(position);
              }}
              className={`absolute bg-red-600 text-white rounded-full flex items-center justify-center transition-all duration-200 hover:bg-red-700 hover:scale-110 z-10
                ${isPhonePortrait
                  ? position === 1
                    ? 'top-2 right-2 w-7 h-7 opacity-100'  // Position 1 on phone - keep current size
                    : 'top-1 right-1 w-6 h-6 opacity-100'  // Positions 2-5 on phone - smaller
                  : 'top-2 right-2 w-7 h-7 sm:w-8 sm:h-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100'  // Other layouts
                }`}
              title="Remove game"
            >
              <X className={isPhonePortrait && position > 1 ? 'h-3 w-3' : 'h-4 w-4'} />
            </button>
          </>
        )}

        {/* Hover overlay with game name - only on desktop */}
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <p className="text-white text-xs font-medium line-clamp-2">{game.name}</p>
        </div>
      </div>
    </div>
  );
};