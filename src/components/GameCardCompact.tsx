import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { GameData } from './GameCardInteractive';

interface GameCardCompactProps {
  game: GameData;
  className?: string;
}

export const GameCardCompact: React.FC<GameCardCompactProps> = ({ 
  game, 
  className = '' 
}) => {
  // Format rating to one decimal place
  const formattedRating = game.rating.toFixed(1);

  return (
    <Link 
      to={`/game/${game.id}`}
      className={`group flex items-center gap-4 p-3 bg-gray-800/80 hover:bg-gray-700/80 backdrop-blur-sm rounded-lg transition-all duration-300 ${className}`}
    >
      {/* Game image */}
      <div className="w-16 h-20 flex-shrink-0 rounded overflow-hidden">
        <img 
          src={game.coverImage} 
          alt={game.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>
      
      {/* Game info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white group-hover:text-game-purple transition-colors line-clamp-1">
          {game.title}
        </h3>
        
        <p className="text-sm text-gray-400 mb-1">{game.genre}</p>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-400 fill-current" />
            <span className="text-white font-medium">{formattedRating}</span>
          </div>
          
          <span className="text-xs text-gray-500">
            {game.reviewCount >= 1000 
              ? `${(game.reviewCount / 1000).toFixed(1)}k reviews` 
              : `${game.reviewCount} reviews`}
          </span>
        </div>
      </div>
    </Link>
  );
};