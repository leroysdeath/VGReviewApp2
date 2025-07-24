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
      
      // Save search term if we have one
      const currentSearch = searchParams.get('q');
      if (currentSearch) {
        saveRecentSearch(currentSearch);
      }
      
      // Navigate to game page
      navigate(`/game/${game.id}`);
    }
  };

  const handleSearchChange = (term: string) => {
    if (term) {
      setSearchParams({ q: term });
    } else {
      setSearchParams({});
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Discover Amazing Games
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Search through thousands of games and find your next gaming adventure
          </p>
        </div>

        {/* Cache Stats (Dev Only) */}
        {import.meta.env.DEV && (
          <div className="mb-6">
            <button
              onClick={() => setShowCacheStats(!showCacheStats)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {showCacheStats ? 'Hide' : 'Show'} Cache Stats
            </button>
            
            {showCacheStats && (
              <div className="mt-2 p-3 bg-gray-800 rounded-lg text-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-purple-400 font-medium">{stats.hits}</div>
                    <div className="text-gray-400">Cache Hits</div>
                  </div>
                  <div>
                    <div className="text-blue-400 font-medium">{stats.misses}</div>
                    <div className="text-gray-400">Cache Misses</div>
                  </div>
                  <div>
                    <div className="text-green-400 font-medium">{stats.entries}</div>
                    <div className="text-gray-400">Cached Entries</div>
                  </div>
                  <div>
                    <div className="text-yellow-400 font-medium">
                      {stats.hits + stats.misses > 0 ? Math.round((stats.hits / (stats.hits + stats.misses)) * 100) : 0}%
                    </div>
                    <div className="text-gray-400">Hit Rate</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Main Search Component */}
        <div className="mb-12">
          <GameSearch
            onGameSelect={handleGameSelect}
            placeholder="Search for games..."
            showViewToggle={true}
            showHealthCheck={import.meta.env.DEV}
            showExploreButton={true}
            className="w-full"
          />
        </div>

        {/* Popular Games Section */}
        {popularGames.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-purple-400" />
              <h2 className="text-2xl font-bold text-white">Popular Games</h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {popularGames.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handleGameSelect(game)}
                  className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer group"
                >
                  {game.cover && (
                    <img
                      src={game.cover.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : '/placeholder-game.jpg'}
                      alt={game.name}
                      className="w-full aspect-[3/4] object-cover rounded-lg mb-3 group-hover:scale-105 transition-transform"
                    />
                  )}
                  <h3 className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors">
                    {game.name}
                  </h3>
                  {game.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-gray-400">
                        {Math.round(game.rating)}/100
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-white">Recent Searches</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => handleSearchChange(search)}
                  className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {search}
                </button>
              ))}
              <button
                onClick={() => {
                  setRecentSearches([]);
                  localStorage.removeItem('recent_searches');
                }}
                className="px-3 py-1 text-gray-500 hover:text-gray-400 text-sm transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        )}

        {/* Quick Categories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Action', icon: '⚔️', query: 'action' },
            { name: 'RPG', icon: '🎭', query: 'role-playing' },
            { name: 'Adventure', icon: '🗺️', query: 'adventure' },
            { name: 'Strategy', icon: '♟️', query: 'strategy' },
          ].map((category) => (
            <button
              key={category.name}
              onClick={() => handleSearchChange(category.query)}
              className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group text-left"
            >
              <div className="text-2xl mb-2">{category.icon}</div>
              <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
                {category.name}
              </h3>
              <p className="text-gray-400 text-sm">Explore {category.name.toLowerCase()} games</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
