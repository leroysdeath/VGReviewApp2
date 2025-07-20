// src/hooks/useIGDBCache.ts
import { useState, useEffect, useCallback } from 'react';
import { igdbCache, CacheConfig, CachedResponse } from '@/services/igdbCacheService';

interface UseIGDBCacheState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  cached: boolean;
  timestamp: Date | null;
  expiresAt: Date | null;
}

interface UseIGDBCacheOptions extends CacheConfig {
  enabled?: boolean;
  refetchOnMount?: boolean;
  refetchInterval?: number;
}

export function useIGDBGame(gameId: number | null, options: UseIGDBCacheOptions = {}) {
  const [state, setState] = useState<UseIGDBCacheState<any>>({
    data: null,
    loading: false,
    error: null,
    cached: false,
    timestamp: null,
    expiresAt: null,
  });

  const fetchGame = useCallback(async (forceRefresh = false) => {
    if (!gameId) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await igdbCache.getGame(gameId, forceRefresh);
      setState({
        data: result.data,
        loading: false,
        error: null,
        cached: result.cached,
        timestamp: result.timestamp,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, [gameId]);

  const refetch = useCallback(() => fetchGame(true), [fetchGame]);

  useEffect(() => {
    if (options.enabled !== false && gameId) {
      fetchGame(false);
    }
  }, [gameId, fetchGame, options.enabled]);

  // Auto-refresh interval
  useEffect(() => {
    if (!options.refetchInterval) return;

    const interval = setInterval(() => {
      if (gameId && !state.loading) {
        fetchGame(false);
      }
    }, options.refetchInterval);

    return () => clearInterval(interval);
  }, [gameId, state.loading, options.refetchInterval, fetchGame]);

  return {
    ...state,
    refetch,
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

export function useIGDBSearch(
  searchTerm: string,
  filters: any = {},
  options: UseIGDBCacheOptions = {}
) {
  const [state, setState] = useState<UseIGDBCacheState<any[]>>({
    data: null,
    loading: false,
    error: null,
    cached: false,
    timestamp: null,
    expiresAt: null,
  });

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchGames = useCallback(async () => {
    if (!debouncedSearchTerm.trim()) {
      setState({
        data: [],
        loading: false,
        error: null,
        cached: false,
        timestamp: null,
        expiresAt: null,
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await igdbCache.searchGames(debouncedSearchTerm, filters, {
        ttl: options.ttl || 1800, // 30 minutes default for search
        staleWhileRevalidate: options.staleWhileRevalidate,
      });

      setState({
        data: result.data,
        loading: false,
        error: null,
        cached: result.cached,
        timestamp: result.timestamp,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, [debouncedSearchTerm, filters, options.ttl, options.staleWhileRevalidate]);

  const refetch = useCallback(() => searchGames(), [searchGames]);

  useEffect(() => {
    if (options.enabled !== false) {
      searchGames();
    }
  }, [searchGames, options.enabled]);

  return {
    ...state,
    refetch,
    searchTerm: debouncedSearchTerm,
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

export function useIGDBEndpoint<T = any>(
  endpoint: string,
  params: any,
  options: UseIGDBCacheOptions = {}
) {
  const [state, setState] = useState<UseIGDBCacheState<T>>({
    data: null,
    loading: false,
    error: null,
    cached: false,
    timestamp: null,
    expiresAt: null,
  });

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await igdbCache.getCachedEndpoint(endpoint, params, {
        ttl: options.ttl || 3600,
        staleWhileRevalidate: options.staleWhileRevalidate,
      });

      setState({
        data: result.data,
        loading: false,
        error: null,
        cached: result.cached,
        timestamp: result.timestamp,
        expiresAt: result.expiresAt,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
      }));
    }
  }, [endpoint, params, options.ttl, options.staleWhileRevalidate]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options.enabled]);

  return {
    ...state,
    refetch,
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

// Hook for cache management
export function useCacheManagement() {
  const [stats, setStats] = useState({
    igdbCache: 0,
    gamesCache: 0,
    searchCache: 0,
    totalSize: 0,
  });

  const refreshStats = useCallback(async () => {
    const newStats = await igdbCache.getCacheStats();
    setStats(newStats);
  }, []);

  const clearCache = useCallback(async () => {
    await igdbCache.clearCache();
    await refreshStats();
  }, [refreshStats]);

  const clearExpiredCache = useCallback(async () => {
    await igdbCache.clearExpiredCache();
    await refreshStats();
  }, [refreshStats]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    stats,
    refreshStats,
    clearCache,
    clearExpiredCache,
  };
}
