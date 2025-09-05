import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Grid3X3, List, Zap, Star, TrendingUp, Trophy, Clock } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { igdbService } from '../services/igdbService';
import type { GameWithCalculatedFields } from '../types/database';
import { Helmet } from 'react-helmet-async';

interface SearchFilters {
  searchTerm: string;
  sortBy: 'name' | 'rating' | 'popularity' | 'release_date';
  sortOrder: 'asc' | 'desc';
  showFilters: boolean;
  viewMode: 'grid' | 'list';
}

interface EnhancedSearchResult extends GameWithCalculatedFields {
  _relevanceScore?: number;
  _priorityScore?: number;
  _enhancementDetails?: {
    gameTypeBoost?: number;
    platformBoost?: number;
    ratingBoost?: number;
    popularityBoost?: number;
    significanceBoost?: number;
    olympicPartyPenalty?: number;
    source?: string;
  };
}

export const EnhancedSearchTestPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Search state
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: searchParams.get('q') || '',
    sortBy: 'popularity',
    sortOrder: 'desc',
    showFilters: false,
    viewMode: 'grid'
  });
  
  const [searchResults, setSearchResults] = useState<EnhancedSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchStarted, setSearchStarted] = useState(false);

  // Enhanced search using the improved igdbService directly
  const performEnhancedSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchStarted(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchStarted(true);
    
    try {
      console.log('🔍 Enhanced Search Test: Starting search for:', searchTerm);
      
      // Use the enhanced search service directly with detailed logging
      const results = await igdbService.searchWithSequels(searchTerm.trim(), 20);
      
      console.log('📊 Enhanced Search Results:', {
        query: searchTerm,
        totalResults: results.length,
        results: results.map(r => ({ 
          name: r.name, 
          category: r.category,
          priority: r._priorityScore,
          relevance: r._relevanceScore 
        }))
      });
      
      // Transform results and add enhancement details for debugging
      const enhancedResults: EnhancedSearchResult[] = results.map(game => {
        const transformedGame = igdbService.transformGame(game);
        
        return {
          ...transformedGame,
          _relevanceScore: game._relevanceScore,
          _priorityScore: game._priorityScore,
          _enhancementDetails: {
            gameTypeBoost: game._gameTypeBoost,
            platformBoost: game._platformBoost,
            ratingBoost: game._ratingBoost,
            popularityBoost: game._popularityBoost,
            significanceBoost: game._significanceBoost,
            olympicPartyPenalty: game._olympicPartyPenalty,
            source: game.fromSequels ? 'sequel_search' : 'primary_search'
          }
        };
      });
      
      setSearchResults(enhancedResults);
      
    } catch (error) {
      console.error('❌ Enhanced Search Test failed:', error);
      setError(error instanceof Error ? error.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (filters.searchTerm.trim()) {
      // Update URL params
      const newParams = new URLSearchParams();
      newParams.set('q', filters.searchTerm.trim());
      setSearchParams(newParams);
      
      // Perform search
      performEnhancedSearch(filters.searchTerm);
    }
  };

  // Initial search from URL params
  useEffect(() => {
    const query = searchParams.get('q');
    if (query && query !== filters.searchTerm) {
      setFilters(prev => ({ ...prev, searchTerm: query }));
      performEnhancedSearch(query);
    }
  }, [searchParams, performEnhancedSearch]);

  // Sort results based on selected criteria
  const sortedResults = React.useMemo(() => {
    if (!searchResults.length) return [];
    
    return [...searchResults].sort((a, b) => {
      let aVal, bVal;
      
      switch (filters.sortBy) {
        case 'name':
          aVal = a.name || '';
          bVal = b.name || '';
          break;
        case 'rating':
          aVal = a.rating || 0;
          bVal = b.rating || 0;
          break;
        case 'release_date':
          aVal = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          bVal = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          break;
        case 'popularity':
        default:
          // Use priority score as popularity indicator
          aVal = a._priorityScore || 0;
          bVal = b._priorityScore || 0;
          break;
      }
      
      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  }, [searchResults, filters.sortBy, filters.sortOrder]);

  // Game card component
  const GameCard: React.FC<{ game: EnhancedSearchResult; viewMode: 'grid' | 'list' }> = ({ game, viewMode }) => {
    const handleGameClick = () => {
      navigate(`/game/${game.igdbId || game.id}`);
    };

    const hasEnhancements = game._enhancementDetails && Object.values(game._enhancementDetails).some(v => v !== undefined && v !== 0);
    
    if (viewMode === 'list') {
      return (
        <div 
          onClick={handleGameClick}
          className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700"
        >
          <div className="flex items-center gap-4">
            <img 
              src={game.coverUrl || '/placeholder-game.jpg'} 
              alt={game.name}
              className="w-12 h-16 object-cover rounded"
            />
            <div className="flex-grow min-w-0">
              <h3 className="text-white font-medium truncate">{game.name}</h3>
              <p className="text-gray-400 text-sm truncate">{game.summary}</p>
              <div className="flex items-center gap-4 mt-1">
                {game.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400" />
                    <span className="text-gray-400 text-xs">{game.rating}</span>
                  </div>
                )}
                {game.releaseDate && (
                  <span className="text-gray-500 text-xs">
                    {new Date(game.releaseDate).getFullYear()}
                  </span>
                )}
                {hasEnhancements && (
                  <span className="text-green-400 text-xs flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Enhanced
                  </span>
                )}
              </div>
              
              {/* Show enhancement details for debugging */}
              {game._enhancementDetails && hasEnhancements && (
                <div className="mt-2 text-xs text-gray-500">
                  <span className="bg-gray-700 px-2 py-1 rounded">
                    Priority: {game._priorityScore?.toFixed(0) || 0} | 
                    Relevance: {(game._relevanceScore || 0).toFixed(2)} | 
                    Source: {game._enhancementDetails.source || 'unknown'}
                  </span>
                  {game._enhancementDetails.gameTypeBoost && (
                    <span className="ml-1 bg-blue-700 px-2 py-1 rounded">
                      Type: +{game._enhancementDetails.gameTypeBoost}
                    </span>
                  )}
                  {game._enhancementDetails.olympicPartyPenalty && (
                    <span className="ml-1 bg-red-700 px-2 py-1 rounded">
                      Olympic: {game._enhancementDetails.olympicPartyPenalty}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div 
        onClick={handleGameClick}
        className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-colors cursor-pointer border border-gray-700"
      >
        <div className="aspect-[3/4] relative">
          <img 
            src={game.coverUrl || '/placeholder-game.jpg'} 
            alt={game.name}
            className="w-full h-full object-cover"
          />
          {hasEnhancements && (
            <div className="absolute top-2 right-2">
              <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Enhanced
              </div>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-white font-medium mb-1 line-clamp-2">{game.name}</h3>
          <div className="flex items-center gap-4 text-sm">
            {game.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-400" />
                <span className="text-gray-400">{game.rating}</span>
              </div>
            )}
            {game.releaseDate && (
              <span className="text-gray-500">
                {new Date(game.releaseDate).getFullYear()}
              </span>
            )}
          </div>
          
          {/* Enhancement debugging info */}
          {game._enhancementDetails && hasEnhancements && (
            <div className="mt-2 space-y-1">
              <div className="text-xs text-gray-500 bg-gray-700 px-2 py-1 rounded">
                Priority: {game._priorityScore?.toFixed(0) || 0} | Rel: {(game._relevanceScore || 0).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">
                {game._enhancementDetails.source && (
                  <span className="bg-gray-600 px-1 py-0.5 rounded mr-1">
                    {game._enhancementDetails.source.replace('_', ' ')}
                  </span>
                )}
                {game._enhancementDetails.gameTypeBoost && (
                  <span className="bg-blue-600 px-1 py-0.5 rounded mr-1">
                    +{game._enhancementDetails.gameTypeBoost}
                  </span>
                )}
                {game._enhancementDetails.olympicPartyPenalty && (
                  <span className="bg-red-600 px-1 py-0.5 rounded mr-1">
                    {game._enhancementDetails.olympicPartyPenalty}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Helmet>
        <title>Enhanced Search Test - VGReview3</title>
        <meta name="description" content="Test page for enhanced search functionality with improved filtering and sorting" />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-8 w-8 text-green-400" />
            <h1 className="text-3xl font-bold text-white">Enhanced Search Test</h1>
          </div>
          <p className="text-gray-400">
            Testing improved search features with flagship fallback, content protection, and enhanced scoring
          </p>
          <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <p className="text-blue-300 text-sm">
              <strong>Note:</strong> This page uses the enhanced igdbService.searchWithSequels() directly to test 
              improved search features including flagship game detection, quality scoring, and content filtering.
            </p>
          </div>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-4 mb-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                placeholder="Search for games (try 'mario', 'pokemon', 'zelda')..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !filters.searchTerm.trim()}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Filters and Controls */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 bg-gray-800 rounded-lg">
          <button
            onClick={() => setFilters(prev => ({ ...prev, showFilters: !prev.showFilters }))}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Filter className="h-4 w-4" />
            {filters.showFilters ? 'Hide' : 'Show'} Advanced
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Sort:</span>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm"
            >
              <option value="popularity">Popularity</option>
              <option value="rating">Rating</option>
              <option value="name">Name</option>
              <option value="release_date">Release Date</option>
            </select>
            <button
              onClick={() => setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'desc' ? 'asc' : 'desc' }))}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors text-sm"
            >
              {filters.sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-gray-400 text-sm">View:</span>
            <button
              onClick={() => setFilters(prev => ({ ...prev, viewMode: 'grid' }))}
              className={`p-2 rounded transition-colors ${filters.viewMode === 'grid' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, viewMode: 'list' }))}
              className={`p-2 rounded transition-colors ${filters.viewMode === 'list' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          
          <div className="text-gray-400 text-sm flex items-center">
            {searchResults.length} results
          </div>
        </div>

        {/* Advanced Filters */}
        {filters.showFilters && (
          <div className="mb-8 p-6 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-400" />
              Enhanced Search Features Active
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div className="text-gray-300">
                <span className="text-green-400">✓</span> Flagship Game Detection
              </div>
              <div className="text-gray-300">
                <span className="text-green-400">✓</span> Content Protection Filtering
              </div>
              <div className="text-gray-300">
                <span className="text-green-400">✓</span> Season & Pack Filtering
              </div>
              <div className="text-gray-300">
                <span className="text-green-400">✓</span> Enhanced Publisher Authorization
              </div>
              <div className="text-gray-300">
                <span className="text-green-400">✓</span> Platform Priority Scoring
              </div>
              <div className="text-gray-300">
                <span className="text-green-400">✓</span> Quality-based Relevance
              </div>
            </div>
          </div>
        )}

        {/* Search Status */}
        {searchStarted && !isLoading && !error && (
          <div className="mb-6">
            {searchResults.length > 0 ? (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <Trophy className="h-4 w-4" />
                Found {searchResults.length} enhanced results for "{filters.searchTerm}"
                {sortedResults.some(r => r._enhancementDetails?.source === 'sequel_search') && (
                  <span className="bg-blue-700 px-2 py-1 rounded text-xs ml-2">
                    Includes sequel detection
                  </span>
                )}
              </div>
            ) : (
              <div className="text-yellow-400 text-sm">
                No results found for "{filters.searchTerm}"
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <p className="text-red-400">Search Error: {error}</p>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center gap-3 text-white">
              <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              Performing enhanced search...
            </div>
          </div>
        ) : searchStarted && sortedResults.length > 0 ? (
          <div className={
            filters.viewMode === 'grid' 
              ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              : "space-y-4"
          }>
            {sortedResults.map((game, index) => (
              <GameCard key={`${game.id}-${index}`} game={game} viewMode={filters.viewMode} />
            ))}
          </div>
        ) : searchStarted && !isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-medium mb-2">No enhanced results found</h3>
              <p>Try searching for popular franchises like "mario", "pokemon", or "zelda"</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Zap className="h-16 w-16 mx-auto mb-4 text-green-400" />
              <h3 className="text-xl font-medium mb-2">Enhanced Search Ready</h3>
              <p>Enter a search term above to test the improved search functionality</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Try these test searches:</p>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {['mario', 'pokemon', 'zelda', 'forza', 'mario party'].map(term => (
                    <button
                      key={term}
                      onClick={() => {
                        setFilters(prev => ({ ...prev, searchTerm: term }));
                        const newParams = new URLSearchParams();
                        newParams.set('q', term);
                        setSearchParams(newParams);
                        performEnhancedSearch(term);
                      }}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-1 rounded text-xs transition-colors"
                    >
                      "{term}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedSearchTestPage;