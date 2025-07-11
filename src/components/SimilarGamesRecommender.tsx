import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, X, Gamepad, Star, ArrowRight } from 'lucide-react';
import { Game } from '../services/igdbApi';
import { LazyImage } from './LazyImage';
import { useResponsive } from '../hooks/useResponsive';

interface SimilarGamesRecommenderProps {
  onSearch: (query: string) => Promise<Game[]>;
  onGetSimilarGames: (gameId: string) => Promise<Game[]>;
  className?: string;
}

export const SimilarGamesRecommender: React.FC<SimilarGamesRecommenderProps> = ({
  onSearch,
  onGetSimilarGames,
  className = '',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [similarGames, setSimilarGames] = useState<Game[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { isMobile } = useResponsive();

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const results = await onSearch(searchQuery);
      setSearchResults(results);
      setSearchOpen(true);
    } catch (error) {
      console.error('Error searching games:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Get similar games when a game is selected
  useEffect(() => {
    const fetchSimilarGames = async () => {
      if (!selectedGame) {
        setSimilarGames([]);
        return;
      }
      
      setIsLoading(true);
      try {
        const games = await onGetSimilarGames(selectedGame.id);
        setSimilarGames(games);
      } catch (error) {
        console.error('Error fetching similar games:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSimilarGames();
  }, [selectedGame, onGetSimilarGames]);

  // Select a game from search results
  const selectGame = (game: Game) => {
    setSelectedGame(game);
    setSearchOpen(false);
    setSearchQuery('');
  };

  // Clear selected game
  const clearSelectedGame = () => {
    setSelectedGame(null);
    setSimilarGames([]);
  };

  // Render search results
  const renderSearchResults = () => {
    if (!searchOpen) return null;
    
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between bg-gray-800 p-2 border-b border-gray-700">
          <span className="text-sm text-gray-400">{searchResults.length} results</span>
          <button
            onClick={() => setSearchOpen(false)}
            className="p-1 text-gray-400 hover:text-white"
            aria-label="Close search results"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {searchResults.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-gray-400">No games found</p>
          </div>
        ) : (
          <div className="p-2">
            {searchResults.map((game) => (
              <button
                key={game.id}
                onClick={() => selectGame(game)}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                <div className="w-10 h-14 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                  {game.coverImage && (
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div>
                  <h4 className="text-white font-medium line-clamp-1">{game.title}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>{game.releaseDate}</span>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <span>{game.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 md:p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <Gamepad className="h-5 w-5 text-game-purple" />
        Games Like...
      </h2>
      
      {/* Game selection */}
      <div className="mb-6">
        {selectedGame ? (
          <div className="bg-gray-700 rounded-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/3 lg:w-1/4">
                <div className="relative aspect-[3/4] md:h-full">
                  <LazyImage
                    src={selectedGame.coverImage}
                    alt={selectedGame.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={clearSelectedGame}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    aria-label="Clear selected game"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="p-4 md:flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">{selectedGame.title}</h3>
                
                <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span>{selectedGame.rating.toFixed(1)}</span>
                  </div>
                  <span>{selectedGame.releaseDate}</span>
                  <span>{selectedGame.genre}</span>
                </div>
                
                <p className="text-gray-300 text-sm line-clamp-3 mb-4">
                  {selectedGame.description}
                </p>
                
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={`/game/${selectedGame.id}`}
                    className="px-4 py-2 bg-game-purple text-white rounded-lg hover:bg-game-purple/90 transition-colors"
                  >
                    View Details
                  </Link>
                  
                  <button
                    onClick={clearSelectedGame}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                  >
                    Change Game
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Enter a game you like..."
                className="w-full px-4 py-3 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                aria-label="Search"
              >
                {isSearching ? (
                  <div className="h-5 w-5 border-2 border-gray-400 border-t-game-purple rounded-full animate-spin"></div>
                ) : (
                  <Search className="h-5 w-5" />
                )}
              </button>
            </div>
            
            {renderSearchResults()}
          </div>
        )}
      </div>
      
      {/* Similar games results */}
      {selectedGame && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">
              Games similar to <span className="text-game-purple">{selectedGame.title}</span>
            </h3>
            
            <Link
              to={`/games/similar/${selectedGame.id}`}
              className="text-sm text-game-purple hover:text-game-purple/80 transition-colors flex items-center gap-1"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg overflow-hidden animate-pulse">
                  <div className="aspect-[3/4] bg-gray-600"></div>
                  <div className="p-3">
                    <div className="h-4 bg-gray-600 rounded mb-2"></div>
                    <div className="h-3 bg-gray-600 rounded w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : similarGames.length === 0 ? (
            <div className="bg-gray-700 rounded-lg p-6 text-center">
              <Gamepad className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-white mb-2">No similar games found</h4>
              <p className="text-gray-400">
                Try selecting a different game or check back later
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similarGames.slice(0, isMobile ? 4 : 8).map((game) => (
                <Link
                  key={game.id}
                  to={`/game/${game.id}`}
                  className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors group"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    <LazyImage
                      src={game.coverImage}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  
                  <div className="p-3">
                    <h4 className="font-medium text-white group-hover:text-game-purple transition-colors line-clamp-1">
                      {game.title}
                    </h4>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-400 fill-current" />
                        <span>{game.rating.toFixed(1)}</span>
                      </div>
                      <span>{game.genre}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};