import React from 'react';
import { Link } from 'react-router-dom';
import { StarRating } from './StarRating';
import { Calendar, ListMusic } from 'lucide-react';

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

interface Review {
  id: string;
  userId: string;
  gameId: string;
  rating: number;
  text: string;
  date: string;
  hasText: boolean;
  author: string;
  authorAvatar: string;
}

interface ProfileDataProps {
  activeTab: 'top5' | 'last5' | 'reviews' | 'activity' | 'lists';
  allGames: Game[];
  sortedReviews: Review[];
  reviewFilter: string;
  onReviewFilterChange: (filter: string) => void;
  isDummy?: boolean;
  stats?: {
    gamesReviewed?: number;
    totalGames?: number;
    averageRating?: number;
    [key: string]: any;
  };
}

export const ProfileData: React.FC<ProfileDataProps> = ({
  activeTab,
  allGames,
  sortedReviews,
  reviewFilter,
  onReviewFilterChange,
  isDummy = false,
  stats = {}
}) => {
  // Top 5 Tab Content
  if (activeTab === 'top5') {
    // Get top 5 highest rated games
    const top5Games = [...allGames]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Top 5 Highest Rated Games
        </h2>
        
        {/* Desktop Version */}
        <div className="hidden md:flex gap-6 justify-center">
          {top5Games.map((game, index) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group relative flex-shrink-0 hover:scale-105 transition-transform"
            >
              <div className="relative">
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-48 h-64 object-cover rounded-lg"
                />
                {/* Rating at the bottom of cover art - full width */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-500 px-2 py-1">
                  <div className="text-center">
                    <span className="text-white text-sm font-bold">{game.rating.toFixed(1)}</span>
                  </div>
                </div>
                {/* Rank number */}
                <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors">
                  {game.title}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile Version */}
        <div className="md:hidden space-y-4">
          {top5Games.map((game, index) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-16 h-20 object-cover rounded"
                />
                {/* Rating overlay for mobile */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-500 px-1 py-0.5">
                  <div className="text-center">
                    <span className="text-white text-xs font-bold">{game.rating.toFixed(1)}</span>
                  </div>
                </div>
                {/* Rank number for mobile */}
                <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  {game.title}
                </h3>
                <p className="text-gray-400 text-sm">{game.genre}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Last 5 Tab Content
  if (activeTab === 'last5') {
    // Get last 5 games (assuming sorted by most recent)
    const last5Games = [...allGames]
      .slice(0, 5);

    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Last 5 Games Played
        </h2>
        
        {/* Mobile Version */}
        <div className="space-y-3">
          {last5Games.map((game, index) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-12 h-16 object-cover rounded"
                />
                {/* Rating overlay for mobile */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-500 px-1 py-0.5">
                  <div className="text-center">
                    <span className="text-white text-xs font-bold">{game.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <h3 className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors">
                    {game.title}
                  </h3>
                </div>
                <p className="text-gray-400 text-xs">{game.genre}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Reviews Tab Content
  if (activeTab === 'reviews') {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">          
          <h2 className="text-xl font-semibold text-white">
            {isDummy ? 'Dummy ' : ''}Reviews ({stats.gamesReviewed || sortedReviews.length})
          </h2>
          
          <select
            value={reviewFilter}
            onChange={(e) => onReviewFilterChange(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="text">With Comments</option>
          </select>
        </div>

        {sortedReviews.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <StarRating rating={0} maxRating={5} size="lg" readonly />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No reviews yet</h3>
            <p className="text-gray-400">
              {isDummy ? 'This dummy user hasn\'t reviewed any games yet.' : 'Start rating and reviewing games to see them here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedReviews.map((review) => {
              const game = allGames.find(g => g.id === review.gameId);
              if (!game) return null;

              return (
                <div key={review.id} className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
                  <div className="flex gap-4">
                    <Link to={`/game/${game.id}`} className="flex-shrink-0">
                      <img
                        src={game.coverImage}
                        alt={game.title}
                        className="w-16 h-20 object-cover rounded"
                      />
                    </Link>
                    
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <Link
                            to={`/game/${game.id}`}
                            className="text-white font-medium hover:text-purple-400 transition-colors"
                          >
                            {game.title}
                          </Link>
                          <p className="text-gray-400 text-sm">{game.genre}</p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <StarRating rating={review.rating} maxRating={10} size="sm" readonly />
                          <span className="text-white font-semibold">{review.rating}/10</span>
                        </div>
                      </div>
                      
                      {review.hasText && (
                        <p className="text-gray-300 text-sm mb-2 line-clamp-3">{review.text}</p>
                      )}
                      
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>{review.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Activity Tab Content
  if (activeTab === 'activity') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Recent Activity
        </h2>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Activity Feed Coming Soon</h3>
          <p className="text-gray-400">
            Track your gaming journey with activity feed updates. Check back soon!
          </p>
        </div>
      </div>
    );
  }
  
  // Lists Tab Content
  if (activeTab === 'lists') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Game Lists
        </h2>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ListMusic className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Lists Coming Soon</h3>
          <p className="text-gray-400">
            Create and share your favorite game lists. This feature is coming soon!
          </p>
        </div>
      </div>
    );
  }

  // Default content for unknown tabs
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-white mb-4">
        {isDummy ? 'Dummy ' : ''}Coming Soon
      </h2>
      <p className="text-gray-400">This feature is coming soon.</p>
    </div>
  );
};
