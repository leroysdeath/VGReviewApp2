import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Star, Database, Zap, AlertCircle, MessageSquare, Gamepad2, Loader2, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { StarRating } from './StarRating';
import { useResponsive } from '../hooks/useResponsive';
import { browserCache } from '../services/browserCacheService';
import { getGameUrl } from '../utils/gameUrls';
// Removed IGDB service - using Supabase data directly

interface Game {
  id: string | number;
  igdb_id?: string | number; // IGDB ID for navigation
  slug?: string | null;
  title: string;
  name?: string; // Alternative title field from IGDB
  coverImage: string;
  cover?: { url: string }; // IGDB cover format
  releaseDate: string;
  release_date?: string; // Database date format
  genre: string;
  genres?: Array<{ name: string }>; // IGDB genres format
  rating: number;
  description?: string;
  summary?: string; // IGDB description field
  developer?: string;
  publisher?: string;
  platforms?: Array<{ name: string }>;
}

// Enhanced theme types from InteractiveGameCard
export type CardTheme = 'purple' | 'green' | 'orange' | 'blue' | 'red' | 'dark' | 'light';

// Theme configurations from InteractiveGameCard
const themeConfig = {
  purple: {
    gradient: 'from-purple-600 to-purple-800',
    border: 'border-purple-500/50',
    hoverBorder: 'hover:border-purple-400',
    button: 'bg-purple-600 hover:bg-purple-700',
    accent: 'text-purple-400',
    shadow: 'hover:shadow-purple-500/25'
  },
  green: {
    gradient: 'from-green-600 to-green-800',
    border: 'border-green-500/50',
    hoverBorder: 'hover:border-green-400',
    button: 'bg-green-600 hover:bg-green-700',
    accent: 'text-green-400',
    shadow: 'hover:shadow-green-500/25'
  },
  orange: {
    gradient: 'from-orange-600 to-orange-800',
    border: 'border-orange-500/50',
    hoverBorder: 'hover:border-orange-400',
    button: 'bg-orange-600 hover:bg-orange-700',
    accent: 'text-orange-400',
    shadow: 'hover:shadow-orange-500/25'
  },
  blue: {
    gradient: 'from-blue-600 to-blue-800',
    border: 'border-blue-500/50',
    hoverBorder: 'hover:border-blue-400',
    button: 'bg-blue-600 hover:bg-blue-700',
    accent: 'text-blue-400',
    shadow: 'hover:shadow-blue-500/25'
  },
  red: {
    gradient: 'from-red-600 to-red-800',
    border: 'border-red-500/50',
    hoverBorder: 'hover:border-red-400',
    button: 'bg-red-600 hover:bg-red-700',
    accent: 'text-red-400',
    shadow: 'hover:shadow-red-500/25'
  },
  dark: {
    gradient: 'from-gray-800 to-gray-900',
    border: 'border-gray-600/50',
    hoverBorder: 'hover:border-gray-500',
    button: 'bg-gray-700 hover:bg-gray-600',
    accent: 'text-gray-400',
    shadow: 'hover:shadow-gray-500/25'
  },
  light: {
    gradient: 'from-gray-100 to-gray-200',
    border: 'border-gray-300/50',
    hoverBorder: 'hover:border-gray-400',
    button: 'bg-gray-200 hover:bg-gray-300',
    accent: 'text-gray-600',
    shadow: 'hover:shadow-gray-500/25'
  }
};

interface ResponsiveGameCardProps {
  game: Game;
  listView?: boolean;
  onClick?: (game: Game) => void;
  enablePrefetch?: boolean;
  showCacheStatus?: boolean;
  cacheData?: {
    cached: boolean;
    isStale: boolean;
    timestamp?: Date;
  };
  className?: string;
  
  // Enhanced features from other components
  variant?: 'standard' | 'interactive' | 'user-rating' | 'compact';
  theme?: CardTheme;
  showQuickActions?: boolean;
  onReviewClick?: (gameId: string) => void;
  onWishlist?: () => void;
  onPlay?: () => void;
  animateOnHover?: boolean;
  
  // From UserRatingCard
  userRating?: number;
  completionStatus?: 'playing' | 'completed' | 'dropped' | 'planned';
  onEdit?: () => void;
  onDelete?: () => void;
}

