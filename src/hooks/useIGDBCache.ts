// src/hooks/useIGDBCache.ts

import { useState, useEffect, useCallback } from 'react';
import { enhancedIGDBService } from '../services/enhancedIGDBService';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

interface UseIGDBCacheOptions {
  enabled?: boolean;
  ttl?: number;
  staleWhileRevalidate?: boolean;
  onError?: (error: Error) => void;
}

interface UseIGDBCacheState<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  cached: boolean;
  timestamp: Date | null;
  expiresAt: Date | null;
}

// Hook for individual game data
export function useIGDBGame(
  gameId: number | null,
  options: UseIGDBCacheOptions = {}
) {
  const [state, setState] = useState<UseIGDBCacheState>({
    data: null,
    loading: false,
    error: null,
    cached: false,
    timestamp: null,
    expiresAt: null,
  });

  const fetchGame = useCallback(async (id: number) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await enhancedIGDBService.getGame(id, {
        ttl: options.ttl || 3600,
        staleWhileRevalidate: options.staleWhileRevalidate,
      });

      setState({
        data: result,
        loading: false,
        error: null,
        cached: true, // Will be true if from any cache level
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (options.ttl || 3600) * 1000),
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
  }, [options.ttl, options.staleWhileRevalidate, options.onError]);

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
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

// Hook for search functionality
export function useIGDBSearch(
  searchTerm: string,
  filters: any = {},
  options: UseIGDBCacheOptions = {}
) {
  const [state, setState] = useState<UseIGDBCacheState<any[]>>({
    data: [],
    loading: false,
    error: null,
    cached: false,
    timestamp: null,
    expiresAt: null,
  });

  const performSearch = useCallback(async (term: string, searchFilters: any) => {
    if (!term.trim()) {
      setState(prev => ({ ...prev, data: [], loading: false }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const results = await enhancedIGDBService.searchGames(term, searchFilters, {
        ttl: options.ttl || 1800, // 30 minutes for search
        staleWhileRevalidate: options.staleWhileRevalidate,
      });

      setState({
        data: results || [],
        loading: false,
        error: null,
        cached: true,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (options.ttl || 1800) * 1000),
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
  }, [options.ttl, options.staleWhileRevalidate, options.onError]);

  const refetch = useCallback(() => {
    performSearch(searchTerm, filters);
  }, [searchTerm, filters, performSearch]);

  useEffect(() => {
    if (options.enabled !== false) {
      performSearch(searchTerm, filters);
    }
  }, [searchTerm, filters, performSearch, options.enabled]);

  return {
    ...state,
    refetch,
    searchTerm,
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

// Hook for popular games
export function usePopularGames(options: UseIGDBCacheOptions = {}) {
  const [state, setState] = useState<UseIGDBCacheState<any[]>>({
    data: [],
    loading: false,
    error: null,
    cached: false,
    timestamp: null,
    expiresAt: null,
  });

  const fetchPopular = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const results = await enhancedIGDBService.getPopularGames({
        ttl: options.ttl || 7200, // 2 hours for popular games
        staleWhileRevalidate: options.staleWhileRevalidate,
      });

      setState({
        data: results || [],
        loading: false,
        error: null,
        cached: true,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (options.ttl || 7200) * 1000),
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
  }, [options.ttl, options.staleWhileRevalidate, options.onError]);

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
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

// Hook for cache management and statistics
export function useCacheManagement() {
  const [stats, setStats] = useState({
    igdbCache: 0,
    gamesCache: 0,
    searchCache: 0,
    totalSize: 0,
    hitRate: 0,
  });

  const [health, setHealth] = useState({
    browserCache: false,
    databaseCache: false,
    edgeFunction: false,
    overall: false,
  });

  const [performance, setPerformance] = useState({
    browserCacheSize: 0,
    browserCacheKeys: 0,
    averageResponseTime: 0,
  });

  const refreshStats = useCallback(async () => {
    try {
      const newStats = await enhancedIGDBService.getCacheStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error refreshing cache stats:', error);
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const healthStatus = await enhancedIGDBService.healthCheck();
      setHealth(healthStatus);
    } catch (error) {
      console.error('Error checking cache health:', error);
    }
  }, []);

  const updatePerformance = useCallback(() => {
    try {
      const metrics = enhancedIGDBService.getPerformanceMetrics();
      setPerformance(metrics);
    } catch (error) {
      console.error('Error getting performance metrics:', error);
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      await enhancedIGDBService.clearCache();
      await refreshStats();
      updatePerformance();
    } catch (error) {
      console.error('Error clearing cache:', error);
      throw error;
    }
  }, [refreshStats, updatePerformance]);

  const clearExpiredCache = useCallback(async () => {
    try {
      await enhancedIGDBService.clearExpiredCache();
      await refreshStats();
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      throw error;
    }
  }, [refreshStats]);

  // Monitor cache activity
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const getRecentActivity = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recent_cache_activity')
        .select('*')
        .limit(50);

      if (error) {
        console.error('Error fetching recent activity:', error);
        return;
      }

      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error in getRecentActivity:', error);
    }
  }, []);

  // Auto-refresh stats periodically
  useEffect(() => {
    refreshStats();
    checkHealth();
    updatePerformance();
    getRecentActivity();

    // Set up periodic refresh
    const interval = setInterval(() => {
      refreshStats();
      updatePerformance();
    }, 30000); // Every 30 seconds

    // Health check every 5 minutes
    const healthInterval = setInterval(checkHealth, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearInterval(healthInterval);
    };
  }, [refreshStats, checkHealth, updatePerformance, getRecentActivity]);

  return {
    stats,
    health,
    performance,
    recentActivity,
    refreshStats,
    clearCache,
    clearExpiredCache,
    checkHealth,
    getRecentActivity,
  };
}

// Hook for cache debugging and development
export function useCacheDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isEnabled, setIsEnabled] = useState(import.meta.env.DEV);

  const logCacheOperation = useCallback((operation: string, key: string, data?: any) => {
    if (!isEnabled) return;

    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      operation,
      key,
      data: data ? JSON.stringify(data).substring(0, 100) : null,
    };

    setDebugInfo((prev: any) => ({
      ...prev,
      operations: [...(prev.operations || []).slice(-49), entry] // Keep last 50
    }));

    console.log(`[Cache Debug] ${operation}:`, key, data);
  }, [isEnabled]);

  const getCacheOverview = useCallback(async () => {
    if (!isEnabled) return;

    try {
      const { data, error } = await supabase
        .from('cache_overview')
        .select('*');

      if (error) {
        console.error('Error fetching cache overview:', error);
        return;
      }

      setDebugInfo((prev: any) => ({
        ...prev,
        overview: data
      }));
    } catch (error) {
      console.error('Error in getCacheOverview:', error);
    }
  }, [isEnabled]);

  useEffect(() => {
    if (isEnabled) {
      getCacheOverview();
    }
  }, [isEnabled, getCacheOverview]);

  return {
    debugInfo,
    isEnabled,
    setIsEnabled,
    logCacheOperation,
    getCacheOverview,
  };
}

// Generic hook for any IGDB endpoint with caching
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
      // This would need to be implemented in enhancedIGDBService
      // as a generic endpoint method
      const result = await fetch(`/api/igdb/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      const data = await result.json();

      setState({
        data,
        loading: false,
        error: null,
        cached: false, // Would need cache detection logic
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (options.ttl || 3600) * 1000),
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
  }, [endpoint, params, options.ttl, options.onError]);

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
