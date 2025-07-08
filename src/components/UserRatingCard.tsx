import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { StarRating } from './StarRating';
import { Rating, Game } from '../types/database';

interface UserRatingCardProps {
  rating: Rating;
  game?: Game;
  onEdit?: (rating: Rating) => void;
  onDelete?: (ratingId: number) => void;
  showGameInfo?: boolean;
}

export const UserRatingCard: React.FC<UserRatingCardProps> = ({
  rating,
  game,
  onEdit,
  onDelete,
  showGameInfo = true
}) => {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
      <div className="flex items-start gap-4">
        {showGameInfo && game && (
          <Link to={`/game/${game.id}`} className="flex-shrink-0">
            <img
              src={game.pic_url || '/placeholder-game.jpg'}
              alt={game.name}
              className="w-16 h-16 object-cover rounded"
            />
          </Link>
        )}
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-3">
            <div>
              {showGameInfo && game && (
                <Link 
                  to={`/game/${game.id}`}
                  className="text-lg font-semibold text-white hover:text-purple-400 transition-colors mb-1 block"
                >
                  {game.name}
                </Link>
              )}
              <div className="flex items-center gap-4 mb-2">
                <StarRating rating={rating.rating} />
                <span className="text-white font-medium">{rating.rating.toFixed(1)}</span>
                <div className="flex items-center gap-1 text-gray-400 text-sm">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(rating.post_date_time)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {rating.finished && (
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>Completed</span>
                </div>
              )}
              {!rating.finished && (
                <div className="flex items-center gap-1 text-blue-400 text-sm">
                  <Clock className="h-4 w-4" />
                  <span>In Progress</span>
                </div>
              )}
              
              {onEdit && (
                <button
                  onClick={() => onEdit(rating)}
                  className="p-2 text-gray-400 hover:text-white transition-colors"
                  title="Edit rating"
                >
                  <Edit className="h-4 w-4" />
                </button>
              )}
              
              {onDelete && (
                <button
                  onClick={() => onDelete(rating.id)}
                  className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete rating"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {rating.review && (
            <p className="text-gray-300 leading-relaxed">{rating.review}</p>
          )}
        </div>
      </div>
    </div>
  );
};