const ResponsiveGameCardComponent: React.FC<ResponsiveGameCardProps> = ({ 
  game, 
  listView = false,
  onClick,
  enablePrefetch = true,
  showCacheStatus = false,
  cacheData,
  className = '',
  
  // Enhanced features
  variant = 'standard',
  theme = 'dark',
  showQuickActions = false,
  onReviewClick,
  onWishlist,
  onPlay,
  animateOnHover = false,
  
  // User rating features
  userRating,
  completionStatus,
  onEdit,
  onDelete
}) => {
  const { isMobile } = useResponsive();
  const [imageError, setImageError] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'cached' | 'prefetched' | 'none'>('none');
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  
  // Get theme styles
  const themeStyles = themeConfig[theme] || themeConfig.dark;

  // Normalize game data for display
  const displayGame = {
    ...game,
    title: game.title || game.name || 'Unknown Game',
    coverImage: game.coverImage || game.cover?.url || '/placeholder-game.jpg',
    releaseDate: game.releaseDate || (
      game.release_date 
        ? new Date(game.release_date).getFullYear().toString()
        : 'Unknown'
    ),
    genre: game.genre || (
      Array.isArray(game.genres) && game.genres.length > 0
        ? game.genres.slice(0, 2).map(g => g.name || g).join(', ')
        : 'Unknown'
    ),
    description: game.description || game.summary || ''
  };

  // Check cache status on mount (from InteractiveGameCard)
  useEffect(() => {
    if (showCacheStatus) {
      const cacheKey = `game:${game.id}`;
      const cached = browserCache.get(cacheKey);
      setCacheStatus(cached ? 'cached' : 'none');
    }
  }, [game.id, showCacheStatus]);

  // Enhanced prefetch on hover (from InteractiveGameCard)
  const handleMouseEnter = async () => {
    if (enablePrefetch && game.id) {
      try {
        setIsPrefetching(true);
        setPrefetchError(null);
        
        const gameId = typeof game.id === 'string' ? parseInt(game.id) : game.id;
        if (!isNaN(gameId)) {
          // Prefetching removed - data already loaded from Supabase
          setCacheStatus('prefetched');
          
          if (import.meta.env.DEV) {
            console.log(`🚀 Prefetched game data for: ${displayGame.title}`);
          }
        }
      } catch (error) {
        setPrefetchError('Prefetch failed');
        console.warn('Prefetch failed:', error);
      } finally {
        setIsPrefetching(false);
      }
    }
  };

  // Handle click events
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick(game);
    }
  };

  // Handle image loading errors
  const handleImageError = () => {
    setImageError(true);
  };

  // Format rating for display
  const displayRating = typeof displayGame.rating === 'number' 
    ? Math.max(0, Math.min(10, displayGame.rating)).toFixed(1)
    : '0.0';

  // Get rating color based on score
  const getRatingColor = (rating: number) => {
    if (rating >= 8) return 'text-green-400';
    if (rating >= 6) return 'text-yellow-400';
    if (rating >= 4) return 'text-orange-400';
    return 'text-red-400';
  };

  // Cache status indicator
  const CacheStatusIndicator = () => {
    if (!showCacheStatus || !cacheData) return null;

    return (
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {cacheData.cached && (
          <div 
            className="w-2 h-2 bg-green-500 rounded-full opacity-75"
            title={`Cached ${cacheData.timestamp ? new Date(cacheData.timestamp).toLocaleTimeString() : ''}`}
          />
        )}
        {cacheData.isStale && (
          <div 
            className="w-2 h-2 bg-yellow-500 rounded-full opacity-75"
            title="Data may be outdated"
          />
        )}
        {isPrefetching && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-75" title="Prefetching..." />
        )}
      </div>
    );
  };

  // Performance status indicator (dev only)
  const PerformanceIndicator = () => {
    if (!import.meta.env.DEV || !enablePrefetch) return null;

    return (
      <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="flex items-center gap-1 bg-black bg-opacity-75 px-2 py-1 rounded text-xs text-white">
          <Zap className="h-3 w-3" />
          <span>Prefetch</span>
        </div>
      </div>
    );
  };

  // Image component with error handling
  const GameImage = ({ className: imgClassName }: { className: string }) => (
    <div className={`relative ${imgClassName} bg-gray-700 flex items-center justify-center overflow-hidden`}>
      {!imageError ? (
        <img
          src={displayGame.coverImage}
          alt={displayGame.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-500 p-2">
          <AlertCircle className="h-6 w-6 mb-1" />
          <span className="text-xs text-center">No Image</span>
        </div>
      )}
      
      {/* Rating overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent px-2 py-1">
        <div className="text-center">
          <span className={`text-sm font-bold ${getRatingColor(Number(displayRating))}`}>
            {displayRating}
          </span>
        </div>
      </div>
    </div>
  );

  // List view layout
  if (listView || isMobile) {
    return (
      <div
        className={`group relative ${className}`}
        onMouseEnter={handleMouseEnter}
      >
        <Link
          to={getGameUrl(game)}
          onClick={handleClick}
          className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all duration-200 hover:shadow-lg"
        >
          <div className="relative flex-shrink-0">
            <GameImage className={`rounded ${isMobile ? 'w-16 h-20' : 'w-20 h-24'}`} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`font-semibold text-white group-hover:text-purple-400 transition-colors mb-1 line-clamp-1 ${isMobile ? 'text-sm' : 'text-lg'}`}>
              {displayGame.title}
            </h3>
            
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className={`text-gray-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                <span className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                  {displayGame.releaseDate}
                </span>
              </div>
              {!isMobile && (
                <StarRating rating={Number(displayRating)} size="sm" />
              )}
            </div>

            {/* Platform badges for larger screens */}
            {!isMobile && game.platforms && game.platforms.length > 0 && (
              <div className="flex gap-1 mt-2">
                {game.platforms.slice(0, 2).map((platform, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                  >
                    {platform.name || platform}
                  </span>
                ))}
                {game.platforms.length > 2 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                    +{game.platforms.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>
        
        <CacheStatusIndicator />
        <PerformanceIndicator />
      </div>
    );
  }

  // Quick Actions Component (from InteractiveGameCard)
  const QuickActions = () => {
    if (!showQuickActions) return null;
    
    return (
      <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {onWishlist && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onWishlist();
            }}
            className={`${themeStyles.button} text-white px-2 py-1 rounded text-xs font-medium transition-colors`}
          >
            + Wishlist
          </button>
        )}
        {onPlay && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlay();
            }}
            className={`${themeStyles.button} text-white px-2 py-1 rounded text-xs font-medium transition-colors`}
          >
            <Gamepad2 className="h-3 w-3" />
          </button>
        )}
        {onReviewClick && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReviewClick(String(game.id));
            }}
            className={`${themeStyles.button} text-white px-2 py-1 rounded text-xs font-medium transition-colors`}
          >
            <MessageSquare className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  // User Rating Info (from UserRatingCard)
  const UserRatingInfo = () => {
    if (variant !== 'user-rating' || !userRating) return null;
    
    return (
      <div className="absolute top-2 right-2 flex flex-col items-end gap-1 z-10">
        <div className="bg-black/80 backdrop-blur-sm rounded px-2 py-1">
          <StarRating rating={userRating} size="sm" readonly />
        </div>
        {completionStatus && (
          <div className={`text-xs px-2 py-1 rounded font-medium ${
            completionStatus === 'completed' ? 'bg-green-600/80 text-green-100' :
            completionStatus === 'playing' ? 'bg-blue-600/80 text-blue-100' :
            completionStatus === 'dropped' ? 'bg-red-600/80 text-red-100' :
            'bg-gray-600/80 text-gray-100'
          }`}>
            {completionStatus === 'completed' && <CheckCircle className="h-3 w-3 inline mr-1" />}
            {completionStatus === 'playing' && <Clock className="h-3 w-3 inline mr-1" />}
            {completionStatus.charAt(0).toUpperCase() + completionStatus.slice(1)}
          </div>
        )}
      </div>
    );
  };

  // Enhanced Cache Status (merged from both components)
  const EnhancedCacheStatus = () => {
    if (!showCacheStatus) return null;
    
    return (
      <div className="absolute bottom-2 right-2 flex gap-1 z-10">
        {cacheStatus === 'cached' && (
          <div className="w-2 h-2 bg-green-500 rounded-full opacity-75" title="Cached" />
        )}
        {cacheStatus === 'prefetched' && (
          <div className="w-2 h-2 bg-blue-500 rounded-full opacity-75" title="Prefetched" />
        )}
        {isPrefetching && (
          <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
        )}
        {prefetchError && (
          <AlertCircle className="h-3 w-3 text-red-400" title={prefetchError} />
        )}
        {cacheData?.cached && (
          <div className="w-2 h-2 bg-green-500 rounded-full opacity-75" title="Data Cached" />
        )}
        {cacheData?.isStale && (
          <div className="w-2 h-2 bg-yellow-500 rounded-full opacity-75" title="Cache Stale" />
        )}
      </div>
    );
  };

  // Get enhanced styling based on variant and theme
  const getCardStyles = () => {
    const baseStyles = "block bg-gray-800 rounded-lg overflow-hidden transition-all duration-200";
    const hoverStyles = animateOnHover ? "hover:scale-105 hover:shadow-lg" : "hover:shadow-md";
    const themeStyles = variant === 'interactive' ? 
      `bg-gradient-to-br ${themeConfig[theme].gradient} ${themeConfig[theme].border} ${themeConfig[theme].hoverBorder} ${themeConfig[theme].shadow}` :
      "hover:bg-gray-700";
    
    return `${baseStyles} ${hoverStyles} ${themeStyles}`;
  };

  // Grid view layout
  return (
    <div
      className={`group relative ${className}`}
      onMouseEnter={handleMouseEnter}
    >
      <QuickActions />
      <UserRatingInfo />
      <EnhancedCacheStatus />
      
      <Link
        to={`/game/${game.igdb_id || game.id}`}
        onClick={handleClick}
        className={getCardStyles()}
      >
        <div className="aspect-[3/4] overflow-hidden relative">
          <GameImage className="w-full h-full" />
        </div>
        
        <div className="p-4">
          <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-2">
            {displayGame.title}
          </h3>
          
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400 text-sm">
                {displayGame.releaseDate}
              </span>
            </div>
            <StarRating rating={Number(displayRating)} size="sm" />
          </div>

          {/* Platform badges */}
          {game.platforms && game.platforms.length > 0 && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {game.platforms.slice(0, 3).map((platform, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                >
                  {platform.name || platform}
                </span>
              ))}
              {game.platforms.length > 3 && (
                <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                  +{game.platforms.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>
      
      <CacheStatusIndicator />
      <PerformanceIndicator />
    </div>
  );
};

// Memoized version with smart comparison for performance
export const ResponsiveGameCard = React.memo(ResponsiveGameCardComponent, (prevProps, nextProps) => {
  // Re-render only if critical props change
  return (
    prevProps.game.id === nextProps.game.id &&
    prevProps.game.name === nextProps.game.name &&
    prevProps.game.cover?.url === nextProps.game.cover?.url &&
    prevProps.listView === nextProps.listView &&
    prevProps.variant === nextProps.variant &&
    prevProps.userRating === nextProps.userRating &&
    prevProps.completionStatus === nextProps.completionStatus &&
    prevProps.size === nextProps.size &&
    prevProps.className === nextProps.className &&
    prevProps.showCacheStatus === nextProps.showCacheStatus &&
    prevProps.showQuickActions === nextProps.showQuickActions &&
    // Compare function references (they should be stable with useCallback)
    prevProps.onClick === nextProps.onClick &&
    prevProps.onReviewClick === nextProps.onReviewClick
  );
});

// Compatibility exports for easier migration
export const GameCard = ResponsiveGameCard;
export const InteractiveGameCard = ResponsiveGameCard;
export const UserRatingCard = ResponsiveGameCard;

// Re-export types for compatibility
export type { ResponsiveGameCardProps as GameCardProps };
export type { ResponsiveGameCardProps as InteractiveGameCardProps };
export type { ResponsiveGameCardProps as UserRatingCardProps };
export type { Game as GameData };
