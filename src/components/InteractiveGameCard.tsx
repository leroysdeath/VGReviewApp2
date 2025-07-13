import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Calendar, Gamepad2 } from 'lucide-react';

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
  className = ''
}) => {
  const themeStyles = themeConfig[theme];

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

  return (
    <div className={`group relative ${className}`}>
      {/* Card Container */}
      <div className={`
        relative overflow-hidden rounded-2xl border-2 
        bg-gray-900/80 backdrop-blur-lg
        transition-all duration-500 ease-out
        hover:scale-105 hover:shadow-2xl
        ${themeStyles.border} ${themeStyles.hoverBorder} ${themeStyles.shadow}
      `}>
        {/* Background Gradient Overlay */}
        <div className={`
          absolute inset-0 opacity-0 group-hover:opacity-20 
          bg-gradient-to-br ${themeStyles.gradient}
          transition-opacity duration-500
        `} />

        {/* Game Image/Video Placeholder */}
        <div className="relative aspect-video overflow-hidden">
          {game.imageUrl ? (
            <img
              src={game.imageUrl}
              alt={game.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
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
              
              <Gamepad2 className="w-16 h-16 text-white/60 group-hover:text-white/80 transition-colors duration-300" />
              
              {/* Play overlay on hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
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
              <span className="text-white font-semibold text-sm">{game.rating.toFixed(1)}</span>
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
        </div>

        {/* Card Content */}
        <div className="relative p-6 space-y-4">
          {/* Title and Genre */}
          <div>
            <Link to={`/game/${game.id}`}>
              <h3 className={`
                text-xl font-bold text-white mb-2 line-clamp-2
                transition-colors duration-300 hover:${themeStyles.accent.replace('text-', 'text-')}
                group-hover:${themeStyles.accent.replace('text-', 'text-')}
              `}>
                {game.title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{game.genre}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(game.releaseDate).getFullYear()}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
            {game.description}
          </p>

          {/* Developer */}
          <div className="text-xs text-gray-500">
            by {game.developer}
          </div>

          {/* Rating and Reviews */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {renderStars(game.rating)}
              <span className="text-white font-semibold">{game.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400 text-sm">
              <MessageSquare className="w-4 h-4" />
              <span>{formatReviewCount(game.reviewCount)} reviews</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => onReviewClick?.(game.id)}
              className={`
                flex-1 px-4 py-3 rounded-xl font-semibold text-white
                transition-all duration-300 transform
                hover:scale-105 hover:shadow-lg
                ${themeStyles.button}
                flex items-center justify-center gap-2
              `}
            >
              <MessageSquare className="w-4 h-4" />
              Write Review
            </button>
            
            <Link
              to={`/game/${game.id}`}
              className="px-4 py-3 rounded-xl border-2 border-gray-600 text-gray-300 font-semibold
                       transition-all duration-300 transform hover:scale-105 hover:border-gray-400 hover:text-white
                       flex items-center justify-center"
            >
              View Details
            </Link>
          </div>
        </div>

        {/* Hover Glow Effect */}
        <div className={`
          absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100
          transition-opacity duration-500 pointer-events-none
          bg-gradient-to-r ${themeStyles.gradient} blur-xl -z-10
        `} />
      </div>
    </div>
  );
};