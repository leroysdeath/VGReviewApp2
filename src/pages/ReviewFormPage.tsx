import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Star, Save, Eye, EyeOff, X, Lock, Filter, Grid, List, RefreshCw, Loader, AlertCircle, Calendar, Plus, Heart, Trash2, Gamepad2, Scroll } from 'lucide-react';
import { gameDataService } from '../services/gameDataService';
import { gameSearchService } from '../services/gameSearchService';
import type { Game, GameWithCalculatedFields } from '../types/database';
import { createReview, getUserReviewForGameByIGDBId, updateReview, deleteReview } from '../services/reviewService';
import { markGameStarted, markGameCompleted, getGameProgress } from '../services/gameProgressService';
import { useAuth } from '../hooks/useAuth';
import { mapPlatformNames } from '../utils/platformMapping';
import { formatGameReleaseDate } from '../utils/dateUtils';
import { filterProtectedContent } from '../utils/contentProtectionFilter';
import { igdbService } from '../services/igdbService';

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
  const [playtimeHours, setPlaytimeHours] = useState<number | null>(null);
  const [isRecommended, setIsRecommended] = useState<boolean | null>(null);
  const [didFinishGame, setDidFinishGame] = useState<boolean | null>(null);
  const [gameAlreadyCompleted, setGameAlreadyCompleted] = useState(false);
  const [isGameCompletionLocked, setIsGameCompletionLocked] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [platformsLoading, setPlatformsLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout>();
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  
  const { isAuthenticated, user } = useAuth();
  
  // Replace IGDB search with Supabase-based search
  const [searchResults, setSearchResults] = useState<GameWithCalculatedFields[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const performSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setShowSearchResults(true);

    try {
      // First try local database
      const localResults = await gameDataService.searchGames(query);

      // If we have few local results, also search IGDB
      if (localResults.length < 10) {
        console.log(`📚 Few local results (${localResults.length}), searching IGDB...`);
        try {
          const igdbGames = await igdbService.searchGames(query, 20);

          // Transform IGDB results to match local format
          const transformedIgdbResults = igdbGames.map(game => ({
            id: 0, // No local ID yet
            igdb_id: game.id,
            name: game.name,
            slug: game.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            cover_url: game.cover?.url ? game.cover.url.replace('t_thumb', 't_1080p').replace('//', 'https://') : undefined,
            summary: game.summary,
            first_release_date: game.first_release_date,
            genres: game.genres?.map(g => g.name) || [],
            platforms: game.platforms?.map(p => p.name) || [],
            igdb_rating: game.rating,
            total_rating: game.rating,
            rating_count: 0,
            averageRating: 0,
            gameReviewCount: 0
          }));

          // Merge results, avoiding duplicates
          const mergedResults = [...localResults];
          for (const igdbResult of transformedIgdbResults) {
            if (!mergedResults.some(r => r.igdb_id === igdbResult.igdb_id)) {
              mergedResults.push(igdbResult);
            }
          }

          // Limit to 20 results
          setSearchResults(mergedResults.slice(0, 20));
        } catch (igdbError) {
          console.error('IGDB search failed, using local results only:', igdbError);
          setSearchResults(localResults.slice(0, 20));
        }
      } else {
        setSearchResults(localResults.slice(0, 20));
      }
    } catch (error) {
      setSearchError('Failed to search games');
      console.error('Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  }, []);
  
  // Handle search input with debounce (300ms like GamePickerModal)
  const handleSearchInput = useCallback((value: string) => {
    setGameSearch(value);

    // Clear existing debounce timer
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Set new debounce timer
    if (value.length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        performSearch(value);
      }, 300); // Same debounce as GamePickerModal
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [performSearch]);

  // Handle click outside to close search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSearchResults]);

  // Handle escape key to close search results
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showSearchResults) {
        setShowSearchResults(false);
      }
    };

    if (showSearchResults) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showSearchResults]);
  
  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<number | null>(null);
  const [gameProgressLoaded, setGameProgressLoaded] = useState(false);
  const [initialFormValues, setInitialFormValues] = useState<{
    rating: number;
    reviewText: string;
    playtimeHours: number | null;
    isRecommended: boolean | null;
    didFinishGame: boolean | null;
    selectedPlatforms: string[];
  } | null>(null);
  const [hasFormChanges, setHasFormChanges] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    // Load game if gameId is provided (gameId is IGDB ID from URL)
    if (gameId) {
      const loadGame = async () => {
        try {
          const game = await gameDataService.getGameByIGDBId(parseInt(gameId));
          if (game) {
            setSelectedGame(game);
            console.log("ID:", gameId);
            console.log('Loaded game from URL IGDB ID:', game);
            
            // Set up available platforms for this game
            if (game.platforms && game.platforms.length > 0) {
              const mappedPlatforms = mapPlatformNames(game.platforms);
              setAvailablePlatforms(mappedPlatforms);
              console.log('Set available platforms from URL game load:', mappedPlatforms);
              // Reset selected platforms when changing games
              setSelectedPlatforms([]);
            } else {
              // Fallback to common platforms if no data
              setAvailablePlatforms(['PC', 'PS5', 'Xbox Series X/S', 'Switch']);
              console.log('No platform data, using fallback platforms');
              setSelectedPlatforms([]);
            }
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
        const result = await getUserReviewForGameByIGDBId(parseInt(gameId));

        if (result.success && result.data) {
          console.log('Found existing review, entering edit mode:', result.data);
          
          // Set edit mode and form values
          setIsEditMode(true);
          setExistingReviewId(result.data.id);
          setRating(result.data.rating);
          setReviewText(result.data.review || '');
          setPlaytimeHours(result.data.playtimeHours || null);
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
          
          // Set up platforms for this game and handle existing review platforms
          let currentAvailablePlatforms = availablePlatforms;
          if (selectedGame.platforms && selectedGame.platforms.length > 0) {
            const mappedPlatforms = mapPlatformNames(selectedGame.platforms);
            setAvailablePlatforms(mappedPlatforms);
            currentAvailablePlatforms = mappedPlatforms;
          }
          
          // Handle existing review platforms - validate against available platforms
          let validSelectedPlatforms: string[] = [];
          if (result.data.platforms && Array.isArray(result.data.platforms)) {
            if (currentAvailablePlatforms.length > 0) {
              // Keep only platforms that are still available for the game
              validSelectedPlatforms = result.data.platforms.filter(p => 
                currentAvailablePlatforms.includes(p)
              );
            } else {
              // No platform constraints, keep all
              validSelectedPlatforms = result.data.platforms;
            }
          }
          setSelectedPlatforms(validSelectedPlatforms);
          
          // Store initial values for change detection
          const initialValues = {
            rating: result.data.rating,
            reviewText: result.data.review || '',
            playtimeHours: result.data.playtimeHours || null,
            isRecommended: result.data.isRecommended,
            didFinishGame: finalDidFinishGame,
            selectedPlatforms: validSelectedPlatforms
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
      playtimeHours,
      isRecommended,
      didFinishGame,
      selectedPlatforms
    };

    const hasChanges = 
      currentValues.rating !== initialFormValues.rating ||
      currentValues.reviewText !== initialFormValues.reviewText ||
      currentValues.playtimeHours !== initialFormValues.playtimeHours ||
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
  }, [rating, reviewText, playtimeHours, isRecommended, didFinishGame, selectedPlatforms, isEditMode, initialFormValues, isGameCompletionLocked]);

  // Auto-select single platform when game changes
  useEffect(() => {
    if (selectedGame && selectedGame.platforms && availablePlatforms.length > 0) {
      if (availablePlatforms.length === 1) {
        // Auto-select the single mapped platform
        setSelectedPlatforms([availablePlatforms[0]]);
      } else if (availablePlatforms.length > 1) {
        // Clear selection if multiple platforms and user hasn't made a choice
        if (selectedPlatforms.length === 0 || !selectedPlatforms.every(p => availablePlatforms.includes(p))) {
          setSelectedPlatforms([]);
        }
      }
    }
  }, [selectedGame, availablePlatforms]);

  const handleGameSelect = (game: GameWithCalculatedFields) => {
    setSelectedGame(game);
    setGameSearch('');
    setSearchResults([]);
    setShowSearchResults(false);

    // Load available platforms for this game
    if (game.platforms && game.platforms.length > 0) {
      const mappedPlatforms = mapPlatformNames(game.platforms);
      setAvailablePlatforms(mappedPlatforms);
      // Reset selected platforms when changing games
      setSelectedPlatforms([]);
    } else {
      // Fallback to common platforms if no data
      setAvailablePlatforms(['PC', 'PS5', 'Xbox Series X/S', 'Switch']);
      setSelectedPlatforms([]);
    }
  };

  const handleChangeGame = () => {
    setSelectedGame(null);
    setGameSearch('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedPlatforms([]);
  };
  
  

  const handlePlatformToggle = (platform: string) => {
    // Single platform selection only
    setSelectedPlatforms([platform]);
  };
  
  // Use centralized date formatting for game release dates
  const formatDate = (dateValue: any) => {
    if (!dateValue) return 'TBA';
    
    // Handle already formatted strings
    if (typeof dateValue === 'string') {
      return dateValue;
    }
    
    // Handle timestamps (IGDB provides Unix timestamps in seconds)
    if (typeof dateValue === 'number') {
      return formatGameReleaseDate(dateValue);
    }
    
    // Handle Date objects
    if (dateValue instanceof Date) {
      // Convert to Unix timestamp in seconds for consistency
      return formatGameReleaseDate(Math.floor(dateValue.getTime() / 1000));
    }
    
    return 'TBA';
  };



  const handleDelete = async () => {
    if (!existingReviewId) return;
    
    setDeleteLoading(true);
    try {
      const result = await deleteReview(existingReviewId);
      
      if (result.success) {
        console.log('Review deleted successfully');
        // Navigate back to the game page
        if (selectedGame?.igdb_id) {
          navigate(`/game/${selectedGame.igdb_id}`);
        } else {
          navigate(-1);
        }
      } else {
        console.error('Failed to delete review:', result.error);
        alert(`Failed to delete review: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Failed to delete review. Please try again.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGame || rating < 1 || (!gameAlreadyCompleted && didFinishGame === null) || 
        (availablePlatforms.length > 0 && selectedPlatforms.length === 0)) return;

    try {
      if (isEditMode && existingReviewId) {
        // Update existing review
        console.log('Updating existing review:', existingReviewId, 'with platform:', selectedPlatforms[0]);
        
        // Use selected platform
        const platformName = selectedPlatforms.length > 0 ? selectedPlatforms[0] : undefined;
        
        const result = await updateReview(
          existingReviewId,
          0, // gameId not used in update operation
          rating,
          reviewText,
          isRecommended,
          platformName,
          playtimeHours
        );

        if (result.success) {
          console.log('Review updated successfully:', result.data);
          
          // Update game progress based on user selection (only if game not already completed)
          try {
            if (!gameAlreadyCompleted) {
              // Prioritize gameId from URL
              let igdbId: number | undefined;
              if (gameId) {
                const parsedGameId = parseInt(gameId);
                if (!isNaN(parsedGameId)) {
                  igdbId = parsedGameId;
                }
              }
              // Fallback to selectedGame.igdb_id
              if (igdbId === undefined || igdbId === null || isNaN(igdbId)) {
                igdbId = selectedGame.igdb_id;
              }
              if (igdbId !== undefined && igdbId !== null && !isNaN(igdbId)) {
                if (didFinishGame) {
                  await markGameCompleted(igdbId);
                  console.log('✅ Game marked as completed');
                } else {
                  await markGameStarted(igdbId);
                  console.log('✅ Game marked as started');
                }
              } else {
                console.warn('⚠️ No IGDB ID available for game progress update');
              }
            }
          } catch (progressError) {
            console.error('❌ Error updating game progress:', progressError);
            // Don't prevent navigation if progress update fails
          }
          
          navigate(`/game/${selectedGame.igdb_id}`);
        } else {
          console.error('Failed to update review:', result.error);
          alert(`Failed to update review: ${result.error}`);
        }
      } else {
        // Create new review
        console.log('Creating new review with platform:', selectedPlatforms[0]);
        
        // First, prioritize the gameId from URL (this is the source of truth)
        let igdbId: number | undefined;
        
        if (gameId) {
          const parsedGameId = parseInt(gameId);
          if (!isNaN(parsedGameId)) {
            igdbId = parsedGameId;
            console.log('Using gameId from URL as IGDB ID:', igdbId);
            // Ensure selectedGame has the correct igdb_id
            setSelectedGame(prev => prev ? { ...prev, igdb_id: parsedGameId } : null);
          }
        }
        
        // Fallback to selectedGame.igdb_id if URL parameter is not available
        if (igdbId === undefined || igdbId === null || isNaN(igdbId)) {
          igdbId = selectedGame.igdb_id;
          console.log('Using selectedGame.igdb_id as fallback:', igdbId);
        }
        
        // Final fallback: check if selectedGame has an 'id' property that could be the IGDB ID
        if (igdbId === undefined || igdbId === null || isNaN(igdbId)) {
          if (selectedGame.id && !isNaN(selectedGame.id)) {
            igdbId = selectedGame.id;
            console.log('Using selectedGame.id as IGDB ID:', igdbId);
          }
        }
        
        if (igdbId === undefined || igdbId === null || isNaN(igdbId)) {
          console.error('No valid IGDB ID available for game:', selectedGame, 'gameId from URL:', gameId);
          alert('Game data is missing IGDB ID. Please try selecting the game again.');
          return;
        }
        
        console.log('Using IGDB ID for review submission:', igdbId);

        // Create the review - createReview will handle ensuring the game exists
        // Use selected platform
        const platformName = selectedPlatforms[0];
        
        const result = await createReview(
          igdbId, // Pass the IGDB ID - createReview will handle the rest
          rating,
          reviewText,
          isRecommended,
          platformName,
          playtimeHours
        );

        if (result.success) {
          console.log('Review created successfully:', result.data);
          
          // Update game progress based on user selection (only if game not already completed)
          try {
            if (!gameAlreadyCompleted) {
              // Prioritize gameId from URL
              let igdbId: number | undefined;
              if (gameId) {
                const parsedGameId = parseInt(gameId);
                if (!isNaN(parsedGameId)) {
                  igdbId = parsedGameId;
                }
              }
              // Fallback to selectedGame.igdb_id
              if (igdbId === undefined || igdbId === null || isNaN(igdbId)) {
                igdbId = selectedGame.igdb_id;
              }
              if (igdbId !== undefined && igdbId !== null && !isNaN(igdbId)) {
                if (didFinishGame) {
                  await markGameCompleted(igdbId);
                  console.log('✅ Game marked as completed');
                } else {
                  await markGameStarted(igdbId);
                  console.log('✅ Game marked as started');
                }
              } else {
                console.warn('⚠️ No IGDB ID available for game progress update');
              }
            }
          } catch (progressError) {
            console.error('❌ Error updating game progress:', progressError);
            // Don't prevent navigation if progress update fails
          }
          
          navigate(`/game/${selectedGame.igdb_id}`);
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
        <div className="bg-gray-800 rounded-lg p-4 sm:p-6 md:p-8">
          <h1 className="text-3xl font-bold text-white mb-8">
            {selectedGame 
              ? (isEditMode ? `Edit Your Review: ${selectedGame.name}` : `Review: ${selectedGame.name}`)
              : (isEditMode ? 'Edit Your Review' : 'Write a Review')
            }
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Game Selection */}
            {!selectedGame && (
              <div ref={searchContainerRef}>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Game
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={gameSearch}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                    placeholder="Search for a game..."
                  />
                </div>

                {/* Search Results Container */}
                {showSearchResults && (
                  <div className="mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl overflow-hidden">
                    {/* Results Header */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-700">
                      <span className="text-sm text-gray-400">
                        {searchLoading ? 'Searching...' : `${searchResults.length} results`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSearchResults(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                        aria-label="Close search results"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Results Content */}
                    <div className="max-h-96 overflow-y-auto">
                      {searchLoading ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader className="h-8 w-8 animate-spin text-purple-500" />
                        </div>
                      ) : searchError ? (
                        <div className="p-4 text-center">
                          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                          <p className="text-red-400">{searchError}</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 p-3">
                          {searchResults.map((game) => (
                            <div
                              key={game.igdb_id || game.id}
                              className="bg-gray-700 rounded-lg overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all flex flex-col"
                            >
                              {/* Game Cover */}
                              <div className="relative aspect-[3/4]">
                                <img
                                  src={game.cover_url || '/placeholder-game.jpg'}
                                  alt={game.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-game.jpg';
                                  }}
                                />
                                {game.igdb_rating && (
                                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
                                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                    <span className="text-xs font-bold text-white">
                                      {Math.round(game.igdb_rating / 10)}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Game Info */}
                              <div className="p-3 flex flex-col flex-grow">
                                <h3 className="text-white font-medium text-sm line-clamp-2 mb-2">
                                  {game.name}
                                </h3>

                                {game.first_release_date && (
                                  <p className="text-gray-400 text-xs mb-2">
                                    {typeof game.first_release_date === 'number'
                                      ? new Date(game.first_release_date * 1000).getFullYear()
                                      : new Date(game.first_release_date).getFullYear()
                                    }
                                  </p>
                                )}

                                <div className="mt-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleGameSelect(game)}
                                    className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Scroll className="h-4 w-4" />
                                    Select Game
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Gamepad2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-400">
                            No eligible games found. Try a different search.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Selected Game Display */}
            {selectedGame && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">{selectedGame.name}</h3>
                  <button
                    type="button"
                    onClick={handleChangeGame}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Change Game
                  </button>
                </div>
                <div className="flex justify-center">
                  <img
                    src={selectedGame.cover_url || '/placeholder-game.jpg'}
                    alt={selectedGame.name}
                    className="w-48 h-64 object-cover rounded-lg shadow-lg"
                  />
                </div>
                {selectedGame.first_release_date && (
                  <p className="text-center text-gray-400 text-sm">Released: {formatDate(selectedGame.first_release_date)}</p>
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

            {/* Platform Played On */}
            {selectedGame && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-4">
                  Platform Played On *
                </label>
                {availablePlatforms && availablePlatforms.length > 0 ? (
                  availablePlatforms.length === 1 ? (
                    // Single platform - just display the name
                    <div className="bg-gray-700 border border-gray-600 rounded-lg p-4 text-center">
                      <span className="text-lg font-medium text-white">{availablePlatforms[0]}</span>
                      <p className="text-sm text-gray-400 mt-1">Available on this platform only</p>
                    </div>
                  ) : (
                    // Multiple platforms - show radio buttons for single selection
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                      {availablePlatforms.map((platform) => (
                        <div key={platform} className="flex flex-col items-center">
                          <input
                            type="radio"
                            id={`platform-${platform}`}
                            name="platform-selection"
                            checked={selectedPlatforms.includes(platform)}
                            onChange={() => handlePlatformToggle(platform)}
                            className="w-5 h-5 bg-gray-700 border-2 border-gray-600 rounded-full text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 focus:ring-offset-gray-800 transition-colors cursor-pointer"
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
                  )
                ) : (
                  // No platform data available - show default options with radio buttons
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {['PS5', 'Xbox Series X/S', 'Nintendo Switch', 'PC', 'Retro'].map((platform) => (
                      <div key={platform} className="flex flex-col items-center">
                        <input
                          type="radio"
                          id={`platform-${platform}`}
                          name="platform-selection-default"
                          checked={selectedPlatforms.includes(platform)}
                          onChange={() => handlePlatformToggle(platform)}
                          className="w-5 h-5 bg-gray-700 border-2 border-gray-600 rounded-full text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-0 focus:ring-offset-gray-800 transition-colors cursor-pointer"
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
                )}
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

            {/* Playtime */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Playtime (Optional)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={playtimeHours || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setPlaytimeHours(null);
                    } else {
                      const num = parseInt(value);
                      if (!isNaN(num) && num >= 1 && num <= 99999) {
                        setPlaytimeHours(num);
                      }
                    }
                  }}
                  onKeyPress={(e) => {
                    // Only allow digits
                    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                      e.preventDefault();
                    }
                  }}
                  min="1"
                  max="99999"
                  className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  placeholder="0"
                />
                <span className="text-gray-400">hours</span>
              </div>
            </div>


            {/* Submit Buttons */}
            <div className="flex justify-end gap-4 pt-6">
              {isEditMode && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteLoading}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  !selectedGame || 
                  rating < 1 || 
                  (!gameAlreadyCompleted && didFinishGame === null) ||
                  (availablePlatforms.length > 0 && selectedPlatforms.length === 0) ||
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
            </div>
            {isEditMode && !hasFormChanges && (
              <p className="text-sm text-gray-500 text-right">
                Make changes to any field to enable the Update Review button
              </p>
            )}
          </form>
        </div>
      </div>


      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">Delete Review</h3>
            <p className="text-gray-300 mb-6">
              Are you sure you want to delete your review for {selectedGame?.name}? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
