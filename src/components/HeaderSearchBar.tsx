import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, TrendingUp, Database, Loader2, Star, Gamepad2, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGameSearch } from '../hooks/useGameSearch';
import { gameDataService } from '../services/gameDataService';
import type { GameWithCalculatedFields } from '../types/database';
import { browserCache } from '../services/browserCacheService';
import { supabase } from '../services/supabase';

// Using GameWithCalculatedFields from database types

interface User {
  id: string;
  name: string;
  bio: string | null;
  picurl: string | null;
}

interface HeaderSearchBarProps {
  className?: string;
  placeholder?: string;
  enableCache?: boolean;
  showCacheStatus?: boolean;
  maxSuggestions?: number;
  debounceMs?: number;
}

interface CachedQuickSearch {
  query: string;
  results: GameWithCalculatedFields[];
  timestamp: number;
}

interface CachedUserSearch {
  query: string;
  results: User[];
  timestamp: number;
}

type SearchTab = 'games' | 'users';

export const HeaderSearchBar: React.FC<HeaderSearchBarProps> = ({ 
  className = "",
  placeholder = "Search games or users...",
  enableCache = true,
  showCacheStatus = false,
  maxSuggestions = 8,
  debounceMs = 300
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('games');
  const [suggestions, setSuggestions] = useState<GameWithCalculatedFields[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentUserSearches, setRecentUserSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'cached' | 'fresh' | 'loading' | 'error'>('loading');
  const [isFromCache, setIsFromCache] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const { 
    searchTerm, 
    setSearchTerm, 
    quickSearch, 
    navigateToSearch,
    clearSearch 
  } = useGameSearch();

  // Load recent searches from cache
  useEffect(() => {
    if (enableCache) {
      const savedGames = browserCache.get('headerRecentSearches') || [];
      const savedUsers = browserCache.get('headerRecentUserSearches') || [];
      setRecentSearches(savedGames.slice(0, 5));
      setRecentUserSearches(savedUsers.slice(0, 5));
    }
  }, [enableCache]);

  // Enhanced quick search for games with caching
  const performGameSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setCacheStatus('loading');
      return;
    }

    setIsLoadingSuggestions(true);
    setCacheStatus('loading');

    try {
      // Check cache first
      if (enableCache) {
        const cacheKey = `header_search:games:${query.toLowerCase()}`;
        const cached = browserCache.get(cacheKey) as CachedQuickSearch;
        
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
          setSuggestions(cached.results.slice(0, maxSuggestions));
          setIsFromCache(true);
          setCacheStatus('cached');
          setShowSuggestions(true);
          
          if (import.meta.env.DEV) {
            console.log('🚀 Game search cache hit:', query);
          }
          return;
        }
      }

      // Fetch fresh results using Supabase gameDataService
      const results = await gameDataService.searchGames(query);

      if (results && Array.isArray(results)) {
        const limitedResults = results.slice(0, maxSuggestions);
        setSuggestions(limitedResults);
        setIsFromCache(false);
        setCacheStatus('fresh');
        setShowSuggestions(true);

        // Cache the results
        if (enableCache) {
          const cacheKey = `header_search:games:${query.toLowerCase()}`;
          const cacheData: CachedQuickSearch = {
            query,
            results: limitedResults,
            timestamp: Date.now()
          };
          browserCache.set(cacheKey, cacheData, 300); // 5 minutes
        }

        if (import.meta.env.DEV) {
          console.log('🌐 Game search fresh fetch:', query, limitedResults.length, 'results');
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }

    } catch (error) {
      console.error('Game quick search failed:', error);
      setSuggestions([]);
      setCacheStatus('error');
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [enableCache, maxSuggestions]);

  // User search functionality
  const performUserSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      setCacheStatus('loading');
      return;
    }

    setIsLoadingSuggestions(true);
    setCacheStatus('loading');

    try {
      // Check cache first
      if (enableCache) {
        const cacheKey = `header_search:users:${query.toLowerCase()}`;
        const cached = browserCache.get(cacheKey) as CachedUserSearch;
        
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
          setUserSuggestions(cached.results.slice(0, maxSuggestions));
          setIsFromCache(true);
          setCacheStatus('cached');
          setShowSuggestions(true);
          
          if (import.meta.env.DEV) {
            console.log('🚀 User search cache hit:', query);
          }
          return;
        }
      }

      // Fetch users from Supabase
      const { data: users, error } = await supabase
        .from('user')
        .select('id, name, bio, picurl')
        .ilike('name', `%${query}%`)
        .limit(maxSuggestions);

      if (error) {
        console.error('User search error:', error);
        setUserSuggestions([]);
        setCacheStatus('error');
        setShowSuggestions(false);
        return;
      }

      if (users && Array.isArray(users)) {
        setUserSuggestions(users);
        setIsFromCache(false);
        setCacheStatus('fresh');
        setShowSuggestions(true);

        // Cache the results
        if (enableCache) {
          const cacheKey = `header_search:users:${query.toLowerCase()}`;
          const cacheData: CachedUserSearch = {
            query,
            results: users,
            timestamp: Date.now()
          };
          browserCache.set(cacheKey, cacheData, 300); // 5 minutes
        }

        if (import.meta.env.DEV) {
          console.log('🌐 User search fresh fetch:', query, users.length, 'results');
        }
      } else {
        setUserSuggestions([]);
        setShowSuggestions(false);
      }

    } catch (error) {
      console.error('User quick search failed:', error);
      setUserSuggestions([]);
      setCacheStatus('error');
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [enableCache, maxSuggestions]);

  // Combined search function
  const performQuickSearch = useCallback(async (query: string, tab?: SearchTab) => {
    const searchTab = tab || activeTab;
    setHasSearched(true);
    
    if (searchTab === 'games') {
      await performGameSearch(query);
    } else {
      await performUserSearch(query);
    }
  }, [activeTab, performGameSearch, performUserSearch]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performQuickSearch(searchTerm);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, performQuickSearch, debounceMs]);

  // Save search to recent searches
  const saveRecentSearch = useCallback((searchQuery: string, tab?: SearchTab) => {
    if (!enableCache || !searchQuery.trim()) return;
    
    const searchTab = tab || activeTab;
    
    if (searchTab === 'games') {
      const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(updated);
      browserCache.set('headerRecentSearches', updated, 24 * 60 * 60); // 24 hours
    } else {
      const updated = [searchQuery, ...recentUserSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentUserSearches(updated);
      browserCache.set('headerRecentUserSearches', updated, 24 * 60 * 60); // 24 hours
    }
  }, [enableCache, recentSearches, recentUserSearches, activeTab]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSuggestions(false);
        setHasSearched(false); // Reset search state when closing
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setIsOpen(true);
    if (searchTerm.length >= 2) {
      setShowSuggestions(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
  };

  const handleSuggestionClick = (game: Game) => {
    setSearchTerm(game.name);
    saveRecentSearch(game.name, 'games');
    navigateToSearch(game.name);
    setIsOpen(false);
    setShowSuggestions(false);
    setHasSearched(false);
  };

  const handleUserClick = (user: User) => {
    saveRecentSearch(user.username || user.name, 'users');
    navigate(`/user/${user.id}`);
    setIsOpen(false);
    setShowSuggestions(false);
    setSearchTerm('');
    setHasSearched(false);
  };

  const handleRecentSearchClick = (searchQuery: string, tab: SearchTab) => {
    setSearchTerm(searchQuery);
    if (tab === 'games') {
      navigateToSearch(searchQuery);
    } else {
      // For users, perform a search to navigate to the first result
      performQuickSearch(searchQuery, 'users');
    }
    setIsOpen(false);
    setShowSuggestions(false);
  };

  const performSearch = (searchQuery: string) => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      if (activeTab === 'games') {
        navigateToSearch(searchQuery);
      } else {
        navigate(`/users?q=${encodeURIComponent(searchQuery)}`);
      }
      setIsOpen(false);
      setShowSuggestions(false);
      setHasSearched(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch(searchTerm);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSuggestions([]);
    setUserSuggestions([]);
    setShowSuggestions(false);
    setCacheStatus('loading');
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    if (activeTab === 'games') {
      setRecentSearches([]);
      browserCache.delete('headerRecentSearches');
    } else {
      setRecentUserSearches([]);
      browserCache.delete('headerRecentUserSearches');
    }
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    // Re-perform search with new tab if there's a search term
    if (searchTerm.trim()) {
      performQuickSearch(searchTerm, tab);
    }
  };

  // Determine placeholder text
  const getPlaceholder = () => {
    if (!hasSearched || !isOpen) {
      return "Search games or users...";
    }
    return activeTab === 'games' ? "Search games..." : "Search users...";
  };

  const getCacheStatusColor = () => {
    switch (cacheStatus) {
      case 'cached': return 'text-green-400';
      case 'fresh': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatReleaseYear = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).getFullYear();
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className={`
          flex items-center transition-all duration-300
          ${isOpen ? 'ring-2 ring-purple-500/50' : ''}
        `}>
          <Search className={`
            absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4
            transition-colors duration-200
            ${isOpen ? 'text-purple-400' : 'text-gray-400'}
          `} />
          
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className={`
              w-full pl-10 pr-16 py-2 bg-gray-800 border border-gray-700 rounded-lg
              text-white placeholder-gray-400 text-sm
              focus:outline-none focus:border-purple-500
              transition-all duration-200
            `}
            aria-label="Search"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          />

          {/* Cache Status & Loading Indicator */}
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            {showCacheStatus && enableCache && (
              <div className="flex items-center">
                {cacheStatus === 'loading' || isLoadingSuggestions ? (
                  <Loader2 className="h-3 w-3 text-purple-400 animate-spin" />
                ) : (
                  <Database className={`h-3 w-3 ${getCacheStatusColor()}`} />
                )}
                {import.meta.env.DEV && (
                  <span className={`text-xs ml-1 ${getCacheStatusColor()}`}>
                    {cacheStatus === 'cached' ? 'C' : 
                     cacheStatus === 'fresh' ? 'F' : 
                     cacheStatus === 'error' ? 'E' : 'L'}
                  </span>
                )}
              </div>
            )}
          </div>

          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-700 bg-gray-900/50">
            <button
              onClick={() => handleTabChange('games')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'games'
                  ? 'text-purple-400 bg-gray-800 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <Gamepad2 className="h-4 w-4" />
              Games
            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-purple-400 bg-gray-800 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              Users
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Cache Status Header */}
            {showCacheStatus && enableCache && ((activeTab === 'games' && suggestions.length > 0) || (activeTab === 'users' && userSuggestions.length > 0)) && (
              <div className="px-3 py-2 border-b border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Database className={`h-3 w-3 ${getCacheStatusColor()}`} />
                  <span className={getCacheStatusColor()}>
                    {isFromCache ? 'Cached results' : 'Fresh results'}
                  </span>
                </div>
                {isFromCache && (
                  <button
                    onClick={() => performQuickSearch(searchTerm)}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Refresh
                  </button>
                )}
              </div>
            )}

            {/* Game Suggestions */}
            {activeTab === 'games' && showSuggestions && suggestions.length > 0 && (
              <div className="space-y-1 p-2">
                {suggestions.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleSuggestionClick(game)}
                    className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded group transition-colors"
                  >
                    {/* Game Cover */}
                    <div className="w-8 h-10 bg-gray-700 rounded mr-3 flex-shrink-0 overflow-hidden">
                      {game.cover?.url ? (
                        <img
                          src={game.cover.url.replace('t_thumb', 't_cover_small')}
                          alt={game.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                          <Gamepad2 className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Game Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                        {game.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {formatReleaseYear(game.first_release_date) && (
                          <>
                            <span>{formatReleaseYear(game.first_release_date)}</span>
                          </>
                        )}
                        {game.rating && (
                          <>
                            {formatReleaseYear(game.first_release_date) && <span>•</span>}
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span>{(game.rating / 10).toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* User Suggestions */}
            {activeTab === 'users' && showSuggestions && userSuggestions.length > 0 && (
              <div className="space-y-1 p-2">
                {userSuggestions.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleUserClick(user)}
                    className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded group transition-colors"
                  >
                    {/* User Avatar */}
                    <div className="w-10 h-10 bg-gray-700 rounded-full mr-3 flex-shrink-0 overflow-hidden">
                      {user.picurl ? (
                        <img
                          src={user.picurl}
                          alt={user.username || user.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                      )}
                    </div>

                    {/* User Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                        {user.username || user.name}
                      </div>
                      {user.bio && (
                        <div className="text-xs text-gray-400 truncate">
                          {user.bio}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Recent Searches */}
            {searchTerm.trim() === '' && (
              <>
                {activeTab === 'games' && recentSearches.length > 0 && (
                  <div>
                    <div className="px-3 py-2 flex items-center justify-between border-t border-gray-700">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Recent Game Searches
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="space-y-1 p-2">
                      {recentSearches.map((searchQuery, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearchClick(searchQuery, 'games')}
                          className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Clock className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                          <span className="text-white truncate">{searchQuery}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {activeTab === 'users' && recentUserSearches.length > 0 && (
                  <div>
                    <div className="px-3 py-2 flex items-center justify-between border-t border-gray-700">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Recent User Searches
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="space-y-1 p-2">
                      {recentUserSearches.map((searchQuery, index) => (
                        <button
                          key={index}
                          onClick={() => handleRecentSearchClick(searchQuery, 'users')}
                          className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Clock className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                          <span className="text-white truncate">{searchQuery}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Loading State */}
            {isLoadingSuggestions && searchTerm.length >= 2 && (
              <div className="p-4 text-center">
                <Loader2 className="h-5 w-5 text-purple-500 animate-spin mx-auto mb-2" />
                <div className="text-sm text-gray-400">
                  Searching {activeTab === 'games' ? 'games' : 'users'}...
                </div>
              </div>
            )}

            {/* No Results */}
            {showSuggestions && searchTerm.length >= 2 && !isLoadingSuggestions && cacheStatus !== 'error' && (
              <>
                {activeTab === 'games' && suggestions.length === 0 && (
                  <div className="p-4 text-center">
                    <div className="text-gray-400 mb-2">No games found</div>
                    <button
                      onClick={() => performSearch(searchTerm)}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Search "{searchTerm}" anyway
                    </button>
                  </div>
                )}
                {activeTab === 'users' && userSuggestions.length === 0 && (
                  <div className="p-4 text-center">
                    <div className="text-gray-400 mb-2">No users found</div>
                    <button
                      onClick={() => performSearch(searchTerm)}
                      className="text-sm text-purple-400 hover:text-purple-300"
                    >
                      Search "{searchTerm}" anyway
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Error State */}
            {cacheStatus === 'error' && (
              <div className="p-4 text-center">
                <div className="text-red-400 mb-2">Search error</div>
                <button
                  onClick={() => performQuickSearch(searchTerm)}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Search Prompt */}
            {!showSuggestions && searchTerm.trim() === '' && !isLoadingSuggestions && (
              <>
                {activeTab === 'games' && recentSearches.length === 0 && (
                  <div className="p-4 text-center text-gray-400">
                    <p className="text-sm">Start typing to search for games...</p>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Popular: Cyberpunk, Elden Ring</span>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'users' && recentUserSearches.length === 0 && (
                  <div className="p-4 text-center text-gray-400">
                    <p className="text-sm">Start typing to search for users...</p>
                    <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        <span>Find friends and reviewers</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Quick Actions Footer */}
          {searchTerm.trim() && (
            <div className="border-t border-gray-700 p-2">
              <button
                onClick={() => performSearch(searchTerm)}
                className="w-full flex items-center justify-center gap-2 p-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-gray-700 rounded transition-colors"
              >
                <Search className="h-4 w-4" />
                Search all {activeTab} for "{searchTerm}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
