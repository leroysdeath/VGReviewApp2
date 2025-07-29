import React, { useState, useEffect } from 'react';
import { GameSearch } from '../components/GameSearch';
import { Game } from '../services/igdbService';
import { useResponsive } from '../hooks/useResponsive';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { enhancedIGDBService } from '../services/enhancedIGDBService';
import { useCacheManagement } from '../hooks/useIGDBCache';
import { Search, TrendingUp, Clock, Star, Filter } from 'lucide-react';

export const GameSearchPage: React.FC = () => {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stats } = useCacheManagement();
  
  const [popularGames, setPopularGames] = useState<Game[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [showCacheStats, setShowCacheStats] = useState(false);

  // Get initial search term from URL params
  const initialSearchTerm = searchParams.get('q') || '';

  useEffect(() => {
    // Load popular games when component mounts
    loadPopularGames();
    // Load recent searches from localStorage
    loadRecentSearches();
  }, []);

  const loadPopularGames = async () => {
    setLoadingPopular(true);
    try {
      console.log('🔥 Loading popular games with caching...');
      const games = await enhancedIGDBService.getPopularGames({
        useCache: true,
        cacheTTL: 7200, // 2 hours
        browserCacheTTL: 600, // 10 minutes
      });
      setPopularGames(games.slice(0, 6)); // Show top 6
      console.log('✅ Popular games loaded:', games.length);
    } catch (error) {
      console.error('❌ Error loading popular games:', error);
    } finally {
      setLoadingPopular(false);
    }
  };

  const loadRecentSearches = () => {
    try {
      const saved = localStorage.getItem('recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  };

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    
    try {
      const updatedSearches = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
      setRecentSearches(updatedSearches);
      localStorage.setItem('recent_searches', JSON.stringify(updatedSearches));
    } catch (error) {
      console.error('Error saving recent search:', error);
    }
  };

  const handleGameSelect = (game: Game) => {
    // Prefetch game data for faster loading
    if (game.id) {
      enhancedIGDBService.prefetchGame(typeof game.id === 'string' ? parseInt(game.id) : game.id);
    }
    navigate(`/game/${game.id}`);
  };

  const handleSearch = (searchTerm: string) => {
    if (searchTerm.trim()) {
      // Update URL with search term
      setSearchParams({ q: searchTerm });
      // Save to recent searches
      saveRecentSearch(searchTerm.trim());
    } else {
      // Clear search param if empty
      setSearchParams({});
    }
  };

  const handlePopularGameClick = (game: Game) => {
    handleGameSelect(game);
  };

  const handleRecentSearchClick = (term: string) => {
    setSearchParams({ q: term });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recent_searches');
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${isMobile ? '' : 'max-w-7xl'}`}>
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className={`font-bold text-white ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Discover Games
            </h1>
            
            {/* Cache Stats Toggle (Dev Mode) */}
            {import.meta.env.DEV && (
              <button
                onClick={() => setShowCacheStats(!showCacheStats)}
                className="flex items-center gap-2 px-3 py-1 bg-gray-800 text-gray-300 rounded-md text-sm hover:bg-gray-700 transition-colors"
              >
                <TrendingUp className="h-4 w-4" />
                Cache Stats
              </button>
            )}
          </div>

          {/* Cache Statistics (Dev Mode) */}
          {import.meta.env.DEV && showCacheStats && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6">
              <h3 className="text-white font-semibold mb-3">Cache Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Total Cache:</span>
                  <span className="text-green-400 ml-2 font-bold">{stats.totalSize}</span>
                </div>
                <div>
                  <span className="text-gray-400">Games:</span>
                  <span className="text-blue-400 ml-2 font-bold">{stats.gamesCache}</span>
                </div>
                <div>
                  <span className="text-gray-400">Searches:</span>
                  <span className="text-purple-400 ml-2 font-bold">{stats.searchCache}</span>
                </div>
                <div>
                  <span className="text-gray-400">IGDB Cache:</span>
                  <span className="text-orange-400 ml-2 font-bold">{stats.igdbCache}</span>
                </div>
              </div>
            </div>
          )}

          {/* Search Description */}
          <p className="text-gray-400 text-lg">
            Search through thousands of games with intelligent caching for lightning-fast results
          </p>
        </div>

        {/* Main Search Component */}
        <div className="mb-8">
          <GameSearch
            onGameSelect={handleGameSelect}
            onSearch={handleSearch}
            placeholder="Search for games..."
            showViewToggle={!isMobile}
            initialViewMode="grid"
            maxResults={20}
            showHealthCheck={import.meta.env.DEV}
            initialSearchTerm={initialSearchTerm}
            enableCaching={true}
          />
        </div>

        {/* Content Sections */}
        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Popular Games Section */}
            {!initialSearchTerm && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                  <h2 className="text-2xl font-bold text-white">Trending Games</h2>
                  {loadingPopular && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                  )}
                </div>
                
                {loadingPopular ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-4 animate-pulse">
                        <div className="w-full h-48 bg-gray-700 rounded mb-3"></div>
                        <div className="h-4 bg-gray-700 rounded mb-2"></div>
                        <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {popularGames.map((game) => (
                      <button
                        key={game.id}
                        onClick={() => handlePopularGameClick(game)}
                        className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors text-left group"
                      >
                        <img
                          src={game.cover?.url || game.coverImage || '/placeholder-game.jpg'}
                          alt={game.name || game.title}
                          className="w-full h-48 object-cover rounded mb-3 group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-game.jpg';
                          }}
                        />
                        <h3 className="text-white font-semibold mb-1 group-hover:text-purple-400 transition-colors">
                          {game.name || game.title}
                        </h3>
                        {game.rating && (
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="text-gray-400 text-sm">
                              {typeof game.rating === 'number' ? (game.rating / 10).toFixed(1) : game.rating}
                            </span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {!loadingPopular && popularGames.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>Unable to load trending games. Please try again later.</p>
                    <button
                      onClick={loadPopularGames}
                      className="mt-2 text-purple-400 hover:text-purple-300 text-sm"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Search Tips */}
            {!initialSearchTerm && (
              <section className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Search Tips</h3>
                <div className="space-y-2 text-gray-300">
                  <p>• Try searching by game title, genre, or developer</p>
                  <p>• Use filters to narrow down your results</p>
                  <p>• Browse popular games for inspiration</p>
                  <p>• Results are cached for faster subsequent searches</p>
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <h3 className="text-lg font-semibold text-white">Recent Searches</h3>
                  </div>
                  <button
                    onClick={clearRecentSearches}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(term)}
                      className="block w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Filters Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-white">Search Features</h3>
              </div>
              <div className="space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Intelligent caching</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Real-time search</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Advanced filtering</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>IGDB integration</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleRecentSearchClick('action')}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  Browse Action Games
                </button>
                <button
                  onClick={() => handleRecentSearchClick('rpg')}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  Explore RPGs
                </button>
                <button
                  onClick={() => handleRecentSearchClick('indie')}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  Discover Indie Games
                </button>
                <button
                  onClick={() => handleRecentSearchClick('2024')}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                >
                  New Releases 2024
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
