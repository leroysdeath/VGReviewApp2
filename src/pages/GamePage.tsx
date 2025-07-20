import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, User, MessageCircle, Plus, Check, Heart, ScrollText } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { useIGDBGame } from '../hooks/useIGDBCache';
import { supabase } from '../services/supabase';

export const GamePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const gameIdNumber = id ? parseInt(id) : null;
  
  // Use the new caching hook for game data
  const { 
    data: game, 
    loading: gameLoading, 
    error: gameError, 
    cached: isGameCached, 
    refetch: refetchGame,
    isStale: isGameStale 
  } = useIGDBGame(gameIdNumber);

  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

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

  // Transform reviews to match ReviewCard component expectations
  const transformedReviews = reviews.map(review => ({
    id: review.id.toString(),
    userId: review.user_id.toString(),
    gameId: review.game_id.toString(),
    rating: review.rating,
    text: review.review || '',
    date: new Date(review.post_date_time).toISOString().split('T')[0],
    hasText: !!review.review,
    likeCount: 0, // To be implemented with real data
    commentCount: 0, // To be implemented with real data
    author: review.user?.name || 'Anonymous',
    authorAvatar: review.user?.picurl || 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=150'
  }));
  
  const topReviews = transformedReviews.filter(r => r.rating >= 8).slice(0, 3);
  const recentReviews = transformedReviews.slice(0, 5);

  const averageRating = transformedReviews.length > 0 
    ? transformedReviews.reduce((sum, review) => sum + review.rating, 0) / transformedReviews.length 
    : 0;

  const ratingDistribution = [
    { rating: 10, count: 15 },
    { rating: 9, count: 25 },
    { rating: 8, count: 30 },
    { rating: 7, count: 20 },
    { rating: 6, count: 8 },
    { rating: 5, count: 2 },
  ];

  const maxCount = Math.max(...ratingDistribution.map(d => d.count));

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
        
        {/* Cache Status Indicator */}
        {(isGameCached || isGameStale) && (
          <div className="mb-4 flex items-center justify-between bg-gray-800 rounded-lg p-3">
            <div className="flex items-center gap-2">
              {isGameCached && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                  📦 Cached Data
                </span>
              )}
              {isGameStale && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  ⚠️ Data may be outdated
                </span>
              )}
            </div>
            {isGameStale && (
              <button
                onClick={refetchGame}
                className="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors"
              >
                🔄 Refresh
              </button>
            )}
          </div>
        )}

        {/* Game Header */}
        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          {/* Game Cover and Info */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:flex-shrink-0">
                  <img
                    src={game.cover?.url || game.coverImage || '/placeholder-game.jpg'}
                    alt={game.name || game.title}
                    className="h-64 w-full object-cover md:h-80 md:w-64"
                    onError={(e) => {
                      e.currentTarget.src = '/placeholder-game.jpg';
                    }}
                  />
                </div>
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-white mb-4">
                    {game.name || game.title}
                  </h1>
                  <div className="space-y-2 text-gray-400 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {game.first_release_date 
                          ? new Date(game.first_release_date * 1000).getFullYear()
                          : game.releaseDate || 'Unknown'
                        }
                      </span>
                    </div>
                    {game.genres && (
                      <div><strong>Genre:</strong> {
                        Array.isArray(game.genres) 
                          ? game.genres.map(g => g.name || g).join(', ')
                          : game.genre || 'Unknown'
                      }</div>
                    )}
                    {game.platforms && (
                      <div><strong>Platforms:</strong> {
                        Array.isArray(game.platforms)
                          ? game.platforms.map(p => p.name || p).join(', ')
                          : 'Multiple'
                      }</div>
                    )}
                    {game.rating && (
                      <div><strong>IGDB Rating:</strong> {Math.round(game.rating)}/100</div>
                    )}
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {game.summary || game.description || 'No description available.'}
                  </p>
                </div>
              </div>
              
              {/* User Actions - Checkboxes and Write Review */}
              <div className="flex items-center gap-4 p-6 border-t border-gray-700">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsInWishlist(!isInWishlist)}
                    className={`relative w-6 h-6 border-2 border-gray-400 rounded transition-all duration-200 flex items-center justify-center overflow-visible ${
                      isInWishlist 
                        ? 'bg-gray-800 border-gray-300' 
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {isInWishlist && (
                      <Check className="h-7 w-7 text-green-500 stroke-[3] absolute -top-0.5 -left-0.5" />
                    )}
                  </button>
                  <span className="text-gray-300 text-sm">Started Game</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsCompleted(!isCompleted)}
                    className={`relative w-6 h-6 border-2 border-gray-400 rounded transition-all duration-200 flex items-center justify-center overflow-visible ${
                      isCompleted 
                        ? 'bg-gray-800 border-gray-300' 
                        : 'bg-gray-800 hover:bg-gray-700'
                    }`}
                  >
                    {isCompleted && (
                      <Check className="h-7 w-7 text-green-500 stroke-[3] absolute -top-0.5 -left-0.5" />
                    )}
                  </button>
                  <span className="text-gray-300 text-sm">Finished Game</span>
                </div>
                
                <div className="flex items-center gap-3 ml-4">
                  <Link
                    to={`/review/${game.id}`}
                    className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center hover:bg-purple-700 transition-colors"
                  >
                    <ScrollText className="h-4 w-4 text-white" />
                  </Link>
                  <Link
                    to={`/review/${game.id}`}
                    className="text-gray-300 text-sm hover:text-purple-400 transition-colors"
                  >
                    Write a Review
                  </Link>
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
          
          {/* Reviews content would go here */}
          {transformedReviews.length > 0 ? (
            <div className="space-y-4">
              {topReviews.map(review => (
                <div key={review.id} className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <img 
                      src={review.authorAvatar} 
                      alt={review.author}
                      className="w-8 h-8 rounded-full"
                    />
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
