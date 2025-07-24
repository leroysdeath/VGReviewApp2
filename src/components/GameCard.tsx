import React, { useState } from 'react';
import { ResponsiveGameCard } from './ResponsiveGameCard';
import AuthModal from './auth/AuthModal';
import { enhancedIGDBService } from '../services/enhancedIGDBService';
import { useAuth } from '../hooks/useAuth';

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
  showQuickActions?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onClick,
  onGameSelect,
  enablePrefetch = true,
  cacheInfo = false,
  showQuickActions = false,
  ...props
}) => {
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

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

  // Handle auth-required actions
  const handleAuthRequiredAction = (action: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent card click
    
    if (!isAuthenticated) {
      setPendingAction(action);
      setShowAuthModal(true);
      return;
    }
    
    executeAction(action);
  };

  const executeAction = (action: string) => {
    switch (action) {
      case 'add_to_wishlist':
        console.log('Adding to wishlist:', game.name || game.title);
        // Implement wishlist logic here
        break;
      case 'quick_rate':
        console.log('Quick rating for:', game.name || game.title);
        // Implement quick rating logic here
        break;
      case 'add_to_favorites':
        console.log('Adding to favorites:', game.name || game.title);
        // Implement favorites logic here
        break;
    }
  };

  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    if (pendingAction) {
      executeAction(pendingAction);
      setPendingAction(null);
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

      {/* Quick Action Buttons (shown on hover) */}
      {showQuickActions && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-y-1">
          <button
            onClick={(e) => handleAuthRequiredAction('add_to_wishlist', e)}
            className="block w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg transition-colors"
            title={isAuthenticated ? "Add to Wishlist" : "Sign in to add to wishlist"}
          >
            +
          </button>
          <button
            onClick={(e) => handleAuthRequiredAction('quick_rate', e)}
            className="block w-8 h-8 bg-yellow-600 hover:bg-yellow-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg transition-colors"
            title={isAuthenticated ? "Quick Rate" : "Sign in to rate"}
          >
            ★
          </button>
          <button
            onClick={(e) => handleAuthRequiredAction('add_to_favorites', e)}
            className="block w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center text-xs shadow-lg transition-colors"
            title={isAuthenticated ? "Add to Favorites" : "Sign in to add to favorites"}
          >
            ♥
          </button>
        </div>
      )}

      {/* Cache Info Badge (Development/Debug) */}
      {cacheInfo && import.meta.env.DEV && (
        <div className="absolute top-2 left-2 px-2 py-1 bg-black bg-opacity-75 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
          Prefetch Ready
        </div>
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
