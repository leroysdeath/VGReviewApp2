import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, X, Star, Trash2 } from 'lucide-react';
import { Game } from '../services/igdbApi';
import { LazyImage } from './LazyImage';
import { useResponsive } from '../hooks/useResponsive';
import { format } from 'date-fns';

interface RecentlyViewedGamesProps {
  maxItems?: number;
  onClearHistory?: () => void;
  onGameSelect?: (game: Game) => void;
  className?: string;
}

export const RecentlyViewedGames: React.FC<RecentlyViewedGamesProps> = ({
  maxItems = 10,
  onClearHistory,
  onGameSelect,
  className = '',
}) => {
  const [recentGames, setRecentGames] = useState<(Game & { viewedAt: string })[]>([]);
  const { isMobile } = useResponsive();

  // Load recently viewed games from localStorage on mount
  useEffect(() => {
    const loadRecentGames = () => {
      try {
        const storedGames = localStorage.getItem('recentlyViewedGames');
        if (storedGames) {
          const parsedGames = JSON.parse(storedGames);
          setRecentGames(parsedGames.slice(0, maxItems));
        }
      } catch (error) {
        console.error('Error loading recently viewed games:', error);
      }
    };
    
    loadRecentGames();
    
    // Add event listener for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'recentlyViewedGames') {
        loadRecentGames();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [maxItems]);

  // Handle game selection
  const handleGameClick = (game: Game) => {
    if (onGameSelect) {
      onGameSelect(game);
    }
  };

  // Remove a game from history
  const removeFromHistory = (gameId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const updatedGames = recentGames.filter(game => game.id !== gameId);
      setRecentGames(updatedGames);
      
      localStorage.setItem('recentlyViewedGames', JSON.stringify(updatedGames));
      
      // Dispatch storage event for multi-tab support
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'recentlyViewedGames',
        newValue: JSON.stringify(updatedGames)
      }));
    } catch (error) {
      console.error('Error removing game from history:', error);
    }
  };

  // Clear all history
  const clearAllHistory = () => {
    try {
      setRecentGames([]);
      localStorage.removeItem('recentlyViewedGames');
      
      // Dispatch storage event for multi-tab support
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'recentlyViewedGames',
        newValue: null
      }));
      
      if (onClearHistory) {
        onClearHistory();
      }
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  // Format relative time (e.g., "2 hours ago")
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    
    return format(date, 'MMM d');
  };

  // Empty state
  if (recentGames.length === 0) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 text-center ${className}`}>
        <Clock className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No recently viewed games</h3>
        <p className="text-gray-400">
          Games you view will appear here for quick access
        </p>
      </div>
    );
  }

  // Mobile layout
  if (isMobile) {
    return (
      <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-game-purple" />
            Recently Viewed
          </h3>
          
          <button
            onClick={clearAllHistory}
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear</span>
          </button>
        </div>
        
        <div className="space-y-3">
          {recentGames.slice(0, 5).map((game) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              onClick={() => handleGameClick(game)}
              className="flex gap-3 p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors relative group"
            >
              <div className="w-12 h-16 bg-gray-600 rounded overflow-hidden flex-shrink-0">
                {game.coverImage && (
                  <LazyImage
                    src={game.coverImage}
                    alt={game.title}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-white line-clamp-1">{game.title}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{game.rating.toFixed(1)}</span>
                  </div>
                  <span>{game.genre}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatRelativeTime(game.viewedAt)}
                </div>
              </div>
              
              <button
                onClick={(e) => removeFromHistory(game.id, e)}
                className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label="Remove from history"
              >
                <X className="h-4 w-4" />
              </button>
            </Link>
          ))}
        </div>
        
        {recentGames.length > 5 && (
          <div className="mt-3 text-center">
            <Link
              to="/history"
              className="text-sm text-game-purple hover:text-game-purple/80 transition-colors"
            >
              View all {recentGames.length} games
            </Link>
          </div>
        )}
      </div>
    );
  }

  // Desktop layout
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-game-purple" />
          Recently Viewed Games
        </h3>
        
        <button
          onClick={clearAllHistory}
          className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Clear History</span>
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {recentGames.map((game) => (
          <Link
            key={game.id}
            to={`/game/${game.id}`}
            onClick={() => handleGameClick(game)}
            className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors group relative"
          >
            <div className="aspect-[3/4] overflow-hidden">
              <LazyImage
                src={game.coverImage}
                alt={game.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute top-2 right-2">
                <button
                  onClick={(e) => removeFromHistory(game.id, e)}
                  className="p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Remove from history"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <div className="text-xs text-gray-300 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{formatRelativeTime(game.viewedAt)}</span>
                </div>
              </div>
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
    </div>
  );
};

// Helper function to add a game to recently viewed history
export const addGameToRecentlyViewed = (game: Game) => {
  try {
    // Get existing history
    const storedGames = localStorage.getItem('recentlyViewedGames');
    let recentGames: (Game & { viewedAt: string })[] = [];
    
    if (storedGames) {
      recentGames = JSON.parse(storedGames);
    }
    
    // Remove the game if it already exists in history
    recentGames = recentGames.filter(g => g.id !== game.id);
    
    // Add the game to the beginning of the array with current timestamp
    recentGames.unshift({
      ...game,
      viewedAt: new Date().toISOString()
    });
    
    // Limit to 20 games
    recentGames = recentGames.slice(0, 20);
    
    // Save to localStorage
    localStorage.setItem('recentlyViewedGames', JSON.stringify(recentGames));
    
    // Dispatch storage event for multi-tab support
    window.dispatchEvent(new StorageEvent('storage', {
      key: 'recentlyViewedGames',
      newValue: JSON.stringify(recentGames)
    }));
  } catch (error) {
    console.error('Error adding game to recently viewed:', error);
  }
};