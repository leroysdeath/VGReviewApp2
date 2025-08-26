import React, { useState, useEffect, useReducer, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, Calendar, User, MessageCircle, Plus, Check, Heart, ScrollText, ChevronDown, ChevronUp } from 'lucide-react';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { AuthModal } from '../components/auth/AuthModal';
import { gameDataService } from '../services/gameDataService';
import type { GameWithCalculatedFields } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { getGameProgress, markGameStarted, markGameCompleted } from '../services/gameProgressService';
import { ensureGameExists, getUserReviewForGame } from '../services/reviewService';
import { generateRatingDistribution } from '../utils/dataTransformers';
import { DLCSection } from '../components/DLCSection';
import { ParentGameSection } from '../components/ParentGameSection';
import { ModSection } from '../components/ModSection';
import { dlcService } from '../services/dlcService';
import { SmartImage } from '../components/SmartImage';
import { shouldHideFanContent } from '../utils/contentProtectionFilter';

// Interface for review data from database
interface GameReview {
  id: number;
  user_id: number;
  game_id: number;
  rating: number;
  review: string | null;
  post_date_time: string;
  user?: {
    id: number;
    name: string;
    avatar_url?: string;
  };
}

// State interface for useReducer
interface GamePageState {
  game: GameWithCalculatedFields | null;
  gameLoading: boolean;
  gameError: Error | null;
  reviews: GameReview[];
  reviewsLoading: boolean;
  reviewsError: string | null;
  isStarted: boolean;
  isCompleted: boolean;
  progressLoading: boolean;
  userHasReviewed: boolean;
  userReviewLoading: boolean;
  showAuthModal: boolean;
  pendingAction: string | null;
  gameCategory: number | null;
  categoryLoading: boolean;
}

// Action types for reducer
type GamePageAction = 
  | { type: 'SET_GAME_LOADING'; payload: boolean }
  | { type: 'SET_GAME'; payload: GameWithCalculatedFields | null }
  | { type: 'SET_GAME_ERROR'; payload: Error | null }
  | { type: 'SET_REVIEWS_LOADING'; payload: boolean }
  | { type: 'SET_REVIEWS'; payload: GameReview[] }
  | { type: 'SET_REVIEWS_ERROR'; payload: string | null }
  | { type: 'SET_PROGRESS'; payload: { isStarted: boolean; isCompleted: boolean } }
  | { type: 'SET_PROGRESS_LOADING'; payload: boolean }
  | { type: 'SET_USER_REVIEW_STATUS'; payload: { hasReviewed: boolean; loading: boolean } }
  | { type: 'SET_AUTH_MODAL'; payload: { show: boolean; pendingAction: string | null } }
  | { type: 'LOAD_GAME_SUCCESS'; payload: { game: GameWithCalculatedFields; reviews: GameReview[] } }
  | { type: 'LOAD_GAME_ERROR'; payload: Error }
  | { type: 'SET_GAME_CATEGORY'; payload: { category: number | null; loading: boolean } };

// Reducer function
function gamePageReducer(state: GamePageState, action: GamePageAction): GamePageState {
  switch (action.type) {
    case 'SET_GAME_LOADING':
      return { ...state, gameLoading: action.payload, gameError: null };
    case 'SET_GAME':
      return { ...state, game: action.payload, gameLoading: false };
    case 'SET_GAME_ERROR':
      return { ...state, gameError: action.payload, gameLoading: false };
    case 'SET_REVIEWS_LOADING':
      return { ...state, reviewsLoading: action.payload, reviewsError: null };
    case 'SET_REVIEWS':
      return { ...state, reviews: action.payload, reviewsLoading: false };
    case 'SET_REVIEWS_ERROR':
      return { ...state, reviewsError: action.payload, reviewsLoading: false };
    case 'SET_PROGRESS':
      return { ...state, ...action.payload };
    case 'SET_PROGRESS_LOADING':
      return { ...state, progressLoading: action.payload };
    case 'SET_USER_REVIEW_STATUS':
      return { 
        ...state, 
        userHasReviewed: action.payload.hasReviewed, 
        userReviewLoading: action.payload.loading 
      };
    case 'SET_AUTH_MODAL':
      return { 
        ...state, 
        showAuthModal: action.payload.show, 
        pendingAction: action.payload.pendingAction 
      };
    case 'LOAD_GAME_SUCCESS':
      return {
        ...state,
        game: action.payload.game,
        reviews: action.payload.reviews,
        gameLoading: false,
        reviewsLoading: false,
        gameError: null,
        reviewsError: null
      };
    case 'LOAD_GAME_ERROR':
      return {
        ...state,
        gameError: action.payload,
        gameLoading: false,
        reviewsLoading: false
      };
    case 'SET_GAME_CATEGORY':
      return {
        ...state,
        gameCategory: action.payload.category,
        categoryLoading: action.payload.loading
      };
    default:
      return state;
  }
}

