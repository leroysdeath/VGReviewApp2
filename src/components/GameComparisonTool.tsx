import React, { useState } from 'react';
import { Search, X, ArrowLeft, ArrowRight, BarChart2, Clock, Calendar, Star, Users, Gamepad } from 'lucide-react';
import { Game } from '../services/igdbApi';
import { useResponsive } from '../hooks/useResponsive';
import { LazyImage } from './LazyImage';

interface GameComparisonToolProps {
  onSearch: (query: string) => Promise<Game[]>;
  className?: string;
}

export const GameComparisonTool: React.FC<GameComparisonToolProps> = ({
  onSearch,
  className = '',
}) => {
  const [leftGame, setLeftGame] = useState<Game | null>(null);
  const [rightGame, setRightGame] = useState<Game | null>(null);
  const [leftSearchQuery, setLeftSearchQuery] = useState('');
  const [rightSearchQuery, setRightSearchQuery] = useState('');
  const [leftSearchResults, setLeftSearchResults] = useState<Game[]>([]);
  const [rightSearchResults, setRightSearchResults] = useState<Game[]>([]);
  const [leftSearching, setLeftSearching] = useState(false);
  const [rightSearching, setRightSearching] = useState(false);
  const [leftSearchOpen, setLeftSearchOpen] = useState(false);
  const [rightSearchOpen, setRightSearchOpen] = useState(false);
  const { isMobile } = useResponsive();

  const handleLeftSearch = async () => {
    if (!leftSearchQuery.trim()) return;
    
    setLeftSearching(true);
    try {
      const results = await onSearch(leftSearchQuery);
      setLeftSearchResults(results);
      setLeftSearchOpen(true);
    } catch (error) {
      console.error('Error searching games:', error);
    } finally {
      setLeftSearching(false);
    }
  };

  const handleRightSearch = async () => {
    if (!rightSearchQuery.trim()) return;
    
    setRightSearching(true);
    try {
      const results = await onSearch(rightSearchQuery);
      setRightSearchResults(results);
      setRightSearchOpen(true);
    } catch (error) {
      console.error('Error searching games:', error);
    } finally {
      setRightSearching(false);
    }
  };

  const selectLeftGame = (game: Game) => {
    setLeftGame(game);
    setLeftSearchOpen(false);
    setLeftSearchQuery('');
  };

  const selectRightGame = (game: Game) => {
    setRightGame(game);
    setRightSearchOpen(false);
    setRightSearchQuery('');
  };

  const clearLeftGame = () => {
    setLeftGame(null);
  };

  const clearRightGame = () => {
    setRightGame(null);
  };

  const swapGames = () => {
    const temp = leftGame;
    setLeftGame(rightGame);
    setRightGame(temp);
  };

  // Comparison metrics
  const getHigherRating = () => {
    if (!leftGame || !rightGame) return null;
    if (leftGame.rating > rightGame.rating) return 'left';
    if (rightGame.rating > leftGame.rating) return 'right';
    return 'equal';
  };

  const getNewerGame = () => {
    if (!leftGame || !rightGame) return null;
    const leftDate = new Date(leftGame.releaseDate);
    const rightDate = new Date(rightGame.releaseDate);
    if (leftDate > rightDate) return 'left';
    if (rightDate > leftDate) return 'right';
    return 'equal';
  };

  // Render game search results
  const renderSearchResults = (
    results: Game[],
    onSelect: (game: Game) => void,
    isOpen: boolean,
    onClose: () => void
  ) => {
    if (!isOpen) return null;
    
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between bg-gray-800 p-2 border-b border-gray-700">
          <span className="text-sm text-gray-400">{results.length} results</span>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white"
            aria-label="Close search results"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        {results.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-gray-400">No games found</p>
          </div>
        ) : (
          <div className="p-2">
            {results.map((game) => (
              <button
                key={game.id}
                onClick={() => onSelect(game)}
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

  // Render comparison row
  const renderComparisonRow = (
    label: string,
    leftValue: React.ReactNode,
    rightValue: React.ReactNode,
    icon: React.ReactNode,
    highlight?: 'left' | 'right' | 'equal' | null
  ) => {
    return (
      <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-center py-3 border-b border-gray-700">
        <div className={`text-right ${highlight === 'left' ? 'text-game-green font-medium' : 'text-white'}`}>
          {leftValue}
        </div>
        
        <div className="flex flex-col items-center px-2">
          <div className="p-2 bg-gray-700 rounded-full text-gray-400">
            {icon}
          </div>
          <span className="text-xs text-gray-500 mt-1">{label}</span>
        </div>
        
        <div className={`text-left ${highlight === 'right' ? 'text-game-green font-medium' : 'text-white'}`}>
          {rightValue}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-gray-800 rounded-xl p-4 md:p-6 ${className}`}>
      <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-game-purple" />
        Game Comparison Tool
      </h2>
      
      {/* Game selection area */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-4 mb-8">
        {/* Left game selection */}
        <div className="relative">
          {leftGame ? (
            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <div className="relative aspect-[3/4] md:aspect-video">
                <LazyImage
                  src={leftGame.coverImage}
                  alt={leftGame.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={clearLeftGame}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Clear left game"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-white mb-1">{leftGame.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{leftGame.rating.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{leftGame.releaseDate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center">
                <input
                  type="text"
                  value={leftSearchQuery}
                  onChange={(e) => setLeftSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLeftSearch()}
                  placeholder="Search for a game..."
                  className="w-full px-4 py-3 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple"
                />
                <button
                  onClick={handleLeftSearch}
                  disabled={leftSearching}
                  className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                  aria-label="Search"
                >
                  {leftSearching ? (
                    <div className="h-5 w-5 border-2 border-gray-400 border-t-game-purple rounded-full animate-spin"></div>
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {renderSearchResults(
                leftSearchResults,
                selectLeftGame,
                leftSearchOpen,
                () => setLeftSearchOpen(false)
              )}
            </div>
          )}
        </div>
        
        {/* Swap button (center) */}
        <div className="flex justify-center items-center">
          <button
            onClick={swapGames}
            disabled={!leftGame || !rightGame}
            className="p-3 bg-gray-700 rounded-full text-white hover:bg-game-purple disabled:opacity-50 disabled:hover:bg-gray-700 transition-colors"
            aria-label="Swap games"
          >
            <div className="flex items-center gap-1">
              <ArrowLeft className="h-4 w-4" />
              <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
        
        {/* Right game selection */}
        <div className="relative">
          {rightGame ? (
            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <div className="relative aspect-[3/4] md:aspect-video">
                <LazyImage
                  src={rightGame.coverImage}
                  alt={rightGame.title}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={clearRightGame}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  aria-label="Clear right game"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-white mb-1">{rightGame.title}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{rightGame.rating.toFixed(1)}</span>
                  </div>
                  <span>•</span>
                  <span>{rightGame.releaseDate}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div className="flex items-center">
                <input
                  type="text"
                  value={rightSearchQuery}
                  onChange={(e) => setRightSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleRightSearch()}
                  placeholder="Search for a game..."
                  className="w-full px-4 py-3 pr-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-game-purple"
                />
                <button
                  onClick={handleRightSearch}
                  disabled={rightSearching}
                  className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                  aria-label="Search"
                >
                  {rightSearching ? (
                    <div className="h-5 w-5 border-2 border-gray-400 border-t-game-purple rounded-full animate-spin"></div>
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </button>
              </div>
              
              {renderSearchResults(
                rightSearchResults,
                selectRightGame,
                rightSearchOpen,
                () => setRightSearchOpen(false)
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Comparison table */}
      {leftGame && rightGame ? (
        <div className="space-y-2">
          {renderComparisonRow(
            'Rating',
            <div className="flex items-center justify-end gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>{leftGame.rating.toFixed(1)}/10</span>
            </div>,
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span>{rightGame.rating.toFixed(1)}/10</span>
            </div>,
            <Star className="h-4 w-4" />,
            getHigherRating()
          )}
          
          {renderComparisonRow(
            'Release Date',
            leftGame.releaseDate,
            rightGame.releaseDate,
            <Calendar className="h-4 w-4" />,
            getNewerGame()
          )}
          
          {renderComparisonRow(
            'Genre',
            leftGame.genre,
            rightGame.genre,
            <Gamepad className="h-4 w-4" />,
            null
          )}
          
          {renderComparisonRow(
            'Developer',
            leftGame.developer,
            rightGame.developer,
            <Users className="h-4 w-4" />,
            null
          )}
          
          {renderComparisonRow(
            'Publisher',
            leftGame.publisher,
            rightGame.publisher,
            <Users className="h-4 w-4" />,
            null
          )}
          
          {/* Add more comparison metrics as needed */}
        </div>
      ) : (
        <div className="bg-gray-700 rounded-lg p-6 text-center">
          <p className="text-gray-400">
            {!leftGame && !rightGame
              ? 'Select two games to compare'
              : !leftGame
              ? 'Select a game for the left side'
              : 'Select a game for the right side'}
          </p>
        </div>
      )}
    </div>
  );
};