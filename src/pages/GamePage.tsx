import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, User, MessageCircle, Plus, Check, Heart, ScrollText } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { AuthModal } from '../components/auth/AuthModal';
import { igdbService, Game } from '../services/igdbApi';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { getGameProgress, markGameStarted, markGameCompleted } from '../services/gameProgressService';
import { ensureGameExists, getUserReviewForGame } from '../services/reviewService';
import { generateRatingDistribution } from '../utils/dataTransformers';

export const GamePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();

  // Use the working igdbService for game data
  const [game, setGame] = useState<Game | null>(null);
  const [gameLoading, setGameLoading] = useState(false);
  const [gameError, setGameError] = useState<Error | null>(null);

  // Refetch function
  const refetchGame = async () => {
    if (!id) return;
    
    setGameLoading(true);
    setGameError(null);

    try {
      const gameData = await igdbService.getGameById(id);
      if (gameData) {
        setGame(gameData);
      } else {
        setGameError(new Error('Game not found'));
      }
    } catch (error) {
      setGameError(error as Error);
    } finally {
      setGameLoading(false);
    }
  };

  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [progressLoading, setProgressLoading] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [userReviewLoading, setUserReviewLoading] = useState(false);

  // Load game data
  useEffect(() => {
    const loadGame = async () => {
      if (!id) return;

      setGameLoading(true);
      setGameError(null);

      try {
        console.log('Loading game with ID:', id);
        const gameData = await igdbService.getGameById(id);
        
        if (gameData) {
          setGame(gameData);
          console.log('✅ Game loaded successfully:', gameData.title);
        } else {
          setGameError(new Error('Game not found'));
          console.log('❌ Game not found for ID:', id);
        }
      } catch (error) {
        console.error('❌ Failed to load game:', error);
        setGameError(error as Error);
      } finally {
        setGameLoading(false);
      }
    };

    loadGame();
  }, [id]);

  // Load game progress when user is authenticated and game is loaded
  useEffect(() => {
    const loadGameProgress = async () => {
      if (!game || !id || !isAuthenticated) return;

      setProgressLoading(true);
      try {
        console.log('Loading game progress for game ID:', id);
        const result = await getGameProgress(parseInt(id));
        
        if (result.success && result.data) {
          setIsStarted(result.data.started);
          setIsCompleted(result.data.completed);
          console.log('✅ Game progress loaded:', result.data);
        } else {
          // No progress found, set to false
          setIsStarted(false);
          setIsCompleted(false);
          console.log('ℹ️ No game progress found');
        }
      } catch (error) {
        console.error('❌ Error loading game progress:', error);
        setIsStarted(false);
        setIsCompleted(false);
      } finally {
        setProgressLoading(false);
      }
    };

    loadGameProgress();
  }, [game, id, isAuthenticated]);

  // Check if user has already reviewed this game
  useEffect(() => {
    const checkUserReview = async () => {
      if (!game || !id || !isAuthenticated) {
        setUserHasReviewed(false);
        return;
      }

      setUserReviewLoading(true);
      try {
        console.log('Checking if user has reviewed game ID:', id);
        const result = await getUserReviewForGame(parseInt(id));
        
        if (result.success) {
          setUserHasReviewed(!!result.data);
          console.log('User has reviewed game:', !!result.data);
        } else {
          console.error('Error checking user review:', result.error);
          setUserHasReviewed(false);
        }
      } catch (error) {
        console.error('Error checking user review:', error);
        setUserHasReviewed(false);
      } finally {
        setUserReviewLoading(false);
      }
    };

    checkUserReview();
  }, [game, id, isAuthenticated]);

  // Load reviews when game data is available
  useEffect(() => {
    const loadReviews = async () => {
      if (!game || !id) return;

      setReviewsLoading(true);
      setReviewsError(null);

      try {
        console.log('Loading reviews for game ID:', id);

        // Check if game exists in our database
        const { data: existingGame, error: dbError } = await supabase
          .from('game')
          .select('id')
          .eq('game_id', id)
          .single();

        console.log('Database query result:', existingGame, 'Error:', dbError);

        if (existingGame) {
          // Fetch reviews for this game
          console.log('Fetching reviews for game:', existingGame.id);
          const { data: gameReviews, error: reviewsError } = await supabase
            .from('rating')
            .select(`
              *,
              user:user_id(*)
            `)
            .eq('game_id', existingGame.id);

          console.log('Reviews fetched:', gameReviews, 'Error:', reviewsError);

          if (!reviewsError && gameReviews) {
            setReviews(gameReviews);
          } else if (reviewsError) {
            setReviewsError('Failed to load reviews');
          }
        } else {
          console.log('Game not found in local database');
          setReviews([]);
        }
      } catch (err) {
        console.error('Error loading reviews:', err);
        setReviewsError('Failed to load reviews');
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [game, id]);

  // Handle auth-required actions
  const handleAuthRequiredAction = (action: string) => {
    if (!isAuthenticated) {
      setPendingAction(action);
      setShowAuthModal(true);
      return;
    }
    executeAction(action);
  };

  const executeAction = async (action: string) => {
    if (!game || !id) return;

    switch (action) {
      case 'mark_started':
        await handleMarkStarted();
        break;
      case 'mark_completed':
        await handleMarkCompleted();
        break;
      case 'write_review':
        // Navigate to review page - handled by Link component
        break;
    }
  };

  const handleMarkStarted = async () => {
    if (!game || !id || isStarted) return; // Don't allow if already started

    setProgressLoading(true);
    try {
      // First ensure the game exists in the database
      const ensureResult = await ensureGameExists(
        parseInt(id),
        game.title,
        game.coverImage,
        game.genre,
        game.releaseDate
      );

      if (!ensureResult.success) {
        console.error('Failed to ensure game exists:', ensureResult.error);
        alert(`Failed to add game to database: ${ensureResult.error}`);
        return;
      }

      // Mark game as started
      const result = await markGameStarted(parseInt(id));
      
      if (result.success) {
        setIsStarted(true);
        console.log('✅ Game marked as started');
      } else {
        console.error('Failed to mark game as started:', result.error);
        alert(`Failed to mark game as started: ${result.error}`);
      }
    } catch (error) {
      console.error('Error marking game as started:', error);
      alert('Failed to mark game as started. Please try again.');
    } finally {
      setProgressLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!game || !id || isCompleted) return; // Don't allow if already completed

    setProgressLoading(true);
    try {
      // First ensure the game exists in the database
      const ensureResult = await ensureGameExists(
        parseInt(id),
        game.title,
        game.coverImage,
        game.genre,
        game.releaseDate
      );

      if (!ensureResult.success) {
        console.error('Failed to ensure game exists:', ensureResult.error);
        alert(`Failed to add game to database: ${ensureResult.error}`);
        return;
      }

      // Mark game as completed (this will also mark as started)
      const result = await markGameCompleted(parseInt(id));
      
      if (result.success) {
        setIsStarted(true); // Auto-mark as started when completed
        setIsCompleted(true);
        console.log('✅ Game marked as completed');
      } else {
        console.error('Failed to mark game as completed:', result.error);
        alert(`Failed to mark game as completed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error marking game as completed:', error);
      alert('Failed to mark game as completed. Please try again.');
    } finally {
      setProgressLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingAction) {
      executeAction(pendingAction);
      setPendingAction(null);
    }
  };

  // Transform reviews to match ReviewCard component expectations
  const transformedReviews = reviews.map(review => ({
    id: review.id.toString(),
    userId: review.user_id.toString(),
    gameId: review.game_id.toString(),
    gameTitle: game?.title || 'Unknown Game',
    rating: review.rating,
    text: review.review || '',
    date: new Date(review.post_date_time).toISOString().split('T')[0],
    hasText: !!review.review,
    likeCount: 0, // To be implemented with real data
    commentCount: 0, // To be implemented with real data
    author: review.user?.name || 'Anonymous',
    authorAvatar: review.user?.picurl || '/default-avatar.png'
  }));

  const topReviews = transformedReviews.filter(r => r.rating >= 8).slice(0, 3);
  const recentReviews = transformedReviews.slice(0, 5);

  const averageRating = transformedReviews.length > 0
    ? transformedReviews.reduce((sum, review) => sum + review.rating, 0) / transformedReviews.length
    : 0;

  // Calculate rating distribution from actual reviews data
  // Only calculate when reviews are loaded to avoid empty state during loading
  const ratingDistribution = reviewsLoading ? 
    Array.from({ length: 10 }, (_, i) => ({ rating: 10 - i, count: 0 })) : // Show empty bars while loading
    generateRatingDistribution(reviews);

  const maxCount = Math.max(...ratingDistribution.map(d => d.count), 1); // Ensure minimum of 1 to avoid division by 0

  if (gameLoading) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8 mb-12">
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                <div className="md:flex">
                  <div className="md:flex-shrink-0">
                    <div className="h-64 w-full bg-gray-700 md:h-80 md:w-64"></div>
                  </div>
                  <div className="p-8">
                    <div className="h-8 bg-gray-700 rounded mb-4"></div>
                    <div className="space-y-2 mb-6">
                      <div className="h-4 bg-gray-700 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-700 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                    </div>
                    <div className="h-20 bg-gray-700 rounded mb-6"></div>
                    <div className="flex gap-4">
                      <div className="h-10 bg-gray-700 rounded w-32"></div>
                      <div className="h-10 bg-gray-700 rounded w-32"></div>
                      <div className="h-10 bg-gray-700 rounded w-32"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-6 bg-gray-700 rounded mb-4"></div>
              <div className="text-center mb-6">
                <div className="h-12 bg-gray-700 rounded mb-2"></div>
                <div className="h-6 bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-1/2 mx-auto"></div>
              </div>
            </div>
          </div>

          {/* Loading indicator with cache status */}
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mr-2"></div>
            <span className="text-gray-400">Loading game data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (gameError || !game) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">
              {gameError?.message || 'Game not found'}
            </h1>
            <p className="text-gray-400 mb-4">
              Debug: Tried to load game with ID: {id}
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={refetchGame}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
              <Link
                to="/search"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
              >
                Browse Other Games
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">


        {/* Game Header */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Game Cover and Info */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:flex-shrink-0">
                  <img
                    src={game.coverImage || '/placeholder-game.jpg'}
                    alt={game.title}
                    className="h-64 w-full object-cover md:h-80 md:w-64"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-game.jpg';
                    }}
                  />
                </div>
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-white mb-4">
                    {game.title}
                  </h1>
                  <div className="space-y-2 text-gray-400 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {game.releaseDate ? new Date(game.releaseDate).getFullYear() : 'Unknown'}
                      </span>
                    </div>
                    {game.genre && (
                      <div><strong>Genre:</strong> {game.genre}</div>
                    )}
                    {game.platforms && game.platforms.length > 0 && (
                      <div><strong>Platforms:</strong> {game.platforms.join(', ')}</div>
                    )}
                    {game.rating > 0 && (
                      <div><strong>Rating:</strong> {game.rating}/10</div>
                    )}
                    {game.developer && (
                      <div><strong>Developer:</strong> {game.developer}</div>
                    )}
                    {game.publisher && (
                      <div><strong>Publisher:</strong> {game.publisher}</div>
                    )}
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {game.description || 'No description available.'}
                  </p>
                </div>
              </div>

              {/* User Actions - Checkboxes and Write Review */}
              <div className="flex items-center gap-4 p-6 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAuthRequiredAction('mark_started')}
                    disabled={isStarted || progressLoading}
                    className={`relative w-6 h-6 border-2 rounded transition-all duration-200 flex items-center justify-center overflow-visible ${
                      isStarted
                        ? 'bg-green-100 border-green-500 cursor-not-allowed'
                        : progressLoading
                        ? 'bg-gray-700 border-gray-500 cursor-not-allowed opacity-50'
                        : 'border-gray-400 bg-gray-800 hover:bg-gray-700 cursor-pointer'
                    }`}
                  >
                    {progressLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                    ) : isStarted ? (
                      <Check className="h-6 w-6 text-green-600 stroke-[2]" />
                    ) : null}
                  </button>
                  <span className={`text-sm ${isStarted ? 'text-green-400' : 'text-gray-300'}`}>
                    {isStarted ? 'Started ✓' : 'Started Game'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleAuthRequiredAction('mark_completed')}
                    disabled={isCompleted || progressLoading}
                    className={`relative w-6 h-6 border-2 rounded transition-all duration-200 flex items-center justify-center overflow-visible ${
                      isCompleted
                        ? 'bg-green-100 border-green-500 cursor-not-allowed'
                        : progressLoading
                        ? 'bg-gray-700 border-gray-500 cursor-not-allowed opacity-50'
                        : 'border-gray-400 bg-gray-800 hover:bg-gray-700 cursor-pointer'
                    }`}
                  >
                    {progressLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                    ) : isCompleted ? (
                      <Check className="h-6 w-6 text-green-600 stroke-[2]" />
                    ) : null}
                  </button>
                  <span className={`text-sm ${isCompleted ? 'text-green-400' : 'text-gray-300'}`}>
                    {isCompleted ? 'Finished ✓' : 'Finished Game'}
                  </span>
                </div>

                <div className="flex items-center gap-3 ml-4">
                  {isAuthenticated ? (
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/review/${game.id}`}
                        className="relative w-6 h-6 border-2 rounded transition-all duration-200 flex items-center justify-center overflow-visible bg-purple-600 border-purple-500 hover:bg-purple-700 cursor-pointer"
                      >
                        <ScrollText className="h-4 w-4 text-white" />
                      </Link>
                      <Link
                        to={`/review/${game.id}`}
                        className={`text-sm ${userHasReviewed ? 'text-purple-400' : 'text-gray-300'} hover:text-purple-400 transition-colors`}
                      >
                        {userReviewLoading ? 'Loading...' : userHasReviewed ? 'Edit Review' : 'Write a Review'}
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleAuthRequiredAction('write_review')}
                        className="relative w-6 h-6 border-2 rounded transition-all duration-200 flex items-center justify-center overflow-visible bg-purple-600 border-purple-500 hover:bg-purple-700 cursor-pointer"
                      >
                        <ScrollText className="h-4 w-4 text-white" />
                      </button>
                      <span className="text-sm text-gray-300">
                        Write a Review
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Rating Summary */}
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Ratings</h3>
                <span className="text-sm text-blue-400">
                  {reviewsLoading ? 'Loading...' : `${reviews.length} fans`}
                </span>
              </div>
              <div className="border-b border-gray-700 mb-4"></div>

              {reviewsError ? (
                <div className="text-center py-4">
                  <p className="text-red-400 text-sm mb-2">{reviewsError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="text-purple-400 text-xs hover:text-purple-300"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <div className="flex items-end justify-between">
                  <div className="flex items-end gap-1">
                    <span className="text-green-500 text-sm">1</span>
                    <div className="flex items-end gap-[2px]">
                      {ratingDistribution.map((item) => (
                        <div
                          key={item.rating}
                          className="w-6 bg-gray-700 rounded-sm"
                          style={{
                            height: `${Math.max(4, (item.count / maxCount) * 40)}px`,
                            backgroundColor: item.rating >= 8 ? '#4ade80' : '#374151'
                          }}
                        ></div>
                      ))}
                    </div>
                    <span className="text-green-500 text-sm">10</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Top Reviews</h2>
            {reviewsLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                <span className="text-sm">Loading reviews...</span>
              </div>
            )}
          </div>

          {/* Reviews content */}
          {transformedReviews.length > 0 ? (
            <div className="space-y-4">
              {topReviews.map(review => (
                <div key={review.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={review.authorAvatar || '/default-avatar.png'}
                      alt={review.author}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div 
                      className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm"
                      style={{ display: 'none' }}
                    >
                      {review.author ? review.author.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="text-white font-medium">{review.author}</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-yellow-500">{review.rating}/10</span>
                    </div>
                  </div>
                  {review.text && (
                    <p className="text-gray-300 text-sm">{review.text}</p>
                  )}
                </div>
              ))}
            </div>
          ) : !reviewsLoading && (
            <div className="text-center py-8 text-gray-500">
              <p>No reviews yet. Be the first to review this game!</p>
              {!isAuthenticated && (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="mt-3 text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Sign in to write a review
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingAction(null);
        }}
        onLoginSuccess={handleAuthSuccess}
        onSignupSuccess={handleAuthSuccess}
      />
    </div>
  );
};
