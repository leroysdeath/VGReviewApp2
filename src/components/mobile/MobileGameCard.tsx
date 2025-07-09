import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

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

interface MobileGameCardProps {
  game: Game;
}

export const MobileGameCard: React.FC<MobileGameCardProps> = ({ game }) => {
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
      <div className="p-3">
        <h3 className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors mb-1 line-clamp-2">
          {game.title}
        </h3>
        <p className="text-gray-400 text-xs mb-2">{game.genre}</p>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-gray-400 text-xs">{game.releaseDate}</span>
        </div>
      </div>
    </Link>
  );
};