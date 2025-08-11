import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Filter, Grid, List, Loader, AlertCircle, Star, Calendar, RefreshCw, Zap, Database, Heart, Plus, Search } from 'lucide-react';
import { useIGDBSearch } from '../hooks/useIGDBCache';
import { enhancedIGDBService } from '../services/enhancedIGDBService';
import { AuthModal } from '../components/auth/AuthModal';
import { useAuth } from '../hooks/useAuth';

interface Game {
  id: number;
  name: string;
  cover?: {
    url: string;
  };
  first_release_date?: number;
  genres?: { name: string }[];
  platforms?: { name: string }[];
  rating?: number;
  summary?: string;
}

interface SearchFilters {
  genres: string[];
  platforms: string[];
  minRating?: number;
  sortBy: 'popularity' | 'rating' | 'release_date' | 'name';
  sortOrder: 'asc' | 'desc';
}

export const SearchResultsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; gameId: number } | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({
    genres: [],
    platforms: [],
    sortBy: 'popularity',
    sortOrder: 'desc'
  });

  // Use the caching search hook
  const {
    data: games,
    loading,
    error,
    cached: isSearchCached,
    refetch,
    isStale: isSearchStale,
    searchTerm: debouncedSearchTerm
  } = useIGDBSearch(searchTerm, filters, {
    enabled: true,
    ttl: 1800, // 30 minutes cache for search results
    staleWhileRevalidate: true
  });

  // Extract parameters from URL and update state
  useEffect(() => {
    const query = searchParams.get('q') || '';
    const genres = searchParams.get('genres')?.split(',').filter(Boolean) || [];
    const platforms = searchParams.get('platforms')?.split(',').filter(Boolean) || [];
    const rating = searchParams.get('rating');
    const sort = searchParams.get('sort') || 'popularity:desc';

    setSearchTerm(query);

    const [sortField, sortOrder] = sort.split(':');
    const newFilters: SearchFilters = {
      genres,
      platforms,
      minRating: rating ? parseInt(rating) : undefined,
      sortBy: (sortField as any) || 'popularity',
      sortOrder: (sortOrder as any) || 'desc'
    };

    setFilters(newFilters);
  }, [searchParams]);

  const handleGameClick = (game: Game) => {
    // Prefetch game data for faster loading
    enhancedIGDBService.prefetchGame(game.id);
    navigate(`/game/${game.id}`);
  };

  const handleRefresh = () => {
    refetch();
  };

  // Handle auth-required actions
  const handleAuthRequiredAction = (action: string, gameId: number, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    if (!isAuthenticated) {
      setPendingAction({ action, gameId });
      setShowAuthModal(true);
      return;
    }
    
    executeAction(action, gameId);
  };

  const executeAction = (action: string, gameId: number) => {
    switch (action) {
      case 'add_to_wishlist':
        console.log('Adding to wishlist:', gameId);
        // Implement wishlist logic here
        break;
      case 'quick_rate':
        console.log('Quick rating for:', gameId);
        // Implement quick rating logic here
        break;
      case 'add_to_favorites':
        console.log('Adding to favorites:', gameId);
        // Implement favorites logic here
        break;
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingAction) {
      executeAction(pendingAction.action, pendingAction.gameId);
      setPendingAction(null);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Update URL parameters
    const newParams = new URLSearchParams(searchParams);
    if (value.trim()) {
      newParams.set('q', value);
    } else {
      newParams.delete('q');
    }
    setSearchParams(newParams);
  };

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);

    // Update URL parameters
    const newParams = new URLSearchParams(searchParams);

    if (updatedFilters.genres.length > 0) {
      newParams.set('genres', updatedFilters.genres.join(','));
    } else {
      newParams.delete('genres');
    }

    if (updatedFilters.platforms.length > 0) {
      newParams.set('platforms', updatedFilters.platforms.join(','));
    } else {
      newParams.delete('platforms');
    }

    if (updatedFilters.minRating) {
      newParams.set('rating', updatedFilters.minRating.toString());
    } else {
      newParams.delete('rating');
    }

    newParams.set('sort', `${updatedFilters.sortBy}:${updatedFilters.sortOrder}`);

    setSearchParams(newParams);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const GameCard: React.FC<{ game: Game }> = ({ game }) => (
    <div
      onClick={() => handleGameClick(game)}
      className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-750 transition-all duration-200 cursor-pointer group hover:scale-105 relative"
      onMouseEnter={() => enhancedIGDBService.prefetchGame(game.id)} // Prefetch on hover
    >
      <div className="aspect-[3/4] relative overflow-hidden">
        {game.cover?.url ? (
          <img
            src={game.cover.url.replace('t_thumb', 't_cover_big')}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-game.jpg';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 text-sm">No Image</span>
          </div>
        )}
        {game.rating && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-lg text-sm flex items-center">
            <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
            {Math.round(game.rating / 10)}
          </div>
        )}
        
        {/* Quick Action Buttons (shown on hover) */}
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-y-1">
          <button
            onClick={(e) => handleAuthRequiredAction('add_to_wishlist', game.id, e)}
            className="block w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg transition-colors"
            title={isAuthenticated ? "Add to Wishlist" : "Sign in to add to wishlist"}
          >
            <Plus className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleAuthRequiredAction('quick_rate', game.id, e)}
            className="block w-8 h-8 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg transition-colors"
            title={isAuthenticated ? "Quick Rate" : "Sign in to rate"}
          >
            <Star className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => handleAuthRequiredAction('add_to_favorites', game.id, e)}
            className="block w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg transition-colors"
            title={isAuthenticated ? "Add to Favorites" : "Sign in to add to favorites"}
          >
            <Heart className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2">
          {game.name}
        </h3>
        {game.first_release_date && (
          <p className="text-gray-400 text-sm mt-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {formatDate(game.first_release_date)}
          </p>
        )}
        {game.genres && game.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {game.genres.slice(0, 2).map((genre, index) => (
              <span
                key={index}
                className="bg-purple-600 bg-opacity-20 text-purple-300 px-2 py-1 rounded text-xs"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const GameListItem: React.FC<{ game: Game }> = ({ game }) => (
    <div
      onClick={() => handleGameClick(game)}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors cursor-pointer group flex gap-4 relative"
      onMouseEnter={() => enhancedIGDBService.prefetchGame(game.id)} // Prefetch on hover
    >
      <div className="w-16 h-20 flex-shrink-0 overflow-hidden rounded">
        {game.cover?.url ? (
          <img
            src={game.cover.url.replace('t_thumb', 't_cover_small')}
            alt={game.name}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/placeholder-game.jpg';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-500 text-xs">No Image</span>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors truncate">
          {game.name}
        </h3>
        {game.first_release_date && (
          <p className="text-gray-400 text-sm mt-1 flex items-center">
            <Calendar className="w-3 h-3 mr-1" />
            {formatDate(game.first_release_date)}
          </p>
        )}
        {game.summary && (
          <p className="text-gray-300 text-sm mt-2 line-clamp-2">
            {game.summary}
          </p>
        )}
        {game.genres && game.genres.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {game.genres.slice(0, 3).map((genre, index) => (
              <span
                key={index}
                className="bg-purple-600 bg-opacity-20 text-purple-300 px-2 py-1 rounded text-xs"
              >
                {genre.name}
              </span>
            ))}
          </div>
        )}
      </div>
      {game.rating && (
        <div className="flex-shrink-0 text-right">
          <div className="flex items-center text-yellow-400">
            <Star className="w-4 h-4 mr-1 fill-current" />
            <span className="text-white font-semibold">
              {Math.round(game.rating / 10)}
            </span>
          </div>
        </div>
      )}
      
      {/* Quick Actions for List View */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1">
        <button
          onClick={(e) => handleAuthRequiredAction('add_to_wishlist', game.id, e)}
          className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg transition-colors"
          title={isAuthenticated ? "Add to Wishlist" : "Sign in to add to wishlist"}
        >
          <Plus className="w-2 h-2" />
        </button>
        <button
          onClick={(e) => handleAuthRequiredAction('add_to_favorites', game.id, e)}
          className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg transition-colors"
          title={isAuthenticated ? "Add to Favorites" : "Sign in to add to favorites"}
        >
          <Heart className="w-2 h-2" />
        </button>
      </div>
    </div>
  );

  const totalResults = games?.length || 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">

        {/* Cache Status Bar */}
        {(isSearchCached || isSearchStale) && (
          <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isSearchCached && (
                  <div className="flex items-center gap-2 text-green-400">
                    <Database className="h-4 w-4" />
                    <span className="text-sm">Results from cache</span>
                  </div>
                )}
                {isSearchStale && (
                  <div className="flex items-center gap-2 text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">Data may be outdated</span>
                  </div>
                )}
                {debouncedSearchTerm !== searchTerm && (
                  <div className="flex items-center gap-2 text-blue-400">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Updating search...</span>
                  </div>
                )}
              </div>

              {isSearchStale && (
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-md transition-colors"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span className="text-sm">Refresh</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              {searchTerm ? `Search Results for "${searchTerm}"` : 'Browse Games'}
            </h1>
            <div className="flex items-center gap-4 mt-1">
              {totalResults > 0 && (
                <p className="text-gray-400">
                  {totalResults.toLocaleString()} games found
                </p>
              )}
              {isSearchCached && (
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <Zap className="h-3 w-3" />
                  <span>Instant results</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </button>

            <div className="flex bg-gray-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search games by title..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Filter Results</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={`${filters.sortBy}:${filters.sortOrder}`}
                  onChange={(e) => {
                    const [sortBy, sortOrder] = e.target.value.split(':');
                    updateFilters({ sortBy: sortBy as any, sortOrder: sortOrder as any });
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="popularity:desc">Most Popular</option>
                  <option value="rating:desc">Highest Rated</option>
                  <option value="release_date:desc">Newest First</option>
                  <option value="release_date:asc">Oldest First</option>
                  <option value="name:asc">Name A-Z</option>
                  <option value="name:desc">Name Z-A</option>
                </select>
              </div>

              {/* Minimum Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Minimum Rating
                </label>
                <select
                  value={filters.minRating || ''}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : undefined;
                    updateFilters({ minRating: value });
                  }}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Any Rating</option>
                  <option value="90">90+ Exceptional</option>
                  <option value="80">80+ Great</option>
                  <option value="70">70+ Good</option>
                  <option value="60">60+ Decent</option>
                </select>
              </div>

              {/* Quick Genre Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Quick Filters
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Action', 'RPG', 'Strategy', 'Indie'].map((genre) => (
                    <button
                      key={genre}
                      onClick={() => {
                        const newGenres = filters.genres.includes(genre)
                          ? filters.genres.filter(g => g !== genre)
                          : [...filters.genres, genre];
                        updateFilters({ genres: newGenres });
                      }}
                      className={`px-3 py-1 rounded-full text-xs transition-colors ${
                        filters.genres.includes(genre)
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end">
                <button
                  onClick={() => {
                    updateFilters({
                      genres: [],
                      platforms: [],
                      minRating: undefined,
                      sortBy: 'popularity',
                      sortOrder: 'desc'
                    });
                  }}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (!games || games.length === 0) && (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-3 text-gray-400">
              {isSearchCached ? 'Updating results...' : 'Searching for games...'}
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 font-semibold mb-2">Search Error</p>
              <p className="text-gray-400 mb-4">{error.message}</p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && (!games || games.length === 0) && searchTerm && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-xl font-semibold mb-2">No games found</h2>
            <p className="text-gray-400 mb-4">
              Try adjusting your search terms or filters
            </p>
            <div className="space-x-2">
              <button
                onClick={() => setSearchTerm('')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Clear Search
              </button>
              <button
                onClick={() => setShowFilters(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Adjust Filters
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {games && games.length > 0 && (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {games.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {games.map((game) => (
                  <GameListItem key={game.id} game={game} />
                ))}
              </div>
            )}

            {/* Search Status Footer */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-4 px-6 py-3 bg-gray-800 rounded-lg">
                <span className="text-gray-400 text-sm">
                  Showing {games.length} results
                </span>
                {isSearchCached && (
                  <div className="flex items-center gap-1 text-green-400 text-sm">
                    <Database className="h-3 w-3" />
                    <span>Cached</span>
                  </div>
                )}
                {loading && (
                  <div className="flex items-center gap-1 text-blue-400 text-sm">
                    <Loader className="h-3 w-3 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setPendingAction(null);
          }}
          onLoginSuccess={handleAuthSuccess}
          onSignupSuccess={handleAuthSuccess}
        />
      </div>
    </div>
  );
};
