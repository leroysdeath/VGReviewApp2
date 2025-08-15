// src/hooks/useDatabaseGameCache.ts - Simplified database game hooks

import { useState, useEffect, useCallback } from 'react';
import { databaseGameService, Game } from '../services/databaseGameService';
import { igdbService } from '../services/igdbApi';

interface UseGameOptions {
  enabled?: boolean;
  onError?: (error: Error) => void;
}

interface UseGameState<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface GameStats {
  totalGames: number;
  gamesWithRatings: number;
  averageRating: number;
  totalPlatforms: number;
}

// Hook for individual game data
export function useGame(
  gameId: number | null,
  options: UseGameOptions = {}
) {
  const [state, setState] = useState<UseGameState<Game>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchGame = useCallback(async (id: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await databaseGameService.getGameById(id);
      setState({
        data: result,
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
      }));
      options.onError?.(err);
    }
  }, [options.onError]);

  const refetch = useCallback(() => {
    if (gameId) {
      fetchGame(gameId);
    }
  }, [gameId, fetchGame]);

  useEffect(() => {
    if (options.enabled !== false && gameId) {
      fetchGame(gameId);
    }
  }, [gameId, fetchGame, options.enabled]);

  return {
    ...state,
    refetch,
  };
}

// Hook for search functionality with debouncing
export function useGameSearch(
  searchTerm: string,
  options: UseGameOptions = {}
) {
  const [state, setState] = useState<UseGameState<Game[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const performSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setState({
        data: [],
        loading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const results = await databaseGameService.searchGames(term);
      setState({
        data: results || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        data: [],
      }));
      options.onError?.(err);
    }
  }, [options.onError]);

  const refetch = useCallback(() => {
    performSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, performSearch]);

  useEffect(() => {
    if (options.enabled !== false) {
      performSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, performSearch, options.enabled]);

  return {
    ...state,
    refetch,
    searchTerm: debouncedSearchTerm,
    originalSearchTerm: searchTerm,
  };
}

// Hook for popular games
export function usePopularGames(options: UseGameOptions = {}) {
  const [state, setState] = useState<UseGameState<Game[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const fetchPopular = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const results = await databaseGameService.getPopularGames();
      setState({
        data: results || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        data: [],
      }));
      options.onError?.(err);
    }
  }, [options.onError]);

  const refetch = useCallback(() => {
    fetchPopular();
  }, [fetchPopular]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchPopular();
    }
  }, [fetchPopular, options.enabled]);

  return {
    ...state,
    refetch,
  };
}

// Hook for recent games
export function useRecentGames(options: UseGameOptions = {}) {
  const [state, setState] = useState<UseGameState<Game[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const fetchRecent = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const results = await databaseGameService.getRecentGames();
      setState({
        data: results || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        data: [],
      }));
      options.onError?.(err);
    }
  }, [options.onError]);

  const refetch = useCallback(() => {
    fetchRecent();
  }, [fetchRecent]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchRecent();
    }
  }, [fetchRecent, options.enabled]);

  return {
    ...state,
    refetch,
  };
}

// Hook for games by genre
export function useGamesByGenre(genre: string, options: UseGameOptions = {}) {
  const [state, setState] = useState<UseGameState<Game[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const fetchByGenre = useCallback(async (genreName: string) => {
    if (!genreName.trim()) {
      setState({
        data: [],
        loading: false,
        error: null,
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const results = await databaseGameService.getGamesByGenre(genreName);
      setState({
        data: results || [],
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        data: [],
      }));
      options.onError?.(err);
    }
  }, [options.onError]);

  const refetch = useCallback(() => {
    fetchByGenre(genre);
  }, [genre, fetchByGenre]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchByGenre(genre);
    }
  }, [genre, fetchByGenre, options.enabled]);

  return {
    ...state,
    refetch,
  };
}

// Hook for game statistics
export function useGameStats(options: UseGameOptions = {}) {
  const [state, setState] = useState<UseGameState<GameStats>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchStats = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const stats = await databaseGameService.getGameStats();
      setState({
        data: stats,
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
      }));
      options.onError?.(err);
    }
  }, [options.onError]);

  const refetch = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchStats();
    }
  }, [fetchStats, options.enabled]);

  return {
    ...state,
    refetch,
  };
}

// Hook for platforms
export function usePlatforms(options: UseGameOptions = {}) {
  const [state, setState] = useState<UseGameState<Array<{ id: number; name: string; slug: string }>>>({
    data: [],
    loading: false,
    error: null,
  });

  const fetchPlatforms = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const platforms = await databaseGameService.getPlatforms();
      setState({
        data: platforms,
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        data: [],
      }));
      options.onError?.(err);
    }
  }, [options.onError]);

  const refetch = useCallback(() => {
    fetchPlatforms();
  }, [fetchPlatforms]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchPlatforms();
    }
  }, [fetchPlatforms, options.enabled]);

  return {
    ...state,
    refetch,
  };
}

// Hook for genres
export function useGenres(options: UseGameOptions = {}) {
  const [state, setState] = useState<UseGameState<string[]>>({
    data: [],
    loading: false,
    error: null,
  });

  const fetchGenres = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const genres = await databaseGameService.getGenres();
      setState({
        data: genres,
        loading: false,
        error: null,
      });
    } catch (error) {
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
        data: [],
      }));
      options.onError?.(err);
    }
  }, [options.onError]);

  const refetch = useCallback(() => {
    fetchGenres();
  }, [fetchGenres]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchGenres();
    }
  }, [fetchGenres, options.enabled]);

  return {
    ...state,
    refetch,
  };
}

// Legacy compatibility exports
export const useIGDBGame = useGame;
export const useIGDBSearch = useGameSearch;
export const useCacheManagement = () => ({
  stats: { totalGames: 0, gamesWithRatings: 0, searchCache: 0, totalSize: 0, hitRate: 0 },
  health: { browserCache: true, databaseCache: true, edgeFunction: true, overall: true },
  performance: { browserCacheSize: 0, browserCacheKeys: 0, averageResponseTime: 0 },
  recentActivity: [],
  refreshStats: () => {},
  clearCache: () => igdbService.clearCache(),
  clearExpiredCache: () => {},
  checkHealth: () => {},
  getRecentActivity: () => {},
});

export const useCacheDebug = () => ({
  debugInfo: { operations: [], overview: null, settings: { logLevel: 'info', enableConsoleLogging: false, maxOperations: 100 } },
  isEnabled: false,
  setIsEnabled: () => {},
  logCacheOperation: () => {},
  getCacheOverview: () => {},
  clearDebugLogs: () => {},
  updateSettings: () => {},
  exportDebugData: () => {},
});

export const useIGDBEndpoint = useGame;
export const usePrefetch = () => ({
  prefetchGame: async () => {},
  prefetchSearch: async () => {},
  prefetchPopular: async () => {},
});

export const useCacheInitialization = () => ({
  isWarming: false,
  warmupComplete: true,
  warmUpCache: async () => {},
  resetWarmup: () => {},
});