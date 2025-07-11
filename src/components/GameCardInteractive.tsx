import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare } from 'lucide-react';

// TypeScript interface for game data
export interface GameData {
  id: string;
  title: string;
  coverImage: string;
  genre: string;
  description: string;
  rating: number;
  reviewCount: number;
  theme?: 'purple' | 'green' | 'orange' | 'blue';
}

interface GameCardInteractiveProps {
  game: GameData;
  className?: string;
}

export const GameCardInteractive: React.FC<GameCardInteractiveProps> = ({ 
  game, 
  className = '' 
}) => {
  // Determine theme colors
  const getThemeColors = () => {
    switch (game.theme) {
      case 'green':
        return {
          primary: 'from-green-500 to-emerald-700',
          hover: 'group-hover:border-green-400',
          button: 'bg-green-600 hover:bg-green-700',
          text: 'text-green-400'
        };
      case 'orange':
        return {
          primary: 'from-orange-500 to-amber-700',
          hover: 'group-hover:border-orange-400',
          button: 'bg-orange-600 hover:bg-orange-700',
          text: 'text-orange-400'
        };
      case 'blue':
        return {
          primary: 'from-blue-500 to-indigo-700',
          hover: 'group-hover:border-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700',
          text: 'text-blue-400'
        };
      default: // purple
        return {
          primary: 'from-purple-500 to-indigo-700',
          hover: 'group-hover:border-purple-400',
          button: 'bg-purple-600 hover:bg-purple-700',
          text: 'text-purple-400'
        };
    }
  };

  const theme = getThemeColors();

  // Format rating to one decimal place
  const formattedRating = game.rating.toFixed(1);
  
  // Format review count with k for thousands
  const formattedReviewCount = game.reviewCount >= 1000 
    ? `${(game.reviewCount / 1000).toFixed(1)}k` 
    : game.reviewCount.toString();

  return (
    <div 
      className={`group relative bg-gray-800 rounded-xl overflow-hidden border-2 border-gray-700 ${theme.hover} transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/30 ${className}`}
    >
      {/* Gradient overlay at the top */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.primary} z-10`}></div>
      
      {/* Game cover image */}
      <div className="aspect-video relative overflow-hidden">
        <img 
          src={game.coverImage} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Rating badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-medium">
          <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
          <span>{formattedRating}</span>
        </div>
        
        {/* Gradient overlay at the bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-900 to-transparent"></div>
      </div>
      
      {/* Card content */}
      <div className="p-4">
        <Link to={`/game/${game.id}`}>
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-1 group-hover:text-game-purple transition-colors">
            {game.title}
          </h3>
        </Link>
        
        <div className="text-sm text-gray-400 mb-3">{game.genre}</div>
        
        <p className="text-gray-300 text-sm mb-4 line-clamp-2">{game.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-sm text-gray-400">
            <MessageSquare className="h-4 w-4" />
            <span>{formattedReviewCount} reviews</span>
          </div>
          
          <Link 
            to={`/review/${game.id}`}
            className={`px-3 py-1.5 rounded-lg text-sm text-white font-medium ${theme.button} transition-colors`}
          >
            Write Review
          </Link>
        </div>
      </div>
      
      {/* Hover overlay with backdrop blur */}
      <div className="absolute inset-0 bg-gray-900/0 backdrop-blur-0 opacity-0 group-hover:bg-gray-900/10 group-hover:backdrop-blur-sm group-hover:opacity-100 transition-all duration-300 pointer-events-none"></div>
    </div>
  );
};