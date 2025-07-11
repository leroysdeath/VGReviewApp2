import React from 'react';
import { Link } from 'react-router-dom';
import { Star, MessageSquare, Calendar } from 'lucide-react';
import { GameData } from './GameCardInteractive';

interface GameCardHorizontalProps {
  game: GameData;
  className?: string;
}

export const GameCardHorizontal: React.FC<GameCardHorizontalProps> = ({ 
  game, 
  className = '' 
}) => {
  // Determine theme colors
  const getThemeColors = () => {
    switch (game.theme) {
      case 'green':
        return {
          gradient: 'from-green-500/20 to-emerald-700/20',
          text: 'text-green-400',
          button: 'bg-green-600 hover:bg-green-700'
        };
      case 'orange':
        return {
          gradient: 'from-orange-500/20 to-amber-700/20',
          text: 'text-orange-400',
          button: 'bg-orange-600 hover:bg-orange-700'
        };
      case 'blue':
        return {
          gradient: 'from-blue-500/20 to-indigo-700/20',
          text: 'text-blue-400',
          button: 'bg-blue-600 hover:bg-blue-700'
        };
      default: // purple
        return {
          gradient: 'from-purple-500/20 to-indigo-700/20',
          text: 'text-purple-400',
          button: 'bg-purple-600 hover:bg-purple-700'
        };
    }
  };

  const theme = getThemeColors();

  return (
    <div 
      className={`group relative bg-gray-800 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-500 transition-all duration-300 ${className}`}
    >
      <div className="md:flex">
        {/* Game cover image */}
        <div className="md:w-1/3 lg:w-1/4">
          <div className="aspect-video md:h-full relative overflow-hidden">
            <img 
              src={game.coverImage} 
              alt={game.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
            
            {/* Rating badge */}
            <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-medium">
              <Star className="h-3.5 w-3.5 text-yellow-400 fill-current" />
              <span>{game.rating.toFixed(1)}</span>
            </div>
            
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          </div>
        </div>
        
        {/* Game info */}
        <div className="p-5 md:flex-1">
          <Link to={`/game/${game.id}`}>
            <h3 className="text-xl font-bold text-white group-hover:text-game-purple transition-colors mb-2">
              {game.title}
            </h3>
          </Link>
          
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-400 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              <span>2023</span>
            </div>
            
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>
                {game.reviewCount >= 1000 
                  ? `${(game.reviewCount / 1000).toFixed(1)}k reviews` 
                  : `${game.reviewCount} reviews`}
              </span>
            </div>
            
            <span>{game.genre}</span>
          </div>
          
          <p className="text-gray-300 mb-5 line-clamp-2 md:line-clamp-3">{game.description}</p>
          
          <div className="flex flex-wrap gap-3">
            <Link 
              to={`/game/${game.id}`}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              View Details
            </Link>
            
            <Link 
              to={`/review/${game.id}`}
              className={`px-4 py-2 ${theme.button} text-white rounded-lg transition-colors`}
            >
              Write Review
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};