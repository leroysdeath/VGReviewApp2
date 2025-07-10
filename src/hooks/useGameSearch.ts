import { useState, useEffect, useCallback } from 'react';
import { igdbService, Game } from '../services/igdbService';

interface UseGameSearchOptions {
  debounceMs?: number;
  maxResults?: number;
  autoSearch?: boolean;
}

interface GameSearchState {
  query: string;
  results: Game[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
}

export const useGameSearch = (options: UseGameSearchOptions = {}) => {
  const {
    debounceMs = 300,
    maxResults = 20,
    autoSearch = true
  } = options;

  const [state, setState] = useState<GameSearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    hasSearched: false
  });

  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Perform search function
  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setState(prev => ({
        ...prev,
        results: [],
        loading: false,
        error: null,
        hasSearched: false
      }));
      return;
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      hasSearched: true
    }));

    try {
      const games = await igdbService.searchGames(searchTerm, maxResults);
      
      setState(prev => ({
        ...prev,
        results: games,
        loading: false,
        error: null
      }));
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to search games. Please try again.';
      
      setState(prev => ({
        ...prev,
        results: [],
        loading: false,
        error: errorMessage
      }));
    }
  }, [maxResults]);

  // Set query with optional auto-search
  const setQuery = useCallback((newQuery: string) => {
    setState(prev => ({ ...prev, query: newQuery }));

    if (!autoSearch) return;

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for debounced search
    const timer = setTimeout(() => {
      performSearch(newQuery);
    }, debounceMs);

    setDebounceTimer(timer);
  }, [debounceTimer, debounceMs, performSearch, autoSearch]);

  // Manual search function
  const search = useCallback((searchTerm?: string) => {
    const term = searchTerm ?? state.query;
    performSearch(term);
  }, [performSearch, state.query]);

  // Clear results
  const clear = useCallback(() => {
    setState({
      query: '',
      results: [],
      loading: false,
      error: null,
      hasSearched: false
    });
    
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      setDebounceTimer(null);
    }
  }, [debounceTimer]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    // State
    query: state.query,
    results: state.results,
    loading: state.loading,
    error: state.error,
    hasSearched: state.hasSearched,
    
    // Actions
    setQuery,
    search,
    clear,
    
    // Computed
    hasResults: state.results.length > 0,
    isEmpty: !state.hasSearched || (state.hasSearched && state.results.length === 0 && !state.loading),
  };
};