import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Grid, List, Loader, AlertCircle, Star, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
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
  sortBy: '' | 'name' | 'release_date' | 'avg_rating' | 'rating_count';
  sortOrder: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 20;

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { searchState, searchGames, searchTerm, setSearchTerm } = useGameSearch();

  // Helper function to get rating badge color classes (matching ReviewCard and ExplorePage)
  const getRatingColorClasses = (rating: number): string => {
    if (rating <= 3) return 'bg-red-500 text-white';
    if (rating <= 5) return 'bg-orange-500 text-white';
    if (rating <= 7) return 'bg-yellow-400 text-gray-700';
    if (rating <= 9.5) return 'bg-green-500 text-white';
    return 'bg-blue-500 text-white';
  };

  // Helper function to get rating text color only (for inline display)
  const getRatingColor = (rating: number): string => {
    if (rating <= 3) return 'text-red-500';
    if (rating <= 5) return 'text-orange-500';
    if (rating <= 7) return 'text-yellow-500';
    if (rating <= 9.5) return 'text-green-500';
    return 'text-blue-500';
  };
  
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

  // Debug mode detection
  const isDebugMode = useMemo(() => {
    return searchParams.get('debug') === 'true' ||
           localStorage.getItem('debugMode') === 'true' ||
           import.meta.env.DEV;
  }, [searchParams]);

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
    sortBy: '',
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
      ratingRange: minRating ? [minRating ? parseFloat(minRating) : 1, 10] : [1, 10]
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
      // Fetch all platforms and filter in JavaScript
      // The Postgrest query syntax for ranges is complex, so we filter client-side
      const { data, error } = await supabase
        .from('platform')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Platform filter query error:', error);
        throw error;
      }

      // Filter to include: 1-33, 44-55, and 71 (common gaming platforms)
      const filteredData = data?.filter(p =>
        (p.id >= 1 && p.id <= 33) ||
        (p.id >= 44 && p.id <= 55) ||
        p.id === 71
      ) || [];

      console.log(`Loaded ${filteredData.length} platforms (filtered from ${data?.length || 0})`);
      setPlatforms(filteredData);
    } catch (err) {
      console.error('Error loading platforms:', err);
      // Don't set platforms on error - keep empty array
      setPlatforms([]);
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

      // Use the regular search which already has all the optimizations
      // (parallel queries, caching, reduced timeouts)
      await searchGames(filters.searchTerm, {
        platforms: filters.platforms,
        minRating: filters.minRating,
        sortBy: filters.sortBy === '' ? undefined :
               filters.sortBy === 'name' ? 'name' :
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
      if (updated.sortBy === '') {
        searchFilters.sortBy = '';
        searchFilters.sortOrder = 'asc';
      } else if (updated.sortBy === 'newest') {
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

    // Platform filters temporarily disabled
    /*
    if (filters.platforms && filters.platforms.length > 0) {
      const platformNames = filters.platforms
        .map(id => platforms.find(p => p.id.toString() === id)?.name)
        .filter(Boolean);
      platformNames.forEach(name => labels.push(`Platform: ${name}`));
    }
    */

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

    // Platform filter removal temporarily disabled
    /*
    if (filterLabel.startsWith('Platform:')) {
      const platformName = filterLabel.replace('Platform: ', '');
      const platform = platforms.find(p => p.name === platformName);
      if (platform && newFilters.platforms) {
        newFilters.platforms = newFilters.platforms.filter(id => id !== platform.id.toString());
      }
    } else */ if (filterLabel.startsWith('Min Rating:')) {
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
      sortBy: '',
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
    // Handle both cover.url and cover_url formats, ensure https protocol
    const coverUrl = (game as any).cover?.url
      ? `https:${(game as any).cover.url}`
      : game.cover_url;

    // Ensure URL has protocol if it exists
    if (coverUrl && !coverUrl.startsWith('http')) {
      return `https:${coverUrl}`;
    }

    return coverUrl || '/placeholder-game.jpg';
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
          <h1 className="text-4xl font-bold mb-4">
            {filters.searchTerm?.trim() ? `Search Results for "${filters.searchTerm}"` : 'Browse Games'}
          </h1>
          
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
            {/* Filters button - hidden for now */}
            {/* <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              Filters
            </button> */}
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
          {activeFilterLabels.length > 0 && !showFilters && (
            <ActiveFilters
              filters={activeFilterLabels}
              onRemoveFilter={handleRemoveFilter}
              onClearAll={handleClearAllFilters}
              className="mb-6"
            />
          )}

          {/* Results Info - Only show when filters are hidden or on mobile */}
          {(!showFilters || isMobile) && (
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 text-gray-400">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <p className="text-sm sm:text-base">
                  Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredGames.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredGames.length)} of {filteredGames.length} games
                </p>
                {isDebugMode && searchState.source && (
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
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area - Filters and Results */}
        <div className={showFilters && !isMobile ? "grid grid-cols-1 lg:grid-cols-4 gap-6" : ""}>
          {/* Filter Panel - Desktop Sidebar */}
          {showFilters && !isMobile && (
            <div className="lg:col-span-1">
              <FilterPanel
                filters={gameSearchFilters}
                onFiltersChange={handleFilterPanelChange}
                genreOptions={[]} // No genre filters
                platformOptions={platformOptions}
              />
              <div className="mt-4">
                <ActiveFilters
                  filters={activeFilterLabels}
                  onRemoveFilter={handleRemoveFilter}
                  onClearAll={handleClearAllFilters}
                />
              </div>
              <div className="text-gray-400 text-xs mt-4">
                <p>Filters auto-apply after 1.5s</p>
              </div>
            </div>
          )}

          {/* Filter Panel - Mobile Dropdown */}
          {showFilters && isMobile && (
            <div className="mb-6">
              <FilterPanel
                filters={gameSearchFilters}
                onFiltersChange={handleFilterPanelChange}
                genreOptions={[]} // No genre filters
                platformOptions={platformOptions}
              />
              <div className="mt-4">
                <ActiveFilters
                  filters={activeFilterLabels}
                  onRemoveFilter={handleRemoveFilter}
                  onClearAll={handleClearAllFilters}
                />
              </div>
              <div className="text-gray-400 text-xs mt-4">
                <p>Filters auto-apply after 1.5 seconds</p>
              </div>
            </div>
          )}

          {/* Results Container - Adjusts width based on filter visibility */}
          <div className={showFilters && !isMobile ? "lg:col-span-3" : ""}>
            {/* Results Info for desktop with filters */}
            {showFilters && !isMobile && (
              <div className="flex justify-between items-center mb-4 text-gray-400">
                <p className="text-sm">
                  Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredGames.length)} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredGames.length)} of {filteredGames.length} games
                </p>
              </div>
            )}

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
                  <div className={`grid gap-2 sm:gap-3 md:gap-4 ${
                    showFilters && !isMobile
                      ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                  }`}>
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
                      {!!shouldShowCategoryLabel(game.category) && (
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
                      {game.avg_user_rating && game.user_rating_count > 0 && (
                        <div className={`absolute top-1 right-1 rounded-lg px-1.5 py-0.5 ${getRatingColorClasses(game.avg_user_rating)}`}>
                          <span className="text-sm font-bold">{game.avg_user_rating === 10 ? '10' : game.avg_user_rating.toFixed(1)}/10</span>
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
                            <span className="truncate inline-block max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
                              {mapPlatformNames(game.platforms).join(', ')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredGames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(game => {
                      // Determine if we're in narrow mode (beside filters)
                      const isNarrowMode = showFilters && !isMobile;

                      return (
                        <div
                          key={game.id}
                          onClick={() => handleGameClick(game)}
                          className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition-colors flex gap-4"
                        >
                          {/* Cover Image - Slightly smaller in narrow mode */}
                          <SmartImage
                            src={getCoverUrl(game)}
                            alt={game.name}
                            className={isNarrowMode ? "w-20 h-28 object-cover rounded-lg" : "w-24 h-32 object-cover rounded-lg"}
                            optimization={{ width: 200, height: 300, quality: 85 }}
                            fallback="/placeholder-game.jpg"
                            lazy={true}
                            lazyStrategy="both"
                            showLoadingSpinner={false}
                            showLoadingSkeleton={true}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                {/* Title and Category - Always show */}
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                  <h3 className={`font-semibold ${isNarrowMode ? 'text-lg' : 'text-xl'}`}>
                                    {game.name}
                                  </h3>
                                  {!!shouldShowCategoryLabel(game.category) && (
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

                                {/* Description - Responsive: 1 line in narrow, 2 lines in wide */}
                                {!isNarrowMode && (
                                  <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                                    {game.summary || game.description || 'No description available'}
                                  </p>
                                )}
                                {isNarrowMode && (game.summary || game.description) && (
                                  <p className="text-gray-400 text-sm mb-2 line-clamp-1">
                                    {game.summary || game.description}
                                  </p>
                                )}

                                {/* Metadata - Always show but more compact in narrow */}
                                <div className="flex items-center gap-2 text-sm text-gray-400 flex-wrap">
                                  {game.release_date && (
                                    <span>{new Date(game.release_date).getFullYear()}</span>
                                  )}
                                  {game.release_date && game.platforms && game.platforms.length > 0 && <span>•</span>}
                                  {game.platforms && game.platforms.length > 0 && (
                                    <span className="truncate inline-block max-w-full">
                                      {mapPlatformNames(game.platforms).join(', ')}
                                    </span>
                                  )}
                                  {game.avg_user_rating && game.user_rating_count > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className={`font-medium ${getRatingColor(game.avg_user_rating)}`}>
                                        {game.avg_user_rating === 10 ? '10' : game.avg_user_rating.toFixed(1)}/10
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                            </div>
                          </div>
                        </div>
                      );
                    })}
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
      </div>
    </div>
  );
};
