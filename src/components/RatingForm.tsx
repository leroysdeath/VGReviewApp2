import React, { useState } from 'react';
import { Star, Save, X } from 'lucide-react';
import { StarRating } from './StarRating';
import { CreateRatingRequest, UpdateRatingRequest, Rating } from '../types/database';

interface RatingFormProps {
  gameId: number;
  existingRating?: Rating;
  onSubmit: (ratingData: CreateRatingRequest | UpdateRatingRequest) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const RatingForm: React.FC<RatingFormProps> = ({
  gameId,
  existingRating,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || '');
  const [finished, setFinished] = useState(existingRating?.finished || false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    const ratingData = existingRating 
      ? {
          id: existingRating.id,
          rating,
          review: review.trim() || undefined,
          finished
        } as UpdateRatingRequest
      : {
          game_id: gameId,
          rating,
          review: review.trim() || undefined,
          finished
        } as CreateRatingRequest;

    await onSubmit(ratingData);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-4">
        {existingRating ? 'Update Your Rating' : 'Rate This Game'}
      </h3>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Your Rating *
          </label>
          <div className="flex items-center gap-4">
            <StarRating 
              rating={rating} 
              onRatingChange={setRating}
              interactive 
              size="lg" 
            />
            <span className="text-2xl font-bold text-white">
              {rating > 0 ? rating.toFixed(1) : '--'}
            </span>
          </div>
        </div>

        {/* Review */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Review (Optional)
          </label>
          <textarea
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={4}
            maxLength={1000}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            placeholder="Share your thoughts about this game..."
          />
          <div className="mt-1 text-sm text-gray-400">
            {review.length}/1000 characters
          </div>
        </div>

        {/* Completion Status */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={finished}
              onChange={(e) => setFinished(e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-600 rounded bg-gray-700"
            />
            <span className="text-gray-300">I have finished this game</span>
          </label>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : existingRating ? 'Update Rating' : 'Submit Rating'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};