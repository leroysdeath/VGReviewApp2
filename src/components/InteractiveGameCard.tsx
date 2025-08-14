import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Calendar, Gamepad2, Database, Loader2 } from 'lucide-react';
import { igdbService } from '../services/igdbApi';
import { browserCache } from '../services/browserCacheService';

// TypeScript interface for game data structure
export interface GameData {
  id: string;
  title: string;
  description: string;
  genre: string;
  rating: number;
  reviewCount: number;
  releaseDate: string;
  imageUrl?: string;
  developer: string;
  platforms: string[];
}

// Color theme types
export type CardTheme = 'purple' | 'green' | 'orange' | 'blue' | 'red';

interface InteractiveGameCardProps {
  game: GameData;
  theme?: CardTheme;
  onReviewClick?: (gameId: string) => void;
  className?: string;
  enablePrefetch?: boolean;
  showCacheStatus?: boolean;
  cacheInfo?: boolean;
}

// Theme configurations
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
  }
};

export const InteractiveGameCard: React.FC<InteractiveGameCardProps> = ({
  game,
  theme = 'purple',
  onReviewClick,
  className = '',
  enablePrefetch = true,
  showCacheStatus = false,
  cacheInfo = false
}) => {
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<'cached' | 'prefetched' | 'none'>('none');
  const [prefetchError, setPrefetchError] = useState<string | null>(null);
  const themeStyles = themeConfig[theme];

  // Check cache status on mount
  useEffect(() => {
    if (showCacheStatus || cacheInfo) {
      const cacheKey = `game:${game.id}`;
      const cached = browserCache.get(cacheKey);
      setCacheStatus(cached ? 'cached' : 'none');
    }
  }, [game.id, showCacheStatus, cacheInfo]);

  // Enhanced prefetch on hover
  const handleMouseEnter = async () => {
    if (enablePrefetch && game.id) {
      try {
        setIsPrefetching(true);
        setPrefetchError(null);
        
        const gameId = typeof game.id === 'string' ? parseInt(game.id) : game.id;
        if (!isNaN(gameId)) {
          await 
          setCacheStatus('prefetched');
          
          if (import.meta.env.DEV) {
            console.log(`🚀 Prefetched game data for: ${game.title}`);
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

  // Prefetch on focus for accessibility
  const handleFocus = () => {
    handleMouseEnter();
  };

  const formatReviewCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating / 2);
    const hasHalfStar = (rating % 2) >= 1;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-1">
        {/* Full stars */}
        {Array.from({ length: fullStars }).map((_, i) => (
          <Star key={`full-${i}`} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        ))}
        {/* Half star */}
        {hasHalfStar && (
          <div className="relative">
            <Star className="w-4 h-4 text-gray-600" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            </div>
          </div>
        )}
        {/* Empty stars */}
        {Array.from({ length: emptyStars }).map((_, i) => (
          <Star key={`empty-${i}`} className="w-4 h-4 text-gray-600" />
        ))}
      </div>
    );
  };

  const getCacheStatusColor = () => {
    switch (cacheStatus) {
      case 'cached': return 'text-green-400';
      case 'prefetched': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getCacheStatusText = () => {
    switch (cacheStatus) {
      case 'cached': return 'Cached';
      case 'prefetched': return 'Prefetched';
      default: return 'Not cached';
    }
  };

  return (
    <div className={`group relative ${className}`}>
      {/* Card Container */}
      <div 
        className={`
          relative overflow-hidden rounded-2xl border-2 
          bg-gray-900/80 backdrop-blur-lg
          transition-all duration-500 ease-out
          hover:scale-105 hover:shadow-2xl focus-within:scale-105 focus-within:shadow-2xl
          ${themeStyles.border} ${themeStyles.hoverBorder} ${themeStyles.shadow}
        `}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
      >
        {/* Background Gradient Overlay */}
        <div className={`
          absolute inset-0 opacity-0 group-hover:opacity-20 group-focus-within:opacity-20
          bg-gradient-to-br ${themeStyles.gradient}
          transition-opacity duration-500
        `} />

        {/* Game Image/Video Placeholder */}
        <div className="relative aspect-video overflow-hidden">
          {game.imageUrl ? (
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-focus-within:scale-110"
              loading="lazy"
            />
          ) : (
            <div className={`
              w-full h-full bg-gradient-to-br ${themeStyles.gradient}
              flex items-center justify-center relative overflow-hidden
            `}>
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white/30 rounded rotate-45 animate-spin-slow" />
                <div className="absolute top-8 right-8 w-6 h-6 border-2 border-white/20 rounded-full animate-bounce" />
                <div className="absolute bottom-6 left-8 w-4 h-4 bg-white/20 rounded animate-pulse" />
              </div>
              
              <Gamepad2 className="w-16 h-16 text-white/60 group-hover:text-white/80 group-focus-within:text-white/80 transition-colors duration-300" />
              
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <div className="w-0 h-0 border-l-8 border-l-white border-y-6 border-y-transparent ml-1" />
                </div>
              </div>
            </div>
          )}

          {/* Rating Badge */}
          <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-1">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="text-white font-semibold text-sm">{(game.rating || 0).toFixed(1)}</span>
            </div>
          </div>

          {/* Platform badges */}
          <div className="absolute bottom-4 left-4 flex gap-2">
            {game.platforms.slice(0, 2).map((platform, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-xs font-medium"
              >
                {platform}
              </span>
            ))}
            {game.platforms.length > 2 && (
              <span className="px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-white text-xs font-medium">
                +{game.platforms.length - 2}
              </span>
            )}
          </div>

          {/* Cache Status Badge */}
          {(showCacheStatus || (cacheInfo && import.meta.env.DEV)) && (
            <div className="absolute top-4 left-4">
              <div className="flex items-center gap-1 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-xs">
                {isPrefetching ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    <span className="text-blue-400">Prefetching...</span>
                  </>
                ) : (
                  <>
                    <Database className={`w-3 h-3 ${getCacheStatusColor()}`} />
                    <span className={getCacheStatusColor()}>{getCacheStatusText()}</span>
                  </>
                )}
              </div>
              {prefetchError && (
                <div className="mt-1 px-2 py-1 bg-red-900/70 backdrop-blur-sm rounded text-xs text-red-400">
                  {prefetchError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card Content */}
        <div className="relative p-6 space-y-4">
          {/* Title and Genre */}
          <div>
            <Link 
              to={`/game/${game.id}`}
              className="focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded"
            >
              <h3 className={`
                text-xl font-bold text-white mb-2 line-clamp-2
                transition-colors duration-300 hover:${themeStyles.accent.replace('text-', 'text-')}
              `}>
                {game.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span>{game.releaseDate}</span>
              <span className="text-gray-500">•</span>
              <span className={themeStyles.accent}>{game.genre}</span>
            </div>
            <p className="text-gray-300 text-sm line-clamp-2 leading-relaxed">
              {game.description}
            </p>
          </div>

          {/* Game Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {renderStars(game.rating)}
              <span className="text-white font-semibold">{(game.rating || 0).toFixed(1)}</span>
            </div>
            
            <div className="flex items-center gap-2 text-gray-400">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm">{formatReviewCount(game.reviewCount)}</span>
            </div>
          </div>

          {/* Developer and Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
            <div className="text-sm">
              <span className="text-gray-400">By:</span>
              <span className="ml-2 text-white font-medium">{game.developer}</span>
            </div>

            <div className="flex gap-2">
              {onReviewClick && (
                <button
                  onClick={() => onReviewClick(game.id)}
                  className={`
                    px-4 py-2 rounded-lg font-medium text-sm
                    transition-all duration-300 hover:scale-105
                    ${themeStyles.button} text-white
                  `}
                  aria-label={`Write review for ${game.title}`}
                >
                  Review
                </button>
              )}
              
              <Link
                to={`/game/${game.id}`}
                className={`
                  px-4 py-2 rounded-lg font-medium text-sm
                  transition-all duration-300 hover:scale-105
                  bg-gray-700 hover:bg-gray-600 text-white
                  focus:outline-none focus:ring-2 focus:ring-purple-500
                `}
                aria-label={`View details for ${game.title}`}
              >
                Details
              </Link>
            </div>
          </div>

          {/* Debug info in development */}
          {import.meta.env.DEV && cacheInfo && (
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-800">
              <div>Game ID: {game.id}</div>
              <div>Cache Status: {cacheStatus}</div>
              <div>Prefetch Enabled: {enablePrefetch ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
