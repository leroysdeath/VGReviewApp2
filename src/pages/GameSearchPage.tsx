import React, { useState, useEffect } from 'react';
import { GameSearch } from '../components/GameSearch';
import { gameDataService } from '../services/gameDataService';
import type { GameWithCalculatedFields } from '../types/database';
import { useResponsive } from '../hooks/useResponsive';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, TrendingUp, Clock, Star, Filter } from 'lucide-react';

export const GameSearchPage: React.FC = () => {
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [popularGames, setPopularGames] = useState<GameWithCalculatedFields[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  
  // Get initial search term from URL params and maintain it in local state
  const initialSearchTerm = searchParams.get('q') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  useEffect(() => {
    // Load popular games when component mounts
    loadPopularGames();
    // Load recent searches from localStorage
    loadRecentSearches();
  }, []);
  
  // Sync searchTerm with URL params
  useEffect(() => {
    const urlSearchTerm = searchParams.get('q') || '';
    if (urlSearchTerm !== searchTerm) {
      setSearchTerm(urlSearchTerm);
    }
  }, [searchParams, searchTerm]);

  const loadPopularGames = async () => {
    setLoadingPopular(true);
    try {
      console.log('🔥 Loading popular games from Supabase...');
      const games = await gameDataService.getPopularGames(6);
      setPopularGames(games);
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

  // Handle direct search bar input changes
  const handleDirectSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Update URL as user types (debounced by GameSearch component)
    if (value.trim()) {
      setSearchParams({ q: value });
      saveRecentSearch(value.trim());
    } else {
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
            
          </div>


          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search games by name..."
              value={searchTerm}
              onChange={handleDirectSearchChange}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* Search Results Counter */}
          {searchTerm && (
            <div className="mb-4">
              <p className="text-gray-400 text-sm">
                Searching for "{searchTerm}"...
              </p>
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
            placeholder="Advanced search with filters..."
            showViewToggle={!isMobile}
            initialViewMode="grid"
            maxResults={20}
            showHealthCheck={import.meta.env.DEV}
            initialQuery={searchTerm}
            showExploreButton={true}
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
