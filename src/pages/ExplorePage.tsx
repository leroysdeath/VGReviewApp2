import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, List, Loader, AlertCircle, Star, TrendingUp, Trophy, Search, RefreshCw } from 'lucide-react';
import { SmartImage } from '../components/SmartImage';
import { fetchGamesWithReviewMetrics, ExploreGame, SortOption } from '../services/exploreService';
import { shouldShowCategoryLabel, getCategoryLabel, getCategoryStyles } from '../utils/gameCategoryLabels';
import { mapPlatformNames } from '../utils/platformMapping';
import { useAuth } from '../hooks/useAuth';
import { trackingService } from '../services/trackingService';

interface ExploreFilters {
  searchTerm?: string;
  // Future filters can be added here easily
  // minReviews?: number;
  // timeRange?: 'all' | 'month' | 'year';
  // genres?: string[];
  // platforms?: string[];
  // minRating?: number;
}

const ITEMS_PER_PAGE = 40;

export const ExplorePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exploreGames, setExploreGames] = useState<ExploreGame[]>([]);
  const [exploreLoading, setExploreLoading] = useState(true);
  const [exploreError, setExploreError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobile, setIsMobile] = useState(false);
  // Remove search-related state since we're redirecting to search-results
  
  // Auth for tracking
  const { user } = useAuth();
  
  // Extensible filter state
  const [filters, setFilters] = useState<ExploreFilters>({
    searchTerm: ''
  });

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set view mode based on device
  useEffect(() => {
    if (isMobile) {
      setViewMode('list');
    }
  }, [isMobile]);

  // Initialize from URL params - redirect if search query exists
  useEffect(() => {
    const query = searchParams.get('q') || '';
    if (query.trim()) {
      // Redirect to search-results page if there's a query parameter
      navigate(`/search-results?q=${encodeURIComponent(query)}`);
    }
  }, [searchParams, navigate]);

  // Fetch explore games (default state)
  useEffect(() => {
    if (!filters.searchTerm?.trim()) {
      loadExploreGames();
    }
  }, []); // Only load once on mount

  // Remove auto-search on typing - now only search on explicit action

  const loadExploreGames = async () => {
    setExploreLoading(true);
    setExploreError(null);
    
    try {
      const gamesData = await fetchGamesWithReviewMetrics('unified_score', ITEMS_PER_PAGE);
      setExploreGames(gamesData);
    } catch (err) {
      console.error('Error fetching explore games:', err);
      setExploreError('Failed to load games. Please try again later.');
    } finally {
      setExploreLoading(false);
    }
  };

  // Search now redirects to /search-results page

  const handleGameClick = async (game: ExploreGame | any) => {
    // Track the click from explore page
    const source = 'list';
    
    try {
      // Track the game click (respects user consent)
      await trackingService.trackGameView(
        game.igdb_id || game.id,
        source,
        user?.databaseId
      );
    } catch (error) {
      // Don't block navigation if tracking fails
      console.error('Failed to track game click:', error);
    }
    
    // Navigate to game page
    navigate(`/game/${game.igdb_id || game.id}`);
  };

  const getCoverUrl = (game: ExploreGame | any) => {
    return game.cover_url || '/placeholder-game.jpg';
  };

  const handleFilterChange = (newFilters: Partial<ExploreFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    // Don't update URL params anymore - we'll redirect on search
    // Keep local state for the input field only
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filters.searchTerm?.trim()) {
      // Redirect to search-results page on Enter
      navigate(`/search-results?q=${encodeURIComponent(filters.searchTerm)}`);
    }
  };

  // Only show explore games now - search redirects elsewhere
  const displayGames = exploreGames;
  const loading = exploreLoading;
  const error = exploreError;

  // Display title for explore page
  const getDisplayTitle = () => {
    return 'Top Games by Rating, Reviews & Popularity';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{getDisplayTitle()}</h1>
          
          {/* Search Bar */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search games... (press Enter or click Search)"
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                onKeyDown={handleKeyPress}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => {
                if (filters.searchTerm?.trim()) {
                  // Redirect to search-results page
                  navigate(`/search-results?q=${encodeURIComponent(filters.searchTerm)}`);
                } else {
                  loadExploreGames();
                }
              }}
              className="px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {filters.searchTerm?.trim() ? 'Search' : 'Refresh'}
            </button>
            
            {/* View Mode Toggle - Desktop Only */}
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

          {/* Info Banner */}
          <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-purple-300">
              <TrendingUp className="h-5 w-5" />
              <p className="text-sm">
                Games ranked by our unified algorithm combining <strong>rating quality</strong>, <strong>review volume</strong>, and <strong>community engagement</strong>
              </p>
            </div>
          </div>

          {/* Results Info */}
          <div className="flex justify-between items-center text-gray-400 text-sm">
            <div>
              Showing top {displayGames.length} games ranked by unified score
            </div>
            <button
              onClick={loadExploreGames}
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center gap-3 mb-6 p-4 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700">
            <Loader className="h-5 w-5 animate-spin text-purple-500" />
            <span className="text-gray-300">
              Loading top-ranked games...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Games Grid/List */}
        {!loading && !error && displayGames.length > 0 && (
          <div>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {displayGames.map((game, index) => (
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
                        showLoadingSpinner={true}
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
                      {game.avg_user_rating && game.avg_user_rating > 0 && (
                        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
                          <span className="text-sm font-bold text-white">{game.avg_user_rating.toFixed(1)}/10</span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 line-clamp-2">{game.name}</h3>
                      {game.release_date && (
                        <p className="text-sm text-gray-400 mb-1">
                          {new Date(game.release_date).getFullYear()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {displayGames.map((game, index) => (
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
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
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
                          {(game.summary || game.description) && (
                            <p className="text-gray-400 text-sm mb-2 line-clamp-2">
                              {game.summary || game.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            {game.release_date && (
                              <span>{new Date(game.release_date).getFullYear()}</span>
                            )}
                            {game.release_date && game.platforms && game.platforms.length > 0 && (
                              <span>•</span>
                            )}
                            {game.platforms && game.platforms.length > 0 && (
                              <span>{mapPlatformNames(game.platforms).join(', ')}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          {game.avg_user_rating && game.avg_user_rating > 0 && (
                            <div className="mb-1">
                              <span className="font-bold text-lg text-white">{game.avg_user_rating.toFixed(1)}/10</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* No Results */}
        {!loading && !error && displayGames.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-400 text-lg mb-4">No games found with reviews</p>
            <p className="text-gray-500 text-sm">Check back later for more content</p>
          </div>
        )}
      </div>
    </div>
  );
};