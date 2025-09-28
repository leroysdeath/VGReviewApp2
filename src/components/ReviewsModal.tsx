import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, TrendingUp, TrendingDown, Clock, History, Grid, List } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
  topPosition?: number | null;
}

export const ReviewsModal: React.FC<ReviewsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName,
  topPosition
}) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'oldest' | 'highest' | 'lowest'>('highest');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'list' | 'tile'>('list');
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);

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
            cover_url,
            slug
          )
        `)
        .eq('user_id', parseInt(userId))
        .not('rating', 'is', null);

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
        .filter(item => item.game && item.rating != null)
        .map(item => ({
          id: item.id.toString(),
          gameId: item.game.igdb_id ? item.game.igdb_id.toString() : item.game.id.toString(),
          gameTitle: item.game.name || 'Unknown Game',
          gameCover: item.game.cover_url || '/default-cover.png',
          gameUrl: getGameUrl(item.game),
          rating: item.rating || 0,
          reviewText: item.review || '',
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

  // Add escape key handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

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

  // Determine modal positioning style - use fixed positioning for consistent behavior
  const modalStyle: React.CSSProperties = topPosition
    ? {
        position: 'fixed',
        top: `${topPosition - window.scrollY}px`,
        left: '50%',
        transform: 'translateX(-50%)',
        maxWidth: 'min(896px, calc(100vw - 2rem))',
        width: '100%',
        minHeight: isMobile ? '400px' : '300px', // Ensure minimum usable height
        maxHeight: `calc(100vh - ${topPosition - window.scrollY}px - 2rem)`,
        zIndex: 50
      }
    : {};

  const containerStyle: React.CSSProperties = topPosition
    ? {
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 50,
        overflow: 'auto'
      }
    : {};

  return (
    <div
      className={topPosition ? '' : 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'}
      style={containerStyle}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={topPosition ? 'bg-gray-800 rounded-lg flex flex-col' : 'bg-gray-800 rounded-lg w-full max-h-[90vh] flex flex-col max-w-[calc(100vw-2rem)] sm:max-w-lg md:max-w-2xl lg:max-w-4xl'}
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:px-6 md:py-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">{userName}'s Reviews</h2>
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <button
              onClick={() => setViewMode('list')}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="List View"
            >
              <List className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('tile')}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'tile' ? 'bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              title="Tile View"
            >
              <Grid className="h-5 w-5" />
            </button>
            {/* Close Button */}
            <button
              onClick={onClose}
              className="ml-2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
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
          ) : viewMode === 'list' ? (
            /* List View */
            <div className="space-y-4">
              {reviews.map((review) => {
                // Generate review URL (same logic as ReviewCard: /review/{userId}/{gameId})
                const reviewUrl = `/review/${userId}/${review.gameId}`;

                return (
                  <Link
                    key={review.id}
                    to={reviewUrl}
                    onClick={onClose}
                    className="block bg-gray-700 rounded-lg p-4 pb-4 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-gray-900/50 hover:bg-gray-700/80"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-4">
                        <img
                          src={review.gameCover}
                          alt={review.gameTitle}
                          className="w-16 h-20 object-cover rounded"
                          onError={(e) => {
                            e.currentTarget.src = '/default-cover.png';
                          }}
                        />
                      </div>

                      <div className="flex-1 min-w-0 mt-4">
                        <h3 className="text-white font-medium mb-2">
                          {review.gameTitle}
                        </h3>

                        <div className="text-gray-400 text-sm mb-2">
                          {new Date(review.postDate).toLocaleDateString()} <span className="text-yellow-400">{review.rating % 1 === 0 ? `${review.rating}/10` : `${review.rating.toFixed(1)}/10`}</span>
                        </div>

                        <div className="text-gray-300 text-sm">
                          {expandedReviews.has(review.id) || review.reviewText.length <= 150 ? (
                            <p className="whitespace-pre-line">{review.reviewText}</p>
                          ) : (
                            <p className="whitespace-pre-line">
                              {review.reviewText.slice(0, 150)}...
                            </p>
                          )}

                          {review.reviewText.length > 150 && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleReviewExpansion(review.id);
                              }}
                              className="text-purple-400 hover:text-purple-300 text-xs mt-1"
                            >
                              {expandedReviews.has(review.id) ? 'Show less' : 'Show more'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Tile View */
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
              {reviews.map((review) => {
                const reviewUrl = `/review/${userId}/${review.gameId}`;

                return (
                  <Link
                    key={review.id}
                    to={reviewUrl}
                    onClick={onClose}
                    className="group relative hover:scale-105 transition-transform"
                  >
                    <div className="relative">
                      <img
                        src={review.gameCover}
                        alt={review.gameTitle}
                        className="w-full aspect-[3/4] object-cover rounded"
                        onError={(e) => {
                          e.currentTarget.src = '/default-cover.png';
                        }}
                      />
                      {/* Rating Badge - Similar to Explore Page */}
                      <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
                        <span className="text-sm font-bold text-white">
                          {review.rating === 10 ? '10' : review.rating.toFixed(1)}/10
                        </span>
                      </div>
                    </div>
                    <h4 className="mt-2 text-sm text-gray-300 truncate group-hover:text-white transition-colors">
                      {review.gameTitle}
                    </h4>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};