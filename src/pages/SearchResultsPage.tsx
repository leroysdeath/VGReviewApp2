import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Grid, List, Loader, AlertCircle, Star, RefreshCw, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useGameSearch } from '../hooks/useGameSearch';
import { SmartImage } from '../components/SmartImage';
import { supabase } from '../services/supabase';
import { useAuth } from '../hooks/useAuth';
import { shouldShowCategoryLabel, getCategoryLabel, getCategoryStyles } from '../utils/gameCategoryLabels';
import { mapPlatformNames } from '../utils/platformMapping';
import { FilterPanel } from '../components/FilterPanel';
import { ActiveFilters } from '../components/ActiveFilters';
import { GameSearchFilters, PlatformOption, DEFAULT_FILTERS } from '../types/search';

interface Game {
  id: number;
  igdb_id?: number;
  name: string;
  description?: string;
  summary?: string;
  release_date?: string;
  cover_url?: string;
  developer?: string;
  publisher?: string;
  genre?: string;
  genres?: string[];
  platforms?: string[];
  igdb_rating?: number;
  metacritic_score?: number;
  avg_user_rating?: number;
  user_rating_count?: number;
  category?: number;
  // Manual flagging system
  greenlight_flag?: boolean;
  redlight_flag?: boolean;
  flag_reason?: string;
}

interface Platform {
  id: number;
  name: string;
}

interface SearchFilters {
  searchTerm?: string;
  platforms?: string[];
  minRating?: number;
  releaseYear?: number;
  sortBy: 'name' | 'release_date' | 'avg_rating' | 'rating_count';
  sortOrder: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 20;

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { searchState, searchGames, searchTerm, setSearchTerm } = useGameSearch();
  
