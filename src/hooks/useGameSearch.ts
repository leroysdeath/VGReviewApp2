// hooks/useGameSearch.ts
import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// Types for our search functionality
interface Game {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  first_release_date?: number;
  genres?: { name: string }[];
  platforms?: { name: string }[];
  rating?: number;
}

interface SearchResult {
  games: Game[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  totalResults: number;
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  genres?: string[];
  platforms?: string[];
  minRating?: number;
  sortBy?: 'name' | 'rating' | 'release_date' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

// Custom hook for unified search logic
export const useGameSearch = () => {
  const navigate = useNavigate();
  const [searchState, setSearchState] = useState<SearchResult>({
    games: [],
    loading: false,
    error: null,
    hasMore: true,
    totalResults: 0
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchOptions, setSearchOptions] = useState<SearchOptions>({
    limit: 20,
    offset: 0,
    sortBy: 'popularity',
    sortOrder: 'desc'
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Main search function that both components will use
  const searchGames = useCallback(async (
    query: string, 
    options: SearchOptions = {},
    append: boolean = false
  ) => {
    // Cancel any existing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    try {
      setSearchState(prev => ({
        ...prev,
        loading: true,
        error: null
      }));

      const searchParams = { ...searchOptions, ...options };
      const offset = append ? searchState.games.length : 0;
      
      // Call your IGDB API endpoint
      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: searchParams.limit,
          offset,
          filters: {
            genres: searchParams.genres,
            platforms: searchParams.platforms,
            minRating: searchParams.minRating
          },
          sort: {
            field: searchParams.sortBy,
            direction: searchParams.sortOrder
          }
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      setSearchState(prev => ({
        games: append ? [...prev.games, ...data.games] : data.games,
        loading: false,
        error: null,
        hasMore: data.hasMore || data.games.length === searchParams.limit,
        totalResults: data.total || data.games.length
      }));

      return data.games;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Search was cancelled, don't update state
      }
      
      setSearchState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Search failed. Please try again.'
      }));
      
      throw error;
    }
  }, [searchOptions, searchState.games.length]);

  // Quick search for autocomplete/suggestions
  const quickSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) return [];
    
    try {
      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 5,
          offset: 0,
          quick: true // Flag for quick search with minimal data
        })
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.games || [];
    } catch (error) {
      console.error('Quick search failed:', error);
      return [];
    }
  }, []);

  // Navigate to search results page
  const navigateToSearch = useCallback((query: string, options: SearchOptions = {}) => {
    const searchParams = new URLSearchParams();
    
    if (query.trim()) {
      searchParams.set('q', query.trim());
    }
    
    if (options.genres?.length) {
      searchParams.set('genres', options.genres.join(','));
    }
    
    if (options.platforms?.length) {
      searchParams.set('platforms', options.platforms.join(','));
    }
    
    if (options.minRating) {
      searchParams.set('rating', options.minRating.toString());
    }
    
    if (options.sortBy) {
      searchParams.set('sort', `${options.sortBy}:${options.sortOrder || 'desc'}`);
    }

    navigate(`/search?${searchParams.toString()}`);
  }, [navigate]);

  // Load more results (for pagination)
  const loadMore = useCallback(() => {
    if (!searchState.loading && searchState.hasMore && searchTerm) {
      searchGames(searchTerm, { 
        ...searchOptions, 
        offset: searchState.games.length 
      }, true);
    }
  }, [searchGames, searchState.loading, searchState.hasMore, searchState.games.length, searchTerm, searchOptions]);

  // Clear search results
  const clearSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setSearchState({
      games: [],
      loading: false,
      error: null,
      hasMore: true,
      totalResults: 0
    });
    
    setSearchTerm('');
  }, []);

  // Update search options
  const updateSearchOptions = useCallback((newOptions: Partial<SearchOptions>) => {
    setSearchOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  return {
    // State
    searchState,
    searchTerm,
    searchOptions,
    
    // Actions
    searchGames,
    quickSearch,
    navigateToSearch,
    loadMore,
    clearSearch,
    setSearchTerm,
    updateSearchOptions
  };
};
