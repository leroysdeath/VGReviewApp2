import { useState, useEffect, useRef } from 'react';

interface UseSmoothSearchOptions {
  searchFunction: (...args: any[]) => Promise<void>;
  debounceMs?: number;
  initialDelayMs?: number;
}

interface SmoothSearchState {
  isSearching: boolean;
  isInitialLoad: boolean;
  showLoading: boolean;
  hasSearched: boolean;
}

/**
 * Hook to manage smooth search loading states and prevent flashing
 */
export function useSmoothSearch({
  searchFunction,
  debounceMs = 300,
  initialDelayMs = 150
}: UseSmoothSearchOptions) {
  const [state, setState] = useState<SmoothSearchState>({
    isSearching: false,
    isInitialLoad: true,
    showLoading: false,
    hasSearched: false
  });

  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const initialSearchRef = useRef(true);

  const performSearch = async (...args: any[]) => {
    // Clear any existing timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    const isFirstSearch = initialSearchRef.current;
    initialSearchRef.current = false;

    setState(prev => ({
      ...prev,
      isSearching: true,
      hasSearched: true
    }));

    // For initial search, delay showing loading indicator
    if (isFirstSearch) {
      loadingTimeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          showLoading: true
        }));
      }, initialDelayMs);
    } else {
      // For subsequent searches, show loading immediately
      setState(prev => ({
        ...prev,
        showLoading: true
      }));
    }

    try {
      await searchFunction(...args);
    } finally {
      // Clear loading timeout if still pending
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      setState(prev => ({
        ...prev,
        isSearching: false,
        isInitialLoad: false,
        showLoading: false
      }));
    }
  };

  const debouncedSearch = (...args: any[]) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(...args);
    }, debounceMs);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    performSearch,
    debouncedSearch,
    // Helper functions
    shouldShowResults: (hasResults: boolean) => hasResults && state.hasSearched,
    shouldShowLoading: () => state.showLoading && state.isSearching,
    shouldShowInitialLoading: () => state.isInitialLoad && state.showLoading,
    shouldShowEmptyState: (hasResults: boolean) => !hasResults && state.hasSearched && !state.isSearching
  };
}