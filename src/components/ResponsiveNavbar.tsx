import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Menu, X, Gamepad2, Home, Users, MessageSquare, LogOut, Settings, Clock, TrendingUp, Database, Loader2, Star, User as UserIcon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAuthModal } from '../context/AuthModalContext'; // NEW IMPORT
import { useResponsive } from '../hooks/useResponsive';
import { useGameSearch } from '../hooks/useGameSearch';
import { igdbService } from '../services/igdbService';
import type { GameWithCalculatedFields } from '../types/database';
import { browserCache } from '../services/browserCacheService';
import { supabase } from '../services/supabase';

// Using GameWithCalculatedFields from database types

interface UserSearchResult {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface CachedQuickSearch {
  query: string;
  results: GameWithCalculatedFields[];
  timestamp: number;
}

interface CachedUserSearch {
  query: string;
  results: UserSearchResult[];
  timestamp: number;
}

type SearchTab = 'games' | 'users';

export const ResponsiveNavbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('games');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GameWithCalculatedFields[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<UserSearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentUserSearches, setRecentUserSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'cached' | 'fresh' | 'loading' | 'error'>('loading');
  const [isFromCache, setIsFromCache] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile } = useResponsive();
  const { user, isAuthenticated, signOut, loading, dbUserId, dbUserIdLoading } = useAuth();
  const { openModal } = useAuthModal(); // USE GLOBAL AUTH MODAL
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userButtonRef = useRef<HTMLButtonElement>(null);
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

  const isActive = (path: string) => location.pathname === path;

  // Load recent searches from cache
  useEffect(() => {
    const savedGames = browserCache.get('headerRecentSearches') || [];
    const savedUsers = browserCache.get('headerRecentUserSearches') || [];
    setRecentSearches(savedGames.slice(0, 5));
    setRecentUserSearches(savedUsers.slice(0, 5));
  }, []);

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
      const cacheKey = `header_search:games:${query.toLowerCase()}`;
      const cached = browserCache.get(cacheKey) as CachedQuickSearch;
      
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
        setSuggestions(cached.results.slice(0, 8));
        setIsFromCache(true);
        setCacheStatus('cached');
        setShowSuggestions(true);
        
