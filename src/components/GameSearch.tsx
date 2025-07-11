import React, { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, AlertCircle, Calendar, Star, Gamepad2, Grid, List, Activity, Bug } from 'lucide-react';
import { igdbService, Game } from '../services/igdbService';

interface GameSearchProps {
  onGameSelect?: (game: Game) => void;
  placeholder?: string;
  showViewToggle?: boolean;
  initialViewMode?: 'grid' | 'list';
  maxResults?: number;
  className?: string;
  showHealthCheck?: boolean;
  debounceMs?: number;
  autoSearch?: boolean;
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
  debounceMs = 300,
  autoSearch = true
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

  const DEBUG_MODE = import.meta.env.DEV;
  
  // Debounced search function
  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchState(prev => ({
        ...prev,
        results: [],
        loading: false,
        error: null,
        hasSearched: false
      }));
      return;
    }

    setSearchState(prev => ({
      ...prev,
      loading: true,
      error: null,
      hasSearched: true
    }));

    try {
      console.log('🔍 Performing search for:', searchTerm);
      if (DEBUG_MODE) {
        console.log('🐛 [DEBUG] Search context:', { searchTerm, maxResults, timestamp: new Date().toISOString() });
        console.log('🐛 [DEBUG] Current URL:', window.location.href);
      }
      const games = await igdbService.searchGames(searchTerm, maxResults);
      
      setSearchState(prev => ({
        ...prev,
        results: games,
        loading: false,
        error: null
      }));
      
      console.log('✅ Search completed, found', games.length, 'games');
      if (DEBUG_MODE) {
        console.log('🐛 [DEBUG] Search results:', games);
      }
    } catch (error) {
      console.error('❌ Search failed:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to search games. Please try again.';
      
      if (DEBUG_MODE) {
        console.log('🐛 [DEBUG] Search error details:', { error, searchTerm, stack: error instanceof Error ? error.stack : 'No stack' });
      }
      
      setSearchState(prev => ({
        ...prev,
        results: [],
        loading: false,
        error: errorMessage
      }));
    }
  }, [maxResults, DEBUG_MODE]);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    
    setSearchState(prev => ({
      ...prev,
      query: newQuery
    }));

    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    if (DEBUG_MODE) {
      console.log('🐛 [DEBUG] Input changed:', { newQuery, willSearch: newQuery.trim().length > 0 && autoSearch });
    }

    // Set new timer for debounced search
    if (autoSearch) {
      const timer = setTimeout(() => {
        performSearch(newQuery);
      }, debounceMs);

      setDebounceTimer(timer);
    }
  };

  // Manual search function
  const handleSearch = () => {
    performSearch(searchState.query);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  // Handle game selection
  const handleGameClick = (game: Game) => {
    if (onGameSelect) {
      if (DEBUG_MODE) {
        console.log('🐛 [DEBUG] Game selected:', game);
      }
      onGameSelect(game);
    }
  };

  // Format rating for display
  const formatRating = (rating: number): string => {
    return rating > 0 ? rating.toFixed(1) : 'N/A';
  };

  // Format release date for display
  const formatReleaseDate = (dateString: string): string => {
    if (!dateString) return 'TBA';
    
    try {
      const date = new Date(dateString);
      return date.getFullYear().toString();
    } catch {
      return 'TBA';
    }
  };

  // Debug function to test the API directly
  const testAPIDirectly = async () => {
    console.log('🧪 Testing API directly...');
    try {
      const response = await fetch('/.netlify/functions/igdb-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: 'test', limit: 1 })
      });
      
      console.log('🧪 Direct API test response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      const data = await response.text();
      console.log('🧪 Direct API test data:', data);
    } catch (error) {
      console.error('🧪 Direct API test failed:', error);
    }
  };

  // Render game card in grid mode
  const renderGameCard = (game: Game) => (
    <div
      key={game.id}
      onClick={() => handleGameClick(game)}
      className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl"
    >
      <div className="aspect-[3/4] overflow-hidden relative">
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <Gamepad2 className="h-12 w-12 text-gray-500" />
          </div>
        )}
        
        {/* Rating overlay */}
        {game.rating > 0 && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-lg text-sm font-bold flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            {formatRating(game.rating)}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-purple-400 transition-colors">
          {game.title}
        </h3>
        
        <div className="space-y-2">
          {game.genre && (
            <p className="text-gray-400 text-sm">{game.genre}</p>
          )}
          
          <div className="flex items-center justify-between text-sm">
            {game.releaseDate && (
              <div className="flex items-center gap-1 text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>{formatReleaseDate(game.releaseDate)}</span>
              </div>
            )}
            
            {game.platforms && game.platforms.length > 0 && (
              <span className="text-gray-500 text-xs">
                {game.platforms.length} platform{game.platforms.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Render game item in list mode
  const renderGameListItem = (game: Game) => (
    <div
      key={game.id}
      onClick={() => handleGameClick(game)}
      className="group flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
    >
      <div className="flex-shrink-0">
        {game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-16 h-20 object-cover rounded"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-20 bg-gray-700 rounded flex items-center justify-center">
            <Gamepad2 className="h-6 w-6 text-gray-500" />
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-lg mb-1 group-hover:text-purple-400 transition-colors">
          {game.title}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-gray-400 mb-2">
          {game.genre && <span>{game.genre}</span>}
          {game.releaseDate && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formatReleaseDate(game.releaseDate)}</span>
            </div>
          )}
          {game.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{formatRating(game.rating)}</span>
            </div>
          )}
        </div>
        
        {game.platforms && game.platforms.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {game.platforms.slice(0, 3).map((platform, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
              >
                {platform}
              </span>
            ))}
            {game.platforms.length > 3 && (
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                +{game.platforms.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Debug Panel for Development */}
      {DEBUG_MODE && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-purple-400" />
              <span className="text-gray-300 text-sm">Debug Panel</span>
            </div>
            <button onClick={testAPIDirectly} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm">
              Test API Directly
            </button>
          </div>
        </div>
      )}
      
      {/* Health Check Button */}
      {showHealthCheck && import.meta.env.DEV && (
        <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-400" />
              <span className="text-gray-300 text-sm">Function Health Check</span>
            </div>
            <button
              onClick={async () => {
                try {
                  console.log('🏥 Starting health check...');
                  console.log('🏥 Function URL:', '/.netlify/functions/igdb-search');
                  console.log('🏥 Current location:', window.location.href);
                  const response = await fetch('/.netlify/functions/igdb-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ searchTerm: 'test', limit: 1 })
                  });
                  const data = await response.json();
                  console.log('Health check result:', { status: response.status, data });
                  console.log('🏥 Response headers:', Object.fromEntries(response.headers.entries()));
                  console.log('🏥 Response URL:', response.url);
                  console.log('🏥 Response type:', response.type);
                  console.log('🏥 Response redirected:', response.redirected);
                  console.log('🏥 Response ok:', response.ok);
                  console.log('🏥 Full response object:', response);
                  alert(`Function ${response.ok ? 'working' : 'has issues'}: ${response.status}`);
                } catch (error) {
                  console.error('Health check failed:', error);
                  alert(`Function error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors text-sm"
            >
              Test Function
            </button>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchState.query}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full pl-10 pr-12 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50 transition-all"
            aria-label="Search games"
          />
          {DEBUG_MODE && (
            <div className="absolute right-12 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">DEBUG</div>
          )}
          {searchState.loading && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <Loader2 className="h-5 w-5 text-purple-400 animate-spin" />
            </div>
          )}
        </div>
        
        {!autoSearch && (
          <button
            onClick={handleSearch}
            className="mt-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Search
          </button>
        )}
      </div>

      {/* View Toggle */}
      {showViewToggle && searchState.results.length > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-gray-400 text-sm">
            Found {searchState.results.length} game{searchState.results.length !== 1 ? 's' : ''}
            {searchState.query && ` for "${searchState.query}"`}
          </p>
          
          <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Grid view"
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
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
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
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
          <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Search for Games</h3>
          <p className="text-gray-400">
            Enter a game title, genre, or keyword to find games from the IGDB database.
          </p>
        </div>
      )}
    </div>
  );
};