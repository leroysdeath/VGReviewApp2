import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AdvancedGameFilters, GameFilterOptions } from '../components/AdvancedGameFilters';
import { SearchBar } from '../components/SearchBar';
import { GameCardGrid } from '../components/GameCardGrid';
import { GameCardInteractive, GameData } from '../components/GameCardInteractive';
import { useGameSearch } from '../hooks/useGameSearch';
import { Loader2, Search, Filter, SlidersHorizontal, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdvancedSearchPage: React.FC = () => {
  const [activeFilters, setActiveFilters] = useState<GameFilterOptions>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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
    autoSearch: false
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
      search(filters.searchQuery);
    }
    
    // Here you would typically filter the results based on the filters
    console.log('Filters applied:', filters);
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <Helmet>
        <title>Advanced Search | GameVault</title>
        <meta name="description" content="Advanced search with comprehensive filtering options" />
      </Helmet>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            to="/search"
            className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Link>
          
          <h1 className="text-3xl font-bold text-white mb-2">Advanced Search</h1>
          <p className="text-gray-400 mb-6">
            Fine-tune your search with our comprehensive filtering options
          </p>
          
          <div className="grid md:grid-cols-[1fr,auto] gap-6">
            <SearchBar 
              onSearch={search}
              autoFocus={true}
              showSuggestions={false}
            />
            
            <button
              onClick={() => search(query)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Search className="h-5 w-5" />
              <span>Search</span>
            </button>
          </div>
        </div>
        
        <div className="grid lg:grid-cols-[300px,1fr] gap-8">
          {/* Sidebar with filters */}
          <div>
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <SlidersHorizontal className="h-5 w-5 text-purple-400" />
                  <span>Filters</span>
                </h2>
                
                <button
                  onClick={() => setActiveFilters({})}
                  className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Reset All
                </button>
              </div>
              
              <AdvancedGameFilters
                initialFilters={activeFilters}
                onFilterChange={handleFilterChange}
                loading={loading}
                totalResults={results.length}
              />
            </div>
          </div>
          
          {/* Main content area */}
          <div>
            {/* Loading state */}
            {loading && (
              <div className="flex items-center justify-center py-12 bg-gray-800 rounded-lg">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-purple-400 animate-spin mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-white mb-2">Searching for games...</h2>
                  <p className="text-gray-400">This may take a moment</p>
                </div>
              </div>
            )}
            
            {/* Error state */}
            {error && !loading && (
              <div className="bg-red-900/20 border border-red-800 text-red-300 p-6 rounded-lg">
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
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white">
                    {results.length} Game{results.length !== 1 ? 's' : ''} Found
                    {query && ` for "${query}"`}
                  </h2>
                </div>
                
                <GameCardGrid games={gameResults} />
              </div>
            )}
            
            {/* Initial state */}
            {!loading && !hasSearched && !error && (
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <Filter className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-white mb-2">Advanced Search</h2>
                <p className="text-gray-400">
                  Use the filters on the left to refine your search
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};