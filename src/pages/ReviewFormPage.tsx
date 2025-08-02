import React, { useState } from 'react';
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Star, Save, Eye, EyeOff, X } from 'lucide-react';
import { igdbService, Game } from '../services/igdbApi';
import { GameSearch } from '../components/GameSearch';
import { createReview, ensureGameExists, getUserReviewForGame, updateReview } from '../services/reviewService';
import { markGameStarted, markGameCompleted, getGameProgress } from '../services/gameProgressService';

export const ReviewFormPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [rating, setRating] = useState(5); // Default to 5
  const [reviewText, setReviewText] = useState('');
  const [isRecommended, setIsRecommended] = useState<boolean | null>(null);
  const [didFinishGame, setDidFinishGame] = useState<boolean | null>(null);
  const [gameAlreadyCompleted, setGameAlreadyCompleted] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<number | null>(null);
  const [initialFormValues, setInitialFormValues] = useState<{
    rating: number;
    reviewText: string;
    isRecommended: boolean | null;
    didFinishGame: boolean | null;
  } | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);

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

  // Check if game is already completed when selectedGame changes
  useEffect(() => {
    const checkGameProgress = async () => {
      if (!selectedGame) return;
      
      try {
        const result = await getGameProgress(parseInt(selectedGame.id));
        if (result.success && result.data) {
          setGameAlreadyCompleted(result.data.completed);
        }
      } catch (error) {
        console.error('Error checking game progress:', error);
      }
    };

    checkGameProgress();
  }, [selectedGame]);

  // Load existing review data if user is editing
  useEffect(() => {
    const loadExistingReview = async () => {
      if (!selectedGame || !gameId) return;

      try {
        console.log('Checking for existing review for game:', gameId);
        const result = await getUserReviewForGame(parseInt(gameId));

        if (result.success && result.data) {
          console.log('Found existing review, entering edit mode:', result.data);
          
          // Set edit mode and form values
          setIsEditMode(true);
          setExistingReviewId(result.data.id);
          setRating(result.data.rating);
          setReviewText(result.data.review || '');
          setIsRecommended(result.data.isRecommended);
          
          // Store initial values for change detection
          const initialValues = {
            rating: result.data.rating,
            reviewText: result.data.review || '',
            isRecommended: result.data.isRecommended,
            didFinishGame: null // Will be set based on game progress
          };
          setInitialFormValues(initialValues);
          
          console.log('Initial form values set:', initialValues);
        } else {
          console.log('No existing review found, staying in create mode');
          setIsEditMode(false);
          setExistingReviewId(null);
          setInitialFormValues(null);
        }
      } catch (error) {
        console.error('Error loading existing review:', error);
        setIsEditMode(false);
      }
    };

    loadExistingReview();
  }, [selectedGame, gameId]);

  // Track form changes for edit mode
  useEffect(() => {
    if (!isEditMode || !initialFormValues) {
      setHasFormChanges(false);
      return;
    }

    const currentValues = {
      rating,
      reviewText,
      isRecommended,
      didFinishGame
    };

    const hasChanges = 
      currentValues.rating !== initialFormValues.rating ||
      currentValues.reviewText !== initialFormValues.reviewText ||
      currentValues.isRecommended !== initialFormValues.isRecommended ||
      currentValues.didFinishGame !== initialFormValues.didFinishGame;

    setHasFormChanges(hasChanges);
  }, [rating, reviewText, isRecommended, didFinishGame, isEditMode, initialFormValues]);

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
    if (!selectedGame || rating < 0.5 || (!gameAlreadyCompleted && didFinishGame === null)) return;

    try {
      if (isEditMode && existingReviewId) {
        // Update existing review
        console.log('Updating existing review:', existingReviewId);
        
        const result = await updateReview(
          existingReviewId,
          parseInt(selectedGame.id),
          rating,
          reviewText,
          isRecommended
        );

        if (result.success) {
          console.log('Review updated successfully:', result.data);
          
          // Update game progress based on user selection (only if game not already completed)
          try {
            if (!gameAlreadyCompleted) {
              if (didFinishGame) {
                await markGameCompleted(parseInt(selectedGame.id));
                console.log('✅ Game marked as completed');
              } else {
                await markGameStarted(parseInt(selectedGame.id));
                console.log('✅ Game marked as started');
              }
            }
          } catch (progressError) {
            console.error('❌ Error updating game progress:', progressError);
            // Don't prevent navigation if progress update fails
          }
          
          navigate(`/game/${selectedGame.id}`);
        } else {
          console.error('Failed to update review:', result.error);
          alert(`Failed to update review: ${result.error}`);
        }
      } else {
        // Create new review
        console.log('Creating new review');
        
        // First, ensure the game exists in the database
        const ensureGameResult = await ensureGameExists(
          parseInt(selectedGame.id),
          selectedGame.title,
          selectedGame.coverImage,
          selectedGame.genre,
          selectedGame.releaseDate
        );

        if (!ensureGameResult.success) {
          console.error('Failed to ensure game exists:', ensureGameResult.error);
          alert(`Failed to add game to database: ${ensureGameResult.error}`);
          return;
        }

        // Then create the review
        const result = await createReview(
          parseInt(selectedGame.id), // Convert string ID to number
          rating,
          reviewText,
          isRecommended
        );

        if (result.success) {
          console.log('Review created successfully:', result.data);
          
          // Update game progress based on user selection (only if game not already completed)
          try {
            if (!gameAlreadyCompleted) {
              if (didFinishGame) {
                await markGameCompleted(parseInt(selectedGame.id));
                console.log('✅ Game marked as completed');
              } else {
                await markGameStarted(parseInt(selectedGame.id));
                console.log('✅ Game marked as started');
              }
            }
          } catch (progressError) {
            console.error('❌ Error updating game progress:', progressError);
            // Don't prevent navigation if progress update fails
          }
          
          navigate(`/game/${selectedGame.id}`);
        } else {
          console.error('Failed to create review:', result.error);
          alert(`Failed to submit review: ${result.error}`);
        }
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
            {selectedGame 
              ? (isEditMode ? `Edit Your Review: ${selectedGame.title}` : `Review: ${selectedGame.title}`)
              : (isEditMode ? 'Edit Your Review' : 'Write a Review')
            }
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
              <label className="block text-sm font-medium text-gray-300 mb-6">
                Your Rating *
              </label>
              <div className="relative">
                {/* Value Input Box Above Slider */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-10">
                  <input
                    type="number"
                    value={rating.toFixed(1)}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value)) {
                        // Clamp to range and round to nearest 0.5
                        const clampedValue = Math.max(0.5, Math.min(10, value));
                        const snappedValue = Math.round(clampedValue * 2) / 2;
                        setRating(snappedValue);
                      }
                    }}
                    onBlur={(e) => {
                      // Ensure proper formatting on blur
                      if (e.target.value === '') {
                        setRating(5);
                      }
                    }}
                    className="w-16 px-2 py-1 text-center text-lg font-bold bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:border-purple-500"
                    min="0.5"
                    max="10"
                    step="0.5"
                    inputMode="decimal"
                  />
                </div>

                {/* Slider Container */}
                <div className="relative pt-2">
                  {/* Custom Slider Track */}
                  <div className="relative h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="absolute h-full bg-purple-500 transition-all duration-150"
                      style={{ width: `${((rating - 0.5) / 9.5) * 100}%` }}
                    />
                  </div>

                  {/* Range Input */}
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={rating}
                    onChange={(e) => setRating(parseFloat(e.target.value))}
                    className="slider-input absolute inset-0 w-full h-2 cursor-pointer"
                    style={{ 
                      zIndex: 2,
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      background: 'transparent',
                      outline: 'none'
                    }}
                  />

                  {/* Tick Marks */}
                  <div className="absolute inset-x-0 -bottom-6">
                    {[0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((tick) => {
                      const position = ((tick - 0.5) / 9.5) * 100;
                      return (
                        <div 
                          key={tick} 
                          className="absolute"
                          style={{ left: `${position}%` }}
                        >
                          <div className="absolute -top-3 w-0.5 h-2 bg-gray-600 transform -translate-x-1/2" />
                          {tick % 1 === 0 && (
                            <span className="absolute top-1 transform -translate-x-1/2 text-xs text-gray-500">
                              {tick}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Helper Text */}
                <div className="mt-8 text-center">
                  <span className="text-sm text-gray-400">
                    {rating === 0.5 ? 'Minimum rating' : rating === 10 ? 'Perfect score!' : `${rating.toFixed(1)} out of 10`}
                  </span>
                </div>
              </div>
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

            {/* Did you finish the game? - Only show if game not already completed */}
            {!gameAlreadyCompleted && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Did you finish the game?
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setDidFinishGame(true)}
                    className={`flex-1 py-4 px-6 rounded-lg font-medium text-lg transition-all duration-200 ${
                      didFinishGame === true
                        ? 'bg-green-600 text-white shadow-lg transform scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span className={didFinishGame === true ? 'text-white' : 'text-green-500'}>YES</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDidFinishGame(false)}
                    className={`flex-1 py-4 px-6 rounded-lg font-medium text-lg transition-all duration-200 ${
                      didFinishGame === false
                        ? 'bg-red-600 text-white shadow-lg transform scale-105'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <span className={didFinishGame === false ? 'text-white' : 'text-red-500'}>NO</span>
                  </button>
                </div>
              </div>
            )}

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
                disabled={
                  !selectedGame || 
                  rating < 0.5 || 
                  (!gameAlreadyCompleted && didFinishGame === null) ||
                  (isEditMode && !hasFormChanges)
                }
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="h-4 w-4" />
                {isEditMode ? 'Update Review' : 'Publish Review'}
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
