import React, { useState } from 'react';
import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, User, MessageCircle, Plus, Check, Heart, ScrollText } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { mockReviews } from '../data/mockData';
import { igdbService, Game } from '../services/igdbApi';

export const GamePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGame = async () => {
      if (!id) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const gameData = await igdbService.getGameByStringId(id);
        if (gameData) {
          setGame(gameData);
        } else {
          setError('Game not found');
        }
      } catch (err) {
        setError('Failed to load game details');
        console.error('Error loading game:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [id]);

  const gameReviews = mockReviews.filter(r => r.gameId === id);
  const topReviews = gameReviews.filter(r => r.rating >= 8).slice(0, 3);
  const recentReviews = gameReviews.slice(0, 5);

  const averageRating = gameReviews.length > 0 
    ? gameReviews.reduce((sum, review) => sum + review.rating, 0) / gameReviews.length 
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

  if (loading) {
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
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-white mb-4">
              {error || 'Game not found'}
            </h1>
            <Link
              to="/search"
              className="text-purple-400 hover:text-purple-300 transition-colors"
            >
              Browse other games
            </Link>
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
                    src={game.coverImage}
                    alt={game.title}
                    className="h-64 w-full object-cover md:h-80 md:w-64"
                  />
                </div>
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-white mb-4">{game.title}</h1>
                  <div className="space-y-2 text-gray-400 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>{game.releaseDate}</span>
                    </div>
                    <div><strong>Developer:</strong> {game.developer}</div>
                    <div><strong>Publisher:</strong> {game.publisher}</div>
                    <div><strong>Genre:</strong> {game.genre}</div>
                  </div>
                  <p className="text-gray-300 mb-6 leading-relaxed">{game.description}</p>
                  
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
                <span className="text-sm text-blue-400">{gameReviews.length} fans</span>
              </div>
              <div className="border-b border-gray-700 mb-4"></div>
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
                  {averageRating.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div>
          {/* Top Reviews */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Top Reviews</h2>
          </div>
        </div>
      </div>
    </div>
  );
};