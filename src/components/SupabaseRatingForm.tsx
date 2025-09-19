import React, { useState } from 'react';
import { Star, Save, X, Trash2 } from 'lucide-react';
import { StarRating } from './StarRating';
import { supabaseHelpers } from '../services/supabase';

interface SupabaseRatingFormProps {
  gameId: number;
  userId: number;
  existingRating?: {
    id: number;
    rating: number;
    review?: string;
    finished: boolean;
  };
  onSubmit?: () => void;
  onCancel: () => void;
}

export const SupabaseRatingForm: React.FC<SupabaseRatingFormProps> = ({
  gameId,
  userId,
  existingRating,
  onSubmit,
  onCancel
}) => {
  const [rating, setRating] = useState(existingRating?.rating || 0);
  const [review, setReview] = useState(existingRating?.review || '');
  const [finished, setFinished] = useState(existingRating?.finished || false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      if (existingRating) {
        await supabaseHelpers.updateRating(existingRating.id, {
          rating,
          review: review.trim() || undefined,
          finished
        });
      } else {
        await supabaseHelpers.createRating({
          user_id: userId,
          game_id: gameId,
          rating,
          review: review.trim() || undefined,
          finished
        });
      }
      
      onSubmit?.();
    } catch (error) {
      console.error('Failed to save rating:', error);
      alert('Failed to save rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingRating) return;
    
    setDeleteLoading(true);
    try {
      await supabaseHelpers.deleteRating(existingRating.id);
      onSubmit?.(); // Call onSubmit to refresh the parent component
    } catch (error) {
      console.error('Failed to delete rating:', error);
      alert('Failed to delete rating. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
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
          {existingRating && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteLoading}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
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

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4">Delete Rating & Review</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete your rating and review? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};