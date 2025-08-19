import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Star, TrendingUp, Users, Search, ArrowRight, Gamepad2 } from 'lucide-react';
import { ReviewCard, ReviewData } from './ReviewCard';
import { useResponsive } from '../hooks/useResponsive';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext';
import { getReviews, Review } from '../services/reviewService';

export const ResponsiveLandingPage: React.FC = () => {
  const [recentReviews, setRecentReviews] = useState<ReviewData[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const { isMobile } = useResponsive();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const navigate = useNavigate();
  
  // Transform Review to ReviewData interface
  const transformReviewData = (review: Review): ReviewData => {
    const theme: ReviewData['theme'] = ['purple', 'green', 'orange', 'blue', 'red'][review.id % 5] as ReviewData['theme'];
    
    // Debug logging to understand the data structure
    console.log('🔍 Transforming review:', {
      reviewId: review.id,
      userId: review.userId,
      gameId: review.gameId,
      reviewIgdbId: (review as any).igdb_id,
      game: review.game,
      gameIgdbId: (review.game as any)?.igdb_id,
      gameGameId: (review.game as any)?.game_id,
    });
    
    // Use rating.igdb_id if game is missing, otherwise use game's igdb_id or game_id
    const igdbId = (review as any).igdb_id?.toString() || 
                   (review.game as any)?.igdb_id?.toString() || 
                   (review.game as any)?.game_id || 
                   review.gameId.toString();
    console.log('📍 Final IGDB ID for routing:', igdbId);
    
    return {
      id: review.id.toString(),
      userId: review.userId.toString(),
      gameId: review.gameId.toString(),
      // Use the game's igdb_id (integer) for proper navigation, fallback to game_id (string), then database id
      igdbGameId: igdbId,
      gameTitle: review.game?.name || 'Unknown Game',
      rating: review.rating,
      text: review.review || '',
      date: review.postDateTime,
      hasText: !!review.review && review.review.trim().length > 0,
      author: review.user?.name || 'Anonymous',
      authorAvatar: review.user?.picurl || '',
      likeCount: review.likeCount || 0,
      commentCount: review.commentCount || 0,
      theme
    };
  };
  
  // Load recent reviews
  useEffect(() => {
    const loadRecentReviews = async () => {
      try {
        setReviewsLoading(true);
        setReviewsError(null);
        
        const result = await getReviews(10); // Get up to 10 recent reviews
        
        if (result.success && result.data) {
          const transformedReviews = result.data.map(transformReviewData);
          // Limit based on screen size
          const limitedReviews = transformedReviews.slice(0, isMobile ? 3 : 4);
          setRecentReviews(limitedReviews);
        } else {
          setReviewsError(result.error || 'Failed to load reviews');
        }
      } catch (error) {
        console.error('Failed to load recent reviews:', error);
        setReviewsError('Failed to load reviews');
      } finally {
        setReviewsLoading(false);
      }
    };
    
    loadRecentReviews();
  }, [isMobile]);


  // Handle join community button click
  const handleJoinCommunity = () => {
    if (!isAuthenticated) {
      openModal(); // Use global auth modal
      return;
    }
    // Navigate to users page if already authenticated
    navigate('/users');
  };

  if (isMobile) {
    return (
      <div className="min-h-screen bg-gray-900">
        {/* Mobile Hero Section */}
        <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 px-4 py-12">
          <div className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Gamepad2 className="h-12 w-12 text-purple-400" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-4">
              Discover Your Next
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 block">
                Gaming Adventure
              </span>
            </h1>
            <p className="text-gray-300 mb-8 leading-relaxed">
              Join the ultimate gaming community. Rate, review, and discover games through social gaming.
            </p>
            <div className="space-y-3">
              <Link
                to="/search"
                className="block w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <div className="flex items-center justify-center gap-2">
                  <Search className="h-5 w-5" />
                  Explore Games
                </div>
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/users"
                  className="block w-full px-6 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors font-medium"
                >
                  <div className="flex items-center justify-center gap-2">
                    Browse Community
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </Link>
              ) : (
                <button
                  onClick={handleJoinCommunity}
                  className="block w-full px-6 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors font-medium"
                >
                  <div className="flex items-center justify-center gap-2">
                    Join Community
                    <ArrowRight className="h-5 w-5" />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Features Section */}
        <div className="px-4 py-12 bg-gray-800">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-3">Why GameVault?</h2>
            <p className="text-gray-400">The social gaming platform built for enthusiasts</p>
          </div>
          <div className="space-y-6">
            <div className="text-center p-6 bg-gray-700 rounded-lg">
              <Star className="h-10 w-10 text-purple-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Precise Ratings</h3>
              <p className="text-gray-400 text-sm">Rate games on a 1-10 scale with half-point precision.</p>
            </div>
            <div className="text-center p-6 bg-gray-700 rounded-lg">
              <Users className="h-10 w-10 text-blue-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Social Discovery</h3>
              <p className="text-gray-400 text-sm">Follow gamers with similar tastes and discover games.</p>
            </div>
            <div className="text-center p-6 bg-gray-700 rounded-lg">
              <TrendingUp className="h-10 w-10 text-green-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-white mb-2">Personal Stats</h3>
              <p className="text-gray-400 text-sm">Track your gaming journey with detailed statistics.</p>
            </div>
          </div>
        </div>


        {/* Mobile Recent Reviews Section */}
        <div className="px-4 py-12 bg-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Reviews</h2>
            <Link
              to="/users"
              className="text-purple-400 hover:text-purple-300 transition-colors text-sm flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {reviewsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-600 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-600 rounded mb-2 w-3/4"></div>
                        <div className="h-3 bg-gray-600 rounded mb-3 w-1/2"></div>
                        <div className="h-3 bg-gray-600 rounded w-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviewsError ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">Failed to load recent reviews</p>
              <p className="text-sm text-gray-500">{reviewsError}</p>
            </div>
          ) : recentReviews.length > 0 ? (
            <div className="space-y-4">
              {recentReviews.map((review) => (
                <ReviewCard key={review.id} review={review} compact />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">No recent reviews yet</p>
              <p className="text-sm text-gray-500 mt-2">Be the first to share your gaming experience!</p>
            </div>
          )}
        </div>

      </div>
    );
  }

  // Desktop version
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              Discover Your Next
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                {' '}Gaming Adventure
              </span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Join the ultimate gaming community. Rate, review, and discover games
              through the power of social gaming. Your next favorite game is just a click away.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/search"
                className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 text-lg font-medium"
              >
                <Search className="h-5 w-5" />
                Explore Games
              </Link>
              {isAuthenticated ? (
                <Link
                  to="/users"
                  className="px-8 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors flex items-center gap-2 text-lg font-medium"
                >
                  Browse Community
                  <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  onClick={handleJoinCommunity}
                  className="px-8 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors flex items-center gap-2 text-lg font-medium"
                >
                  Join Community
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">Why GameVault?</h2>
            <p className="text-gray-400 text-lg">The social gaming platform built for enthusiasts</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <Star className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Precise Ratings</h3>
              <p className="text-gray-400">Rate games on a 1-10 scale with half-point precision. Your opinions matter.</p>
            </div>
            <div className="text-center p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <Users className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Social Discovery</h3>
              <p className="text-gray-400">Follow gamers with similar tastes and discover your next favorite game.</p>
            </div>
            <div className="text-center p-6 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <TrendingUp className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Personal Stats</h3>
              <p className="text-gray-400">Track your gaming journey with detailed statistics and personal lists.</p>
            </div>
          </div>
        </div>
      </div>


      {/* Recent Reviews Section */}
      <div className="py-16 bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">Recent Reviews</h2>
            <Link
              to="/users"
              className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-2"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {reviewsLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-600 rounded mb-3 w-3/4"></div>
                        <div className="h-3 bg-gray-600 rounded mb-4 w-1/2"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-gray-600 rounded w-full"></div>
                          <div className="h-3 bg-gray-600 rounded w-4/5"></div>
                          <div className="h-3 bg-gray-600 rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reviewsError ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg mb-2">Failed to load recent reviews</p>
              <p className="text-sm text-gray-500">{reviewsError}</p>
            </div>
          ) : recentReviews.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {recentReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No recent reviews yet</p>
              <p className="text-sm text-gray-500 mt-2">Be the first to share your gaming experience!</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