        if (import.meta.env.DEV) {
          console.log('🚀 Game search cache hit:', query);
        }
        return;
      }

      // Fetch fresh results using IGDB API
      const igdbResults = await igdbService.searchGames(query, 8);
      const results = igdbResults.map(game => igdbService.transformGame(game));

      if (results && Array.isArray(results)) {
        const limitedResults = results.slice(0, 8);
        setSuggestions(limitedResults);
        setIsFromCache(false);
        setCacheStatus('fresh');
        setShowSuggestions(true);

        // Cache the results
        const cacheData: CachedQuickSearch = {
          query,
          results: limitedResults,
          timestamp: Date.now()
        };
        browserCache.set(cacheKey, cacheData, 300); // 5 minutes

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
  }, []);

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
      const cacheKey = `header_search:users:${query.toLowerCase()}`;
      const cached = browserCache.get(cacheKey) as CachedUserSearch;
      
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
        setUserSuggestions(cached.results.slice(0, 8));
        setIsFromCache(true);
        setCacheStatus('cached');
        setShowSuggestions(true);
        
        if (import.meta.env.DEV) {
          console.log('🚀 User search cache hit:', query);
        }
        return;
      }

      // Fetch users from Supabase
      const { data: users, error } = await supabase
        .from('user')
        .select('id, name, bio, avatar_url')
        .ilike('name', `%${query}%`)
        .limit(8);

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
        const cacheData: CachedUserSearch = {
          query,
          results: users,
          timestamp: Date.now()
        };
        browserCache.set(cacheKey, cacheData, 300); // 5 minutes

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
  }, []);

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
      performQuickSearch(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery, performQuickSearch]);

  // Save search to recent searches
  const saveRecentSearch = useCallback((searchQuery: string, tab?: SearchTab) => {
    if (!searchQuery.trim()) return;
    
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
  }, [recentSearches, recentUserSearches, activeTab]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery);
      if (activeTab === 'games') {
        navigate(`/search-results?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        navigate(`/users?q=${encodeURIComponent(searchQuery.trim())}`);
      }
      setSearchQuery('');
      setIsMenuOpen(false);
      setIsSearchOpen(false);
      setShowSuggestions(false);
      setHasSearched(false);
    }
  };

  const handleSuggestionClick = (game: Game) => {
    setSearchQuery('');
    saveRecentSearch(game.name, 'games');
    navigate(`/game/${game.id}`);
    setIsSearchOpen(false);
    setShowSuggestions(false);
    setHasSearched(false);
  };

  const handleUserClick = (user: UserSearchResult) => {
    saveRecentSearch(user.username || user.name, 'users');
    navigate(`/user/${user.id}`);
    setIsSearchOpen(false);
    setShowSuggestions(false);
    setSearchQuery('');
    setHasSearched(false);
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    // Re-perform search with new tab if there's a search term
    if (searchQuery.trim()) {
      performQuickSearch(searchQuery, tab);
    }
  };

  // Determine placeholder text
  const getPlaceholder = () => {
    if (!hasSearched || !isSearchOpen) {
      return "Search games or users...";
    }
    return activeTab === 'games' ? "Search games..." : "Search users...";
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

  const formatReleaseYear = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).getFullYear();
  };

  const getCacheStatusColor = () => {
    switch (cacheStatus) {
      case 'cached': return 'text-green-400';
      case 'fresh': return 'text-blue-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
    navigate('/');
  };

  const handleAuthClick = () => {
    openModal(); // SIMPLIFIED - NO LOCAL STATE NEEDED
    setIsMenuOpen(false);
  };
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Handle user menu dropdown
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        userButtonRef.current &&
        !userButtonRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
      
      // Handle search dropdown
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setShowSuggestions(false);
        setHasSearched(false);
      }
    };

    if (isUserMenuOpen || isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isUserMenuOpen, isSearchOpen]);

  if (isMobile) {
    return (
      <>
        {/* Mobile Navbar */}
        <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <Link to="/" className="flex items-center space-x-2">
                <Gamepad2 className="h-6 w-6 text-purple-400" />
                <span className="text-lg font-bold text-white">GameVault</span>
              </Link>

              {/* User Avatar or Menu Button */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Mobile Menu Overlay */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setIsMenuOpen(false)}>
            <div className="bg-gray-800 w-full max-w-sm h-full shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Gamepad2 className="h-6 w-6 text-purple-400" />
                    <span className="text-lg font-bold text-white">GameVault</span>
                  </div>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* User Info Section */}
                {isAuthenticated ? (
                  <div className="border-b border-gray-700 pb-4">
                    <div className="flex items-center space-x-3 mb-3">
                      {user?.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.name}
                          className="h-10 w-10 rounded-full"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-purple-600 rounded-full flex items-center justify-center">
                          <User className="h-6 w-6 text-white" />
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">{user?.name}</p>
                        <p className="text-gray-400 text-sm">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-gray-700 pb-4">
                    <button
                      onClick={handleAuthClick}
                      className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium"
                    >
                      Sign In / Sign Up
                    </button>
                  </div>
                )}

                {/* Enhanced Search */}
                <div ref={searchRef} className="relative">
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        ref={inputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsSearchOpen(true);
                        }}
                        onFocus={() => {
                          setIsSearchOpen(true);
                          if (searchQuery.length >= 2) {
                            setShowSuggestions(true);
                          }
                        }}
                        placeholder={getPlaceholder()}
                        className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </form>

                  {/* Mobile Search Dropdown */}
                  {isSearchOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-80 overflow-hidden">
                      {/* Mobile Tabs */}
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

                      <div className="max-h-64 overflow-y-auto">
                        {/* Game Results */}
                        {activeTab === 'games' && showSuggestions && suggestions.length > 0 && (
                          <div className="space-y-1 p-2">
                            {suggestions.map((game) => (
                              <button
                                key={game.id}
                                onClick={() => handleSuggestionClick(game)}
                                className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded transition-colors"
                              >
                                <div className="w-8 h-10 bg-gray-700 rounded mr-3 flex-shrink-0 overflow-hidden">
                                  {game.cover_url ? (
                                    <img
                                      src={game.cover_url}
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
                                <div className="min-w-0 flex-1">
                                  <div className="text-white font-medium truncate">
                                    {game.name}
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-gray-400">
                                    {game.release_date && (
                                      <span>{formatReleaseYear(game.release_date)}</span>
                                    )}
                                    {game.averageUserRating && (
                                      <>
                                        {game.release_date && <span>•</span>}
                                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                        <span>{game.averageUserRating?.toFixed(1) || '0.0'}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* User Results */}
                        {activeTab === 'users' && showSuggestions && userSuggestions.length > 0 && (
                          <div className="space-y-1 p-2">
                            {userSuggestions.map((user) => (
                              <button
                                key={user.id}
                                onClick={() => handleUserClick(user)}
                                className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded transition-colors"
                              >
                                <div className="w-10 h-10 bg-gray-700 rounded-full mr-3 flex-shrink-0 overflow-hidden">
                                  {user.avatar_url ? (
                                    <img
                                      src={user.avatar_url}
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
                                <div className="min-w-0 flex-1">
                                  <div className="text-white font-medium truncate">
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

                        {/* Loading State */}
                        {isLoadingSuggestions && searchQuery.length >= 2 && (
                          <div className="p-4 text-center">
                            <Loader2 className="h-5 w-5 text-purple-500 animate-spin mx-auto mb-2" />
                            <div className="text-sm text-gray-400">
                              Searching {activeTab === 'games' ? 'games' : 'users'}...
                            </div>
                          </div>
                        )}

                        {/* Quick Action */}
                        {searchQuery.trim() && (
                          <div className="border-t border-gray-700 p-2">
                            <button
                              onClick={handleSearch}
                              className="w-full flex items-center justify-center gap-2 p-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-gray-700 rounded transition-colors"
                            >
                              <Search className="h-4 w-4" />
                              Search all {activeTab} for "{searchQuery}"
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Navigation Links */}
                <div className="space-y-2">
                  <Link
                    to="/"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Home className="h-5 w-5" />
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/search"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Gamepad2 className="h-5 w-5" />
                    <span>Games</span>
                  </Link>
                  <Link
                    to="/users"
                    className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Users className="h-5 w-5" />
                    <span>Users</span>
                  </Link>

                  {/* Authenticated User Links */}
                  {isAuthenticated && (
                    <>
                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide px-3 py-1">Profile</p>
                      </div>
                      <Link
                        to={dbUserId ? `/user/${dbUserId}` : "#"}
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={(e) => {
                          if (!dbUserId) {
                            e.preventDefault();
                            if (!dbUserIdLoading) {
                              console.error('Database user ID not available');
                            }
                          } else {
                            setIsMenuOpen(false);
                          }
                        }}
                      >
                        <User className="h-5 w-5" />
                        <span>My Profile</span>
                        {dbUserIdLoading && (
                          <Loader2 className="h-3 w-3 animate-spin ml-1" />
                        )}
                      </Link>
                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide px-3 py-1">User</p>
                      </div>
                      <Link
                        to="/review"
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <MessageSquare className="h-5 w-5" />
                        <span>Write Review</span>
                      </Link>
                    </>
                  )}

                  {/* Development Links */}
                  {import.meta.env.DEV && (
                    <>
                      <div className="border-t border-gray-700 pt-2 mt-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide px-3 py-1">Development</p>
                      </div>
                      <Link
                        to="/game/dummy-game"
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <Gamepad2 className="h-5 w-5 text-green-400" />
                        <span>Dummy Game</span>
                      </Link>
                      <Link
                        to="/user/1"
                        className="flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5 text-blue-400" />
                        <span>Dummy User</span>
                      </Link>
                    </>
                  )}

                  {/* Sign Out Button */}
                  {isAuthenticated && (
                    <div className="border-t border-gray-700 pt-2 mt-2">
                      <button
                        onClick={handleSignOut}
                        className="flex items-center space-x-2 w-full px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                      >
                        <LogOut className="h-5 w-5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

      </>
    );
  }

  // Desktop Navbar
  return (
    <nav className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <Gamepad2 className="h-8 w-8 text-purple-400" />
                <span className="text-xl font-bold text-white">GameVault</span>
              </Link>
              
              {/* Development Quick Links */}
              {import.meta.env.DEV && (
                <>
                  <Link
                    to="/game/dummy-game"
                    className="p-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                    title="Dummy Test Game"
                  >
                    <Gamepad2 className="h-5 w-5 text-white" />
                  </Link>
                  <Link
                    to="/user/1"
                    className="p-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    title="Dummy Test User"
                  >
                    <User className="h-5 w-5 text-white" />
                  </Link>
                  {isAuthenticated && (
                    <>
                      <Link
                        to="/review"
                        className="p-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                        title="Write Review"
                      >
                        <MessageSquare className="h-5 w-5 text-white" />
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Enhanced Search Bar */}
          <div className="hidden md:block flex-1 max-w-lg mx-8">
            <div ref={searchRef} className="relative">
              <form onSubmit={handleSearch}>
                <div className="relative">
                  <div className={`flex items-center transition-all duration-300 ${isSearchOpen ? 'ring-2 ring-purple-500/50' : ''}`}>
                    <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 transition-colors duration-200 ${isSearchOpen ? 'text-purple-400' : 'text-gray-400'}`} />
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsSearchOpen(true);
                      }}
                      onFocus={() => {
                        setIsSearchOpen(true);
                        if (searchQuery.length >= 2) {
                          setShowSuggestions(true);
                        }
                      }}
                      placeholder={getPlaceholder()}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all duration-200"
                    />
                  </div>
                </div>
              </form>

              {/* Desktop Search Dropdown */}
              {isSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
                  {/* Desktop Tabs */}
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
                    {/* Game Results */}
                    {activeTab === 'games' && showSuggestions && suggestions.length > 0 && (
                      <div className="space-y-1 p-2">
                        {suggestions.map((game) => (
                          <button
                            key={game.id}
                            onClick={() => handleSuggestionClick(game)}
                            className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded group transition-colors"
                          >
                            <div className="w-8 h-10 bg-gray-700 rounded mr-3 flex-shrink-0 overflow-hidden">
                              {game.cover_url ? (
                                <img
                                  src={game.cover_url}
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
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                                {game.name}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-400">
                                {game.release_date && (
                                  <span>{formatReleaseYear(game.release_date)}</span>
                                )}
                                {game.averageUserRating && (
                                  <>
                                    {game.release_date && <span>•</span>}
                                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                    <span>{game.averageUserRating?.toFixed(1) || '0.0'}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* User Results */}
                    {activeTab === 'users' && showSuggestions && userSuggestions.length > 0 && (
                      <div className="space-y-1 p-2">
                        {userSuggestions.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleUserClick(user)}
                            className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded group transition-colors"
                          >
                            <div className="w-10 h-10 bg-gray-700 rounded-full mr-3 flex-shrink-0 overflow-hidden">
                              {user.avatar_url ? (
                                <img
                                  src={user.avatar_url}
                                  alt={user.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
                                  <UserIcon className="h-5 w-5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                                {user.name}
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

                    {/* Loading State */}
                    {isLoadingSuggestions && searchQuery.length >= 2 && (
                      <div className="p-4 text-center">
                        <Loader2 className="h-5 w-5 text-purple-500 animate-spin mx-auto mb-2" />
                        <div className="text-sm text-gray-400">
                          Searching {activeTab === 'games' ? 'games' : 'users'}...
                        </div>
                      </div>
                    )}

                    {/* No Results */}
                    {showSuggestions && searchQuery.length >= 2 && !isLoadingSuggestions && cacheStatus !== 'error' && (
                      <>
                        {activeTab === 'games' && suggestions.length === 0 && (
                          <div className="p-4 text-center">
                            <div className="text-gray-400 mb-2">No games found</div>
                            <button
                              onClick={handleSearch}
                              className="text-sm text-purple-400 hover:text-purple-300"
                            >
                              Search "{searchQuery}" anyway
                            </button>
                          </div>
                        )}
                        {activeTab === 'users' && userSuggestions.length === 0 && (
                          <div className="p-4 text-center">
                            <div className="text-gray-400 mb-2">No users found</div>
                            <button
                              onClick={handleSearch}
                              className="text-sm text-purple-400 hover:text-purple-300"
                            >
                              Search "{searchQuery}" anyway
                            </button>
                          </div>
                        )}
                      </>
                    )}

                    {/* Recent Searches */}
                    {searchQuery.trim() === '' && (
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
                              {recentSearches.map((searchTerm, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSearchQuery(searchTerm)}
                                  className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded transition-colors"
                                >
                                  <Clock className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                                  <span className="text-white truncate">{searchTerm}</span>
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
                              {recentUserSearches.map((searchTerm, index) => (
                                <button
                                  key={index}
                                  onClick={() => setSearchQuery(searchTerm)}
                                  className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded transition-colors"
                                >
                                  <Clock className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                                  <span className="text-white truncate">{searchTerm}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Quick Actions Footer */}
                  {searchQuery.trim() && (
                    <div className="border-t border-gray-700 p-2">
                      <button
                        onClick={handleSearch}
                        className="w-full flex items-center justify-center gap-2 p-2 text-sm text-purple-400 hover:text-purple-300 hover:bg-gray-700 rounded transition-colors"
                      >
                        <Search className="h-4 w-4" />
                        Search all {activeTab} for "{searchQuery}"
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Desktop User Menu */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center gap-2 md:ml-6">
              {/* User Menu */}
              {isAuthenticated ? (
               <div className="relative">
                  <button
                    ref={userButtonRef}
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="flex items-center space-x-2 p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    {user?.avatar ? (
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-purple-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <span className="text-white font-medium">{user?.name}</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div 
                      ref={dropdownRef}
                      className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                      <div className="py-1">
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-700 mb-1">
                          Profile
                        </div>
                        <Link
                          to={dbUserId ? `/user/${dbUserId}` : "#"}
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={(e) => {
                            if (!dbUserId) {
                              e.preventDefault();
                            } else {
                              setIsUserMenuOpen(false);
                            }
                          }}
                        >
                          <User className="h-4 w-4" />
                          <span>My Profile</span>
                        </Link>
                        <div className="border-t border-gray-700 my-1"></div>
                        <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          User
                        </div>
                        <Link
                          to="/review"
                          className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white"
                          onClick={() => setIsUserMenuOpen(false)}
                        >
                          <MessageSquare className="h-4 w-4" />
                          <span>Write Review</span>
                        </Link>
                        <div className="border-t border-gray-700 my-1"></div>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-red-400 hover:bg-gray-700 hover:text-red-300"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleAuthClick}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Sign In'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-800 border-t border-gray-700">
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search games or users..."
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
              />
            </form>
            
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link
              to="/search"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Games
            </Link>
            <Link
              to="/users"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Users
            </Link>
            
            {isAuthenticated ? (
              <>
                <div className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider border-t border-gray-700 mt-2 pt-2">
                  Profile
                </div>
                <Link
                  to={dbUserId ? `/user/${dbUserId}` : "#"}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  onClick={(e) => {
                    if (!dbUserId) {
                      e.preventDefault();
                    } else {
                      setIsMenuOpen(false);
                    }
                  }}
                >
                  My Profile
                </Link>
                <Link
                  to="/review"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Write Review
                </Link>
                <button
                  onClick={handleSignOut}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={handleAuthClick}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
