import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, User, MessageCircle, Heart, X } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { gameDataService } from '../services/gameDataService';
import type { GameWithCalculatedFields } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';

interface Review {
  id: string;
  user_id: number;
  game_id: number;
  rating: number;
  review: string;
  post_date_time: string;
  user: {
    id: number;
    name: string;
    avatar_url?: string;
  };
}

interface Comment {
  id: string;
  review_id: string;
  user_id: number;
  comment: string;
  post_date_time: string;
  hearts_count: number;
  user_has_hearted: boolean;
  user: {
    id: number;
    name: string;
    avatar_url?: string;
  };
}

export const ReviewPage: React.FC = () => {
  const { userId, gameId } = useParams<{ userId: string; gameId: string }>();
  const { isAuthenticated, user } = useAuth();
  
  const [game, setGame] = useState<GameWithCalculatedFields | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullReview, setShowFullReview] = useState(false);
  const [reviewExpanded, setReviewExpanded] = useState(false);

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
          user:user_id (
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
            user:user_id (
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

      // Load comments for this review
      await loadComments(reviewData.id);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load review');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async (reviewId: string) => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('review_comments')
        .select(`
          id,
          review_id,
          user_id,
          comment,
          post_date_time,
          user:user_id (
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

      // Get heart counts and user heart status for each comment
      const commentsWithHearts = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: heartsData } = await supabase
            .from('comment_hearts')
            .select('user_id')
            .eq('comment_id', comment.id);

          const heartsCount = heartsData?.length || 0;
          const userHasHearted = isAuthenticated && heartsData?.some(heart => heart.user_id === user?.id) || false;

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

  const handleHeartComment = async (commentId: string) => {
    if (!isAuthenticated || !user?.id) return;

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    try {
      if (comment.user_has_hearted) {
        // Remove heart
        await supabase
          .from('comment_hearts')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id);
      } else {
        // Add heart
        await supabase
          .from('comment_hearts')
          .insert({
            comment_id: commentId,
            user_id: user.id
          });
      }

      // Reload comments to update heart counts
      if (review) {
        await loadComments(review.id);
      }
    } catch (err) {
      console.error('Error toggling heart:', err);
    }
  };

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
                    className="text-3xl font-bold text-white mb-4 hover:text-purple-400 transition-colors"
                  >
                    {game.name}
                  </Link>
                  <div className="space-y-2 text-gray-400 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {game.release_date ? new Date(game.release_date).getFullYear() : 'Unknown'}
                      </span>
                    </div>
                    {game.genres && game.genres.length > 0 && (
                      <div><strong>Genre:</strong> {game.genres.join(', ')}</div>
                    )}
                    {game.platforms && game.platforms.length > 0 && (
                      <div><strong>Platforms:</strong> {game.platforms.join(', ')}</div>
                    )}
                  </div>
                  
                  {/* Review Content */}
                  <div className="bg-gray-700 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <img
                        src={review.user.avatar_url || '/default-avatar.png'}
                        alt={review.user.username || review.user.name}
                        className="w-10 h-10 rounded-full object-cover"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                      <div 
                        className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm"
                        style={{ display: 'none' }}
                      >
                        {(review.user.username || review.user.name) ? (review.user.username || review.user.name).charAt(0).toUpperCase() : '?'}
                      </div>
                      <div>
                        <Link
                          to={`/user/${review.user.id}`}
                          className="text-white font-medium hover:text-purple-400 transition-colors"
                        >
                          {review.user.username || review.user.name}
                        </Link>
                        <div className="text-sm text-gray-400">
                          {new Date(review.post_date_time).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    {reviewText && (
                      <div className="text-gray-300 leading-relaxed">
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
                <div className="flex justify-center mb-2">
                  <StarRating rating={review.rating} />
                </div>
                <div className="text-sm text-gray-400">
                  out of 10
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div>
          <div className="border-b border-gray-700 mb-6"></div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Comments</h2>
          </div>

          <div className="space-y-4">
            {comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={comment.user.avatar_url || '/default-avatar.png'}
                      alt={comment.user.username || comment.user.name}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ display: 'none' }}
                    >
                      {(comment.user.username || comment.user.name) ? (comment.user.username || comment.user.name).charAt(0).toUpperCase() : '?'}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          to={`/user/${comment.user.id}`}
                          className="text-white font-medium hover:text-purple-400 transition-colors"
                        >
                          {comment.user.username || comment.user.name}
                        </Link>
                        <span className="text-gray-400 text-sm">
                          {new Date(comment.post_date_time).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-2">{comment.comment}</p>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleHeartComment(comment.id)}
                          disabled={!isAuthenticated}
                          className={`flex items-center gap-1 text-sm transition-colors ${
                            comment.user_has_hearted 
                              ? 'text-red-400' 
                              : 'text-gray-400 hover:text-red-400'
                          } ${!isAuthenticated ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <Heart 
                            className={`h-4 w-4 ${
                              comment.user_has_hearted ? 'fill-current' : ''
                            }`} 
                          />
                          {comment.hearts_count > 0 && (
                            <span className="text-green-400 font-medium">
                              {comment.hearts_count}
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p>No comments yet. Be the first to comment on this review!</p>
              </div>
            )}
          </div>
        </div>
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
                    {new Date(review.post_date_time).toLocaleDateString()}
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
