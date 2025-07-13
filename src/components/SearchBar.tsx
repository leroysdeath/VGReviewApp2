import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { SearchSuggestion } from '../types/search';

interface SearchBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  suggestions: SearchSuggestion[];
  isLoading?: boolean;
  placeholder?: string;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  className?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  suggestions,
  isLoading = false,
  placeholder = 'Search games, genres, platforms...',
  onSuggestionSelect,
  className = ''
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Reset active suggestion when suggestions change
  useEffect(() => {
    setActiveSuggestionIndex(-1);
  }, [suggestions]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Down arrow
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    }
    // Up arrow
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    }
    // Enter key
    else if (e.key === 'Enter') {
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < suggestions.length) {
        e.preventDefault();
        const selectedSuggestion = suggestions[activeSuggestionIndex];
        handleSuggestionClick(selectedSuggestion);
      }
    }
    // Escape key
    else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    onQueryChange(suggestion.title);
    onSuggestionSelect?.(suggestion);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  // Clear search input
  const handleClearSearch = () => {
    onQueryChange('');
    inputRef.current?.focus();
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
          aria-controls={suggestions.length > 0 ? "search-suggestions" : undefined}
          aria-activedescendant={activeSuggestionIndex >= 0 ? `suggestion-${activeSuggestionIndex}` : undefined}
          className={`
            w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-xl
            text-white placeholder-gray-400 focus:outline-none
            transition-all duration-200
          `}
        />
        
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-500 animate-spin" />
        ) : query ? (
          <button
            onClick={handleClearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Suggestions dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id="search-suggestions"
          className="absolute z-50 mt-2 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              id={`suggestion-${index}`}
              role="option"
              aria-selected={index === activeSuggestionIndex}
              className={`
                flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                ${index === activeSuggestionIndex ? 'bg-gray-700' : 'hover:bg-gray-700'}
              `}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span className="text-lg">{getSuggestionIcon(suggestion.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium">{suggestion.title}</div>
                <div className="text-gray-400 text-sm capitalize">{suggestion.type}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};