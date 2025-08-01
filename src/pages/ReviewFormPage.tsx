import React, { useState } from 'react';
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Star, Save, Eye, EyeOff, X } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { igdbService, Game } from '../services/igdbApi';
import { GameSearch } from '../components/GameSearch';
import { createReview } from '../services/reviewService';

export const ReviewFormPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isRecommended, setIsRecommended] = useState<boolean | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    // Load game if gameId is provided
    if (gameId) {
      const loadGame = async () => {
        try {
          const game = await igdbService.getGameByStringId(gameId);
          if (game) {
            setSelectedGame(game);
          }
        } catch (error) {
          console.error('Failed to load game:', error);
        }
      };
      loadGame();
    }
  }, [gameId]);


  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setGameSearch('');
    setShowSearchModal(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && gameSearch.trim()) {
      e.preventDefault();
      setShowSearchModal(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame || rating === 0) return;

    try {
      const result = await createReview(
        parseInt(selectedGame.id), // Convert string ID to number
        rating,
        reviewText,
        isRecommended
      );

      if (result.success) {
        console.log('Review created successfully:', result.data);
        navigate(`/game/${selectedGame.id}`);
      } else {
        console.error('Failed to create review:', result.error);
        alert(`Failed to submit review: ${result.error}`);
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-800 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8">
            {selectedGame ? `Review: ${selectedGame.title}` : 'Write a Review'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Game Selection */}
            {!selectedGame && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Game
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={gameSearch}
                    onChange={(e) => setGameSearch(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Search for a game and press Enter..."
                  />
                </div>
              </div>
            )}

            {/* Selected Game Display */}
            {selectedGame && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">{selectedGame.title}</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedGame(null)}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Change Game
                  </button>
                </div>
                <div className="flex justify-center">
                  <img
                    src={selectedGame.coverImage}
                    alt={selectedGame.title}
                    className="w-48 h-64 object-cover rounded-lg shadow-lg"
                  />
                </div>
                {selectedGame.releaseDate && (
                  <p className="text-center text-gray-400 text-sm">Released: {selectedGame.releaseDate}</p>
                )}
              </div>
            )}

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Rating *
              </label>
              <div className="flex items-center gap-4">
                <StarRating 
                  rating={rating} 
                  onRatingChange={setRating}
                  interactive 
                  size="lg" 
                />
                <div className="flex flex-col items-center">
                  <span className="text-2xl font-bold text-white">
                    {rating > 0 ? rating.toFixed(1) : '--'}
                  </span>
                  <span className="text-sm text-gray-400">
                    {rating > 0 ? 'out of 10' : 'Click to rate'}
                  </span>
                </div>
              </div>
              {rating > 0 && (
                <p className="mt-2 text-sm text-gray-400">
                  Click the left half of a star for .5 ratings, right half for whole numbers
                </p>
              )}
            </div>

            {/* Recommendation */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Would you recommend this game?
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsRecommended(true)}
                  className={`flex-1 py-4 px-6 rounded-lg font-medium text-lg transition-all duration-200 ${
                    isRecommended === true
                      ? 'bg-green-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  👍 Yes
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecommended(false)}
                  className={`flex-1 py-4 px-6 rounded-lg font-medium text-lg transition-all duration-200 ${
                    isRecommended === false
                      ? 'bg-red-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  👎 No
                </button>
              </div>
            </div>

            {/* Review Text */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Review (Optional)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                placeholder="Share your thoughts about this game..."
              />
              <div className="mt-1 text-sm text-gray-400">
                {reviewText.length} characters
              </div>
            </div>


            {/* Submit Buttons */}
            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={!selectedGame || rating === 0}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                Publish Review
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Game Search Modal */}
      {showSearchModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden bg-gray-800 rounded-xl shadow-2xl border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-gray-800 border-b border-gray-700 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Select a Game</h2>
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Body with GameSearch */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <GameSearch
                onGameSelect={handleGameSelect}
                placeholder="Search for games..."
                showViewToggle={true}
                initialViewMode="grid"
                showExploreButton={false}
                initialQuery={gameSearch}
                key={gameSearch}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
