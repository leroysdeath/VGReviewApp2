import React from 'react';
import { Link } from 'react-router-dom';
import { StarRating } from '../StarRating';

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

interface MobileReviewCardProps {
  review: Review;
}

export const MobileReviewCard: React.FC<MobileReviewCardProps> = ({ review }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors">
      <div className="flex items-start gap-3">
        <Link to={`/user/${review.userId}`}>
          <img
            src={review.authorAvatar}
            alt={review.author}
            className="w-10 h-10 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Link
              to={`/user/${review.userId}`}
              className="font-medium text-white hover:text-purple-400 transition-colors text-sm"
            >
              {review.author}
            </Link>
            <span className="text-gray-500 text-xs">•</span>
            <span className="text-gray-400 text-xs">{review.date}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <StarRating rating={review.rating} size="sm" />
            <span className="text-white font-medium text-sm">{review.rating.toFixed(1)}</span>
          </div>
          {review.hasText && (
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-3">{review.text}</p>
          )}
        </div>
      </div>
    </div>
  );
};