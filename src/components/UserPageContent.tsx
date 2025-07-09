import React from 'react';
import { Link } from 'react-router-dom';
import { Grid, List } from 'lucide-react';
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

interface UserPageContentProps {
  activeTab: string;
  userFavoriteGames: Game[];
  userRecentGames: Game[];
  sortedReviews: Review[];
  allGames: Game[];
  stats: {
    films: number;
    thisYear: number;
    lists: number;
    following: number;
    followers: number;
  };
  reviewFilter: string;
  onReviewFilterChange: (filter: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  isDummy?: boolean;
}

export const UserPageContent: React.FC<UserPageContentProps> = ({
  activeTab,
  userFavoriteGames,
  userRecentGames,
  sortedReviews,
  allGames,
  stats,
  reviewFilter,
  onReviewFilterChange,
  viewMode,
  onViewModeChange,
  isDummy = false
}) => {
  // Profile Tab Content
  if (activeTab === 'profile') {
    return (
      <div className="space-y-8">
        {/* Favorite Games Section */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">FAVORITE GAMES</h2>
          <div className="grid grid-cols-4 gap-4">
            {userFavoriteGames.map((game, index) => (
              <Link
                key={game.id}
                to={`/game/${game.id}`}
                className="group relative aspect-[3/4] rounded-lg overflow-hidden hover:scale-105 transition-transform"
              >
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-white font-semibold text-sm mb-1">{game.title}</div>
                    <StarRating rating={game.rating} size="sm" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">RECENT ACTIVITY</h2>
          <div className="grid grid-cols-8 gap-3">
            {userRecentGames.map((game) => (
              <Link
                key={game.id}
                to={`/game/${game.id}`}
                className="group relative aspect-[3/4] rounded overflow-hidden hover:scale-105 transition-transform"
              >
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-xs font-medium text-center px-1">
                    {game.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Reviews */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 uppercase tracking-wide">RECENT REVIEWS</h2>
          <div className="space-y-4">
            {sortedReviews.slice(0, 3).map((review) => {
              const game = allGames.find(g => g.id === review.gameId);
              return (
                <div key={review.id} className="flex gap-4 p-4 bg-gray-800 rounded-lg">
                  <Link to={`/game/${game?.id}`} className="flex-shrink-0">
                    <img
                      src={game?.coverImage}
                      alt={game?.title}
                      className="w-16 h-20 object-cover rounded"
                    />
                  </Link>
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <Link 
                        to={`/game/${game?.id}`}
                        className="font-semibold text-white hover:text-green-400 transition-colors"
                      >
                        {game?.title}
                      </Link>
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-sm text-gray-400">{review.date}</span>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">{review.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upgrade Prompt (like Letterboxd) - only show for dummy */}
        {isDummy && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20"></div>
            <div className="relative">
              <h3 className="text-xl font-bold text-white mb-2">NEED AN UPGRADE?</h3>
              <p className="text-gray-300 mb-4">
                Profile stats, filtering by favorite streaming services, watchlist alerts and no ads!
              </p>
              <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium transition-colors">
                GET PRO
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Games Tab Content
  if (activeTab === 'films') {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Games ({stats.films.toLocaleString()})</h2>
          <div className="flex items-center gap-4">
            <select
              value={reviewFilter}
              onChange={(e) => onReviewFilterChange(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-green-500"
            >
              <option value="recent">Recently Added</option>
              <option value="highest">Highest Rated</option>
              <option value="lowest">Lowest Rated</option>
              <option value="oldest">Oldest</option>
            </select>
            <div className="flex items-center gap-1 bg-gray-800 rounded p-1">
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => onViewModeChange('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-green-600 text-white' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3">
            {allGames.map((game) => (
              <Link
                key={game.id}
                to={`/game/${game.id}`}
                className="group relative aspect-[3/4] rounded overflow-hidden hover:scale-105 transition-transform"
              >
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-xs font-medium text-center px-1">
                    {game.title}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {allGames.map((game) => (
              <div key={game.id} className="flex items-center gap-4 p-3 bg-gray-800 rounded hover:bg-gray-750 transition-colors">
                <Link to={`/game/${game.id}`} className="flex-shrink-0">
                  <img
                    src={game.coverImage}
                    alt={game.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                </Link>
                <div className="flex-1">
                  <Link 
                    to={`/game/${game.id}`}
                    className="font-medium text-white hover:text-green-400 transition-colors"
                  >
                    {game.title}
                  </Link>
                  <div className="text-sm text-gray-400">{game.releaseDate}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={game.rating} size="sm" />
                  <span className="text-sm text-gray-400">{game.rating.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
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
                  <div className="flex items-center gap-4 mb-3">
                    <Link 
                      to={`/game/${game?.id}`}
                      className="text-lg font-semibold text-white hover:text-green-400 transition-colors"
                    >
                      {game?.title}
                    </Link>
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

  // Placeholder content for other tabs
  const tabTitles = {
    diary: 'Gaming Diary',
    watchlist: 'Wishlist',
    lists: 'Lists',
    likes: 'Likes',
    tags: 'Tags',
    network: 'Network',
    stats: 'Statistics'
  };

  const tabDescriptions = {
    diary: 'Track your daily gaming activity and progress.',
    watchlist: 'Games you want to play in the future.',
    lists: 'Custom collections and curated game lists.',
    likes: 'Reviews and content you\'ve liked.',
    tags: 'Organize games with custom tags.',
    network: 'Friends, followers, and gaming connections.',
    stats: 'Detailed analytics about your gaming habits.'
  };

  return (
    <div className="text-center py-12">
      <h2 className="text-xl font-semibold text-white mb-4">
        {tabTitles[activeTab as keyof typeof tabTitles] || 'Coming Soon'}
      </h2>
      <p className="text-gray-400">
        {tabDescriptions[activeTab as keyof typeof tabDescriptions] || 'This feature is coming soon.'}
      </p>
    </div>
  );
};