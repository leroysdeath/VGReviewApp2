import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Star, Save, Eye, EyeOff, X, Lock, Filter, Grid, List, RefreshCw, Loader, AlertCircle, Calendar, Plus, Heart } from 'lucide-react';
import { gameDataService } from '../services/gameDataService';
import { gameSearchService } from '../services/gameSearchService';
import type { GameWithCalculatedFields } from '../types/database';
import { GameSearch } from '../components/GameSearch';
import { createReview, ensureGameExists, getUserReviewForGame, updateReview } from '../services/reviewService';
import { markGameStarted, markGameCompleted, getGameProgress } from '../services/gameProgressService';
import { useAuth } from '../hooks/useAuth';

// Search filters interface from SearchResultsPage
interface SearchFilters {
  genres: string[];
  platforms: string[];
  minRating?: number;
  sortBy: 'popularity' | 'rating' | 'release_date' | 'name';
  sortOrder: 'asc' | 'desc';
}

export const ReviewFormPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [selectedGame, setSelectedGame] = useState<GameWithCalculatedFields | null>(null);
  const [gameSearch, setGameSearch] = useState('');
  const [rating, setRating] = useState(5); // Default to 5
  const [reviewText, setReviewText] = useState('');
  const [isRecommended, setIsRecommended] = useState<boolean | null>(null);
  const [didFinishGame, setDidFinishGame] = useState<boolean | null>(null);
  const [gameAlreadyCompleted, setGameAlreadyCompleted] = useState(false);
  const [isGameCompletionLocked, setIsGameCompletionLocked] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  
  // Enhanced search state from SearchResultsPage
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    genres: [],
    platforms: [],
    sortBy: 'popularity',
    sortOrder: 'desc'
  });
  
  const { isAuthenticated } = useAuth();
  
  // Replace IGDB search with Supabase-based search
  const [searchResults, setSearchResults] = useState<GameWithCalculatedFields[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const refetchSearch = useCallback(async () => {
    if (!searchTerm || searchTerm.length === 0) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    setSearchError(null);
    
    try {
      const results = await gameDataService.searchGames(searchTerm);
      setSearchResults(results);
    } catch (error) {
      setSearchError('Failed to search games');
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [searchTerm]);
  
  // Trigger search when searchTerm changes
  useEffect(() => {
    if (showSearchModal && searchTerm.length > 0) {
      refetchSearch();
    } else {
      setSearchResults([]);
    }
  }, [showSearchModal, searchTerm, refetchSearch]);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<number | null>(null);
  const [gameProgressLoaded, setGameProgressLoaded] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    rating: number;
    reviewText: string;
    isRecommended: boolean | null;
    didFinishGame: boolean | null;
    selectedPlatforms: string[];
  } | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);

  useEffect(() => {
    // Load game if gameId is provided (gameId is IGDB ID from URL)
    if (gameId) {
      const loadGame = async () => {
        try {
          const game = await gameDataService.getGameByIGDBId(parseInt(gameId));
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
      if (!selectedGame) {
        setGameProgressLoaded(false);
        return;
      }
      
      try {
        console.log('Checking game progress for game IGDB ID:', selectedGame.igdb_id);
        const result = await getGameProgress(selectedGame.igdb_id);
        
        if (result.success) {
          if (result.data) {
            const isCompleted = result.data.completed;
            setGameAlreadyCompleted(isCompleted);
            
            // Game progress status ALWAYS takes priority (whether completed or not)
            setDidFinishGame(isCompleted);
            
            if (isCompleted) {
              setIsGameCompletionLocked(true);
              console.log('Game is marked as completed on game page - locking completion status');
            } else {
              setIsGameCompletionLocked(false);
              console.log('Game is NOT marked as completed on game page - setting didFinishGame to false');
            }
          } else {
            // No game progress data found - game has not been started or completed
            setGameAlreadyCompleted(false);
            setDidFinishGame(null); // Use null to indicate no game progress data
            setIsGameCompletionLocked(false);
            console.log('No game progress data found - didFinishGame set to null');
          }
          setGameProgressLoaded(true);
        }
      } catch (error) {
        console.error('Error checking game progress:', error);
        setGameProgressLoaded(true); // Still mark as loaded to prevent blocking
      }
    };

    checkGameProgress();
  }, [selectedGame]);

  // Load existing review data if user is editing
  useEffect(() => {
    const loadExistingReview = async () => {
      if (!selectedGame || !gameId || !gameProgressLoaded) return;

      try {
        console.log('Checking for existing review for game IGDB ID:', gameId);
        const result = await getUserReviewForGame(parseInt(gameId));

        if (result.success && result.data) {
          console.log('Found existing review, entering edit mode:', result.data);
          
          // Set edit mode and form values
          setIsEditMode(true);
          setExistingReviewId(result.data.id);
          setRating(result.data.rating);
          setReviewText(result.data.review || '');
          setIsRecommended(result.data.isRecommended);
          
          // CRITICAL FIX: didFinishGame is already set by game progress check
          // We DO NOT override it here - game progress is the source of truth
          // Only use review data as fallback if didFinishGame is still null (no game progress data)
          let finalDidFinishGame = didFinishGame;
          if (didFinishGame === null) {
            // No game progress data exists, use review data as fallback
            finalDidFinishGame = result.data.isRecommended;
            setDidFinishGame(finalDidFinishGame);
            console.log('No game progress data - using review recommendation as fallback:', finalDidFinishGame);
          } else {
            console.log('Game progress data takes priority - didFinishGame remains:', didFinishGame);
          }
          
          // Store initial values for change detection
          const initialValues = {
            rating: result.data.rating,
            reviewText: result.data.review || '',
            isRecommended: result.data.isRecommended,
            didFinishGame: finalDidFinishGame,
            selectedPlatforms: [] // Start with empty array for existing reviews
          };
          setInitialFormValues(initialValues);
          
          console.log('Initial form values set with priority logic:', initialValues);
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
  }, [selectedGame, gameId, gameProgressLoaded, didFinishGame]);

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
      didFinishGame,
      selectedPlatforms
    };

    const hasChanges = 
      currentValues.rating !== initialFormValues.rating ||
      currentValues.reviewText !== initialFormValues.reviewText ||
      currentValues.isRecommended !== initialFormValues.isRecommended ||
      (!isGameCompletionLocked && currentValues.didFinishGame !== initialFormValues.didFinishGame) ||
      JSON.stringify(currentValues.selectedPlatforms.sort()) !== JSON.stringify(initialFormValues.selectedPlatforms.sort());

    setHasFormChanges(hasChanges);
    console.log('Form change detection:', {
      currentValues,
      initialFormValues,
      isGameCompletionLocked,
      hasChanges
    });
  }, [rating, reviewText, isRecommended, didFinishGame, selectedPlatforms, isEditMode, initialFormValues, isGameCompletionLocked]);

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setGameSearch('');
    setSearchTerm('');
    setShowSearchModal(false);
  };
  
  const handleGameClick = (game: GameWithCalculatedFields) => {
    // Prefetch game data for faster loading
    // Game data is already loaded from Supabase
    handleGameSelect(game);
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };
  
  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        // Don't allow removing if it's the only selected platform
        if (prev.length === 1) {
          return prev;
        }
        return prev.filter(p => p !== platform);
      } else {
        return [...prev, platform];
      }
    });
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Game Card Component for Grid View
  const GameCard: React.FC<{ game: Game }> = ({ game }) => (
    <div
      onClick={() => handleGameClick(game)}
      className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-all duration-200 cursor-pointer group hover:scale-105 relative"
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
        {game.rating && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-lg text-sm flex items-center">
            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
            {Math.round(game.rating / 10)}
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
          {game.title}
        </h3>
        {game.releaseDate && (
          <p className="text-gray-400 text-sm mt-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {game.releaseDate}
          </p>
        )}
        {game.genre && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="bg-purple-600 bg-opacity-20 text-purple-300 px-2 py-1 rounded text-xs">
              {game.genre}
            </span>
          </div>
        )}
      </div>
    </div>
  );
  
  // Game List Item Component for List View
  const GameListItem: React.FC<{ game: Game }> = ({ game }) => (
    <div
      onClick={() => handleGameClick(game)}
      className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer group flex gap-4 relative"
    >
      <div className="w-16 h-20 flex-shrink-0 overflow-hidden rounded">
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-600 flex items-center justify-center">
            <span className="text-gray-500 text-xs">No Image</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
          {game.title}
        </h3>
        {game.releaseDate && (
          <p className="text-gray-400 text-sm mt-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {game.releaseDate}
          </p>
        )}
        {game.description && (
          <p className="text-gray-300 text-sm mt-2 line-clamp-2">
            {game.description}
          </p>
        )}
        {game.genre && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="bg-purple-600 bg-opacity-20 text-purple-300 px-2 py-1 rounded text-xs">
              {game.genre}
            </span>
          </div>
        )}
      </div>
      {game.rating && (
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center text-yellow-400">
            <Star className="w-4 h-4 mr-1 fill-current" />
            <span className="text-white font-semibold">
              {Math.round(game.rating / 10)}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && gameSearch.trim()) {
      e.preventDefault();
      setShowSearchModal(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame || rating < 1 || (!gameAlreadyCompleted && didFinishGame === null) || selectedPlatforms.length === 0) return;

    try {
      if (isEditMode && existingReviewId) {
        // Update existing review
        console.log('Updating existing review:', existingReviewId, 'with platforms:', selectedPlatforms);
        
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
        console.log('Creating new review with platforms:', selectedPlatforms);
        
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
                        const clampedValue = Math.max(1, Math.min(10, value));
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
                    min="1"
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
                      style={{ width: `${((rating - 1) / 9) * 100}%` }}
                    />
                  </div>

                  {/* Range Input */}
                  <input
                    type="range"
                    min="1"
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
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((tick) => {
                      const position = ((tick - 1) / 9) * 100;
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
                    {rating === 1 ? 'Minimum rating' : rating === 10 ? 'Perfect score!' : `${rating.toFixed(1)} out of 10`}
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

            {/* Did you finish the game? - Show when not completed OR when editing to show locked state */}
            {(!gameAlreadyCompleted || isEditMode) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Did you finish the game?
                  {isGameCompletionLocked && (
                    <span className="ml-2 inline-flex items-center text-xs text-yellow-400">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked (marked as finished on game page)
                    </span>
                  )}
                </label>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => !isGameCompletionLocked && setDidFinishGame(true)}
                    disabled={isGameCompletionLocked}
                    className={`flex-1 py-4 px-6 rounded-lg font-medium text-lg transition-all duration-200 ${
                      didFinishGame === true
                        ? 'bg-green-600 text-white shadow-lg transform scale-105'
                        : isGameCompletionLocked
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className={didFinishGame === true ? 'text-white' : isGameCompletionLocked ? 'text-gray-400' : 'text-green-500'}>
                        YES
                      </span>
                      {isGameCompletionLocked && didFinishGame === true && (
                        <Lock className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => !isGameCompletionLocked && setDidFinishGame(false)}
                    disabled={isGameCompletionLocked}
                    className={`flex-1 py-4 px-6 rounded-lg font-medium text-lg transition-all duration-200 ${
                      didFinishGame === false
                        ? 'bg-red-600 text-white shadow-lg transform scale-105'
                        : isGameCompletionLocked
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 cursor-pointer'
                    }`}
                  >
                    <span className={didFinishGame === false ? 'text-white' : isGameCompletionLocked ? 'text-gray-400' : 'text-red-500'}>
                      NO
                    </span>
                  </button>
                </div>
                {isGameCompletionLocked && (
                  <p className="mt-2 text-sm text-gray-500 italic">
                    This setting is locked because you marked this game as finished on the game page.
                  </p>
                )}
              </div>
            )}

            {/* Platform(s) Played On */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Platform(s) Played On *
              </label>
              <div className="flex justify-between gap-4">
                {['PS5', 'Xbox Series X/S', 'Nintendo Switch', 'PC', 'Retro'].map((platform) => (
                  <div key={platform} className="flex flex-col items-center">
                    <input
                      type="checkbox"
                      id={`platform-${platform}`}
                      checked={selectedPlatforms.includes(platform)}
                      onChange={() => handlePlatformToggle(platform)}
                      className="w-5 h-5 bg-gray-700 border-2 border-gray-600 rounded text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 focus:ring-offset-gray-800 transition-colors cursor-pointer"
                    />
                    <label 
                      htmlFor={`platform-${platform}`}
                      className="text-sm text-gray-300 mt-2 text-center cursor-pointer hover:text-purple-300 transition-colors"
                    >
                      {platform}
                    </label>
                  </div>
                ))}
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
                disabled={
                  !selectedGame || 
                  rating < 1 || 
                  (!gameAlreadyCompleted && didFinishGame === null) ||
                  selectedPlatforms.length === 0 ||
                  (isEditMode && !hasFormChanges)
                }
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={
                  isEditMode && !hasFormChanges 
                    ? "Make changes to enable updating your review"
                    : ""
                }
              >
                <Save className="h-4 w-4" />
                {isEditMode ? 'Update Review' : 'Publish Review'}
              </button>
              {isEditMode && !hasFormChanges && (
                <p className="text-sm text-gray-500 mt-2">
                  Make changes to any field to enable the Update Review button
                </p>
              )}
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

      {/* Enhanced Game Search Modal */}
      {showSearchModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowSearchModal(false)}
        >
          <div
            className="relative w-full max-w-7xl max-h-[90vh] overflow-hidden bg-gray-800 rounded-xl shadow-2xl border border-gray-700"
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

            {/* Modal Body with Enhanced Search */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="p-6">
                {/* Search Controls Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {searchTerm ? `Search Results for "${searchTerm}"` : 'Find Games to Review'}
                    </h3>
                    {searchResults && searchResults.length > 0 && (
                      <p className="text-gray-400 text-sm mt-1">
                        {searchResults.length.toLocaleString()} games found
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Filter className="w-4 h-4 mr-2" />
                      Filters
                    </button>
                    
                    {searchResults && searchResults.length > 0 && (
                      <div className="flex bg-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setViewMode('grid')}
                          className={`p-2 transition-colors ${
                            viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <Grid className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setViewMode('list')}
                          className={`p-2 transition-colors ${
                            viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          <List className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Search Bar */}
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search games by title..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    autoFocus
                  />
                </div>
                
                {/* Filters Panel */}
                {showFilters && (
                  <div className="bg-gray-700 rounded-lg p-6 mb-6 border border-gray-600">
                    <h4 className="text-lg font-semibold mb-4 text-white">Filter Results</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      
                      {/* Sort By */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Sort By
                        </label>
                        <select
                          value={`${filters.sortBy}:${filters.sortOrder}`}
                          onChange={(e) => {
                            const [sortBy, sortOrder] = e.target.value.split(':');
                            updateFilters({ sortBy: sortBy as any, sortOrder: sortOrder as any });
                          }}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="popularity:desc">Most Popular</option>
                          <option value="rating:desc">Highest Rated</option>
                          <option value="release_date:desc">Newest First</option>
                          <option value="release_date:asc">Oldest First</option>
                          <option value="name:asc">Name A-Z</option>
                          <option value="name:desc">Name Z-A</option>
                        </select>
                      </div>
                      
                      {/* Minimum Rating */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Minimum Rating
                        </label>
                        <select
                          value={filters.minRating || ''}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : undefined;
                            updateFilters({ minRating: value });
                          }}
                          className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          <option value="">Any Rating</option>
                          <option value="90">90+ Exceptional</option>
                          <option value="80">80+ Great</option>
                          <option value="70">70+ Good</option>
                          <option value="60">60+ Decent</option>
                        </select>
                      </div>
                      
                      {/* Quick Genre Filters */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Quick Filters
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Action', 'RPG', 'Strategy', 'Indie'].map((genre) => (
                            <button
                              key={genre}
                              onClick={() => {
                                const newGenres = filters.genres.includes(genre)
                                  ? filters.genres.filter(g => g !== genre)
                                  : [...filters.genres, genre];
                                updateFilters({ genres: newGenres });
                              }}
                              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                                filters.genres.includes(genre)
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                              }`}
                            >
                              {genre}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => {
                          updateFilters({
                            genres: [],
                            platforms: [],
                            minRating: undefined,
                            sortBy: 'popularity',
                            sortOrder: 'desc'
                          });
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Loading State */}
                {searchLoading && (!searchResults || searchResults.length === 0) && (
                  <div className="flex items-center justify-center py-12">
                    <Loader className="w-8 h-8 animate-spin text-purple-400" />
                    <span className="ml-3 text-gray-400">
                      {isSearchCached ? 'Updating results...' : 'Searching for games...'}
                    </span>
                  </div>
                )}
                
                {/* Error State */}
                {searchError && (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                      <p className="text-red-400 font-semibold mb-2">Search Error</p>
                      <p className="text-gray-400 mb-4">{searchError.message}</p>
                      <button
                        onClick={() => refetchSearch()}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
                
                {/* No Results */}
                {!searchLoading && !searchError && (!searchResults || searchResults.length === 0) && searchTerm && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎮</div>
                    <h3 className="text-xl font-semibold mb-2 text-white">No games found</h3>
                    <p className="text-gray-400 mb-4">
                      Try adjusting your search terms or filters
                    </p>
                    <div className="space-x-2">
                      <button
                        onClick={() => setSearchTerm('')}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                      >
                        Clear Search
                      </button>
                      <button
                        onClick={() => setShowFilters(true)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                      >
                        Adjust Filters
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Initial State */}
                {!searchTerm && (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🎯</div>
                    <h3 className="text-xl font-semibold mb-2 text-white">Search for Games to Review</h3>
                    <p className="text-gray-400">
                      Enter a game title above to find games you want to review
                    </p>
                  </div>
                )}
                
                {/* Results */}
                {searchResults && searchResults.length > 0 && (
                  <>
                    {viewMode === 'grid' ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {searchResults.map((game) => (
                          <GameCard key={game.id} game={game} />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {searchResults.map((game) => (
                          <GameListItem key={game.id} game={game} />
                        ))}
                      </div>
                    )}
                    
                    {/* Search Status Footer */}
                    <div className="mt-8 text-center">
                      <div className="inline-flex items-center gap-4 px-6 py-3 bg-gray-700 rounded-lg">
                        <span className="text-gray-300 text-sm">
                          Showing {searchResults.length} results
                        </span>
                        {isSearchCached && (
                          <div className="flex items-center gap-1 text-green-400 text-sm">
                            <span>Cached</span>
                          </div>
                        )}
                        {searchLoading && (
                          <div className="flex items-center gap-1 text-blue-400 text-sm">
                            <Loader className="h-3 w-3 animate-spin" />
                            <span>Loading more...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
