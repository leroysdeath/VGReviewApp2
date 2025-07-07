import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Star } from 'lucide-react';
import { StarRating } from './StarRating';

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

interface GameCardProps {
  game: Game;
  listView?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ game, listView = false }) => {
  if (listView) {
    return (
      <Link
        to={`/game/${game.id}`}
        className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors group"
      >
        <img
          src={game.coverImage}
          alt={game.title}
          className="w-20 h-20 object-cover rounded"
        />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
            {game.title}
          </h3>
          <p className="text-gray-400 text-sm mb-2">{game.genre}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-gray-400 text-sm">{game.releaseDate}</span>
            </div>
            <StarRating rating={game.rating} />
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
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={game.coverImage}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors mb-2">
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