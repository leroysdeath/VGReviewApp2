// src/hooks/useIGDBCache.ts

import { useState, useEffect, useCallback } from 'react';
import { enhancedIGDBService } from '../services/enhancedIGDBService';
import { supabase } from '../services/supabase';

interface UseIGDBCacheOptions {
  enabled?: boolean;
  ttl?: number;
  staleWhileRevalidate?: boolean;
  onError?: (error: Error) => void;
  forceRefresh?: boolean;
  useDirectIGDB?: boolean; // Add option to use direct IGDB calls
}

interface UseIGDBCacheState<T = any> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  cached: boolean;
  timestamp: Date | null;
  expiresAt: Date | null;
}

// Temporary direct IGDB service for testing
const directIGDBService = {
  async getGame(gameId: number) {
    console.log('🧪 Direct IGDB call for game:', gameId);
    console.log('🧪 Environment check:', {
      clientId: import.meta.env.VITE_IGDB_CLIENT_ID,
      hasToken: !!import.meta.env.VITE_IGDB_ACCESS_TOKEN,
      tokenLength: import.meta.env.VITE_IGDB_ACCESS_TOKEN?.length
    });

    if (!import.meta.env.VITE_IGDB_CLIENT_ID || !import.meta.env.VITE_IGDB_ACCESS_TOKEN) {
      throw new Error('IGDB credentials not configured');
    }

    const response = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': import.meta.env.VITE_IGDB_CLIENT_ID,
        'Authorization': `Bearer ${import.meta.env.VITE_IGDB_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: `fields name,summary,cover.url,first_release_date,genres.name,platforms.name,rating; where id = ${gameId};`
    });

    console.log('🧪 IGDB Response status:', response.status);
    console.log('🧪 IGDB Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🧪 IGDB Error response:', errorText);
      throw new Error(`IGDB API error: ${response.status} - ${errorText}`);
    }

    const games = await response.json();
    console.log('🧪 Direct IGDB response:', games);
    
    if (!games || games.length === 0) {
      throw new Error(`Game with ID ${gameId} not found`);
    }

    return games[0];
  }
};

interface CacheStats {
  igdbCache: number;
  gamesCache: number;
  searchCache: number;
  totalSize: number;
  hitRate: number;
}

interface HealthStatus {
  browserCache: boolean;
  databaseCache: boolean;
  edgeFunction: boolean;
  overall: boolean;
}

interface PerformanceMetrics {
  browserCacheSize: number;
  browserCacheKeys: number;
  averageResponseTime: number;
}

// Hook for individual game data
export function useIGDBGame(
  gameId: number | null,
  options: UseIGDBCacheOptions = {}
) {
  console.log('🔵 useIGDBGame hook initialized with gameId:', gameId, 'Options:', options);
  
  const [state, setState] = useState<UseIGDBCacheState>({
    data: null,
    loading: false,
    error: null,
    cached: false,
    timestamp: null,
    expiresAt: null,
  });

  const fetchGame = useCallback(async (id: number) => {
    console.log('🔵 fetchGame called with ID:', id);
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let result;
      
      // Use direct IGDB call if specified in options or if enhanced service fails
      if (options.useDirectIGDB) {
        console.log('🔵 Using direct IGDB service...');
        result = await directIGDBService.getGame(id);
      } else {
        console.log('🔵 Using enhanced IGDB service...');
        try {
          result = await enhancedIGDBService.getGame(id, {
            cacheTTL: options.ttl || 3600,
            staleWhileRevalidate: options.staleWhileRevalidate,
            forceRefresh: options.forceRefresh || false,
          });
        } catch (enhancedError) {
          console.warn('🔵 Enhanced service failed, falling back to direct IGDB:', enhancedError);
          result = await directIGDBService.getGame(id);
        }
      }
      
      console.log('🔵 Fetched game data:', result);
      setState({
        data: result,
        loading: false,
        error: null,
        cached: !options.useDirectIGDB, // Direct calls are not cached
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (options.ttl || 3600) * 1000),
      });
    } catch (error) {
      console.error('🔴 Error fetching game:', error);
      const err = error as Error;
      setState(prev => ({
        ...prev,
        loading: false,
        error: err,
      }));
      options.onError?.(err);
    }
  }, [options.ttl, options.staleWhileRevalidate, options.onError, options.forceRefresh, options.useDirectIGDB]);

  const refetch = useCallback(() => {
    if (gameId) {
      console.log('🔵 Refetching game:', gameId);
      fetchGame(gameId);
    }
  }, [gameId, fetchGame]);

  const forceRefresh = useCallback(() => {
    if (gameId) {
      console.log('🔵 Force refreshing game:', gameId);
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      if (options.useDirectIGDB) {
        directIGDBService.getGame(gameId).then(result => {
          setState({
            data: result,
            loading: false,
            error: null,
            cached: false,
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + (options.ttl || 3600) * 1000),
          });
        }).catch(error => {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error as Error,
          }));
          options.onError?.(error);
        });
      } else {
        enhancedIGDBService.getGame(gameId, {
          cacheTTL: options.ttl || 3600,
          forceRefresh: true,
        }).then(result => {
          setState({
            data: result,
            loading: false,
            error: null,
            cached: false,
            timestamp: new Date(),
            expiresAt: new Date(Date.now() + (options.ttl || 3600) * 1000),
          });
        }).catch(error => {
          setState(prev => ({
            ...prev,
            loading: false,
            error: error as Error,
          }));
          options.onError?.(error);
        });
      }
    }
  }, [gameId, options.ttl, options.onError, options.useDirectIGDB]);

  useEffect(() => {
    console.log('🔵 useEffect triggered - enabled:', options.enabled, 'gameId:', gameId);
    if (options.enabled !== false && gameId) {
      fetchGame(gameId);
    }
  }, [gameId, fetchGame, options.enabled]);

  return {
    ...state,
    refetch,
    forceRefresh,
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

// Hook for search functionality with debouncing
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

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const performSearch = useCallback(async (term: string, searchFilters: any) => {
    if (!term.trim()) {
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
      const results = await enhancedIGDBService.searchGames(term, searchFilters, {
        cacheTTL: options.ttl || 1800, // 30 minutes for search
        staleWhileRevalidate: options.staleWhileRevalidate,
        forceRefresh: options.forceRefresh || false,
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
  }, [options.ttl, options.staleWhileRevalidate, options.onError, options.forceRefresh]);

  const refetch = useCallback(() => {
    performSearch(debouncedSearchTerm, filters);
  }, [debouncedSearchTerm, filters, performSearch]);

  const forceRefresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    enhancedIGDBService.searchGames(debouncedSearchTerm, filters, {
      cacheTTL: options.ttl || 1800,
      forceRefresh: true,
    }).then(results => {
      setState({
        data: results || [],
        loading: false,
        error: null,
        cached: false,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (options.ttl || 1800) * 1000),
      });
    }).catch(error => {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
        data: [],
      }));
      options.onError?.(error);
    });
  }, [debouncedSearchTerm, filters, options.ttl, options.onError]);

  useEffect(() => {
    if (options.enabled !== false) {
      performSearch(debouncedSearchTerm, filters);
    }
  }, [debouncedSearchTerm, filters, performSearch, options.enabled]);

  return {
    ...state,
    refetch,
    forceRefresh,
    searchTerm: debouncedSearchTerm,
    originalSearchTerm: searchTerm,
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

// ... (rest of the hooks remain the same)

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
        cacheTTL: options.ttl || 7200, // 2 hours for popular games
        staleWhileRevalidate: options.staleWhileRevalidate,
        forceRefresh: options.forceRefresh || false,
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
  }, [options.ttl, options.staleWhileRevalidate, options.onError, options.forceRefresh]);

  const refetch = useCallback(() => {
    fetchPopular();
  }, [fetchPopular]);

  const forceRefresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    enhancedIGDBService.getPopularGames({
      cacheTTL: options.ttl || 7200,
      forceRefresh: true,
    }).then(results => {
      setState({
        data: results || [],
        loading: false,
        error: null,
        cached: false,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + (options.ttl || 7200) * 1000),
      });
    }).catch(error => {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error,
        data: [],
      }));
      options.onError?.(error);
    });
  }, [options.ttl, options.onError]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchPopular();
    }
  }, [fetchPopular, options.enabled]);

  return {
    ...state,
    refetch,
    forceRefresh,
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

// Hook for cache management and statistics
export function useCacheManagement() {
  const [stats, setStats] = useState<CacheStats>({
    igdbCache: 0,
    gamesCache: 0,
    searchCache: 0,
    totalSize: 0,
    hitRate: 0,
  });

  const [health, setHealth] = useState<HealthStatus>({
    browserCache: false,
    databaseCache: false,
    edgeFunction: false,
    overall: false,
  });

  const [performance, setPerformance] = useState<PerformanceMetrics>({
    browserCacheSize: 0,
    browserCacheKeys: 0,
    averageResponseTime: 0,
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const refreshStats = useCallback(async () => {
    try {
      const newStats = await enhancedIGDBService.getCacheStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error refreshing cache stats:', error);
      // Fallback to default stats
      setStats({
        igdbCache: 0,
        gamesCache: 0,
        searchCache: 0,
        totalSize: 0,
        hitRate: 0,
      });
    }
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const healthStatus = await enhancedIGDBService.healthCheck();
      setHealth(healthStatus);
    } catch (error) {
      console.error('Error checking cache health:', error);
      setHealth({
        browserCache: false,
        databaseCache: false,
        edgeFunction: false,
        overall: false,
      });
    }
  }, []);

  const updatePerformance = useCallback(() => {
    try {
      const metrics = enhancedIGDBService.getPerformanceMetrics();
      setPerformance(metrics);
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      setPerformance({
        browserCacheSize: 0,
        browserCacheKeys: 0,
        averageResponseTime: 0,
      });
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

  const getRecentActivity = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('recent_cache_activity')
        .select('*')
        .order('last_accessed', { ascending: false })
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
    const statsInterval = setInterval(() => {
      refreshStats();
      updatePerformance();
    }, 30000); // Every 30 seconds

    // Health check every 5 minutes
    const healthInterval = setInterval(checkHealth, 5 * 60 * 1000);

    // Activity refresh every 2 minutes
    const activityInterval = setInterval(getRecentActivity, 2 * 60 * 1000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(healthInterval);
      clearInterval(activityInterval);
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
  const [debugInfo, setDebugInfo] = useState<any>({
    operations: [],
    overview: null,
    settings: {
      logLevel: 'info',
      enableConsoleLogging: import.meta.env.DEV,
      maxOperations: 100,
    }
  });
  
  const [isEnabled, setIsEnabled] = useState(import.meta.env.DEV);

  const logCacheOperation = useCallback((operation: string, key: string, data?: any) => {
    if (!isEnabled) return;

    const timestamp = new Date().toISOString();
    const entry = {
      id: Date.now() + Math.random(),
      timestamp,
      operation,
      key,
      data: data ? JSON.stringify(data).substring(0, 100) + '...' : null,
      dataSize: data ? JSON.stringify(data).length : 0,
    };

    setDebugInfo((prev: any) => ({
      ...prev,
      operations: [...(prev.operations || []).slice(-(prev.settings?.maxOperations || 100) + 1), entry]
    }));

    if (debugInfo.settings?.enableConsoleLogging) {
      console.log(`[Cache Debug] ${operation}:`, key, data);
    }
  }, [isEnabled, debugInfo.settings]);

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

  const clearDebugLogs = useCallback(() => {
    setDebugInfo((prev: any) => ({
      ...prev,
      operations: []
    }));
  }, []);

  const updateSettings = useCallback((newSettings: Partial<any>) => {
    setDebugInfo((prev: any) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);

  const exportDebugData = useCallback(() => {
    const exportData = {
      ...debugInfo,
      exportTimestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cache-debug-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [debugInfo]);

  useEffect(() => {
    if (isEnabled) {
      getCacheOverview();
      // Refresh overview every 5 minutes
      const interval = setInterval(getCacheOverview, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isEnabled, getCacheOverview]);

  return {
    debugInfo,
    isEnabled,
    setIsEnabled,
    logCacheOperation,
    getCacheOverview,
    clearDebugLogs,
    updateSettings,
    exportDebugData,
  };
}

// Generic hook for IGDB endpoints with enhanced error handling
export function useIGDBEndpoint<T = any>(
  endpointConfig: {
    type: 'search' | 'game' | 'popular' | 'custom';
    gameId?: number;
    searchTerm?: string;
    filters?: any;
    customParams?: any;
  },
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
      let result: any;

      switch (endpointConfig.type) {
        case 'game':
          if (!endpointConfig.gameId) {
            throw new Error('Game ID is required for game endpoint');
          }
          result = await enhancedIGDBService.getGame(endpointConfig.gameId, {
            cacheTTL: options.ttl || 3600,
            staleWhileRevalidate: options.staleWhileRevalidate,
            forceRefresh: options.forceRefresh || false,
          });
          break;

        case 'search':
          if (!endpointConfig.searchTerm) {
            throw new Error('Search term is required for search endpoint');
          }
          result = await enhancedIGDBService.searchGames(
            endpointConfig.searchTerm,
            endpointConfig.filters || {},
            {
              cacheTTL: options.ttl || 1800,
              staleWhileRevalidate: options.staleWhileRevalidate,
              forceRefresh: options.forceRefresh || false,
            }
          );
          break;

        case 'popular':
          result = await enhancedIGDBService.getPopularGames({
            cacheTTL: options.ttl || 7200,
            staleWhileRevalidate: options.staleWhileRevalidate,
            forceRefresh: options.forceRefresh || false,
          });
          break;

        case 'custom':
          // For custom endpoints, you'd need to implement this in enhancedIGDBService
          throw new Error('Custom endpoints not yet implemented');

        default:
          throw new Error(`Unknown endpoint type: ${endpointConfig.type}`);
      }

      setState({
        data: result,
        loading: false,
        error: null,
        cached: true, // Enhanced service handles cache detection
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
  }, [endpointConfig, options.ttl, options.staleWhileRevalidate, options.onError, options.forceRefresh]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  const forceRefresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    // Update options to force refresh
    const refreshOptions = { ...options, forceRefresh: true };
    
    // Re-run fetchData with force refresh
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (options.enabled !== false) {
      fetchData();
    }
  }, [fetchData, options.enabled]);

  return {
    ...state,
    refetch,
    forceRefresh,
    isStale: state.expiresAt ? new Date() > state.expiresAt : false,
  };
}

// Utility hook for prefetching
export function usePrefetch() {
  const prefetchGame = useCallback(async (gameId: number) => {
    try {
      await enhancedIGDBService.prefetchGame(gameId);
    } catch (error) {
      console.warn('Prefetch failed for game:', gameId, error);
    }
  }, []);

  const prefetchSearch = useCallback(async (searchTerm: string, filters: any = {}) => {
    try {
      await enhancedIGDBService.searchGames(searchTerm, filters, {
        cacheTTL: 1800,
        staleWhileRevalidate: true,
      });
    } catch (error) {
      console.warn('Prefetch failed for search:', searchTerm, error);
    }
  }, []);

  const prefetchPopular = useCallback(async () => {
    try {
      await enhancedIGDBService.getPopularGames({
        cacheTTL: 7200,
        staleWhileRevalidate: true,
      });
    } catch (error) {
      console.warn('Prefetch failed for popular games:', error);
    }
  }, []);

  return {
    prefetchGame,
    prefetchSearch,
    prefetchPopular,
  };
}

// Hook for cache warming and initialization
export function useCacheInitialization() {
  const [isWarming, setIsWarming] = useState(false);
  const [warmupComplete, setWarmupComplete] = useState(false);

  const warmUpCache = useCallback(async () => {
    setIsWarming(true);
    try {
      await enhancedIGDBService.warmUpCache();
      setWarmupComplete(true);
    } catch (error) {
      console.error('Cache warmup failed:', error);
    } finally {
      setIsWarming(false);
    }
  }, []);

  const resetWarmup = useCallback(() => {
    setWarmupComplete(false);
  }, []);

  return {
    isWarming,
    warmupComplete,
    warmUpCache,
    resetWarmup,
  };
}