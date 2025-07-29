import React from 'react';
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
  const stars = [];

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  const starSize = sizeClasses[size];

  for (let i = 1; i <= maxRating; i++) {
    const isFilled = i <= rating;
    const isHalf = i - 0.5 <= rating && rating < i;

    stars.push(
      <button
        key={i}
        type="button"
        onClick={() => interactive && onRatingChange && onRatingChange(i)}
        onMouseEnter={() => interactive && onRatingChange && onRatingChange(i)}
        className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        disabled={!interactive}
      >
        <Star
          className={`${starSize} ${
            isFilled
              ? 'text-yellow-400 fill-current'
              : isHalf
              ? 'text-yellow-400 fill-current opacity-50'
              : 'text-gray-600'
          }`}
        />
      </button>
    );
  }

  // For half-star ratings, we need to handle them differently
  if (interactive) {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: maxRating }, (_, i) => {
          const starValue = i + 1;
          const halfStarValue = i + 0.5;
          
          return (
            <div key={i} className="relative">
              <button
                type="button"
                onClick={() => onRatingChange && onRatingChange(halfStarValue)}
                className="absolute left-0 top-0 w-1/2 h-full z-10 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => onRatingChange && onRatingChange(starValue)}
                className="absolute right-0 top-0 w-1/2 h-full z-10 cursor-pointer"
              />
              <Star
                className={`${starSize} ${
                  rating >= starValue
                    ? 'text-yellow-400 fill-current'
                    : rating >= halfStarValue
                    ? 'text-yellow-400 fill-current opacity-50'
                    : 'text-gray-600'
                } transition-colors`}
              />
            </div>
          );
        })}
      </div>
    );
  }

  return <div className="flex items-center gap-1">{stars}</div>;
};