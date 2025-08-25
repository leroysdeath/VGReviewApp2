import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, Grid, List, Loader, AlertCircle, Star, Calendar, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useGameSearch } from '../hooks/useGameSearch';
import { SmartImage } from '../components/SmartImage';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { shouldShowCategoryLabel, getCategoryLabel, getCategoryStyles } from '../utils/gameCategoryLabels';
import { filterProtectedContent } from '../utils/contentProtectionFilter';

interface Game {
  id: number;
  igdb_id?: number;
  name: string;
  description?: string;
  summary?: string;
  release_date?: string;
  pic_url?: string;
  cover_url?: string;
  developer?: string;
  publisher?: string;
  genre?: string;
  genres?: string[];
  igdb_rating?: number;
  metacritic_score?: number;
  avg_user_rating?: number;
  user_rating_count?: number;
  category?: number;
}

interface Platform {
  id: number;
  name: string;
}

interface SearchFilters {
  searchTerm?: string;
  platformId?: number;
  releaseYear?: number;
  minRating?: number;
  maxRating?: number;
  sortBy: 'name' | 'release_date' | 'avg_rating' | 'rating_count';
  sortOrder: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 20;

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { searchState, searchGames, searchTerm, setSearchTerm } = useGameSearch();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchStarted, setSearchStarted] = useState(false);
  
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    platformId: undefined,
    releaseYear: undefined,
    minRating: undefined,
    maxRating: undefined,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Load platforms for filter dropdown
  useEffect(() => {
    loadPlatforms();
  }, []);

  // Extract parameters from URL and update state
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const platform = searchParams.get('platform');
    const year = searchParams.get('year');
    const minRating = searchParams.get('minRating');
    const maxRating = searchParams.get('maxRating');
    const sort = searchParams.get('sort') || 'name:asc';
    const page = searchParams.get('page');
    const [sortField, sortOrder] = sort.split(':');
    
    setFilters({
      searchTerm: query,
      platformId: platform ? parseInt(platform) : undefined,
      releaseYear: year ? parseInt(year) : undefined,
      minRating: minRating ? parseFloat(minRating) : undefined,
      maxRating: maxRating ? parseFloat(maxRating) : undefined,
      sortBy: sortField as any || 'name',
      sortOrder: sortOrder as any || 'asc'
    });

    setCurrentPage(page ? parseInt(page) : 1);
  }, [searchParams]);

  // Trigger search when filters change
  useEffect(() => {
    if (filters.searchTerm) {
      performSearch();
    }
  }, [filters]);

  const loadPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platform')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      console.error('Error loading platforms:', err);
    }
  };

  const performSearch = async () => {
    if (!filters.searchTerm?.trim()) return;
    
    try {
      setSearchStarted(true);
      console.log('🔍 SearchResultsPage: Performing search for:', filters.searchTerm);
      
      await searchGames(filters.searchTerm, {
        genres: filters.platformId ? [filters.platformId.toString()] : undefined,
        minRating: filters.minRating,
        sortBy: filters.sortBy === 'name' ? 'name' : 
               filters.sortBy === 'release_date' ? 'release_date' : 
               filters.sortBy === 'avg_rating' ? 'rating' : 'popularity',
        sortOrder: filters.sortOrder
      });
      
      console.log('✅ SearchResultsPage: Search completed, results:', searchState.games.length);
    } catch (err) {
      console.error('❌ SearchResultsPage: Search failed:', err);
    }
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setCurrentPage(1); // Reset to first page when filters change
    
    // Update URL params
    const params = new URLSearchParams();
    if (updatedFilters.searchTerm) params.set('q', updatedFilters.searchTerm);
    if (updatedFilters.platformId) params.set('platform', updatedFilters.platformId.toString());
    if (updatedFilters.releaseYear) params.set('year', updatedFilters.releaseYear.toString());
    if (updatedFilters.minRating) params.set('minRating', updatedFilters.minRating.toString());
    if (updatedFilters.maxRating) params.set('maxRating', updatedFilters.maxRating.toString());
    params.set('sort', `${updatedFilters.sortBy}:${updatedFilters.sortOrder}`);
    
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    setSearchParams(params);
    window.scrollTo(0, 0);
  };

  const handleGameClick = (game: Game) => {
    navigate(`/game/${game.igdb_id || game.id}`);
  };

  const getCoverUrl = (game: Game) => {
    return game.cover_url || game.pic_url || '/placeholder-game.jpg';
  };

  // Filter out problematic fan-made content before display
  const filteredGames = useMemo(() => {
    const filtered = filterProtectedContent(searchState.games);
    
    // Log filtering stats in development
    if (import.meta.env.DEV && searchState.games.length !== filtered.length) {
      console.log(`🛡️ Content filter: ${searchState.games.length - filtered.length} items filtered from ${searchState.games.length} results`);
    }
    
    return filtered;
  }, [searchState.games]);

  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);

  // Generate year options for filter
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Browse Games</h1>
          
          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search games..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Filter className="h-5 w-5" />
              Filters
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-3 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <Grid className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-3 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-purple-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <List className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Platform Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Platform</label>
                  <select
                    value={filters.platformId || ''}
                    onChange={(e) => handleFilterChange({ 
                      platformId: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Platforms</option>
                    {platforms.map(platform => (
                      <option key={platform.id} value={platform.id}>
                        {platform.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Release Year Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Release Year</label>
                  <select
                    value={filters.releaseYear || ''}
                    onChange={(e) => handleFilterChange({ 
                      releaseYear: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">All Years</option>
                    {yearOptions.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                {/* Min Rating Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Min Rating</label>
                  <select
                    value={filters.minRating || ''}
                    onChange={(e) => handleFilterChange({ 
                      minRating: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No Minimum</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(rating => (
                      <option key={rating} value={rating}>{rating}+</option>
                    ))}
                  </select>
                </div>

                {/* Max Rating Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Max Rating</label>
                  <select
                    value={filters.maxRating || ''}
                    onChange={(e) => handleFilterChange({ 
                      maxRating: e.target.value ? parseFloat(e.target.value) : undefined 
                    })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">No Maximum</option>
                    {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
                      <option key={rating} value={rating}>Up to {rating}</option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium mb-2">Sort By</label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="name">Name</option>
                    <option value="release_date">Release Date</option>
                    <option value="avg_rating">Average Rating</option>
                    <option value="rating_count">Most Reviewed</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium mb-2">Order</label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange({ sortOrder: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilters({
                      searchTerm: '',
                      platformId: undefined,
                      releaseYear: undefined,
                      minRating: undefined,
                      maxRating: undefined,
                      sortBy: 'name',
                      sortOrder: 'asc'
                    });
                    setSearchParams(new URLSearchParams());
                  }}
                  className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          )}

          {/* Results Info */}
          <div className="flex justify-between items-center text-gray-400">
            <div className="flex items-center gap-4">
              <p>
                Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredGames.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredGames.length)} of {filteredGames.length} games
              </p>
              {searchState.source && (
                <div className="flex items-center gap-2 text-xs">
                  <div className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${searchState.source === 'database' ? 'bg-green-900/30 text-green-400' :
                      searchState.source === 'igdb' ? 'bg-blue-900/30 text-blue-400' :
                      'bg-purple-900/30 text-purple-400'}
                  `}>
                    {searchState.source === 'database' ? 'Database' :
                     searchState.source === 'igdb' ? 'IGDB API' :
                     'Mixed Sources'}
                  </div>
                  {searchState.source === 'igdb' && (
                    <span className="text-gray-500 text-xs">
                      High-quality game data
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={performSearch}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State - only show after user has started searching and if we have no results yet */}
        {searchState.loading && searchStarted && filteredGames.length === 0 && (
          <div className="flex justify-center items-center py-20">
            <Loader className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Error State */}
        {searchState.error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-300">{searchState.error}</p>
            </div>
          </div>
        )}

        {/* Games Results */}
        {!searchState.error && filteredGames.length > 0 && (
          <div className="transition-opacity duration-300 ease-in-out">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredGames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(game => (
                  <div
                    key={game.id}
                    onClick={() => handleGameClick(game)}
                    className="bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:transform hover:scale-105 transition-all duration-200 hover:shadow-xl"
                  >
                    <div className="aspect-[3/4] relative bg-gray-700">
                      <SmartImage
                        src={getCoverUrl(game)}
                        alt={game.name}
                        className="w-full h-full object-cover"
                        optimization={{ width: 400, height: 600, quality: 85 }}
                        fallback="/placeholder-game.jpg"
                      />
                      {shouldShowCategoryLabel(game.category) && (
                        <div className="absolute top-2 left-2">
                          {(() => {
                            const label = getCategoryLabel(game.category);
                            const styles = getCategoryStyles(game.category);
                            return label && styles ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.text} ${styles.bg} border border-current/30`}>
                                {label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      )}
                      {game.avg_user_rating && (
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="text-sm font-bold">{game.avg_user_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{game.name}</h3>
                      {game.release_date && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(game.release_date).getFullYear()}</span>
                        </div>
                      )}
                      {game.user_rating_count > 0 && (
                        <p className="text-sm text-gray-400">
                          {game.user_rating_count} review{game.user_rating_count !== 1 ? 's' : ''}
                        </p>
                      )}
                      {game.genre && (
                        <p className="text-sm mt-2 text-gray-400">{game.genre}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredGames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(game => (
                  <div
                    key={game.id}
                    onClick={() => handleGameClick(game)}
                    className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition-colors flex gap-4"
                  >
                    <SmartImage
                      src={getCoverUrl(game)}
                      alt={game.name}
                      className="w-24 h-32 object-cover rounded-lg"
                      optimization={{ width: 200, height: 300, quality: 85 }}
                      fallback="/placeholder-game.jpg"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-xl">{game.name}</h3>
                            {shouldShowCategoryLabel(game.category) && (
                              (() => {
                                const label = getCategoryLabel(game.category);
                                const styles = getCategoryStyles(game.category);
                                return label && styles ? (
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles.text} ${styles.bg} border border-current/30`}>
                                    {label}
                                  </span>
                                ) : null;
                              })()
                            )}
                          </div>
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                            {game.summary || game.description || 'No description available'}
                          </p>
                          <div className="flex gap-4 text-sm text-gray-400">
                            {game.release_date && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>{new Date(game.release_date).getFullYear()}</span>
                              </div>
                            )}
                            {game.developer && (
                              <span>by {game.developer}</span>
                            )}
                            {game.genre && (
                              <span>{game.genre}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {game.avg_user_rating && (
                            <div className="flex items-center gap-1 mb-1">
                              <Star className="h-5 w-5 text-yellow-400 fill-current" />
                              <span className="text-lg font-bold">{game.avg_user_rating.toFixed(1)}</span>
                            </div>
                          )}
                          {game.user_rating_count > 0 && (
                            <p className="text-sm text-gray-400">
                              {game.user_rating_count} reviews
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                {/* Page Numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!searchState.loading && !searchState.error && filteredGames.length === 0 && searchStarted && (
          <div className="text-center py-20">
            {searchState.games.length > 0 ? (
              <>
                <p className="text-gray-400 text-lg mb-2">Search results were filtered for content protection</p>
                <p className="text-gray-500 text-sm mb-4">
                  {searchState.games.length} result{searchState.games.length !== 1 ? 's were' : ' was'} filtered out to avoid potentially problematic fan-made content
                </p>
              </>
            ) : (
              <p className="text-gray-400 text-lg mb-4">No games found matching your criteria</p>
            )}
            <button
              onClick={() => {
                setFilters({
                  searchTerm: '',
                  platformId: undefined,
                  releaseYear: undefined,
                  minRating: undefined,
                  maxRating: undefined,
                  sortBy: 'name',
                  sortOrder: 'asc'
                });
                setSearchParams(new URLSearchParams());
              }}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