// Initial state
const initialState: GamePageState = {
  game: null,
  gameLoading: false,
  gameError: null,
  reviews: [],
  reviewsLoading: false,
  reviewsError: null,
  isStarted: false,
  isCompleted: false,
  progressLoading: false,
  userHasReviewed: false,
  userReviewLoading: false,
  showAuthModal: false,
  pendingAction: null,
  gameCategory: null,
  categoryLoading: false
};

export const GamePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();

  // Validate IGDB ID parameter
  const isValidId = id && !isNaN(parseInt(id)) && parseInt(id) > 0;
  
  // State for text expansion
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isDeveloperExpanded, setIsDeveloperExpanded] = useState(false);
  const [isPublisherExpanded, setIsPublisherExpanded] = useState(false);
  
  // Use reducer for centralized state management
  const [state, dispatch] = useReducer(gamePageReducer, initialState);
  const { 
    game, 
    gameLoading, 
    gameError, 
    reviews, 
    reviewsLoading, 
    reviewsError,
    isStarted,
    isCompleted,
    progressLoading,
    userHasReviewed,
    userReviewLoading,
    showAuthModal,
    pendingAction,
    gameCategory,
    categoryLoading
  } = state;

  // Refetch function using the new consolidated service method
  const refetchGame = async () => {
    if (!isValidId) {
      dispatch({ type: 'SET_GAME_ERROR', payload: new Error('Invalid game ID') });
      return;
    }
    
    dispatch({ type: 'SET_GAME_LOADING', payload: true });

    try {
      // Use the new consolidated method to fetch both game and reviews
      const { game: gameData, reviews: reviewData } = await gameDataService.getGameWithFullReviews(parseInt(id));
      
      if (gameData) {
        dispatch({ type: 'LOAD_GAME_SUCCESS', payload: { game: gameData, reviews: reviewData } });
      } else {
        dispatch({ type: 'LOAD_GAME_ERROR', payload: new Error('Game not found') });
      }
    } catch (error) {
      dispatch({ type: 'LOAD_GAME_ERROR', payload: error as Error });
    }
  };

  // Load game data and reviews in a single call
  useEffect(() => {
    const loadGameData = async () => {
      if (!isValidId) {
        dispatch({ type: 'SET_GAME_ERROR', payload: new Error('Invalid or missing game ID') });
        return;
      }

      dispatch({ type: 'SET_GAME_LOADING', payload: true });
      dispatch({ type: 'SET_REVIEWS_LOADING', payload: true });

      try {
        console.log('Loading game with IGDB ID:', id);
        
        // Use the consolidated method to fetch both game and reviews
        const { game: gameData, reviews: reviewData } = await gameDataService.getGameWithFullReviews(parseInt(id));
        
        if (gameData) {
          console.log('✅ Game loaded successfully:', gameData.name);
          console.log(`✅ Loaded ${reviewData.length} reviews`);
          console.log('📊 Raw review data:', reviewData);
          dispatch({ type: 'LOAD_GAME_SUCCESS', payload: { game: gameData, reviews: reviewData } });
        } else {
          console.log('❌ Game not found for IGDB ID:', id);
          dispatch({ type: 'LOAD_GAME_ERROR', payload: new Error('Game not found') });
        }
      } catch (error) {
        console.error('❌ Failed to load game:', error);
        dispatch({ type: 'LOAD_GAME_ERROR', payload: error as Error });
      }
    };

    loadGameData();
  }, [id, isValidId]);

  // Load game progress when user is authenticated and game is loaded
  useEffect(() => {
    const loadGameProgress = async () => {
      if (!game || !id || !isAuthenticated) return;

      dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
      try {
        console.log('Loading game progress for game ID:', id);
        const result = await getGameProgress(parseInt(id));
        
        if (result.success && result.data) {
          dispatch({ type: 'SET_PROGRESS', payload: { 
            isStarted: result.data.started, 
            isCompleted: result.data.completed 
          }});
          console.log('✅ Game progress loaded:', result.data);
        } else {
          // No progress found, set to false
          dispatch({ type: 'SET_PROGRESS', payload: { isStarted: false, isCompleted: false }});
          console.log('ℹ️ No game progress found');
        }
      } catch (error) {
        console.error('❌ Error loading game progress:', error);
        dispatch({ type: 'SET_PROGRESS', payload: { isStarted: false, isCompleted: false }});
      } finally {
        dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
      }
    };

    loadGameProgress();
  }, [game, id, isAuthenticated]);

  // Check if user has already reviewed this game
  useEffect(() => {
    const checkUserReview = async () => {
      if (!game || !id || !isAuthenticated) {
        dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { hasReviewed: false, loading: false }});
        return;
      }

      dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { hasReviewed: false, loading: true }});
      try {
        console.log('Checking if user has reviewed game ID:', id);
        const result = await getUserReviewForGame(parseInt(id));
        
        if (result.success) {
          dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { 
            hasReviewed: !!result.data, 
            loading: false 
          }});
          console.log('User has reviewed game:', !!result.data);
        } else {
          console.error('Error checking user review:', result.error);
          dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { hasReviewed: false, loading: false }});
        }
      } catch (error) {
        console.error('Error checking user review:', error);
        dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { hasReviewed: false, loading: false }});
      }
    };

    checkUserReview();
  }, [game, id, isAuthenticated]);

  // Fetch game category from IGDB for DLC/expansion detection
  useEffect(() => {
    const fetchGameCategory = async () => {
      if (!game || !id) return;

      dispatch({ type: 'SET_GAME_CATEGORY', payload: { category: null, loading: true }});

      try {
        console.log('Fetching category for game IGDB ID:', id);
        
        const response = await fetch('/.netlify/functions/igdb-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isBulkRequest: true,
            endpoint: 'games',
            requestBody: `fields category, parent_game; where id = ${id};`
          })
        });

        if (!response.ok) {
          console.error('IGDB API response not ok:', response.status);
          dispatch({ type: 'SET_GAME_CATEGORY', payload: { category: null, loading: false }});
          return;
        }

        const data = await response.json();
        
        if (!data.success) {
          console.error('IGDB API returned error:', data.error);
          dispatch({ type: 'SET_GAME_CATEGORY', payload: { category: null, loading: false }});
          return;
        }

        const categoryValue = data.games?.[0]?.category || null;
        console.log('✅ Game category fetched:', categoryValue);
        dispatch({ type: 'SET_GAME_CATEGORY', payload: { category: categoryValue, loading: false }});

      } catch (error) {
        console.error('Category fetch failed:', error);
        dispatch({ type: 'SET_GAME_CATEGORY', payload: { category: null, loading: false }});
      }
    };

    fetchGameCategory();
  }, [game, id]);

  // Reviews are now loaded with game data in the main useEffect
  // This reduces redundant API calls and improves performance

  // Handle auth-required actions
  const handleAuthRequiredAction = (action: string) => {
    if (!isAuthenticated) {
      dispatch({ type: 'SET_AUTH_MODAL', payload: { show: true, pendingAction: action }});
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

    dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
    try {
      // Game should already exist since it was loaded, but verify with database ID
      const ensureResult = await ensureGameExists(game.id);

      if (!ensureResult.success) {
        console.error('Failed to ensure game exists:', ensureResult.error);
        alert(`Failed to verify game in database: ${ensureResult.error}`);
        return;
      }

      // Mark game as started using IGDB ID
      const result = await markGameStarted(parseInt(id));
      
      if (result.success) {
        dispatch({ type: 'SET_PROGRESS', payload: { isStarted: true, isCompleted } });
        console.log('✅ Game marked as started');
      } else {
        console.error('Failed to mark game as started:', result.error);
        alert(`Failed to mark game as started: ${result.error}`);
      }
    } catch (error) {
      console.error('Error marking game as started:', error);
      alert('Failed to mark game as started. Please try again.');
    } finally {
      dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
    }
  };

  const handleMarkCompleted = async () => {
    if (!game || !id || isCompleted) return; // Don't allow if already completed

    dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
    try {
      // Game should already exist since it was loaded, but verify with database ID
      const ensureResult = await ensureGameExists(game.id);

      if (!ensureResult.success) {
        console.error('Failed to ensure game exists:', ensureResult.error);
        alert(`Failed to verify game in database: ${ensureResult.error}`);
        return;
      }

      // Mark game as completed using IGDB ID (this will also mark as started)
      const result = await markGameCompleted(parseInt(id));
      
      if (result.success) {
        dispatch({ type: 'SET_PROGRESS', payload: { isStarted: true, isCompleted: true } });
        console.log('✅ Game marked as completed');
      } else {
        console.error('Failed to mark game as completed:', result.error);
        alert(`Failed to mark game as completed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error marking game as completed:', error);
      alert('Failed to mark game as completed. Please try again.');
    } finally {
      dispatch({ type: 'SET_PROGRESS_LOADING', payload: false });
    }
  };

  const handleAuthSuccess = () => {
    dispatch({ type: 'SET_AUTH_MODAL', payload: { show: false, pendingAction: null }});
    if (pendingAction) {
      executeAction(pendingAction);
    }
  };

  // Recommendation 4: Add data validation for reviews
  const validRatings = useMemo(() => 
    reviews.filter(r => 
      r.rating >= 1 && r.rating <= 10 && !isNaN(r.rating)
    ),
    [reviews]
  );

  // Transform reviews to match ReviewCard component expectations
  const transformedReviews = useMemo(() => 
    validRatings.map((review: GameReview) => ({
      id: review.id.toString(),
      userId: review.user_id.toString(),
      gameId: review.game_id.toString(),
      igdbGameId: id, // Use the IGDB game_id from the URL parameter
      gameTitle: game?.name || 'Unknown Game',
      rating: review.rating,
      text: review.review || '',
      date: new Date(review.post_date_time).toISOString().split('T')[0],
      hasText: !!review.review,
      likeCount: 0, // To be implemented with real data
      commentCount: 0, // To be implemented with real data
      author: review.user?.name || 'Anonymous',
      authorAvatar: review.user?.avatar_url || '/default-avatar.png'
    })),
    [validRatings, id, game?.name]
  );

  // Recommendation 6: Clarify terminology - separate reviews with text from ratings
  const reviewsWithText = useMemo(() => 
    transformedReviews.filter(r => r.hasText),
    [transformedReviews]
  );

  const topReviews = useMemo(() => 
    transformedReviews.filter(r => r.rating >= 8).slice(0, 3),
    [transformedReviews]
  );
  
  const recentReviews = useMemo(() => 
    transformedReviews.slice(0, 5),
    [transformedReviews]
  );

  // Recommendation 3: Use game's calculated average from service
  const averageRating = game?.averageUserRating || 0;

  // Recommendation 5: Memoize expensive calculations
  // Recommendation 7: Add error boundaries for distribution
  const ratingDistribution = useMemo(() => {
    if (reviewsLoading) {
      return Array.from({ length: 10 }, (_, i) => ({ 
        rating: i + 1, 
        count: 0, 
        percentage: 0 
      }));
    }
    
    try {
      // Debug logging
      console.log('📊 Bar Graph Debug:', {
        reviews: reviews,
        validRatings: validRatings,
        validRatingsCount: validRatings.length,
        reviewsCount: reviews.length,
        sampleRating: validRatings[0]
      });
      
      // Get distribution already in ascending order (1-10)
      const distribution = generateRatingDistribution(validRatings);
      console.log('📊 Generated distribution:', distribution);
      return distribution;
    } catch (error) {
      console.error('Error generating rating distribution:', error);
      // Return default distribution on error
      return Array.from({ length: 10 }, (_, i) => ({ 
        rating: i + 1, 
        count: 0, 
        percentage: 0 
      }));
    }
  }, [validRatings, reviewsLoading]);

  // Count ratings vs reviews for clarity
  const totalRatings = validRatings.length;
  const totalReviews = reviewsWithText.length;

  // Helper function to format date to full month name
  const formatFullDate = (date: Date | string | number | undefined): string => {
    if (!date) return 'Unknown';
    
    try {
      const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      
      if (isNaN(dateObj.getTime())) {
        return 'Unknown';
      }
      
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      return dateObj.toLocaleDateString('en-US', options);
    } catch {
      return 'Unknown';
    }
  };

  // Helper to check if text needs truncation (for developers/publishers)
  const needsTruncation = (text: string | undefined, maxLength: number = 30): boolean => {
    return text ? text.length > maxLength : false;
  };
  
  // Helper to truncate text
  const truncateText = (text: string | undefined, maxLength: number = 30): string => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

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
              Debug: Tried to load game with IGDB ID: {id}
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
                  <SmartImage
                    src={game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : (game.cover_url || '/placeholder-game.jpg')}
                    alt={game.name}
                    className="h-64 w-full object-cover md:h-80 md:w-64"
                    optimization={{
                      width: 640,
                      height: 960,
                      quality: 95,
                      format: 'webp'
                    }}
                    fallback="/placeholder-game.jpg"
                  />
                </div>
                <div className="p-8">
                  <h1 className="text-3xl font-bold text-white mb-4">
                    {game.name}
                  </h1>
                  <div className="space-y-2 text-gray-400 mb-6">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {formatFullDate(game.first_release_date)}
                      </span>
                    </div>
                    {game.platforms && game.platforms.length > 0 && (
                      <div><strong>Platforms:</strong> {game.platforms.join(', ')}</div>
                    )}
                    {game.developer && (
                      <div className="flex items-center gap-2">
                        <strong>Developer:</strong> 
                        <span className="truncate">
                          {isDeveloperExpanded || !needsTruncation(game.developer) 
                            ? game.developer 
                            : truncateText(game.developer)}
                        </span>
                        {needsTruncation(game.developer) && (
                          <button
                            onClick={() => setIsDeveloperExpanded(!isDeveloperExpanded)}
                            className="text-purple-400 hover:text-purple-300 text-sm whitespace-nowrap"
                          >
                            {isDeveloperExpanded ? 'See less' : 'See more'}
                          </button>
                        )}
                      </div>
                    )}
                    {game.publisher && (
                      <div className="flex items-center gap-2">
                        <strong>Publisher:</strong> 
                        <span className="truncate">
                          {isPublisherExpanded || !needsTruncation(game.publisher) 
                            ? game.publisher 
                            : truncateText(game.publisher)}
                        </span>
                        {needsTruncation(game.publisher) && (
                          <button
                            onClick={() => setIsPublisherExpanded(!isPublisherExpanded)}
                            className="text-purple-400 hover:text-purple-300 text-sm whitespace-nowrap"
                          >
                            {isPublisherExpanded ? 'See less' : 'See more'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mb-6">
                    <p 
                      className="text-gray-300 leading-relaxed transition-all duration-300"
                      style={{
                        display: '-webkit-box',
                        WebkitLineClamp: !isSummaryExpanded ? 3 : 'unset',
                        WebkitBoxOrient: 'vertical',
                        overflow: !isSummaryExpanded ? 'hidden' : 'visible'
                      }}
                    >
                      {game.summary || 'No description available.'}
                    </p>
                    {game.summary && game.summary.length > 200 && (
                      <button
                        onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                        className="text-purple-400 hover:text-purple-300 text-sm mt-2 flex items-center gap-1"
                      >
                        {isSummaryExpanded ? (
                          <>
                            See less <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            See more <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
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

                <div className="ml-auto">
                  {isAuthenticated ? (
                    <Link
                      to={`/review/${game.igdb_id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ScrollText className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {userReviewLoading ? 'Loading...' : userHasReviewed ? 'Edit Review' : 'Write a Review'}
                      </span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleAuthRequiredAction('write_review')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ScrollText className="h-4 w-4" />
                      <span className="text-sm font-medium">Write a Review</span>
                    </button>
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
                <div className="text-sm">
                  <span className="text-blue-400">
                    {reviewsLoading ? 'Loading...' : totalRatings}
                  </span>
                </div>
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
                  <div className="flex flex-col">
                    <div className="flex items-end gap-[2px] mb-1" style={{ height: '80px' }}>
                      {ratingDistribution.map((item) => (
                        <div
                          key={item.rating}
                          className="w-6 bg-gray-700 rounded-sm"
                          style={{
                            height: item.count > 0 
                              ? `${(item.percentage / 100) * 80}px`
                              : '2px',
                            backgroundColor: item.rating >= 8 ? '#4ade80' : '#374151'
                          }}
                        ></div>
                      ))}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-500 text-xs" style={{ width: '24px', textAlign: 'center' }}>1</span>
                      <span className="text-green-500 text-xs" style={{ width: '24px', textAlign: 'center' }}>10</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {averageRating > 0 ? averageRating.toFixed(1) : '-'}
                  </div>
                </div>
              )}
            </div>

            {/* Parent Game Section (for DLC/Expansions) */}
            {game && !categoryLoading && gameCategory && dlcService.isDLC(gameCategory) && (
              <ParentGameSection dlcId={game.igdb_id} />
            )}

            {/* DLC Section (for Main Games) */}
            {game && !categoryLoading && (!gameCategory || gameCategory === 0) && (
              <DLCSection gameId={game.igdb_id} />
            )}

            {/* Mod Section (for Main Games) - Hidden for aggressive copyright companies */}
            {game && !categoryLoading && (!gameCategory || gameCategory === 0) && !shouldHideFanContent(game) && (
              <ModSection gameId={game.igdb_id} />
            )}
          </div>
        </div>

        {/* Reviews Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Reviews</h2>
            {reviewsLoading && (
              <div className="flex items-center gap-2 text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500"></div>
                <span className="text-sm">Loading reviews...</span>
              </div>
            )}
          </div>

          {/* Reviews content - show only reviews with text */}
          {reviewsWithText.length > 0 ? (
            <div className="space-y-4">
              {reviewsWithText.slice(0, 5).map(review => (
                <Link 
                  key={review.id} 
                  to={`/review/${review.userId}/${review.gameId}`}
                  className="bg-gray-800 rounded-lg p-4 block hover:bg-gray-700 transition-colors"
                >
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
                </Link>
              ))}
            </div>
          ) : !reviewsLoading && (
            <div className="text-center py-8 text-gray-500">
              <p>No written reviews yet. Be the first to write a review for this game!</p>
              {!isAuthenticated && (
                <button
                  onClick={() => dispatch({ type: 'SET_AUTH_MODAL', payload: { show: true, pendingAction: null }})}
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
          dispatch({ type: 'SET_AUTH_MODAL', payload: { show: false, pendingAction: null }});
        }}
        onLoginSuccess={handleAuthSuccess}
        onSignupSuccess={handleAuthSuccess}
      />
    </div>
  );
};
