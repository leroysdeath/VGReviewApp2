import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import { StarRating } from './StarRating';
import { useResponsive } from '../hooks/useResponsive';

interface Game {
  id: string;
  title: string;
  coverImage: string;
  releaseDate: string;
  genre: string;
  rating: number;
  description: string;
  developer: string;
  publisher: string;
}

interface ResponsiveGameCardProps {
  game: Game;
  listView?: boolean;
}

export const ResponsiveGameCard: React.FC<ResponsiveGameCardProps> = ({ game, listView = false }) => {
  const { isMobile } = useResponsive();

  if (listView || isMobile) {
    return (
      <Link
        to={`/game/${game.id}`}
        className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
      >
        <div className="relative flex-shrink-0">
          <img
            src={game.coverImage}
            alt={game.title}
            className={`object-cover rounded ${isMobile ? 'w-16 h-20' : 'w-20 h-20'}`}
          />
          {/* Rating overlay for mobile */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-500 px-1 py-0.5">
            <div className="text-center">
              <span className="text-white text-xs font-bold">{game.rating.toFixed(1)}</span>
            </div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-white group-hover:text-purple-400 transition-colors mb-1 ${isMobile ? 'text-sm' : 'text-lg'}`}>
            {game.title}
          </h3>
          <p className={`text-gray-400 mb-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>{game.genre}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className={`text-gray-400 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
              <span className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>{game.releaseDate}</span>
            </div>
            {!isMobile && <StarRating rating={game.rating} />}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={`/game/${game.id}`}
      className="group bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors"
    >
      <div className="aspect-[3/4] overflow-hidden relative">
        <img
          src={game.coverImage}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Rating overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-500 px-2 py-1">
          <div className="text-center">
            <span className="text-white text-sm font-bold">{game.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors mb-2 line-clamp-2">
          {game.title}
        </h3>
        <p className="text-gray-400 text-sm mb-3">{game.genre}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-400 text-sm">{game.releaseDate}</span>
          </div>
          <StarRating rating={game.rating} />
        </div>
      </div>
    </Link>
  );
};