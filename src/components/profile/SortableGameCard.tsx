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
}

export const SortableGameCard: React.FC<SortableGameCardProps> = ({
  id,
  position,
  game,
  isEditing,
  onRemove,
  isDragging = false,
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
    disabled: !isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    cursor: isEditing ? (isSortableDragging ? 'grabbing' : 'grab') : 'pointer',
    zIndex: isSortableDragging ? 1000 : 'auto',
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
      className="relative aspect-[3/4] group"
      {...(isEditing ? {} : attributes)}
    >
      <div className="relative h-full">
        <img
          src={game.cover_url}
          alt={game.name}
          className="w-full h-full object-cover rounded-lg"
          onError={(e) => {
            e.currentTarget.src = '/default-cover.png';
          }}
          draggable={false}
        />
        
        {/* Position badge */}
        <div className="absolute top-2 left-2 bg-gray-900 bg-opacity-75 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
          {position}
        </div>

        {isEditing && (
          <>
            {/* Semi-transparent overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg pointer-events-none" />
            
            {/* Drag handle */}
            <div
              {...attributes}
              {...listeners}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gray-900/95 backdrop-blur-sm text-white p-2 sm:p-3 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-110"
              title="Drag to reorder"
            >
              <GripVertical className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>

            {/* Remove button */}
            <button
              onClick={() => onRemove(position)}
              className="absolute top-2 right-2 bg-red-600 text-white w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-700 hover:scale-110"
              title="Remove game"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}

        {/* Hover overlay with game name */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
          <p className="text-white text-xs font-medium line-clamp-2">{game.name}</p>
        </div>
      </div>
    </div>
  );
};