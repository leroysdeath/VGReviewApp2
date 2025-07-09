import React from 'react';
import { Link } from 'react-router-dom';
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
  activeTab: string;
  allGames: Game[];
  sortedReviews: Review[];
  reviewFilter: string;
  onReviewFilterChange: (filter: string) => void;
}

export const ProfileData: React.FC<ProfileDataProps> = ({
  activeTab,
  allGames,
  sortedReviews,
  reviewFilter,
  onReviewFilterChange
}) => {
  // Top 5 Tab Content
  if (activeTab === 'top5') {
    // Get top 5 highest rated games
    const top5Games = [...allGames]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);

    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Top 5 Highest Rated Games</h2>
        <div className="flex gap-6 justify-center">
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
                {/* Rating at the bottom of cover art */}
                <div className="absolute bottom-2 left-2 right-2 bg-black/80 rounded px-2 py-1">
                  <div className="flex items-center justify-center">
                    <div className="bg-gray-500 px-2 py-1 rounded">
                      <span className="text-white text-sm font-bold">{game.rating.toFixed(1)}</span>
                    </div>
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
      </div>
    );
  }

  // Top 50 Tab Content
  if (activeTab === 'top50') {
    // Get top 50 highest rated games
    const top50Games = [...allGames]
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 50);

    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Top 50 Highest Rated Games</h2>
        <div className="grid grid-cols-10 gap-4">
          {top50Games.map((game, index) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group relative hover:scale-105 transition-transform"
            >
              <div className="relative">
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-full aspect-[3/4] object-cover rounded"
                />
                {/* Rating at the bottom of cover art */}
                <div className="absolute bottom-1 left-1 right-1 bg-black/80 rounded px-1 py-0.5">
                  <div className="flex items-center justify-center">
                    <div className="bg-gray-500 px-1 py-0.5 rounded">
                      <span className="text-white text-xs font-bold">{game.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
                {/* Rank number */}
                <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="mt-1">
                <h3 className="text-white text-xs font-medium group-hover:text-purple-400 transition-colors line-clamp-2">
                  {game.title}
                </h3>
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
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Reviews ({sortedReviews.length})</h2>
          <select
            value={reviewFilter}
            onChange={(e) => onReviewFilterChange(e.target.value)}
            className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
          >
            <option value="recent">Most Recent</option>
            <option value="highest">Highest Rated</option>
            <option value="lowest">Lowest Rated</option>
            <option value="oldest">Oldest</option>
          </select>
        </div>
        <div className="space-y-6">
          {sortedReviews.map((review) => {
            const game = allGames.find(g => g.id === review.gameId);
            return (
              <div key={review.id} className="flex gap-4 p-6 bg-gray-800 rounded-lg">
                <Link to={`/game/${game?.id}`} className="flex-shrink-0">
                  <img
                    src={game?.coverImage}
                    alt={game?.title}
                    className="w-20 h-28 object-cover rounded"
                  />
                </Link>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Link
                      to={`/game/${game?.id}`}
                      className="text-lg font-semibold text-white hover:text-green-400 transition-colors"
                    >
                      {game?.title}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <StarRating rating={review.rating} />
                    <span className="text-sm text-gray-400">{review.date}</span>
                  </div>
                  <p className="text-gray-300 leading-relaxed">{review.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default content for unknown tabs
  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-white mb-4">Coming Soon</h2>
      <p className="text-gray-400">This feature is coming soon.</p>
    </div>
  );
};