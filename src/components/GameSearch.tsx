import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Loader2, AlertCircle, Calendar, Star, Gamepad2, Grid, List, Activity, Bug, ArrowRight } from 'lucide-react';
import { igdbService, Game } from '../services/igdbApi';
import { Link } from 'react-router-dom';
import type { SearchSuggestion } from '../types/search';

interface GameSearchProps {
  onGameSelect?: (game: Game) => void;
  placeholder?: string;
  showViewToggle?: boolean;
  initialViewMode?: 'grid' | 'list';
  maxResults?: number;
  className?: string;
  showHealthCheck?: boolean;
  showExploreButton?: boolean;
}

interface SearchState {
  query: string;
  results: Game[];
  loading: boolean;
  error: string | null;
  hasSearched: boolean;
}

export const GameSearch: React.FC<GameSearchProps> = ({
  onGameSelect,
  placeholder = "Search for games...",
  showViewToggle = true,
  initialViewMode = 'grid',
  maxResults = 20,
  className = '',
  showHealthCheck = false,
  showExploreButton = true
}) => {
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    results: [],
    loading: false,
    error: null,
    hasSearched: false
  });
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialViewMode);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const DEBUG_MODE = import.meta.env.DEV || false;
  
  // Generate search suggestions based on query
  const generateSuggestions = useCallback((query: string): SearchSuggestion[] => {
    if (!query.trim()) return [];
    
    // Generate game suggestions
    const gameSuggestions: SearchSuggestion[] = searchState.results.slice(0, 5).map(game => ({
      id: game.id?.toString() || '',
      type: 'game',
      title: game.name,
      subtitle: game.genres?.map(g => g.name).join(', ') || '',
      imageUrl: game.cover?.url ? `https:${game.cover.url}` : undefined
    }));

    // Generate genre suggestions
    const genreSuggestions: SearchSuggestion[] = [
      'Action', 'Adventure', 'RPG', 'Strategy', 'Simulation', 'Sports'
    ]
      .filter(genre => genre.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 3)
      .map(genre => ({
        id: genre.toLowerCase(),
        type: 'genre',
        title: genre,
        subtitle: `Browse ${genre} games`
      }));

    return [...gameSuggestions, ...genreSuggestions];
  }, [searchState.results]);

  // Debounced search function
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchState(prev => ({
        ...prev,
        results: [],
        loading: false,
        error: null,
        hasSearched: false
      }));
      return;
    }

    setSearchState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`🔍 Searching for: "${query}"`);
      const results = await igdbService.searchGames(query, { limit: maxResults });
      
      setSearchState(prev => ({
        ...prev,
        results: results || [],
        loading: false,
        hasSearched: true,
        error: null
      }));

      // Generate suggestions
      const newSuggestions = generateSuggestions(query);
      setSuggestions(newSuggestions);
      
      console.log(`✅ Found ${results?.length || 0} games`);
    } catch (error: any) {
      console.error('❌ Search error:', error);
      setSearchState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Search failed. Please try again.',
        results: [],
        hasSearched: true
      }));
    }
  }, [maxResults, generateSuggestions]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    setSearchState(prev => ({ ...prev, query: value }));

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer
    const newTimer = setTimeout(() => {
      performSearch(value);
    }, 300);
    
    setDebounceTimer(newTimer);
    setShowSuggestions(value.length > 0);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (suggestion.type === 'game') {
      const game = searchState.results.find(g => g.id?.toString() === suggestion.id);
      if (game && onGameSelect) {
        onGameSelect(game);
      }
    } else if (suggestion.type === 'genre') {
      setSearchState(prev => ({ ...prev, query: suggestion.title }));
      performSearch(suggestion.title);
    }
    setShowSuggestions(false);
  };

  // Render game card (grid view)
  const renderGameCard = (game: Game) => (
    <div
      key={game.id}
      onClick={() => onGameSelect?.(game)}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-all duration-200 cursor-pointer group"
    >
      {game.cover && (
        <img
          src={`https:${game.cover.url.replace('t_thumb', 't_cover_small')}`}
          alt={game.name}
          className="w-full aspect-[3/4] object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform"
          loading="lazy"
        />
      )}
      <h3 className="text-white font-medium text-sm mb-1 group-hover:text-purple-400 transition-colors line-clamp-2">
        {game.name}
      </h3>
      
      <div className="flex items-center gap-2 text-xs text-gray-400">
        {game.first_release_date && (
          <span>{new Date(game.first_release_date * 1000).getFullYear()}</span>
        )}
        {game.rating && (
          <>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 text-yellow-400 fill-current" />
              <span>{Math.round(game.rating)}</span>
            </div>
          </>
        )}
      </div>
      
      {game.genres && game.genres.length > 0 && (
        <div className="mt-2">
          <span className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
            {game.genres[0].name}
          </span>
        </div>
      )}
    </div>
  );

  // Render game list item (list view)
  const renderGameListItem = (game: Game) => (
    <div
      key={game.id}
      onClick={() => onGameSelect?.(game)}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer flex gap-4"
    >
      {game.cover && (
        <img
          src={`https:${game.cover.url.replace('t_thumb', 't_cover_small')}`}
          alt={game.name}
          className="w-16 h-20 object-cover rounded flex-shrink-0"
          loading="lazy"
        />
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-medium mb-1 hover:text-purple-400 transition-colors">
          {game.name}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
          {game.first_release_date && (
            <span>{new Date(game.first_release_date * 1000).getFullYear()}</span>
          )}
          {game.rating && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>{Math.round(game.rating)}/100</span>
            </div>
          )}
        </div>
        
        {game.genres && (
          <div className="flex flex-wrap gap-1">
            {game.genres.slice(0, 3).map(genre => (
              <span
                key={genre.id}
                className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}
        
        {game.summary && (
          <p className="text-gray-400 text-sm mt-2 line-clamp-2">
            {game.summary}
          </p>
        )}
      </div>
      
      <ArrowRight className="h-5 w-5 text-gray-500 flex-shrink-0 self-center" />
    </div>
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchState.query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full pl-12 pr-4 py-4 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
            onFocus={() => setShowSuggestions(searchState.query.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          
          {searchState.loading && (
            <Loader2 className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-400 animate-spin" />
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.id}`}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors text-left"
              >
                {suggestion.imageUrl ? (
                  <img
                    src={suggestion.imageUrl}
                    alt={suggestion.title}
                    className="w-8 h-10 object-cover rounded flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-10 bg-gray-700 rounded flex-shrink-0 flex items-center justify-center">
                    {suggestion.type === 'game' ? (
                      <Gamepad2 className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Search className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium">{suggestion.title}</div>
                  {suggestion.subtitle && (
                    <div className="text-gray-400 text-xs">{suggestion.subtitle}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Health Check (Development only) */}
      {showHealthCheck && DEBUG_MODE && (
        <div className="mb-6 p-4 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg">
          <div className="flex items-center gap-3">
            <Bug className="h-5 w-5 text-yellow-400" />
            <div>
              <h3 className="text-yellow-400 font-medium">Debug Mode</h3>
              <p className="text-yellow-300 text-sm">
                Search health check enabled. Check console for detailed logs.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* View Toggle and Results Count */}
      {showViewToggle && searchState.results.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <div className="text-gray-400 text-sm">
            {searchState.results.length} game{searchState.results.length !== 1 ? 's' : ''} found
            {searchState.query && ` for "${searchState.query}"`}
          </div>
          
          <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'list'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {searchState.error && (
        <div className="mb-6 p-4 bg-red-900 bg-opacity-50 border border-red-700 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="text-red-400 font-medium mb-1">Search Error</h3>
              <p className="text-red-300 text-sm">{searchState.error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {searchState.loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-purple-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Searching for games...</p>
          </div>
        </div>
      )}

      {/* No Results */}
      {!searchState.loading && searchState.hasSearched && searchState.results.length === 0 && !searchState.error && (
        <div className="text-center py-12">
          <Gamepad2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No games found</h3>
          <p className="text-gray-400">
            {searchState.query 
              ? `No results found for "${searchState.query}". Try a different search term.`
              : 'Start typing to search for games.'
            }
          </p>
        </div>
      )}

      {/* Results */}
      {!searchState.loading && searchState.results.length > 0 && (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
            : 'space-y-4'
        }>
          {searchState.results.map(game => 
            viewMode === 'grid' ? renderGameCard(game) : renderGameListItem(game)
          )}
        </div>
      )}

      {/* Initial State */}
      {!searchState.loading && !searchState.hasSearched && !searchState.error && (
        <div className="text-center py-12">
          <Gamepad2 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Search for Games</h3>
          <p className="text-gray-400">
            Enter a game title, genre, or keyword to discover your next gaming adventure.
          </p>
          {showExploreButton && (
            <Link
              to="/search-results"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Gamepad2 className="h-4 w-4" />
              Explore All Games
            </Link>
          )}
        </div>
      )}
    </div>
  );
};
