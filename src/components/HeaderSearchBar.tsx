import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Loader2, Star, Gamepad2, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdvancedSearchCoordination } from '../services/advancedSearchCoordination';
import type { GameWithCalculatedFields } from '../types/database';
import { supabase } from '../services/supabase';

interface User {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}

interface HeaderSearchBarProps {
  className?: string;
  placeholder?: string;
  maxSuggestions?: number;
  debounceMs?: number;
}

type SearchTab = 'games' | 'users';

export const HeaderSearchBar: React.FC<HeaderSearchBarProps> = ({ 
  className = "",
  placeholder = "Search games or users...",
  maxSuggestions = 8,
  debounceMs = 200
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchTab>('games');
  const [searchTerm, setSearchTerm] = useState(''); // Independent local state
  const [gameSuggestions, setGameSuggestions] = useState<GameWithCalculatedFields[]>([]);
  const [userSuggestions, setUserSuggestions] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();
  const searchCoordinationRef = useRef<AdvancedSearchCoordination>(new AdvancedSearchCoordination());

  // Direct game search using fast mode for immediate dropdown results
  const performGameSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setGameSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      if (import.meta.env.DEV) {
        console.log('🔍 HeaderSearchBar: Fast search for:', query);
      }

      // Use fast mode for immediate dropdown results - independent of main search
      const searchResult = await searchCoordinationRef.current.coordinatedSearch(query.trim(), {
        maxResults: maxSuggestions,
        includeMetrics: false,
        fastMode: true,
        bypassCache: false
      });
      
      setGameSuggestions(searchResult.results);

      if (import.meta.env.DEV) {
        console.log('🎯 HeaderSearchBar: Got', searchResult.results.length, 'fast results');
      }
    } catch (error) {
      console.error('HeaderSearchBar game search failed:', error);
      setGameSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [maxSuggestions]);

  // Simple user search
  const performUserSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setUserSuggestions([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data: users, error } = await supabase
        .from('user')
        .select('id, name, bio, avatar_url')
        .ilike('name', `%${query}%`)
        .limit(maxSuggestions);

      if (error) throw error;
      setUserSuggestions(users || []);
    } catch (error) {
      console.error('HeaderSearchBar user search failed:', error);
      setUserSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [maxSuggestions]);

  // Debounced search effect
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchTerm.length >= 2) {
      debounceRef.current = setTimeout(() => {
        if (activeTab === 'games') {
          performGameSearch(searchTerm);
        } else {
          performUserSearch(searchTerm);
        }
      }, debounceMs);
    } else {
      setGameSuggestions([]);
      setUserSuggestions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm, activeTab, performGameSearch, performUserSearch, debounceMs]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsOpen(true);
  };

  const handleGameClick = (game: GameWithCalculatedFields) => {
    setSearchTerm(game.name);
    navigate(`/search-results?q=${encodeURIComponent(game.name)}&source=header`);
    setIsOpen(false);
  };

  const handleUserClick = (user: User) => {
    navigate(`/user/${user.id}`);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      if (activeTab === 'games') {
        navigate(`/search-results?q=${encodeURIComponent(searchTerm.trim())}&source=header`);
      } else {
        navigate(`/users?q=${encodeURIComponent(searchTerm)}`);
      }
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setGameSuggestions([]);
    setUserSuggestions([]);
    inputRef.current?.focus();
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    if (searchTerm.trim()) {
      if (tab === 'games') {
        performGameSearch(searchTerm);
      } else {
        performUserSearch(searchTerm);
      }
    }
  };

  const formatReleaseYear = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).getFullYear();
  };

  const showSuggestions = isOpen && searchTerm.length >= 2;
  const currentSuggestions = activeTab === 'games' ? gameSuggestions : userSuggestions;

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
            placeholder={placeholder}
            className={`
              w-full pl-10 pr-16 py-2 bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-lg
              text-white placeholder-gray-400 text-sm
              focus:outline-none focus:border-purple-500
              transition-all duration-200
            `}
            aria-label="Search"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
          />

          {/* Loading Indicator */}
          {isLoading && (
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-3 w-3 text-purple-400 animate-spin" />
            </div>
          )}

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
        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-700 bg-gray-900/50">
            <button
              onClick={() => handleTabChange('games')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'games'
                  ? 'text-purple-400 bg-gray-900/90 border-b-2 border-purple-400'
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
                  ? 'text-purple-400 bg-gray-900/90 border-b-2 border-purple-400'
                  : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
              }`}
            >
              <UserIcon className="h-4 w-4" />
              Users
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {/* Game Suggestions */}
            {activeTab === 'games' && showSuggestions && gameSuggestions.length > 0 && (
              <div className="space-y-1 p-2">
                {gameSuggestions.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameClick(game)}
                    className="flex items-center w-full text-left p-2 hover:bg-gray-700 rounded group transition-colors"
                  >
                    {/* Game Cover */}
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

                    {/* Game Info */}
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-medium truncate group-hover:text-purple-300 transition-colors">
                        {game.name}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        {game.first_release_date && (
                          <span>{formatReleaseYear(game.first_release_date)}</span>
                        )}
                        {game.rating && (
                          <>
                            {game.first_release_date && <span>•</span>}
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

                    {/* User Info */}
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
            {isLoading && showSuggestions && (
              <div className="p-4 text-center">
                <Loader2 className="h-5 w-5 text-purple-500 animate-spin mx-auto mb-2" />
                <div className="text-sm text-gray-400">
                  Searching {activeTab === 'games' ? 'games' : 'users'}...
                </div>
              </div>
            )}

            {/* No Results */}
            {showSuggestions && !isLoading && currentSuggestions.length === 0 && (
              <div className="p-4 text-center">
                <div className="text-gray-400 mb-2">No {activeTab} found</div>
                <button
                  onClick={handleSearch}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  Search "{searchTerm}" anyway
                </button>
              </div>
            )}

            {/* Search Prompt */}
            {!showSuggestions && !isLoading && (
              <div className="p-4 text-center text-gray-400">
                <p className="text-sm">Start typing to search for {activeTab}...</p>
              </div>
            )}
          </div>

          {/* Quick Actions Footer */}
          {searchTerm.trim() && (
            <div className="border-t border-gray-700 p-2">
              <button
                onClick={handleSearch}
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