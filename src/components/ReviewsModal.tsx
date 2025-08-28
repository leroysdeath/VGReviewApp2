import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, TrendingDown, Clock, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useResponsive } from '../hooks/useResponsive';
import { getGameUrl } from '../utils/gameUrls';

interface Review {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCover: string;
  gameUrl: string;
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

  // Load reviews based on active tab - optimized with foreign key syntax
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
            igdb_id,
            name,
            pic_url,
            slug
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
          gameId: item.game.igdb_id ? item.game.igdb_id.toString() : item.game.id.toString(),
          gameTitle: item.game.name || 'Unknown Game',
          gameCover: item.game.pic_url || '/default-cover.png',
          gameUrl: getGameUrl(item.game),
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
            className={`flex-1 py-3 px-2 text-center transition-colors ${
              activeTab === 'highest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Highest</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('lowest')}
            className={`flex-1 py-3 px-2 text-center transition-colors ${
              activeTab === 'lowest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <TrendingDown className="h-4 w-4" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Lowest</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`flex-1 py-3 px-2 text-center transition-colors ${
              activeTab === 'recent'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Recent</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('oldest')}
            className={`flex-1 py-3 px-2 text-center transition-colors ${
              activeTab === 'oldest'
                ? 'border-b-2 border-purple-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center justify-center gap-1">
              <History className="h-4 w-4" />
              <span className={isMobile ? 'text-xs' : 'text-sm'}>Oldest</span>
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
              <div className="h-12 w-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-500 text-lg">0</span>
              </div>
              <p className="text-gray-400">No reviews found</p>
            </div>
          ) : (
            /* Reviews List */
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-700 rounded-lg p-4 pb-4">
                  <div className="flex items-start gap-4">
                    <Link
                      to={review.gameUrl}
                      className="flex-shrink-0 mt-4"
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
                    </Link>
                    
                    <div className="flex-1 min-w-0 mt-4">
                      <Link
                        to={review.gameUrl}
                        className="text-white font-medium hover:text-purple-400 transition-colors block mb-2"
                        onClick={onClose}
                      >
                        {review.gameTitle}
                      </Link>
                      
                      <div className="text-gray-400 text-sm mb-2">
                        {new Date(review.postDate).toLocaleDateString()} <span className="text-yellow-400">{review.rating % 1 === 0 ? `${review.rating}/10` : `${review.rating.toFixed(1)}/10`}</span>
                      </div>
                      
                      <div className="text-gray-300 text-sm">
                        {expandedReviews.has(review.id) || review.reviewText.length <= 150 ? (
                          <p>{review.reviewText}</p>
                        ) : (
                          <p>
                            {review.reviewText.slice(0, 150)}...
                          </p>
                        )}
                        
                        {review.reviewText.length > 150 && (
                          <button
                            onClick={() => toggleReviewExpansion(review.id)}
                            className="text-purple-400 hover:text-purple-300 text-xs mt-1"
                          >
                            {expandedReviews.has(review.id) ? 'Show less' : 'Show more'}
                          </button>
                        )}
                      </div>
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