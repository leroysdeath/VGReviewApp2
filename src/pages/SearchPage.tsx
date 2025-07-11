import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useGameSearch } from '../hooks/useGameSearch';
import { AdvancedGameFilters, GameFilterOptions } from '../components/AdvancedGameFilters';
import { GameCardGrid } from '../components/GameCardGrid';
import { GameCardInteractive, GameData } from '../components/GameCardInteractive';
import { Loader2, Search, Filter, ChevronDown } from 'lucide-react';
import { useResponsive } from '../hooks/useResponsive';

export const SearchPage: React.FC = () => {
  const { isMobile } = useResponsive();
  const [showFilters, setShowFilters] = useState(!isMobile);
  const [activeFilters, setActiveFilters] = useState<GameFilterOptions>({});
  
  const {
    query,
    results,
    loading,
    error,
    hasSearched,
    setQuery,
    search
  } = useGameSearch({
    debounceMs: 500,
    maxResults: 50,
    autoSearch: true
  });

  // Convert API results to GameData format
  const gameResults: GameData[] = results.map(game => ({
    id: game.id,
    title: game.title,
    coverImage: game.coverImage,
    genre: game.genre || 'Unknown',
    description: game.description || 'No description available',
    rating: game.rating,
    reviewCount: Math.floor(Math.random() * 2000) + 100, // Mock data
    theme: ['purple', 'green', 'orange', 'blue'][Math.floor(Math.random() * 4)] as any // Random theme
  }));

  // Handle filter changes
  const handleFilterChange = (filters: GameFilterOptions) => {
    setActiveFilters(filters);
    
    // Apply search query from filters if different from current query
    if (filters.searchQuery && filters.searchQuery !== query) {
      setQuery(filters.searchQuery);
    }
    
    // Here you would typically filter the results based on the filters
    // For now, we'll just log the filters
    console.log('Filters applied:', filters);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>Search Games | GameVault</title>
        <meta name="description" content="Search and discover games with advanced filtering options" />
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">Game Search</h1>
          
          {/* Mobile search bar */}
          {isMobile && (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for games..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
                />
              </div>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white"
              >
                <Filter className="h-5 w-5" />
                <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
          
          {/* Desktop header with filter toggle */}
          {!isMobile && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-400">
                Find your next gaming adventure with our advanced search tools
              </p>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Filter className="h-4 w-4" />
                <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}
          
          {/* Advanced filters */}
          {showFilters && (
            <div className="mb-8">
              <AdvancedGameFilters
                initialFilters={activeFilters}
                onFilterChange={handleFilterChange}
                loading={loading}
                totalResults={results.length}
              />
            </div>
          )}
        </div>
        
        {/* Search results */}
        <div>
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Searching for games...</h2>
                <p className="text-gray-400">This may take a moment</p>
              </div>
            </div>
          )}
          
          {/* Error state */}
          {error && !loading && (
            <div className="bg-red-900/20 border border-red-800 text-red-300 p-4 rounded-lg mb-8">
              <h2 className="text-lg font-semibold mb-2">Error</h2>
              <p>{error}</p>
              <button
                onClick={() => search(query)}
                className="mt-4 px-4 py-2 bg-red-800 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
          
          {/* No results */}
          {!loading && hasSearched && results.length === 0 && !error && (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">No games found</h2>
              <p className="text-gray-400 mb-4">
                {query 
                  ? `We couldn't find any games matching "${query}"`
                  : 'Try searching for a game title, genre, or keyword'
                }
              </p>
              {query && (
                <p className="text-gray-400">
                  Try adjusting your search terms or filters
                </p>
              )}
            </div>
          )}
          
          {/* Results */}
          {!loading && results.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-white mb-6">
                {results.length} Game{results.length !== 1 ? 's' : ''} Found
                {query && ` for "${query}"`}
              </h2>
              
              <GameCardGrid games={gameResults} />
            </div>
          )}
          
          {/* Initial state */}
          {!loading && !hasSearched && !error && (
            <div className="text-center py-12 bg-gray-800 rounded-lg">
              <Search className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">Search for Games</h2>
              <p className="text-gray-400">
                Use the search bar and filters to find your next favorite game
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};