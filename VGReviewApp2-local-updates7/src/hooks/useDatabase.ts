// Custom hooks for database operations
import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/databaseService';
import { 
  GameWithRatings, 
  UserProfile, 
  Rating, 
  Platform,
  CreateRatingRequest,
  UpdateRatingRequest 
} from '../types/database';

// Hook for managing games
export const useGames = () => {
  const [games, setGames] = useState<GameWithRatings[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await databaseService.searchGames(query);
      setGames(result.games);
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
      const popularGames = await databaseService.getPopularGames(limit);
      setGames(popularGames);
    } catch (err) {
      setError('Failed to load popular games');
      console.error('Popular games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecentGames = useCallback(async (limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const recentGames = await databaseService.getRecentGames(limit);
      setGames(recentGames);
    } catch (err) {
      setError('Failed to load recent games');
      console.error('Recent games error:', err);
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
    getRecentGames,
  };
};

// Hook for managing a single game
export const useGame = (gameId: number | null) => {
  const [game, setGame] = useState<GameWithRatings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;

    const loadGame = async () => {
      setLoading(true);
      setError(null);
      try {
        const gameData = await databaseService.getGame(gameId);
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

// Hook for managing users
export const useUsers = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await databaseService.searchUsers(query);
      setUsers(result.users);
    } catch (err) {
      setError('Failed to search users');
      console.error('Search users error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    users,
    loading,
    error,
    searchUsers,
  };
};

// Hook for managing a single user
export const useUser = (userId: number | null) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    const loadUser = async () => {
      setLoading(true);
      setError(null);
      try {
        const userData = await databaseService.getUser(userId);
        setUser(userData);
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
export const useRatings = () => {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserRatings = useCallback(async (userId: number) => {
    setLoading(true);
    setError(null);
    try {
      const userRatings = await databaseService.getUserRatings(userId);
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
      const gameRatings = await databaseService.getGameRatings(gameId);
      setRatings(gameRatings);
    } catch (err) {
      setError('Failed to load game ratings');
      console.error('Game ratings error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createRating = useCallback(async (ratingData: CreateRatingRequest) => {
    setLoading(true);
    setError(null);
    try {
      const newRating = await databaseService.createRating(ratingData);
      if (newRating) {
        setRatings(prev => [newRating, ...prev]);
        return newRating;
      }
      throw new Error('Failed to create rating');
    } catch (err) {
      setError('Failed to create rating');
      console.error('Create rating error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRating = useCallback(async (ratingData: UpdateRatingRequest) => {
    setLoading(true);
    setError(null);
    try {
      const updatedRating = await databaseService.updateRating(ratingData);
      if (updatedRating) {
        setRatings(prev => 
          prev.map(rating => 
            rating.id === updatedRating.id ? updatedRating : rating
          )
        );
        return updatedRating;
      }
      throw new Error('Failed to update rating');
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
      const success = await databaseService.deleteRating(ratingId);
      if (success) {
        setRatings(prev => prev.filter(rating => rating.id !== ratingId));
        return true;
      }
      throw new Error('Failed to delete rating');
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
export const usePlatforms = () => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlatforms = async () => {
      setLoading(true);
      setError(null);
      try {
        const platformData = await databaseService.getPlatforms();
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