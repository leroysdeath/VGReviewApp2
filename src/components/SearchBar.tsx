import React, { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Game } from '../services/igdbService';
import { SearchSuggestions } from './SearchSuggestions';
import { useGameSearch } from '../hooks/useGameSearch';

interface SearchBarProps {
  placeholder?: string;
  onSearch?: (query: string) => void;
  onGameSelect?: (game: Game) => void;
  className?: string;
  maxSuggestions?: number;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search for games...',
  onSearch,
  onGameSelect,
  className = '',
  maxSuggestions = 5,
  showSuggestions = true,
  autoFocus = false
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const {
    query,
    results,
    loading,
    setQuery,
    hasResults
  } = useGameSearch({
    debounceMs: 300,
    maxResults: maxSuggestions,
    autoSearch: true
  });

  // Focus input on mount if autoFocus is true
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Show suggestions when we have results and input is focused
  useEffect(() => {
    if (hasResults && showSuggestions) {
      setShowSuggestionsDropdown(true);
    } else {
      setShowSuggestionsDropdown(false);
    }
  }, [hasResults, showSuggestions]);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [results]);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (query.trim()) {
      if (onSearch) {
        onSearch(query);
      } else {
        navigate(`/search-results?q=${encodeURIComponent(query.trim())}`);
      }
      
      setShowSuggestionsDropdown(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (game: Game) => {
    if (onGameSelect) {
      onGameSelect(game);
    } else {
      navigate(`/game/${game.id}`);
    }
    
    setShowSuggestionsDropdown(false);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestionsDropdown || results.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < results.length) {
          handleSelectSuggestion(results[highlightedIndex]);
        } else {
          handleSubmit(e);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestionsDropdown(false);
        break;
    }
  };

  // Clear search input
  const clearSearch = () => {
    setQuery('');
    setShowSuggestionsDropdown(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} role="search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => hasResults && setShowSuggestionsDropdown(true)}
            onBlur={() => setTimeout(() => setShowSuggestionsDropdown(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all"
            aria-label="Search games"
            aria-autocomplete="list"
            aria-controls="search-suggestions"
            aria-expanded={showSuggestionsDropdown}
            aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
          />
          
          {loading ? (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
            </div>
          ) : query ? (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </form>
      
      {/* Search suggestions */}
      {showSuggestions && (
        <SearchSuggestions
          suggestions={results}
          loading={loading}
          onSelectSuggestion={handleSelectSuggestion}
          onClose={() => setShowSuggestionsDropdown(false)}
          visible={showSuggestionsDropdown}
          highlightedIndex={highlightedIndex}
          setHighlightedIndex={setHighlightedIndex}
          className="z-50"
        />
      )}
    </div>
  );
};