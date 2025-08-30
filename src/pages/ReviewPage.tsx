import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, X } from 'lucide-react';
import { gameDataService } from '../services/gameDataService';
import type { GameWithCalculatedFields } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { ReviewInteractions } from '../components/ReviewInteractions';
import { useReviewInteractions } from '../hooks/useReviewInteractions';

interface Review {
  id: string;
  user_id: number;
  game_id: number;
  rating: number;
  review: string;
  post_date_time: string;
  platform_id?: number;
  platform?: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    name: string;
    username?: string;
    avatar_url?: string;
  };
}


export const ReviewPage: React.FC = () => {
  const { userId, gameId } = useParams<{ userId: string; gameId: string }>();
  const { isAuthenticated, user } = useAuth();
  
  const [game, setGame] = useState<GameWithCalculatedFields | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullReview, setShowFullReview] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);

  // Get current user ID for review interactions
  const currentUserId = user?.id ? parseInt(user.id.toString()) : undefined;
  
  // Use review interactions hook
  const {
    likeCount,
    commentCount,
    isLiked,
    comments,
    isLoadingComments,
    isLoadingLike,
    toggleLike,
    postComment
  } = useReviewInteractions({
    reviewId: review ? parseInt(review.id) : 0,
    userId: currentUserId
  });

  useEffect(() => {
    if (userId && gameId) {
      loadReviewData();
    }
  }, [userId, gameId]);

  const loadReviewData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate URL parameters
      const userIdNum = parseInt(userId!);
      const gameIdNum = parseInt(gameId!);

      if (isNaN(userIdNum) || isNaN(gameIdNum)) {
        throw new Error('Invalid review URL parameters. User ID and Game ID must be numbers.');
      }

      console.log('🎮 ReviewPage - Loading review data:', {
        userId: userIdNum,
        gameId: gameIdNum,
        originalParams: { userId, gameId }
      });

      let reviewData = null;
      let reviewError = null;

      // Strategy 1: Try igdb_id match (current approach)
      const { data: igdbMatchData, error: igdbMatchError } = await supabase
        .from('rating')
        .select(`
          id,
          user_id,
          game_id,
          igdb_id,
          rating,
          review,
          post_date_time,
          platform_id,
          platform:platform_id(
            id,
            name
          ),
          user!fk_rating_user(
            id,
            username,
            name,
            avatar_url
          )
        `)
        .eq('user_id', userIdNum)
        .eq('igdb_id', gameIdNum)
        .maybeSingle();

      console.log('🎮 ReviewPage - IGDB ID match result:', { igdbMatchData, igdbMatchError });

      if (igdbMatchData) {
        reviewData = igdbMatchData;
      } else {
        // Strategy 2: Fallback to game_id match via join
        console.log('🔄 ReviewPage - Trying fallback strategy with game table join...');
        const { data: gameIdMatchData, error: gameIdMatchError } = await supabase
          .from('rating')
          .select(`
            id,
            user_id,
            game_id,
            igdb_id,
            rating,
            review,
            post_date_time,
            platform_id,
            platform:platform_id(
              id,
              name
            ),
            user!fk_rating_user(
              id,
              username,
              name,
              avatar_url
            ),
            game:game_id!inner(igdb_id)
          `)
          .eq('user_id', userIdNum)
          .eq('game.igdb_id', gameIdNum)
          .maybeSingle();
          
        console.log('🎮 ReviewPage - Game ID fallback result:', { gameIdMatchData, gameIdMatchError });
        
        if (gameIdMatchData) {
          reviewData = gameIdMatchData;
        } else {
          reviewError = igdbMatchError || gameIdMatchError || new Error('Review not found with either strategy');
        }
      }

      if (reviewError || !reviewData) {
        const errorMsg = reviewError?.message || 'Review not found';
        const detailedError = `Review not found for user ${userIdNum} and game ${gameIdNum}. ${errorMsg}`;
        console.error('❌ ReviewPage error:', { reviewError, userId: userIdNum, gameId: gameIdNum });
        throw new Error(detailedError);
      }

      setReview(reviewData);

      // Now load game data using IGDB ID
      const gameData = await gameDataService.getGameByIGDBId(gameIdNum);
      console.log('🎮 ReviewPage - Game data result:', gameData);
      
      // If game not in database, create a minimal game object
      if (!gameData) {
        // Try to get basic game info from IGDB or create placeholder
        const placeholderGame: GameWithCalculatedFields = {
          id: reviewData.game_id,
          igdb_id: reviewData.igdb_id,
          name: 'Game #' + reviewData.igdb_id,
          cover_url: null,
          release_date: null,
          genres: [],
          platforms: [],
          summary: null,
          averageUserRating: reviewData.rating,
          totalUserRatings: 1
        } as GameWithCalculatedFields;
        
        setGame(placeholderGame);
      } else {
        setGame(gameData);
      }

      // Comments will be loaded by ReviewInteractions component

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  // Remove broken loadComments function - ReviewInteractions handles this
  /*
  const loadComments = async (reviewId: string) => {
    // This function was using non-existent tables
    // Now handled by ReviewInteractions component
        .select(`
          id,
          review_id,
          user_id,
          comment,
          post_date_time,
          user(
            id,
            username,
            name,
            avatar_url
          )
        `)
        .eq('review_id', reviewId)
        .order('post_date_time', { ascending: true });

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
        return;
      }

      // Get heart counts and user heart status for each comment - optimized with computed columns
      const commentsWithHearts = await Promise.all(
        (commentsData || []).map(async (comment) => {
          // Use computed like_count instead of manual counting
          const heartsCount = comment.like_count || 0;
          
          // Still need to check if current user has liked this comment
          let userHasHearted = false;
          if (isAuthenticated && user?.id) {
            const { data: userLikeData } = await supabase
              .from('content_like')
              .select('id')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .single();
            
            userHasHearted = !!userLikeData;
          }

          return {
            ...comment,
            hearts_count: heartsCount,
            user_has_hearted: userHasHearted
          };
        })
      );

      setComments(commentsWithHearts);
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  };

  // Remove broken handleHeartComment - ReviewInteractions handles this
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mr-2"></div>
            <span className="text-gray-400">Loading review...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game || !review) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">
              {error || 'Review not found'}
            </h1>
            <Link
              to="/search"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Browse Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const reviewText = review.review || '';
  const isLongReview = reviewText.length > 500;

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Review Header */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Game Cover and Info */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:flex-shrink-0">
                  <img
                    src={game.cover_url || '/placeholder-game.jpg'}
                    alt={game.name}
                    className="h-64 w-full object-cover md:h-80 md:w-64"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-game.jpg';
                    }}
                  />
                </div>
                <div className="p-8">
                  <Link 
                    to={`/game/${gameId}`}
                    className="text-3xl font-bold text-white mb-2 hover:text-purple-400 transition-colors block"
                  >
                    {game.name}
                  </Link>
                  
                  {/* Review Info */}
                  <div className="text-gray-400 mb-1">
                    Review by{' '}
                    <Link
                      to={`/user/${review.user.id}`}
                      className="text-white font-medium hover:text-purple-400 transition-colors"
                    >
                      {review.user.username || review.user.name}
                    </Link>
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-4">
                    {review.post_date_time ? new Date(review.post_date_time).toLocaleDateString() : 'Unknown date'}
                    {review.platform && review.platform.name && (
                      <>
                        {' • '}
                        <span>{review.platform.name}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Review Text */}
                  {reviewText && (
                    <div className="text-gray-300 leading-relaxed mt-4">
                      {isLongReview && !reviewExpanded ? (
                        <>
                          <p>{reviewText.substring(0, 500)}...</p>
                          <button
                            onClick={() => setShowFullReview(true)}
                            className="mt-2 text-purple-400 hover:text-purple-300 transition-colors text-sm"
                          >
                            more
                          </button>
                        </>
                      ) : (
                        <p>{reviewText}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Review Score Box */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                  {review.user.username || review.user.name}'s rating
                </h3>
              </div>
              <div className="border-b border-gray-700 mb-4"></div>
              
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">
                  {review.rating.toFixed(1)}
                </div>
                <div className="mb-2">
                  {/* Progress bar */}
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-green-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${(review.rating / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="text-sm text-gray-400">
                  out of 10
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section - Using the working ReviewInteractions component */}
        {review && (
          <div>
            <div className="border-b border-gray-700 mb-6"></div>
            <ReviewInteractions
              reviewId={review.id}
              initialLikeCount={likeCount}
              initialCommentCount={commentCount}
              isLiked={isLiked}
              onLike={toggleLike}
              onUnlike={toggleLike}
              comments={comments || []}
              onAddComment={postComment}
              isLoadingComments={isLoadingComments}
              isLoadingLike={isLoadingLike}
              reviewAuthorId={review.user_id}
              currentUserId={currentUserId}
            />
          </div>
        )}
      </div>

      {/* Full Review Modal */}
      {showFullReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Full Review</h3>
              <button
                onClick={() => setShowFullReview(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <img
                  src={review.user.avatar_url || '/default-avatar.png'}
                  alt={review.user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="text-white font-medium">{review.user.username || review.user.name}</div>
                  <div className="text-sm text-gray-400">
                    {review.post_date_time ? new Date(review.post_date_time).toLocaleDateString() : 'Unknown date'}
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-yellow-500">{review.rating}/10</span>
                </div>
              </div>
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {reviewText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