  // Detect mobile and set default view mode accordingly
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchStarted, setSearchStarted] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const filterDebounceRef = useRef<NodeJS.Timeout>();

  // Optimized debounce delays for different contexts
  const DEBOUNCE_DELAYS = {
    autocomplete: 150,  // Faster for responsive feel
    detailed: 500       // Slower to prevent excessive API calls
  };

  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    platforms: [],
    minRating: undefined,
    releaseYear: undefined,
    sortBy: 'name',
    sortOrder: 'asc'
  });

  // Filter panel state
  const [gameSearchFilters, setGameSearchFilters] = useState<GameSearchFilters>({
    ...DEFAULT_FILTERS,
    query: '',
    genres: [], // Will not be used
    platforms: []
  });

  // Set view mode based on device type
  useEffect(() => {
    if (isMobile) {
      setViewMode('list');
    }
  }, [isMobile]);

  // Load platforms for filter dropdown - only IDs 1-33 and 44-55
  useEffect(() => {
    loadPlatforms();
  }, []);

  // Platform options for FilterPanel
  const platformOptions = useMemo<PlatformOption[]>(() => {
    return platforms.map(p => ({
      id: p.id.toString(),
      label: p.name
    }));
  }, [platforms]);

  // Extract parameters from URL and update state
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const platformIds = searchParams.get('platforms')?.split(',').filter(Boolean) || [];
    const minRating = searchParams.get('minRating');
    const year = searchParams.get('year');
    const sort = searchParams.get('sort') || 'name:asc';
    const page = searchParams.get('page');
    const [sortField, sortOrder] = sort.split(':');

    setFilters({
      searchTerm: query,
      platforms: platformIds,
      minRating: minRating ? parseFloat(minRating) : undefined,
      releaseYear: year ? parseInt(year) : undefined,
      sortBy: sortField as any || 'name',
      sortOrder: sortOrder as any || 'asc'
    });

    // Update GameSearchFilters for FilterPanel
    setGameSearchFilters(prev => ({
      ...prev,
      query,
      platforms: platformIds,
      ratingRange: minRating ? [minRating ? parseFloat(minRating) : 0, 10] : [0, 10]
    }));

    setCurrentPage(page ? parseInt(page) : 1);

    // CRITICAL FIX: Set search term and let the unified search handler take over
    // This prevents dual search triggers that were causing 406 errors
    if (query.trim()) {
      setSearchTerm(query);
      // Don't call searchGames directly here - let the consolidated handler do it
    }
  }, [searchParams, setSearchTerm]);

  // CONSOLIDATED SEARCH HANDLER: Single point for all search triggers
  // This prevents the dual search issue that was causing 406 errors
  useEffect(() => {
    if (filters.searchTerm?.trim()) {
      // Debounced search for better performance
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        performSearch();
      }, DEBOUNCE_DELAYS.detailed); // Use optimized delay for detailed search
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [filters.searchTerm, filters.platforms?.join(','), filters.minRating, filters.releaseYear, filters.sortBy, filters.sortOrder]);

  const loadPlatforms = async () => {
    try {
      const { data, error } = await supabase
        .from('platform')
        .select('id, name')
        .or('id.gte.1,id.lte.33', 'id.gte.44,id.lte.55')
        .order('name');

      if (error) throw error;
      setPlatforms(data || []);
    } catch (err) {
      console.error('Error loading platforms:', err);
    }
  };

  const performSearch = async () => {
    // Clear any pending debounce timer when search is performed
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (!filters.searchTerm?.trim()) return;
    
    try {
      setSearchStarted(true);
      
      await searchGames(filters.searchTerm, {
        platforms: filters.platforms,
        minRating: filters.minRating,
        sortBy: filters.sortBy === 'name' ? 'name' :
               filters.sortBy === 'release_date' ? 'release_date' :
               filters.sortBy === 'avg_rating' ? 'rating' : 'popularity',
        sortOrder: filters.sortOrder
      });
      
    } catch (err) {
      console.error('SearchResultsPage: Search failed:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filters.searchTerm?.trim()) {
      // Clear any pending debounced search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      // Execute search immediately
      performSearch();
    }
  };

  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setCurrentPage(1); // Reset to first page when filters change

    // Search is now handled by the consolidated useEffect handler
    // No need for additional debouncing here since it's centralized

    // Update URL params
    const params = new URLSearchParams();
    if (updatedFilters.searchTerm) params.set('q', updatedFilters.searchTerm);
    if (updatedFilters.platforms && updatedFilters.platforms.length > 0) {
      params.set('platforms', updatedFilters.platforms.join(','));
    }
    if (updatedFilters.minRating) params.set('minRating', updatedFilters.minRating.toString());
    if (updatedFilters.releaseYear) params.set('year', updatedFilters.releaseYear.toString());
    params.set('sort', `${updatedFilters.sortBy}:${updatedFilters.sortOrder}`);

    setSearchParams(params);
  };

  // Handle FilterPanel changes with auto-apply and debouncing
  const handleFilterPanelChange = useCallback((newFilters: Partial<GameSearchFilters>) => {
    const updated = { ...gameSearchFilters, ...newFilters };
    setGameSearchFilters(updated);

    // Clear existing debounce timer
    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current);
    }

    // Auto-apply filters after 1.5 seconds
    filterDebounceRef.current = setTimeout(() => {
      // Convert GameSearchFilters to SearchFilters format
      const searchFilters: Partial<SearchFilters> = {
        platforms: updated.platforms,
        minRating: updated.ratingRange[0] > 0 ? updated.ratingRange[0] : undefined,
      };

      // Convert sort option
      if (updated.sortBy === 'newest') {
        searchFilters.sortBy = 'release_date';
        searchFilters.sortOrder = 'desc';
      } else if (updated.sortBy === 'oldest') {
        searchFilters.sortBy = 'release_date';
        searchFilters.sortOrder = 'asc';
      } else if (updated.sortBy === 'highest_rated') {
        searchFilters.sortBy = 'avg_rating';
        searchFilters.sortOrder = 'desc';
      } else if (updated.sortBy === 'lowest_rated') {
        searchFilters.sortBy = 'avg_rating';
        searchFilters.sortOrder = 'asc';
      } else if (updated.sortBy === 'most_reviewed') {
        searchFilters.sortBy = 'rating_count';
        searchFilters.sortOrder = 'desc';
      }

      handleFilterChange(searchFilters);
    }, 1500);
  }, [gameSearchFilters, handleFilterChange]);

  // Generate active filter labels
  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];

    if (filters.platforms && filters.platforms.length > 0) {
      const platformNames = filters.platforms
        .map(id => platforms.find(p => p.id.toString() === id)?.name)
        .filter(Boolean);
      platformNames.forEach(name => labels.push(`Platform: ${name}`));
    }

    if (filters.minRating) {
      labels.push(`Min Rating: ${filters.minRating}/10`);
    }

    if (filters.releaseYear) {
      labels.push(`Year: ${filters.releaseYear}`);
    }

    return labels;
  }, [filters, platforms]);

  // Handle removing individual filter
  const handleRemoveFilter = (filterLabel: string) => {
    const newFilters = { ...filters };

    if (filterLabel.startsWith('Platform:')) {
      const platformName = filterLabel.replace('Platform: ', '');
      const platform = platforms.find(p => p.name === platformName);
      if (platform && newFilters.platforms) {
        newFilters.platforms = newFilters.platforms.filter(id => id !== platform.id.toString());
      }
    } else if (filterLabel.startsWith('Min Rating:')) {
      newFilters.minRating = undefined;
    } else if (filterLabel.startsWith('Year:')) {
      newFilters.releaseYear = undefined;
    }

    handleFilterChange(newFilters);
  };

  // Clear all filters but keep search term
  const handleClearAllFilters = () => {
    const clearedFilters: SearchFilters = {
      searchTerm: filters.searchTerm,
      platforms: [],
      minRating: undefined,
      releaseYear: undefined,
      sortBy: 'name',
      sortOrder: 'asc'
    };

    setFilters(clearedFilters);
    setGameSearchFilters({
      ...DEFAULT_FILTERS,
      query: filters.searchTerm || ''
    });

    // Update URL to keep search term but clear filters
    const params = new URLSearchParams();
    if (filters.searchTerm) params.set('q', filters.searchTerm);
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
    return game.cover_url || '/placeholder-game.jpg';
  };

  // Use games directly from searchState (igdbService already applies filtering)
  const filteredGames = useMemo(() => {
    return searchState.games;
  }, [searchState.games]);

  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE);

  // Generate year options for filter
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 50 }, (_, i) => currentYear - i);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Browse Games</h1>
          
          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search games... (auto-searches after 2s or press Enter)"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                onKeyDown={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                if (filters.searchTerm?.trim()) {
                  performSearch();
                }
              }}
              disabled={!filters.searchTerm?.trim()}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Filters
            </button>
            <div className="hidden md:flex gap-2">
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

          {/* Active Filters Display */}
          {activeFilterLabels.length > 0 && (
            <ActiveFilters
              filters={activeFilterLabels}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
              className="mb-6"
            />
          )}

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              <div className="lg:col-span-1">
                <FilterPanel
                  filters={gameSearchFilters}
                  onFiltersChange={handleFilterPanelChange}
                  genreOptions={[]} // No genre filters
                  platformOptions={platformOptions}
                />
              </div>
              <div className="lg:col-span-3">
                {/* Results will be shown here */}
                <div className="text-gray-400 text-sm mb-4">
                  <p>Filters auto-apply after 1.5 seconds of inactivity</p>
                </div>
              </div>
            </div>
          )}

          {/* Results Info */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 text-gray-400">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <p className="text-sm sm:text-base">
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
              onClick={() => {
                if (filters.searchTerm?.trim()) {
                  performSearch();
                }
              }}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {searchState.loading && searchStarted && (
          <div className="flex justify-center items-center gap-3 mb-6 p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
            <Loader className="h-5 w-5 animate-spin text-purple-500" />
            <span className="text-gray-300">Searching for "{filters.searchTerm}"...</span>
          </div>
        )}

        {/* Initial Loading State - show when no results yet */}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
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
                        lazy={true}
                        lazyStrategy="both"
                        showLoadingSpinner={true}
                        showLoadingSkeleton={false}
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
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">{game.name}</h3>
                      {(game.release_date || game.platforms) && (
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                          {game.release_date && (
                            <span>{new Date(game.release_date).getFullYear()}</span>
                          )}
                          {game.release_date && game.platforms && game.platforms.length > 0 && <span>•</span>}
                          {game.platforms && game.platforms.length > 0 && (
                            <span>
                              {(() => {
                                const mappedPlatforms = mapPlatformNames(game.platforms);
                                return mappedPlatforms.slice(0, 5).join(', ') + (mappedPlatforms.length > 5 ? '...' : '');
                              })()}
                            </span>
                          )}
                        </div>
                      )}
                      {game.user_rating_count > 0 && (
                        <p className="text-sm text-gray-400">
                          {game.user_rating_count} review{game.user_rating_count !== 1 ? 's' : ''}
                        </p>
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
                      lazy={true}
                      lazyStrategy="both"
                      showLoadingSpinner={false}
                      showLoadingSkeleton={true}
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
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            {game.release_date && (
                              <span>{new Date(game.release_date).getFullYear()}</span>
                            )}
                            {game.release_date && game.platforms && game.platforms.length > 0 && <span>•</span>}
                            {game.platforms && game.platforms.length > 0 && (
                              <span>
                                {(() => {
                                  const mappedPlatforms = mapPlatformNames(game.platforms);
                                  return mappedPlatforms.slice(0, 5).join(', ') + (mappedPlatforms.length > 5 ? '...' : '');
                                })()}
                              </span>
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
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8">
                {/* Mobile: Show current page info */}
                <div className="sm:hidden text-sm text-gray-400">
                  Page {currentPage} of {totalPages}
                </div>
                
                <div className="flex justify-center items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 sm:p-3 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  
                  {/* Page Numbers - Show fewer on mobile */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      const maxPages = isMobile ? 3 : 5;
                      const halfRange = Math.floor(maxPages / 2);
                      
                      if (totalPages <= maxPages) {
                        pageNum = i + 1;
                      } else if (currentPage <= halfRange + 1) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - halfRange) {
                        pageNum = totalPages - maxPages + 1 + i;
                      } else {
                        pageNum = currentPage - halfRange + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base rounded-lg transition-colors ${
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
                    className="p-2 sm:p-3 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
                
                {/* Desktop: Show jump to first/last if needed */}
                {!isMobile && totalPages > 7 && (
                  <div className="flex gap-2">
                    {currentPage > 4 && (
                      <button
                        onClick={() => handlePageChange(1)}
                        className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                      >
                        First
                      </button>
                    )}
                    {currentPage < totalPages - 3 && (
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                      >
                        Last
                      </button>
                    )}
                  </div>
                )}
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
              onClick={handleClearAllFilters}
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
