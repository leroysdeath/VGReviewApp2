import React from 'react';
import { ReviewCard, ReviewData } from './ReviewCard';

interface ReviewCardGridProps {
  reviews: ReviewData[];
  compact?: boolean;
  className?: string;
}

export const ReviewCardGrid: React.FC<ReviewCardGridProps> = ({ 
  reviews, 
  compact = false, 
  className = '' 
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 ${className}`}>
      {reviews.map((review) => (
        <ReviewCard 
          key={review.id} 
          review={review} 
          compact={compact} 
        />
      ))}
    </div>
  );
};