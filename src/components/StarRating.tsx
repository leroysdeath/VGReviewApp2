import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  onRatingChange,
  interactive = false,
  size = 'md'
}) => {
  const maxRating = 10;
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const starSize = sizeClasses[size];
  const displayRating = hoverRating !== null ? hoverRating : rating;

  const renderStar = (starIndex: number) => {
    const starValue = starIndex + 1;
    const halfStarValue = starIndex + 0.5;
    
    // Determine star appearance based on current rating
    const isFullStar = displayRating >= starValue;
    const isHalfStar = displayRating >= halfStarValue && displayRating < starValue;
    const isEmpty = displayRating < halfStarValue;

    if (!interactive) {
      // Non-interactive version - simpler rendering
      return (
        <div key={starIndex} className="relative">
          <Star
            className={`${starSize} ${
              isFullStar
                ? 'text-yellow-400 fill-current'
                : isHalfStar
                ? 'text-yellow-400'
                : 'text-gray-600'
            } transition-colors`}
          />
          {isHalfStar && (
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star
                className={`${starSize} text-yellow-400 fill-current`}
              />
            </div>
          )}
        </div>
      );
    }

    // Interactive version with hover and click handlers
    return (
      <div key={starIndex} className="relative">
        {/* Half star button (left side) */}
        <button
          type="button"
          className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer"
          onClick={() => onRatingChange && onRatingChange(halfStarValue)}
          onMouseEnter={() => setHoverRating(halfStarValue)}
          onMouseLeave={() => setHoverRating(null)}
          aria-label={`Rate ${halfStarValue} out of ${maxRating}`}
        />
        
        {/* Full star button (right side) */}
        <button
          type="button"
          className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer"
          onClick={() => onRatingChange && onRatingChange(starValue)}
          onMouseEnter={() => setHoverRating(starValue)}
          onMouseLeave={() => setHoverRating(null)}
          aria-label={`Rate ${starValue} out of ${maxRating}`}
        />
        
        {/* Base star (empty) */}
        <Star
          className={`${starSize} text-gray-600 transition-colors`}
        />
        
        {/* Filled portion */}
        {(isFullStar || isHalfStar) && (
          <div 
            className={`absolute inset-0 overflow-hidden ${
              isFullStar ? 'w-full' : 'w-1/2'
            }`}
          >
            <Star
              className={`${starSize} text-yellow-400 fill-current transition-colors`}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, i) => renderStar(i))}
    </div>
  );
};
