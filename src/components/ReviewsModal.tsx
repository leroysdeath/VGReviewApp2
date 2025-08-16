import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, TrendingUp, TrendingDown, Clock, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';

interface Review {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCover: string;
  rating: number;
  reviewText: string;
  postDate: string;
}

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName
}) => {
  const [activeTab, setActiveTab] = useState<'highest' | 'lowest' | 'recent' | 'oldest'>('recent');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const { isMobile } = useResponsive();

  // Load reviews based on active tab
  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('rating')
        .select(`
          id,
          rating,
          review,
          post_date_time,
          game:game_id (
            id,
            name,
            pic_url
          )
        `)
        .eq('user_id', parseInt(userId))
        .not('review', 'is', null)
        .not('review', 'eq', '');

      // Apply sorting based on active tab
      switch (activeTab) {
        case 'highest':
          query = query.order('rating', { ascending: false });
          break;
        case 'lowest':
          query = query.order('rating', { ascending: true });
          break;
        case 'recent':
          query = query.order('post_date_time', { ascending: false });
          break;
        case 'oldest':
          query = query.order('post_date_time', { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      const reviewsData = (data || [])
        .filter(item => item.game && item.review)
        .map(item => ({
          id: item.id.toString(),
          gameId: item.game.id.toString(),
          gameTitle: item.game.name || 'Unknown Game',
          gameCover: item.game.pic_url || '/default-cover.png',
          rating: item.rating || 0,
          reviewText: item.review,
          postDate: item.post_date_time
        }));

      setReviews(reviewsData);
    } catch (error) {
      console.error('Error loading reviews:', error);
      setError('Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [userId, activeTab]);

  // Load data when modal opens or tab changes
  useEffect(() => {
    if (isOpen) {
      loadReviews();
    }
  }, [isOpen, activeTab, loadReviews]);

  // Toggle review expansion
  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews(prev => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  if (!isOpen) return null;

  const shouldTruncate = (text: string) => text.length > 200;

  const getTruncatedText = (text: string, reviewId: string) => {
    if (expandedReviews.has(reviewId) || !shouldTruncate(text)) {
      return text;
    }
    return text.slice(0, 200) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gray-800 rounded-lg w-full max-h-[90vh] flex flex-col ${
        isMobile ? 'max-w-sm' : 'max-w-4xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{userName}'s Reviews</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('highest')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'highest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className={isMobile ? 'text-sm' : ''}>Highest Rating</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('lowest')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'lowest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <TrendingDown className="h-4 w-4" />
              <span className={isMobile ? 'text-sm' : ''}>Lowest Rating</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'recent'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={isMobile ? 'text-sm' : ''}>Recent</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('oldest')}
            className={`flex-1 py-3 px-4 text-center transition-colors ${
              activeTab === 'oldest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <History className="h-4 w-4" />
              <span className={isMobile ? 'text-sm' : ''}>Oldest</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Display */}
          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-700 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                <p className="text-red-300 text-sm">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-300 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
          ) : reviews.length === 0 ? (
            /* Empty State */
            <div className="text-center py-12">
              <Star className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No reviews found</p>
            </div>
          ) : (
            /* Reviews Grid */
            <div className={`grid gap-4 ${
              isMobile ? 'grid-cols-1' : 'md:grid-cols-3'
            }`}>
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                >
                  <div className="flex gap-3">
                    {/* Game Cover with Rating */}
                    <Link
                      to={`/game/${review.gameId}`}
                      className="relative flex-shrink-0"
                      onClick={onClose}
                    >
                      <img
                        src={review.gameCover}
                        alt={review.gameTitle}
                        className="w-16 h-20 object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = '/default-cover.png';
                        }}
                      />
                      {/* Rating Bar */}
                      <div className="absolute -top-2 -right-2 bg-gray-500 text-white px-2 py-1 rounded-full flex items-center justify-center min-w-[32px]">
                        <span className="text-xs font-bold">{review.rating}</span>
                      </div>
                    </Link>

                    {/* Review Content */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/game/${review.gameId}`}
                        onClick={onClose}
                        className="text-white font-medium text-sm hover:text-purple-400 transition-colors block mb-2"
                      >
                        {review.gameTitle}
                      </Link>
                      
                      <p className="text-gray-300 text-sm mb-2">
                        {getTruncatedText(review.reviewText, review.id)}
                      </p>
                      
                      {shouldTruncate(review.reviewText) && (
                        <button
                          onClick={() => toggleReviewExpansion(review.id)}
                          className="text-purple-400 hover:text-purple-300 text-xs transition-colors"
                        >
                          {expandedReviews.has(review.id) ? 'see less' : 'see more'}
                        </button>
                      )}
                      
                      <p className="text-gray-500 text-xs mt-2">
                        {new Date(review.postDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
