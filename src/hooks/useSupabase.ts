// Custom hooks for Supabase database operations
import { useState, useEffect, useCallback } from 'react';
import { supabaseHelpers } from '../services/supabase';
import { 
  GameWithRatings, 
  UserWithStats, 
  RatingWithBoth,
  Platform
} from '../types/supabase';

// Hook for managing games
export const useSupabaseGames = () => {
  const [games, setGames] = useState<GameWithRatings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await supabaseHelpers.searchGames(query);
      setGames(result);
    } catch (err) {
      setError('Failed to search games');
      console.error('Search games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getPopularGames = useCallback(async (limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const popularGames = await supabaseHelpers.getPopularGames(limit);
      setGames(popularGames);
    } catch (err) {
      setError('Failed to load popular games');
      console.error('Popular games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    games,
    loading,
    error,
    searchGames,
    getPopularGames,
  };
};

// Hook for managing a single game
export const useSupabaseGame = (gameId: number | null) => {
  const [game, setGame] = useState<GameWithRatings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const loadGame = async () => {
      setLoading(true);
      setError(null);
      try {
        const gameData = await supabaseHelpers.getGame(gameId);
        setGame(gameData);
      } catch (err) {
        setError('Failed to load game');
        console.error('Load game error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [gameId]);

  return { game, loading, error };
};

// Hook for managing a single user
export const useSupabaseUser = (userId: number | null) => {
  const [user, setUser] = useState<UserWithStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userData, userStats] = await Promise.all([
          supabaseHelpers.getUser(userId),
          supabaseHelpers.getUserStats(userId)
        ]);
        
        setUser({
          ...userData,
          ...userStats
        });
      } catch (err) {
        setError('Failed to load user');
        console.error('Load user error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [userId]);

  return { user, loading, error };
};

// Hook for managing ratings
export const useSupabaseRatings = () => {
  const [ratings, setRatings] = useState<RatingWithBoth[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserRatings = useCallback(async (userId: number) => {
    setLoading(true);
    setError(null);
    try {
      const userRatings = await supabaseHelpers.getUserRatings(userId);
      setRatings(userRatings);
    } catch (err) {
      setError('Failed to load user ratings');
      console.error('User ratings error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getGameRatings = useCallback(async (gameId: number) => {
    setLoading(true);
    setError(null);
    try {
      const gameRatings = await supabaseHelpers.getGameRatings(gameId);
      setRatings(gameRatings);
    } catch (err) {
      setError('Failed to load game ratings');
      console.error('Game ratings error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRating = useCallback(async (ratingData: {
    user_id: number;
    game_id: number;
    rating: number;
    review?: string;
    finished: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const newRating = await supabaseHelpers.createRating(ratingData);
      setRatings(prev => [newRating, ...prev]);
      return newRating;
    } catch (err) {
      setError('Failed to create rating');
      console.error('Create rating error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRating = useCallback(async (id: number, updates: {
    rating?: number;
    review?: string;
    finished?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const updatedRating = await supabaseHelpers.updateRating(id, updates);
      setRatings(prev => 
        prev.map(rating => 
          rating.id === updatedRating.id ? updatedRating : rating
        )
      );
      return updatedRating;
    } catch (err) {
      setError('Failed to update rating');
      console.error('Update rating error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteRating = useCallback(async (ratingId: number) => {
    setLoading(true);
    setError(null);
    try {
      await supabaseHelpers.deleteRating(ratingId);
      setRatings(prev => prev.filter(rating => rating.id !== ratingId));
      return true;
    } catch (err) {
      setError('Failed to delete rating');
      console.error('Delete rating error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    ratings,
    loading,
    error,
    getUserRatings,
    getGameRatings,
    createRating,
    updateRating,
    deleteRating,
  };
};

// Hook for managing platforms
export const useSupabasePlatforms = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlatforms = async () => {
      setLoading(true);
      setError(null);
      try {
        const platformData = await supabaseHelpers.getPlatforms();
        setPlatforms(platformData);
      } catch (err) {
        setError('Failed to load platforms');
        console.error('Load platforms error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadPlatforms();
  }, []);

  return { platforms, loading, error };
};

// Hook for game statistics
export const useGameStats = (gameId: number | null) => {
  const [stats, setStats] = useState<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: { rating: number; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const loadStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const gameStats = await supabaseHelpers.getGameStats(gameId);
        setStats(gameStats);
      } catch (err) {
        setError('Failed to load game statistics');
        console.error('Game stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [gameId]);

  return { stats, loading, error };
};