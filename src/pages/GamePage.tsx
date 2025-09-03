import React, { useState, useEffect, useReducer, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Calendar, User, MessageCircle, Plus, Check, Heart, ScrollText, ChevronDown, ChevronUp, Gift, BookOpen, Play, CheckCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { StarRating } from '../components/StarRating';
import { ReviewCard } from '../components/ReviewCard';
import { AuthModal } from '../components/auth/AuthModal';
import { gameDataService } from '../services/gameDataService';
import type { GameWithCalculatedFields } from '../types/database';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../services/supabase';
import { getGameProgress, markGameStarted, markGameCompleted } from '../services/gameProgressService';
import { ensureGameExists, getUserReviewForGameByIGDBId } from '../services/reviewService';
import { generateRatingDistribution } from '../utils/dataTransformers';
import { DLCSection } from '../components/DLCSection';
import { ParentGameSection } from '../components/ParentGameSection';
import { ModSection } from '../components/ModSection';
import { dlcService } from '../services/dlcService';
import { SmartImage } from '../components/SmartImage';
import { shouldHideFanContent } from '../utils/contentProtectionFilter';
import { isNumericIdentifier } from '../utils/gameUrls';
import { collectionWishlistService } from '../services/collectionWishlistService';
import { mapPlatformNames } from '../utils/platformMapping';
import { GameActionSheet } from '../components/GameActionSheet';

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
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  
  // State for text expansion
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const [isDevPubExpanded, setIsDevPubExpanded] = useState(false);
  const [isPlatformsExpanded, setIsPlatformsExpanded] = useState(false);
  
  // State for collection and wishlist
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isInCollection, setIsInCollection] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [collectionLoading, setCollectionLoading] = useState(false);
  
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
    if (!identifier) {
      dispatch({ type: 'SET_GAME_ERROR', payload: new Error('Invalid game identifier') });
      return;
    }
    
    dispatch({ type: 'SET_GAME_LOADING', payload: true });

    try {
      let gameData = null;
      let reviewData = [];

      // Smart resolution: check if identifier is numeric (IGDB ID) or slug
      if (isNumericIdentifier(identifier)) {
        console.log('🔢 Treating as IGDB ID:', identifier);
        const result = await gameDataService.getGameWithFullReviews(parseInt(identifier));
        gameData = result.game;
        reviewData = result.reviews;
      } else {
        console.log('🔤 Treating as slug:', identifier);
        const result = await gameDataService.getGameWithFullReviewsBySlug(identifier);
        gameData = result.game;
        reviewData = result.reviews;
      }
      
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
      if (!identifier) {
        dispatch({ type: 'SET_GAME_ERROR', payload: new Error('Invalid or missing game identifier') });
        return;
      }

      dispatch({ type: 'SET_GAME_LOADING', payload: true });
      dispatch({ type: 'SET_REVIEWS_LOADING', payload: true });

      try {
        console.log('Loading game with identifier:', identifier);
        
        // Smart resolution: check if identifier is numeric (IGDB ID) or slug
        let result;
        if (isNumericIdentifier(identifier)) {
          console.log('Using IGDB ID lookup:', identifier);
          result = await gameDataService.getGameWithFullReviews(parseInt(identifier));
        } else {
          console.log('Using slug lookup:', identifier);
          result = await gameDataService.getGameWithFullReviewsBySlug(identifier);
        }
        
        const { game: gameData, reviews: reviewData } = result;
        
        if (gameData) {
          console.log('✅ Game loaded successfully:', gameData.name);
          console.log(`✅ Loaded ${reviewData.length} reviews`);
          console.log('📊 Raw review data:', reviewData);
          dispatch({ type: 'LOAD_GAME_SUCCESS', payload: { game: gameData, reviews: reviewData } });
          
          // If loaded by IGDB ID but game has slug, redirect to canonical URL
          if (isNumericIdentifier(identifier) && gameData.slug) {
            navigate(`/game/${gameData.slug}`, { replace: true });
          }
        } else {
          console.log('❌ Game not found for identifier:', identifier);
          dispatch({ type: 'LOAD_GAME_ERROR', payload: new Error('Game not found') });
        }
      } catch (error) {
        console.error('❌ Failed to load game:', error);
        dispatch({ type: 'LOAD_GAME_ERROR', payload: error as Error });
      }
    };

    loadGameData();
  }, [identifier, navigate]);

  // Load game progress when user is authenticated and game is loaded
  useEffect(() => {
    const loadGameProgress = async () => {
      if (!game || !game.igdb_id || !isAuthenticated) return;

      dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
      try {
        console.log('Loading game progress for game ID:', game.igdb_id);
        const result = await getGameProgress(game.igdb_id);
        
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
  }, [game, isAuthenticated]);

  // Check if user has already reviewed this game
  useEffect(() => {
    const checkUserReview = async () => {
      if (!game || !game.igdb_id || !isAuthenticated) {
        dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { hasReviewed: false, loading: false }});
        return;
      }

      dispatch({ type: 'SET_USER_REVIEW_STATUS', payload: { hasReviewed: false, loading: true }});
      try {
        console.log('Checking if user has reviewed game IGDB ID:', game.igdb_id);
        const result = await getUserReviewForGameByIGDBId(game.igdb_id);
        
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
  }, [game, isAuthenticated]);

  // Check collection and wishlist status - with error recovery
  useEffect(() => {
    const checkCollectionWishlistStatus = async () => {
      if (!game || !game.igdb_id || !isAuthenticated) {
        setIsInCollection(false);
        setIsInWishlist(false);
        return;
      }

      try {
        // Add timeout for mobile networks
        const statusPromise = collectionWishlistService.checkBothStatuses(game.igdb_id);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );
        
        const status = await Promise.race([statusPromise, timeoutPromise]).catch(() => ({
          inWishlist: false,
          inCollection: false
        }));
        
        // If game is started/finished, don't show wishlist/collection status
        const progressPromise = getGameProgress(game.igdb_id);
        const progress = await Promise.race([
          progressPromise,
          new Promise(resolve => setTimeout(() => resolve(null), 3000))
        ]).catch(() => null);
        
        if (progress?.started || progress?.completed) {
          setIsInWishlist(false);
          setIsInCollection(false);
          // Clean up any stale wishlist/collection entries (non-blocking)
          if (status.inWishlist) {
            collectionWishlistService.removeFromWishlist(game.igdb_id).catch(() => {});
          }
          if (status.inCollection) {
            collectionWishlistService.removeFromCollection(game.igdb_id).catch(() => {});
          }
        } else {
          setIsInCollection(status.inCollection);
          setIsInWishlist(status.inWishlist);
        }
        console.log('Collection/Wishlist status:', status);
      } catch (error) {
        console.error('Error checking collection/wishlist status:', error);
        // Default to false on error
        setIsInCollection(false);
        setIsInWishlist(false);
      }
    };

    checkCollectionWishlistStatus();
  }, [game, isAuthenticated]);

  // Fetch game category from IGDB for DLC/expansion detection - with timeout for mobile
  useEffect(() => {
    const fetchGameCategory = async () => {
      if (!game || !game.igdb_id) return;

      dispatch({ type: 'SET_GAME_CATEGORY', payload: { category: null, loading: true }});

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for mobile

      try {
        console.log('Fetching category for game IGDB ID:', game.igdb_id);
        
        const response = await fetch('/.netlify/functions/igdb-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isBulkRequest: true,
            endpoint: 'games',
            requestBody: `fields category, parent_game; where id = ${game.igdb_id};`
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

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
        clearTimeout(timeoutId);
        
        // Handle timeout specifically
        if (error.name === 'AbortError') {
          console.warn('Category fetch timed out (mobile network issue)');
        } else {
          console.error('Category fetch failed:', error);
        }
        
        // Still load the page even if category fetch fails
        dispatch({ type: 'SET_GAME_CATEGORY', payload: { category: null, loading: false }});
      }
    };

    fetchGameCategory();
  }, [game]);

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
    if (!game || !game.igdb_id) return;

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
    if (!game || !game.igdb_id || isStarted) return; // Don't allow if already started
    
    // Automatically move from wishlist/collection when marking as started
    if (isInWishlist || isInCollection) {
      console.log('Moving game from wishlist/collection to started');
      if (isInWishlist) {
        await collectionWishlistService.removeFromWishlist(game.igdb_id);
        setIsInWishlist(false);
      }
      if (isInCollection) {
        await collectionWishlistService.removeFromCollection(game.igdb_id);
        setIsInCollection(false);
      }
    }

    dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
    try {
      // Game should already exist since it was loaded, but verify with complete game data
      const ensureResult = await ensureGameExists({
        id: game.id,
        igdb_id: game.igdb_id,
        name: game.name,
        cover_url: game.cover_url,
        releaseDate: game.release_date || game.first_release_date
      });

      if (!ensureResult.success) {
        console.error('Failed to ensure game exists:', ensureResult.error);
        alert(`Failed to verify game in database: ${ensureResult.error}`);
        return;
      }

      // Mark game as started using IGDB ID
      const result = await markGameStarted(game.igdb_id);
      
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
    if (!game || !game.igdb_id || isCompleted) return; // Don't allow if already completed
    
    // Automatically move from wishlist/collection when marking as completed
    if (isInWishlist || isInCollection) {
      console.log('Moving game from wishlist/collection to completed');
      if (isInWishlist) {
        await collectionWishlistService.removeFromWishlist(game.igdb_id);
        setIsInWishlist(false);
      }
      if (isInCollection) {
        await collectionWishlistService.removeFromCollection(game.igdb_id);
        setIsInCollection(false);
      }
    }

    dispatch({ type: 'SET_PROGRESS_LOADING', payload: true });
    try {
      // Game should already exist since it was loaded, but verify with complete game data
      const ensureResult = await ensureGameExists({
        id: game.id,
        igdb_id: game.igdb_id,
        name: game.name,
        cover_url: game.cover_url,
        releaseDate: game.release_date || game.first_release_date
      });

      if (!ensureResult.success) {
        console.error('Failed to ensure game exists:', ensureResult.error);
        alert(`Failed to verify game in database: ${ensureResult.error}`);
        return;
      }

      // Mark game as completed using IGDB ID (this will also mark as started)
      const result = await markGameCompleted(game.igdb_id);
      
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

  const handleToggleWishlist = async () => {
    if (!game || !game.igdb_id) return;
    
    // Prevent wishlist if game is in collection or started/finished
    if (isInCollection || isStarted || isCompleted) {
      console.warn('Cannot add to wishlist: game is already in collection or started/finished');
      return;
    }

    if (!isAuthenticated) {
      dispatch({ type: 'SET_AUTH_MODAL', payload: { show: true, pendingAction: 'toggle_wishlist' }});
      return;
    }

    setWishlistLoading(true);
    try {
      const gameData = {
        igdb_id: game.igdb_id,
        name: game.name,
        cover_url: game.cover_url,
        genre: game.genre,
        release_date: game.release_date
      };

      const result = await collectionWishlistService.toggleWishlist(game.igdb_id, gameData);
      
      if (result.success) {
        setIsInWishlist(result.data || false);
        console.log(result.data ? '✅ Added to wishlist' : '✅ Removed from wishlist');
      } else {
        console.error('Failed to toggle wishlist:', result.error);
        alert(`Failed to update wishlist: ${result.error}`);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      alert('Failed to update wishlist. Please try again.');
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleToggleCollection = async () => {
    if (!game || !game.igdb_id) return;
    
    if (!isAuthenticated) {
      dispatch({ type: 'SET_AUTH_MODAL', payload: { show: true, pendingAction: 'toggle_collection' }});
      return;
    }

    setCollectionLoading(true);
    try {
      const gameData = {
        igdb_id: game.igdb_id,
        name: game.name,
        cover_url: game.cover_url,
        genre: game.genre,
        release_date: game.release_date
      };

      // If in wishlist, move to collection (remove from wishlist, add to collection)
      if (isInWishlist) {
        const result = await collectionWishlistService.moveFromWishlistToCollection(game.igdb_id, gameData);
        if (result.success) {
          setIsInWishlist(false);
          setIsInCollection(true);
          console.log('✅ Moved from wishlist to collection');
        } else {
          console.error('Failed to move to collection:', result.error);
          alert(`Failed to move to collection: ${result.error}`);
        }
      } else {
        // Toggle collection status
        const result = await collectionWishlistService.toggleCollection(game.igdb_id, gameData);
        if (result.success) {
          setIsInCollection(result.data || false);
          console.log(result.data ? '✅ Added to collection' : '✅ Removed from collection');
        } else {
          console.error('Failed to toggle collection:', result.error);
          alert(`Failed to update collection: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Error toggling collection:', error);
      alert('Failed to update collection. Please try again.');
    } finally {
      setCollectionLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    dispatch({ type: 'SET_AUTH_MODAL', payload: { show: false, pendingAction: null }});
    if (pendingAction) {
      if (pendingAction === 'toggle_wishlist') {
        handleToggleWishlist();
      } else if (pendingAction === 'toggle_collection') {
        handleToggleCollection();
      } else {
        executeAction(pendingAction);
      }
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
      igdbGameId: game?.igdb_id?.toString() || '', // Use the IGDB game_id from the game data
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
    [validRatings, game?.igdb_id, game?.name]
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

  // Helper function to format date to full month name - mobile-safe version
  const formatFullDate = (date: Date | string | number | undefined): string => {
    if (!date) return 'Unknown';
    
    try {
      let dateObj: Date;
      
      // Handle Unix timestamp (number)
      if (typeof date === 'number') {
        // IGDB uses Unix timestamps
        dateObj = new Date(date * 1000);
      } else if (typeof date === 'string') {
        // Try to parse ISO date strings safely
        // Replace any timezone issues for mobile Safari
        const cleanDateStr = date.replace(' ', 'T').replace(/\//, '-');
        dateObj = new Date(cleanDateStr);
        
        // Fallback for Safari: try parsing with Date.parse
        if (isNaN(dateObj.getTime())) {
          const parsed = Date.parse(cleanDateStr);
          if (!isNaN(parsed)) {
            dateObj = new Date(parsed);
          } else {
            // Last resort: try to extract year, month, day
            const match = date.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
            if (match) {
              dateObj = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
            } else {
              return 'Unknown';
            }
          }
        }
      } else if (date instanceof Date) {
        dateObj = date;
      } else {
        return 'Unknown';
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'Unknown';
      }
      
      // Use fallback formatting for better mobile compatibility
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
      const month = months[dateObj.getMonth()];
      const day = dateObj.getDate();
      const year = dateObj.getFullYear();
      
      return `${month} ${day}, ${year}`;
    } catch (error) {
      console.error('Date formatting error:', error, 'for date:', date);
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12">
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
              Debug: Tried to load game with identifier: {identifier}
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

  // Generate SEO meta data
  const metaDescription = game.summary 
    ? game.summary.substring(0, 160) 
    : `${game.name} - Rating: ${averageRating.toFixed(1)}/10. ${totalRatings} player ratings. ${game.genres?.join(', ') || 'Game'} on ${game.platforms ? mapPlatformNames(game.platforms).join(', ') : 'multiple platforms'}.`;
  
  const canonicalUrl = game.slug 
    ? `https://vgreviewapp.com/game/${game.slug}`
    : `https://vgreviewapp.com/game/${game.igdb_id}`;
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": game.name,
    "description": game.summary || metaDescription,
    "image": game.cover_url || game.cover?.url 
      ? (game.cover?.url || game.cover_url).startsWith('http') 
        ? (game.cover?.url || game.cover_url)
        : `https:${(game.cover?.url || game.cover_url)}`
      : undefined,
    "aggregateRating": totalRatings > 0 ? {
      "@type": "AggregateRating",
      "ratingValue": averageRating.toFixed(1),
      "bestRating": "10",
      "worstRating": "1",
      "ratingCount": totalRatings
    } : undefined,
    "genre": game.genres || [],
    "gamePlatform": game.platforms || [],
    "publisher": game.publisher,
    "developer": game.developer,
    "datePublished": game.first_release_date || game.release_date
  };

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{game.name} - VGReviewApp</title>
        <meta name="title" content={`${game.name} - VGReviewApp`} />
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={`${game.name} - VGReviewApp`} />
        <meta property="og:description" content={metaDescription} />
        {game.cover_url && (
          <meta property="og:image" content={
            game.cover_url.startsWith('http') 
              ? game.cover_url
              : `https:${game.cover_url}`
          } />
        )}
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={canonicalUrl} />
        <meta property="twitter:title" content={`${game.name} - VGReviewApp`} />
        <meta property="twitter:description" content={metaDescription} />
        {game.cover_url && (
          <meta property="twitter:image" content={
            game.cover_url.startsWith('http') 
              ? game.cover_url
              : `https:${game.cover_url}`
          } />
        )}
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
        
        {/* Additional SEO Tags */}
        <meta name="robots" content="index, follow" />
        <meta name="language" content="English" />
        <meta name="revisit-after" content="7 days" />
        <meta name="author" content="VGReviewApp" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">


          {/* Game Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8 lg:mb-12">
          {/* Game Cover and Info */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="md:flex">
                <div className="md:flex-shrink-0">
                  <SmartImage
                    src={game.cover?.url ? `https:${game.cover.url}` : (game.cover_url || '/placeholder-game.jpg')}
                    alt={game.name}
                    className="h-64 w-full object-cover md:h-80 md:w-64"
                    optimization={{
                      width: window.innerWidth < 768 ? 320 : 640,  // Smaller for mobile
                      height: window.innerWidth < 768 ? 480 : 960, // Smaller for mobile
                      quality: window.innerWidth < 768 ? 80 : 95,  // Lower quality for mobile
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
                        {formatFullDate(game.first_release_date || game.release_date)}
                      </span>
                    </div>
                    {game.platforms && game.platforms.length > 0 && (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <strong className="whitespace-nowrap flex-shrink-0">Platforms:</strong>
                          <div className="flex-1 min-w-0">
                            <span>
                              {mapPlatformNames(game.platforms).join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {(game.developer || game.publisher) && (
                      <div>
                        {!isDevPubExpanded ? (
                          // Collapsed view - separate lines
                          <div className="space-y-1">
                            {game.developer && (
                              <div className="flex items-center gap-2">
                                <strong className="whitespace-nowrap flex-shrink-0">Developer:</strong>
                                <span className="truncate">{truncateText(game.developer, 30)}</span>
                                {needsTruncation(game.developer, 30) && (
                                  <button
                                    onClick={() => setIsDevPubExpanded(true)}
                                    className="text-purple-400 hover:text-purple-300 text-sm whitespace-nowrap flex-shrink-0 ml-2"
                                  >
                                    See more
                                  </button>
                                )}
                              </div>
                            )}
                            {game.publisher && (
                              <div className="flex items-center gap-2">
                                <strong className="whitespace-nowrap flex-shrink-0">Publisher:</strong>
                                <span className="truncate">{truncateText(game.publisher, 30)}</span>
                                {needsTruncation(game.publisher, 30) && (
                                  <button
                                    onClick={() => setIsDevPubExpanded(true)}
                                    className="text-purple-400 hover:text-purple-300 text-sm whitespace-nowrap flex-shrink-0 ml-2"
                                  >
                                    See more
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          // Expanded view - full text
                          <div className="space-y-1">
                            {game.developer && (
                              <div>
                                <strong>Developer:</strong> {game.developer}
                              </div>
                            )}
                            {game.publisher && (
                              <div>
                                <strong>Publisher:</strong> {game.publisher}
                              </div>
                            )}
                            <button
                              onClick={() => setIsDevPubExpanded(false)}
                              className="text-purple-400 hover:text-purple-300 text-sm mt-1"
                            >
                              See less
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mb-6">
                    <div className="relative">
                      <p 
                        className={`text-gray-300 leading-relaxed transition-all duration-300 ${
                          !isSummaryExpanded ? 'line-clamp-3' : ''
                        }`}
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: !isSummaryExpanded ? 3 : 'unset',
                          WebkitBoxOrient: 'vertical',
                          overflow: !isSummaryExpanded ? 'hidden' : 'visible',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {game.summary || 'No description available.'}
                      </p>
                    </div>
                    {game.summary && game.summary.length > 200 && (
                      <button
                        onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                        className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-flex items-center gap-1"
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

              {/* User Actions - Wishlist, Collection, Started, Finished and Write Review */}
              <div className="p-6 border-t border-gray-700">
                {/* Mobile Action Sheet - Only visible on mobile */}
                <div className="md:hidden">
                  <GameActionSheet
                    isInWishlist={isInWishlist}
                    isInCollection={isInCollection}
                    isStarted={isStarted}
                    isCompleted={isCompleted}
                    userHasReviewed={userHasReviewed}
                    wishlistLoading={wishlistLoading}
                    collectionLoading={collectionLoading}
                    progressLoading={progressLoading}
                    userReviewLoading={userReviewLoading}
                    onToggleWishlist={handleToggleWishlist}
                    onToggleCollection={handleToggleCollection}
                    onMarkStarted={() => handleAuthRequiredAction('mark_started')}
                    onMarkCompleted={() => handleAuthRequiredAction('mark_completed')}
                    onWriteReview={() => {
                      if (isAuthenticated) {
                        navigate(`/review/${game.igdb_id}`);
                      } else {
                        handleAuthRequiredAction('write_review');
                      }
                    }}
                  />
                </div>

                {/* Desktop buttons - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-6 w-full">
                  {/* Wishlist Button - Gray out when unavailable */}
                  <button
                    onClick={handleToggleWishlist}
                    disabled={wishlistLoading || isInCollection || isStarted || isCompleted}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isInCollection || isStarted || isCompleted
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                        : isInWishlist
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'border border-red-500 text-red-400 hover:bg-red-600/10'
                    } ${wishlistLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {wishlistLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Gift className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {isInWishlist ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span>In</span>
                          <span>Wishlist</span>
                        </span>
                      ) : (
                        <span className="flex flex-col items-center leading-tight">
                          <span>Add to</span>
                          <span>Wishlist</span>
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Collection Button - Gray out when unavailable */}
                  <button
                    onClick={handleToggleCollection}
                    disabled={collectionLoading || isStarted || isCompleted}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isStarted || isCompleted
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-50'
                        : isInCollection
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'border border-orange-500 text-orange-400 hover:bg-orange-600/10'
                    } ${collectionLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {collectionLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <BookOpen className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {isInCollection ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span>In</span>
                          <span>Collection</span>
                        </span>
                      ) : isInWishlist ? (
                        <span className="flex flex-col items-center leading-tight">
                          <span>Move to</span>
                          <span>Collection</span>
                        </span>
                      ) : (
                        <span className="flex flex-col items-center leading-tight">
                          <span>Add to</span>
                          <span>Collection</span>
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Started Button */}
                  <button
                    onClick={() => handleAuthRequiredAction('mark_started')}
                    disabled={isStarted || progressLoading}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isStarted
                        ? 'bg-blue-600 text-white cursor-not-allowed'
                        : progressLoading
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                        : 'border border-blue-500 text-blue-400 hover:bg-blue-600/10'
                    }`}
                  >
                    {progressLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {isStarted ? (
                        'Started'
                      ) : (
                        <span className="flex flex-col items-center leading-tight">
                          <span>Mark as</span>
                          <span>Started</span>
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Finished Button */}
                  <button
                    onClick={() => handleAuthRequiredAction('mark_completed')}
                    disabled={isCompleted || progressLoading}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isCompleted
                        ? 'bg-green-600 text-white cursor-not-allowed'
                        : progressLoading
                        ? 'bg-gray-700 text-gray-400 cursor-not-allowed opacity-50'
                        : 'border border-green-500 text-green-400 hover:bg-green-600/10'
                    }`}
                  >
                    {progressLoading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {isCompleted ? (
                        'Finished'
                      ) : (
                        <span className="flex flex-col items-center leading-tight">
                          <span>Mark as</span>
                          <span>Finished</span>
                        </span>
                      )}
                    </span>
                  </button>

                  {/* Write Review Button */}
                  {isAuthenticated ? (
                    <Link
                      to={`/review/${game.igdb_id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ScrollText className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {userReviewLoading ? (
                          'Loading...'
                        ) : userHasReviewed ? (
                          <span className="flex flex-col items-center leading-tight">
                            <span>Edit</span>
                            <span>Review</span>
                          </span>
                        ) : (
                          <span className="flex flex-col items-center leading-tight">
                            <span>Write</span>
                            <span>Review</span>
                          </span>
                        )}
                      </span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleAuthRequiredAction('write_review')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      <ScrollText className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        <span className="flex flex-col items-center leading-tight">
                          <span>Write</span>
                          <span>Review</span>
                        </span>
                      </span>
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
                            backgroundColor: '#6b7280'
                          }}
                        ></div>
                      ))}
                    </div>
                    <div className="border-t border-gray-700 pt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400 text-xs" style={{ width: '24px', textAlign: 'center' }}>1</span>
                        <span className="text-gray-400 text-xs" style={{ width: '24px', textAlign: 'center' }}>10</span>
                      </div>
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
                  to={`/review/${review.userId}/${review.igdbGameId || review.gameId}`}
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
                    <span className="text-yellow-500">{review.rating}/10</span>
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
    </>
  );
};
