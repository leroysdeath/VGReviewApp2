import { useState, useCallback, useEffect, useRef } from 'react';
import { igdbService, Game } from '../services/igdbApi';
import { browserCache } from '../services/browserCacheService';

export const useGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchGames = useCallback(async (query: string) => {
    setLoading(true);
    setError(null);

    try {
      const searchResults = await igdbService.searchGames(query);
      setGames(searchResults);
    } catch (err) {
      setError('Failed to search games. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAllGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const popularGames = await igdbService.getPopularGames();
      setGames(popularGames);
    } catch (err) {
      setError('Failed to load games. Please try again.');
      console.error('Load games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getRecentGames = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const recentGames = await igdbService.getPopularGames(10);
      setGames(recentGames);
    } catch (err) {
      setError('Failed to load recent games. Please try again.');
      console.error('Load recent games error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    games,
    loading,
    error,
    searchGames,
    getAllGames,
    getRecentGames
  };
};

// Add the search filters interface
interface SearchFilters {
  genres: string[];
  platforms: string[];
  minRating?: number;
  sortBy: 'popularity' | 'rating' | 'release_date' | 'name';
  sortOrder: 'asc' | 'desc';
}

interface UseIGDBSearchOptions {
  enabled?: boolean;
  ttl?: number;
  staleWhileRevalidate?: boolean;
}

interface UseIGDBSearchResult {
  data: Game[];
  loading: boolean;
  error: string | null;
  cached: boolean;
  refetch: () => Promise<void>;
  isStale: boolean;
  searchTerm: string;
}

// Add the useIGDBSearch hook
export const useIGDBSearch = (
  searchTerm: string,
  filters: SearchFilters,
  options: UseIGDBSearchOptions = {}
): UseIGDBSearchResult => {
  const {
    enabled = true,
    ttl = 1800, // 30 minutes default
    staleWhileRevalidate = false
  } = options;

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const [isStale, setIsStale] = useState(false);
  
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const debouncedSearchTerm = useRef(searchTerm);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce the search term
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debouncedSearchTerm.current = searchTerm;
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);

  const performSearch = useCallback(async (forceRefresh = false) => {
    if (!enabled || !debouncedSearchTerm.current) {
      setGames([]);
      return;
    }

    // Cancel any existing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    const cacheKey = `igdb_search:${debouncedSearchTerm.current}:${JSON.stringify(filters)}`;

    // Check cache first if not forcing refresh
    if (!forceRefresh && browserCache) {
      const cachedData = browserCache.get(cacheKey);
      if (cachedData) {
        setGames(cachedData);
        setCached(true);
        setIsStale(false);
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);
    setCached(false);

    try {
      // For now, just pass the search term and limit since igdbService doesn't support advanced filters
      const searchResults = await igdbService.searchGames(debouncedSearchTerm.current, {
        limit: 20
      });

      // Apply client-side filtering until the backend supports it
      let filteredResults = searchResults;
      
      // Filter by genres if specified
      if (filters.genres.length > 0) {
        filteredResults = filteredResults.filter(game => 
          filters.genres.some(genre => 
            game.genre?.toLowerCase().includes(genre.toLowerCase())
          )
        );
      }
      
      // Filter by platforms if specified
      if (filters.platforms.length > 0) {
        filteredResults = filteredResults.filter(game => 
          game.platforms?.some(platform => 
            filters.platforms.some(filterPlatform => 
              platform.toLowerCase().includes(filterPlatform.toLowerCase())
            )
          )
        );
      }
      
      // Filter by minimum rating if specified
      if (filters.minRating) {
        filteredResults = filteredResults.filter(game => 
          game.rating >= filters.minRating
        );
      }
      
      // Sort the results
      if (filters.sortBy) {
        filteredResults.sort((a, b) => {
          switch (filters.sortBy) {
            case 'rating':
              return filters.sortOrder === 'asc' ? 
                (a.rating - b.rating) : (b.rating - a.rating);
            case 'release_date':
              return filters.sortOrder === 'asc' ?
                new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime() :
                new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
            case 'name':
              return filters.sortOrder === 'asc' ?
                a.title.localeCompare(b.title) :
                b.title.localeCompare(a.title);
            default: // 'popularity'
              return filters.sortOrder === 'asc' ?
                (a.rating - b.rating) : (b.rating - a.rating);
          }
        });
      }

      if (!abortControllerRef.current.signal.aborted) {
        setGames(filteredResults);
        
        // Cache the results
        if (browserCache) {
          browserCache.set(cacheKey, filteredResults, ttl);
        }
      }
    } catch (err: any) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError(err.message || 'Failed to search games');
        console.error('Search error:', err);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [enabled, filters, ttl]);

  // Effect to trigger search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearchTerm.current) {
        performSearch();
      } else {
        setGames([]);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [searchTerm, filters, performSearch]);

  const refetch = useCallback(async () => {
    await performSearch(true);
  }, [performSearch]);

  return {
    data: games,
    loading,
    error,
    cached,
    refetch,
    isStale,
    searchTerm: debouncedSearchTerm.current
  };
};

// Export the cache management hook
export const useCacheManagement = () => {
  const [stats, setStats] = useState({
    totalItems: 0,
    validItems: 0,
    expiredItems: 0,
    maxItems: 100
  });

  const refreshStats = useCallback(() => {
    if (browserCache) {
      const cacheStats = browserCache.getStats();
      setStats(cacheStats);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, [refreshStats]);

  return {
    stats,
    refreshStats,
    clearCache: () => browserCache?.clear(),
    cleanup: () => browserCache?.cleanup()
  };
};
