import React from 'react';
import { ResponsiveGameCard } from './ResponsiveGameCard';
// This is now a compatibility wrapper

interface GameCardProps {
  game: {
    id: string | number;
    title?: string;
    name?: string;
    coverImage?: string;
    cover?: { url: string };
    rating?: number;
    releaseDate?: string;
    release_date?: string;
    genre?: string;
    genres?: Array<{ name: string }>;
    [key: string]: unknown;
  };
  onClick?: (game: GameCardProps['game']) => void;
  onGameSelect?: (game: GameCardProps['game']) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  enablePrefetch?: boolean;
  cacheInfo?: boolean;
  showQuickActions?: boolean;
}

const GameCardComponent: React.FC<GameCardProps> = ({
  game,
  onClick,
  onGameSelect,
  enablePrefetch = true,
  cacheInfo = false,
  showQuickActions = false,
  ...props
}) => {
  // Simplified wrapper - delegate to ResponsiveGameCard
  const handleClick = (clickedGame: GameCardProps['game']) => {
    if (onClick) {
      onClick(clickedGame);
    } else if (onGameSelect) {
      onGameSelect(clickedGame);
    }
  };

  return (
    <ResponsiveGameCard
      {...props}
      game={game}
      onClick={handleClick}
      enablePrefetch={enablePrefetch}
      showCacheStatus={cacheInfo}
      showQuickActions={showQuickActions}
    />
  );
};

// Memoized for performance - uses default shallow comparison since it's mostly a wrapper
export const GameCard = React.memo(GameCardComponent);

// Enhanced version with additional caching features
export const CachedGameCard: React.FC<GameCardProps & {
  showCacheStatus?: boolean;
  gameData?: {
    cached?: boolean;
    isStale?: boolean;
    timestamp?: number;
  }; // Pre-loaded game data from cache
}> = ({
  showCacheStatus = false,
  gameData,
  ...props
}) => {
  return (
    <ResponsiveGameCard
      {...props}
      showCacheStatus={showCacheStatus}
      cacheData={gameData ? {
        cached: gameData.cached || false,
        isStale: gameData.isStale || false,
        timestamp: gameData.timestamp
      } : undefined}
    />
  );
};

// Backward compatibility - re-export ResponsiveGameCard as default
export default GameCard;
