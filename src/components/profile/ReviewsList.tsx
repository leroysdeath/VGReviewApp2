import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Star } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { getGameUrl } from '../../utils/gameUrls';

interface Review {
  id: number;
  user_id: number;
  game_id: number;
  rating: number;
  review: string | null;
  post_date_time: string;
  is_recommended: boolean | null;
  game?: {
    id: number;
    igdb_id?: number;
    slug?: string;
    name: string;
    cover_url?: string;
  };
}

interface ReviewsListProps {
  userId: string;
  filter?: 'recent' | 'rating' | 'all';
  onFilterChange?: (filter: string) => void;
}

export const ReviewsList: React.FC<ReviewsListProps> = ({ 
  userId, 
  filter = 'recent',
  onFilterChange 
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('rating')
        .select(`
          *,
          game:game_id (
            id,
            igdb_id,
            slug,
            name,
            cover_url
          )
        `)
        .eq('user_id', parseInt(userId))
        .not('rating', 'is', null)
        .order('post_date_time', { ascending: false });

      if (fetchError) throw fetchError;

      // Filter out invalid reviews
      const validReviews = (data || []).filter(review => 
        review.rating != null && 
        !isNaN(review.rating) && 
        typeof review.rating === 'number' &&
        review.game
      );

      setReviews(validReviews);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [userId]);

  // Sort reviews based on filter
  const sortedReviews = React.useMemo(() => {
    const sorted = [...reviews];
    
    switch (filter) {
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'recent':
      default:
        return sorted.sort((a, b) => 
          new Date(b.post_date_time).getTime() - new Date(a.post_date_time).getTime()
        );
    }
  }, [reviews, filter]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="bg-gray-800 rounded-lg p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-20 bg-gray-700 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                <div className="h-16 bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchReviews}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 mb-4">No reviews yet</p>
        <p className="text-gray-500 text-sm">Start rating games to see reviews here!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter controls */}
      {onFilterChange && (
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => onFilterChange('recent')}
            className={`px-4 py-2 rounded text-sm ${
              filter === 'recent' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Most Recent
          </button>
          <button
            onClick={() => onFilterChange('rating')}
            className={`px-4 py-2 rounded text-sm ${
              filter === 'rating' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Highest Rated
          </button>
        </div>
      )}

      {/* Reviews list */}
      <div className="space-y-6">
        {sortedReviews.map((review) => (
          <div key={review.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex gap-4">
              {/* Game cover */}
              <Link 
                to={getGameUrl(review.game!)} 
                className="flex-shrink-0 group"
              >
                <img
                  src={review.game?.cover_url || '/default-cover.png'}
                  alt={review.game?.name || 'Game cover'}
                  className="w-16 h-20 object-cover rounded group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    e.currentTarget.src = '/default-cover.png';
                  }}
                />
              </Link>

              {/* Review content */}
              <div className="flex-1 min-w-0">
                {/* Game title and rating */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-3">
                  <Link 
                    to={getGameUrl(review.game!)}
                    className="text-white font-semibold hover:text-purple-400 transition-colors"
                  >
                    {review.game?.name || 'Unknown Game'}
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-yellow-500 font-medium ml-1">
                        {review.rating === 10 ? '10' : review.rating.toFixed(1)}/10
                      </span>
                    </div>
                    {review.is_recommended !== null && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        review.is_recommended 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {review.is_recommended ? 'Recommended' : 'Not Recommended'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Review text */}
                {review.review && (
                  <p className="text-gray-300 mb-3 leading-relaxed">
                    {review.review}
                  </p>
                )}

                {/* Date */}
                <div className="flex items-center text-gray-500 text-sm">
                  <Calendar className="h-4 w-4 mr-1" />
                  {formatDate(review.post_date_time)}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-700">
              <Link
                to={`/review/${userId}/${review.game_id}`}
                className="text-purple-400 hover:text-purple-300 text-sm"
              >
                View Full Review →
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Load more placeholder (for future pagination) */}
      {sortedReviews.length >= 10 && (
        <div className="text-center mt-8">
          <button className="px-6 py-2 bg-gray-800 text-gray-300 rounded hover:bg-gray-700 disabled:opacity-50" disabled>
            Load More Reviews (Coming Soon)
          </button>
        </div>
      )}
    </div>
  );
};