import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, Check, ScrollText, Star } from 'lucide-react';
import { StarRating } from '../StarRating';
import { MobileReviewCard } from './MobileReviewCard';
import { mockReviews } from '../../data/mockData';
import { igdbService, Game } from '../../services/igdbApi';

export const MobileGamePage: React.FC = () => {
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

  const gameReviews = mockReviews.filter(r => r.gameId === id).slice(0, 3);
  const averageRating = gameReviews.length > 0 
    ? gameReviews.reduce((sum, review) => sum + review.rating, 0) / gameReviews.length 
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pb-20">
        <div className="px-4 py-6">
          <div className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
            <div className="h-64 bg-gray-700"></div>
            <div className="p-4">
              <div className="h-6 bg-gray-700 rounded mb-3"></div>
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-700 rounded w-2/3 mb-4"></div>
              <div className="h-20 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="min-h-screen bg-gray-900 pb-20">
        <div className="px-4 py-6">
          <div className="text-center py-12">
            <h1 className="text-xl font-bold text-white mb-4">
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
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="px-4 py-6">
        {/* Game Header */}
        <div className="bg-gray-800 rounded-lg overflow-hidden mb-6">
          <div className="relative">
            <img
              src={game.coverImage}
              alt={game.title}
              className="w-full h-64 object-cover"
            />
            {/* Rating overlay */}
            <div className="absolute bottom-4 right-4 bg-gray-500 px-3 py-1 rounded">
              <span className="text-white font-bold">{averageRating.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="p-4">
            <h1 className="text-2xl font-bold text-white mb-3">{game.title}</h1>
            <div className="space-y-2 text-gray-400 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{game.releaseDate}</span>
              </div>
              <div><strong>Developer:</strong> {game.developer}</div>
              <div><strong>Publisher:</strong> {game.publisher}</div>
              <div><strong>Genre:</strong> {game.genre}</div>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed text-sm">{game.description}</p>
            
            {/* User Actions */}
            <div className="space-y-3">
              <div className="flex items-center gap-4">
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
              </div>
              
              <Link
                to={`/review/${game.id}`}
                className="flex items-center justify-center gap-2 w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                <ScrollText className="h-4 w-4" />
                Write a Review
              </Link>
            </div>
          </div>
        </div>

        {/* Community Rating */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Community Rating</h3>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {averageRating.toFixed(1)}
            </div>
            <StarRating rating={averageRating} size="lg" />
            <div className="text-gray-400 mt-2 text-sm">{gameReviews.length} reviews</div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4">Recent Reviews</h2>
          <div className="space-y-4">
            {gameReviews.map((review) => (
              <MobileReviewCard key={review.id} review={review} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};