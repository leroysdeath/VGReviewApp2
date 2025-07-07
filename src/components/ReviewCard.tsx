import React from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { StarRating } from './StarRating';

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

interface ReviewCardProps {
  review: Review;
  compact?: boolean;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({ review, compact = false }) => {
  return (
    <div className={`bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors ${compact ? 'p-4' : ''}`}>
      <div className="flex items-start gap-4">
        <Link to={`/user/${review.userId}`}>
          <img
            src={review.authorAvatar}
            alt={review.author}
            className="w-10 h-10 rounded-full object-cover"
          />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Link
              to={`/user/${review.userId}`}
              className="font-medium text-white hover:text-purple-400 transition-colors"
            >
              {review.author}
            </Link>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 text-sm">{review.date}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <StarRating rating={review.rating} />
            <span className="text-white font-medium">{review.rating.toFixed(1)}</span>
          </div>
          {review.hasText && (
            <p className="text-gray-300 leading-relaxed mb-4">{review.text}</p>
          )}
          {!compact && (
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <button className="flex items-center gap-1 hover:text-green-400 transition-colors">
                <ThumbsUp className="h-4 w-4" />
                <span>12</span>
              </button>
              <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                <ThumbsDown className="h-4 w-4" />
                <span>1</span>
              </button>
              <button className="flex items-center gap-1 hover:text-purple-400 transition-colors">
                <MessageCircle className="h-4 w-4" />
                <span>Reply</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};