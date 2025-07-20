import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Loader2, Database, Clock, TrendingUp } from 'lucide-react';
import { SearchSuggestion } from '../types/search';
import { browserCache } from '../services/browserCacheService';
import { enhancedIGDBService } from '../services/enhancedIGDBService';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: SearchSuggestion[];
  isLoading?: boolean;
  placeholder?: string;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  className?: string;
  enableCache?: boolean;
  showCacheStatus?: boolean;
  debounceMs?: number;
}

interface CachedSearch {
  query: string;
  timestamp: number;
  results: SearchSuggestion[];
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  suggestions,
  isLoading = false,
  placeholder = 'Search games, genres, platforms...',
  onSuggestionSelect,
  className = '',
  enableCache = true,
  showCacheStatus = false,
  debounceMs = 300
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [cachedSuggestions, setCachedSuggestions] = useState<SearchSuggestion[]>([]);
  const [isFromCache, setIsFromCache] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'loading' | 'cached' | 'fresh' | 'error'>('loading');

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Load recent searches on mount
  useEffect(() => {
    if (enableCache) {
      const saved = browserCache.get('recentSearches') || [];
      setRecentSearches(saved.slice(0, 5)); // Keep only 5 recent searches
    }
  }, [enableCache]);

  // Enhanced caching with debounced search
  const debouncedSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setCachedSuggestions([]);
      setIsFromCache(false);
      setCacheStatus('loading');
      return;
    }

    // Check browser cache first
    if (enableCache) {
      const cacheKey = `search_suggestions:${searchQuery.toLowerCase()}`;
      const cached = browserCache.get(cacheKey) as CachedSearch;
      
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes cache
        setCachedSuggestions(cached.results);
        setIsFromCache(true);
        setCacheStatus('cached');
        
        if (import.meta.env.DEV) {
          console.log('🚀 Using cached suggestions for:', searchQuery);
        }
        return;
      }
    }

    try {
      setCacheStatus('loading');
      
      // Simulate API call for suggestions (replace with actual implementation)
      const results = await fetchSearchSuggestions(searchQuery);
      
      // Cache the results
      if (enableCache) {
        const cacheKey = `search_suggestions:${searchQuery.toLowerCase()}`;
        const cacheData: CachedSearch = {
          query: searchQuery,
          timestamp: Date.now(),
          results
        };
        browserCache.set(cacheKey, cacheData, 300); // 5 minutes TTL
      }

      setCachedSuggestions(results);
      setIsFromCache(false);
      setCacheStatus('fresh');

      if (import.meta.env.DEV) {
        console.log('🌐 Fetched fresh suggestions for:', searchQuery);
      }

    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setCacheStatus('error');
      setCachedSuggestions([]);
    }
  }, [enableCache]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      debouncedSearch(query);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debouncedSearch, debounceMs]);

  // Mock function to simulate API call
  const fetchSearchSuggestions = async (searchQuery: string): Promise<SearchSuggestion[]> => {
    // This would be replaced with actual API call to your enhanced IGDB service
    await new Promise(resolve => setTimeout(resolve, 200)); // Simulate network delay
    
    // Return mock data for now
    return [
      { id: '1', title: `${searchQuery} Game`, type: 'game', subtitle: 'Popular game' },
      { id: '2', title: `${searchQuery} 2`, type: 'game', subtitle: 'Sequel' },
      { id: '3', title: `${searchQuery} Genre`, type: 'genre', subtitle: 'Game category' }
    ];
  };

  // Save search to recent searches
  const saveRecentSearch = (searchQuery: string) => {
    if (!enableCache || !searchQuery.trim()) return;

    const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
    setRecentSearches(updated);
    browserCache.set('recentSearches', updated, 24 * 60 * 60); // 24 hours
  };

  // Reset active suggestion when suggestions change
  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [suggestions, cachedSuggestions]);

  // Get combined suggestions (prefer provided suggestions, fallback to cached)
  const displaySuggestions = suggestions.length > 0 ? suggestions : cachedSuggestions;
  const showSuggestionsList = isFocused && (displaySuggestions.length > 0 || recentSearches.length > 0);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestionsList) return;

    const totalItems = displaySuggestions.length + (query.trim() === '' ? recentSearches.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < displaySuggestions.length) {
          e.preventDefault();
          const selectedSuggestion = displaySuggestions[activeSuggestionIndex];
          handleSuggestionClick(selectedSuggestion);
        } else if (activeSuggestionIndex >= displaySuggestions.length) {
          // Recent search selected
          const recentIndex = activeSuggestionIndex - displaySuggestions.length;
          if (recentIndex < recentSearches.length) {
            e.preventDefault();
            onQueryChange(recentSearches[recentIndex]);
            setIsFocused(false);
          }
        }
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onQueryChange(suggestion.title);
    onSuggestionSelect?.(suggestion);
    saveRecentSearch(suggestion.title);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  // Handle recent search click
  const handleRecentSearchClick = (searchTerm: string) => {
    onQueryChange(searchTerm);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  // Clear search input
  const handleClearSearch = () => {
    onQueryChange('');
    setCachedSuggestions([]);
    setIsFromCache(false);
    setCacheStatus('loading');
    inputRef.current?.focus();
  };

  // Clear recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    browserCache.delete('recentSearches');
  };

  // Scroll active suggestion into view
  useEffect(() => {
    if (activeSuggestionIndex >= 0 && suggestionsRef.current) {
      const activeElement = suggestionsRef.current.children[activeSuggestionIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeSuggestionIndex]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node) &&
          suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get suggestion icon based on type
  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'game':
        return '🎮';
      case 'genre':
        return '🏷️';
      case 'platform':
        return '💻';
      case 'developer':
        return '👨‍💻';
      default:
        return '🔍';
    }
  };

  const getCacheStatusColor = () => {
    switch (cacheStatus) {
      case 'cached': return 'text-green-400';
      case 'fresh': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`
        relative flex items-center transition-all duration-300
        ${isFocused ? 'ring-2 ring-purple-500 ring-opacity-50' : ''}
      `}>
        <Search className={`
          absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5
          transition-colors duration-200
          ${isFocused ? 'text-purple-500' : 'text-gray-400'}
        `} />
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search"
          aria-autocomplete="list"
          aria-controls={showSuggestionsList ? "search-suggestions" : undefined}
          aria-activedescendant={activeSuggestionIndex >= 0 ? `suggestion-${activeSuggestionIndex}` : undefined}
          className={`
            w-full pl-10 pr-20 py-3 bg-gray-800 border border-gray-700 rounded-xl
            text-white placeholder-gray-400 focus:outline-none
            transition-all duration-200
          `}
        />
        
        {/* Cache Status & Loading Indicator */}
        <div className="absolute right-12 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {showCacheStatus && enableCache && (
            <div className="flex items-center gap-1">
              {cacheStatus === 'loading' ? (
                <Loader2 className="h-4 w-4 text-purple-500 animate-spin" />
              ) : (
                <Database className={`h-4 w-4 ${getCacheStatusColor()}`} />
              )}
              {import.meta.env.DEV
