import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  GameSearchFilters, 
  SearchSuggestion, 
  DEFAULT_FILTERS,
  SearchState,
  SearchResponse
} from '../types/search';

// Mock API service - replace with your actual API service
const searchGamesAPI = async (
  query: string, 
  filters: Partial<GameSearchFilters>
): Promise<SearchResponse> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // This is a mock implementation - replace with your actual API call
  console.log('Searching with query:', query, 'and filters:', filters);
  
  // Return mock data
  return {
    results: Array(10).fill(null).map((_, i) => ({
      id: `game-${i}`,
      title: `Game ${i} ${query ? `matching "${query}"` : ''}`,
      rating: Math.floor(Math.random() * 10) + 1,
      reviewCount: Math.floor(Math.random() * 1000),
      releaseDate: new Date(2010 + Math.floor(Math.random() * 13), 
                           Math.floor(Math.random() * 12), 
                           Math.floor(Math.random() * 28)).toISOString()
    })),
    totalResults: 100,
    page: 1,
    pageSize: 10
  };
};

// Mock API service for suggestions
const getSuggestionsAPI = async (query: string): Promise<SearchSuggestion[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (!query.trim()) return [];
  
  // This is a mock implementation - replace with your actual API call
  return [
    { id: 'game-1', title: `${query} Adventure`, type: 'game' },
    { id: 'game-2', title: `Super ${query}`, type: 'game' },
    { id: 'genre-1', title: `${query.charAt(0).toUpperCase() + query.slice(1)} Genre`, type: 'genre' },
    { id: 'platform-1', title: `${query} Platform`, type: 'platform' }
  ];
};

export const useSearchFilters = (initialFilters = DEFAULT_FILTERS) => {
  const [state, setState] = useState<SearchState>({
    query: initialFilters.query,
    filters: initialFilters,
    suggestions: [],
    isLoading: false,
    error: null,
    results: [],
    totalResults: 0,
    activeFilters: []
  });
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update active filters based on current filter state
  const updateActiveFilters = useCallback((filters: GameSearchFilters) => {
    const activeFilters: string[] = [];
    
    if (filters.query) {
      activeFilters.push(`Search: ${filters.query}`);
    }
    
    filters.genres.forEach(genre => {
      activeFilters.push(`Genre: ${genre}`);
    });
    
    filters.platforms.forEach(platform => {
      activeFilters.push(`Platform: ${platform}`);
    });
    
    if (filters.ratingRange[0] > 0 || filters.ratingRange[1] < 10) {
      activeFilters.push(`Rating: ${filters.ratingRange[0]}-${filters.ratingRange[1]}`);
    }
    
    const currentYear = new Date().getFullYear();
    if (filters.releaseYearRange[0] > 1990 || filters.releaseYearRange[1] < currentYear) {
      activeFilters.push(`Year: ${filters.releaseYearRange[0]}-${filters.releaseYearRange[1]}`);
    }
    
    if (filters.sortBy !== 'newest') {
      activeFilters.push(`Sort: ${filters.sortBy.replace('_', ' ')}`);
    }
    
    return activeFilters;
  }, []);
  
  // Debounced search function
  const performSearch = useCallback(async (filters: GameSearchFilters) => {
    setState(prev => ({ 
      ...prev, 
      isLoading: true, 
      error: null,
      activeFilters: updateActiveFilters(filters)
    }));
    
    try {
      const response = await searchGamesAPI(filters.query, filters);
      
      setState(prev => ({ 
        ...prev, 
        results: response.results,
        totalResults: response.totalResults,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'An error occurred',
        isLoading: false
      }));
    }
  }, [updateActiveFilters]);
  
  // Debounced suggestions function
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, suggestions: [] }));
      return;
    }
    
    try {
      const suggestions = await getSuggestionsAPI(query);
      setState(prev => ({ ...prev, suggestions }));
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setState(prev => ({ ...prev, suggestions: [] }));
    }
  }, []);
  
  // Update query with debounce
  const setQuery = useCallback((query: string) => {
    setState(prev => ({ 
      ...prev, 
      query,
      filters: { ...prev.filters, query }
    }));
    
    // Clear previous timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }
    
    // Set new timeouts
    suggestionsTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 200); // Faster debounce for suggestions
    
    searchTimeoutRef.current = setTimeout(() => {
      performSearch({ ...state.filters, query });
    }, 500); // Slower debounce for search
  }, [fetchSuggestions, performSearch, state.filters]);
  
  // Update filters
  const setFilters = useCallback((newFilters: Partial<GameSearchFilters>) => {
    const updatedFilters = { ...state.filters, ...newFilters };
    
    setState(prev => ({ 
      ...prev, 
      filters: updatedFilters
    }));
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(updatedFilters);
    }, 500);
  }, [performSearch, state.filters]);
  
  // Remove a single filter
  const removeFilter = useCallback((filterToRemove: string) => {
    const updatedFilters = { ...state.filters };
    
    if (filterToRemove.startsWith('Search:')) {
      updatedFilters.query = '';
    } else if (filterToRemove.startsWith('Genre:')) {
      const genre = filterToRemove.replace('Genre: ', '');
      updatedFilters.genres = updatedFilters.genres.filter(g => g !== genre);
    } else if (filterToRemove.startsWith('Platform:')) {
      const platform = filterToRemove.replace('Platform: ', '');
      updatedFilters.platforms = updatedFilters.platforms.filter(p => p !== platform);
    } else if (filterToRemove.startsWith('Rating:')) {
      updatedFilters.ratingRange = [0, 10];
    } else if (filterToRemove.startsWith('Year:')) {
      updatedFilters.releaseYearRange = [1990, new Date().getFullYear()];
    } else if (filterToRemove.startsWith('Sort:')) {
      updatedFilters.sortBy = 'newest';
    }
    
    setState(prev => ({ 
      ...prev, 
      filters: updatedFilters,
      activeFilters: updateActiveFilters(updatedFilters)
    }));
    
    performSearch(updatedFilters);
  }, [performSearch, state.filters, updateActiveFilters]);
  
  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setState(prev => ({ 
      ...prev, 
      filters: DEFAULT_FILTERS,
      activeFilters: []
    }));
    
    performSearch(DEFAULT_FILTERS);
  }, [performSearch]);
  
  // Initial search on mount
  useEffect(() => {
    performSearch(state.filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // State
    query: state.query,
    filters: state.filters,
    suggestions: state.suggestions,
    isLoading: state.isLoading,
    error: state.error,
    results: state.results,
    totalResults: state.totalResults,
    activeFilters: state.activeFilters,
    
    // Actions
    setQuery,
    setFilters,
    removeFilter,
    clearAllFilters,
    
    // Computed
    hasActiveFilters: state.activeFilters.length > 0,
    hasResults: state.results.length > 0
  };
};