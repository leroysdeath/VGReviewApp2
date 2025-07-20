import React from 'react';
import { ResponsiveGameCard } from './ResponsiveGameCard';
import { enhancedIGDBService } from '../services/enhancedIGDBService';

interface GameCardProps {
  game: {
    id: string | number;
    title?: string;
    name?: string;
    coverImage?: string;
    cover?: { url: string };
    rating?: number;
    releaseDate?: string;
    first_release_date?: number;
    genre?: string;
    genres?: Array<{ name: string }>;
    [key: string]: any;
  };
  onClick?: (game: any) => void;
  onGameSelect?: (game: any) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  enablePrefetch?: boolean;
  cacheInfo?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ 
  game, 
  onClick, 
  onGameSelect,
  enablePrefetch = true,
  cacheInfo = false,
  ...props 
}) => {
  
  // Prefetch game data on hover for faster navigation
  const handleMouseEnter = () => {
    if (enablePrefetch && game.id) {
      const gameId = typeof game.id === 'string' ? parseInt(game.id) : game.id;
      if (!isNaN(gameId)) {
        enhancedIGDBService.prefetchGame(gameId);
      }
    }
  };

  // Enhanced click handler with prefetching
  const handleClick = (clickedGame: any) => {
    // Ensure game data is prefetched before navigation
    if (enablePrefetch && game.id) {
      const gameId = typeof game.id === 'string' ? parseInt(game.id) : game.id;
      if (!isNaN(gameId)) {
        enhancedIGDBService.prefetchGame(gameId);
      }
    }

    // Call the appropriate click handler
    if (onClick) {
      onClick(clickedGame);
    } else if (onGameSelect) {
      onGameSelect(clickedGame);
    }
  };

  // Normalize game data for ResponsiveGameCard
  const normalizedGame = {
    ...game,
    title: game.title || game.name || 'Unknown Game',
    coverImage: game.coverImage || game.cover?.url || '/placeholder-game.jpg',
    rating: game.rating || 0,
    releaseDate: game.releaseDate || (
      game.first_release_date 
        ? new Date(game.first_release_date * 1000).toISOString().split('T')[0]
        : undefined
    ),
    genre: game.genre || (
      Array.isArray(game.genres) 
        ? game.genres.map(g => g.name || g).join(', ')
        : undefined
    )
  };

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      className="relative group"
    >
      <ResponsiveGameCard
        {...props}
        game={normalizedGame}
        onClick={handleClick}
      />
      
      {/* Cache Info Badge (Development/Debug) */}
      {cacheInfo && import.meta.env.DEV && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Prefetch Ready
        </div>
      )}
    </div>
  );
};

// Enhanced version with additional caching features
export const CachedGameCard: React.FC<GameCardProps & {
  showCacheStatus?: boolean;
  gameData?: any; // Pre-loaded game data from cache
}> = ({ 
  showCacheStatus = false, 
  gameData,
  ...props 
}) => {
  return (
    <div className="relative">
      <GameCard {...props} cacheInfo={showCacheStatus} />
      
      {/* Cache Status Indicator */}
      {showCacheStatus && gameData && (
        <div className="absolute top-2 right-2 flex gap-1">
          {gameData.cached && (
            <div className="w-2 h-2 bg-green-500 rounded-full" title="Cached" />
          )}
          {gameData.isStale && (
            <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Stale" />
          )}
        </div>
      )}
    </div>
  );
};

// Backward compatibility - re-export ResponsiveGameCard as default
export default GameCard;
