// components/HeaderSearchBar.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useGameSearch } from '../hooks/useGameSearch';

interface Game {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  first_release_date?: number;
}

interface HeaderSearchBarProps {
  className?: string;
  placeholder?: string;
}

export const HeaderSearchBar: React.FC<HeaderSearchBarProps> = ({ 
  className = "",
  placeholder = "Search games or users..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Game[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { 
    searchTerm, 
    setSearchTerm, 
    quickSearch, 
    navigateToSearch,
    clearSearch 
  } = useGameSearch();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Handle search input changes with debouncing
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (searchTerm.trim().length >= 2) {
      timeoutRef.current = setTimeout(async () => {
        try {
          const results = await quickSearch(searchTerm);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error('Quick search failed:', error);
          setSuggestions([]);
        }
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchTerm, quickSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    if (value.length > 0) {
      setIsOpen(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      performSearch(searchTerm.trim());
    }
  };

  const performSearch = (query: string) => {
    // Save to recent searches
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
    
    // Navigate to search results
    navigateToSearch(query);
    
    // Close dropdown
    setIsOpen(false);
    setShowSuggestions(false);
    inputRef.current?.blur();
  };

  const handleSuggestionClick = (game: Game) => {
    performSearch(game.name);
  };

  const handleRecentSearchClick = (query: string) => {
    setSearchTerm(query);
    performSearch(query);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleClearInput = () => {
    setSearchTerm('');
    clearSearch();
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (searchTerm.length >= 2) {
      setShowSuggestions(true);
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearInput}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {/* Recent Searches */}
          {recentSearches.length > 0 && !showSuggestions && (
            <div className="p-3 border-b border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-300 flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  Recent Searches
                </h4>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(query)}
                    className="block w-full text-left px-2 py-1 text-sm text-gray-300 hover:bg-gray-700 rounded"
                  >
                    {query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Game Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="p-3">
              <h4 className="text-sm font-semibold text-gray-300 mb-2 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Games
              </h4>
              <div className="space-y-1">
                {suggestions.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleSuggestionClick(game)}
                    className="flex items-center w-full text-left px-2 py-2 hover:bg-gray-700 rounded group"
                  >
                    {game.cover?.url && (
                      <img
                        src={game.cover.url.replace('t_thumb', 't_cover_small')}
                        alt={game.name}
                        className="w-8 h-10 object-cover rounded mr-3 flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-white font-medium truncate group-hover:text-purple-300">
                        {game.name}
                      </div>
                      {game.first_release_date && (
                        <div className="text-xs text-gray-400">
                          {new Date(game.first_release_date * 1000).getFullYear()}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {showSuggestions && suggestions.length === 0 && searchTerm.length >= 2 && (
            <div className="p-4 text-center text-gray-400">
              <p>No games found for "{searchTerm}"</p>
              <button
                onClick={() => performSearch(searchTerm)}
                className="mt-2 text-purple-400 hover:text-purple-300 text-sm"
              >
                Search anyway
              </button>
            </div>
          )}

          {/* Search Prompt */}
          {!showSuggestions && recentSearches.length === 0 && (
            <div className="p-4 text-center text-gray-400">
              <p className="text-sm">Start typing to search for games...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
