import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Star, Database, Zap, AlertCircle } from 'lucide-react';
import { StarRating } from './StarRating';
import { useResponsive } from '../hooks/useResponsive';
// Removed IGDB service - using Supabase data directly

interface Game {
  id: string | number;
  igdb_id?: string | number; // IGDB ID for navigation
  title: string;
  name?: string; // Alternative title field from IGDB
  coverImage: string;
  cover?: { url: string }; // IGDB cover format
  releaseDate: string;
  first_release_date?: number; // IGDB timestamp format
  genre: string;
  genres?: Array<{ name: string }>; // IGDB genres format
  rating: number;
  description?: string;
  summary?: string; // IGDB description field
  developer?: string;
  publisher?: string;
  platforms?: Array<{ name: string }>;
}

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
}

export const ResponsiveGameCard: React.FC<ResponsiveGameCardProps> = ({ 
  game, 
  listView = false,
  onClick,
  enablePrefetch = true,
  showCacheStatus = false,
  cacheData,
  className = ''
}) => {
  const { isMobile } = useResponsive();
  const [imageError, setImageError] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);

  // Normalize game data for display
  const displayGame = {
    ...game,
    title: game.title || game.name || 'Unknown Game',
    coverImage: game.coverImage || game.cover?.url || '/placeholder-game.jpg',
    releaseDate: game.releaseDate || (
      game.first_release_date 
        ? new Date(game.first_release_date * 1000).getFullYear().toString()
        : 'Unknown'
    ),
    genre: game.genre || (
      Array.isArray(game.genres) && game.genres.length > 0
        ? game.genres.slice(0, 2).map(g => g.name || g).join(', ')
        : 'Unknown'
    ),
    description: game.description || game.summary || ''
  };

  // Handle prefetching on hover
  const handleMouseEnter = async () => {
    if (enablePrefetch && !isPrefetching) {
      setIsPrefetching(true);
      try {
        const gameId = typeof game.id === 'string' ? parseInt(game.id) : game.id;
        if (!isNaN(gameId)) {
          // Prefetching removed - data already loaded from Supabase
        }
      } catch (error) {
        console.error('Prefetch error:', error);
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
          to={`/game/${game.igdb_id || game.id}`}
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

  // Grid view layout
  return (
    <div
      className={`group relative ${className}`}
      onMouseEnter={handleMouseEnter}
    >
      <Link
        to={`/game/${game.igdb_id || game.id}`}
        onClick={handleClick}
        className="block bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
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
