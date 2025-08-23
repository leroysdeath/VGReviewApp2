import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StarRating } from './StarRating';
import { Calendar, ListMusic, Star, Plus } from 'lucide-react';
import { supabase } from '../services/supabase';
import { imageOptimizer } from '../utils/imageOptimization';

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
  hasGameData?: boolean;
  dbId?: string;
}

interface TopGame {
  id: number;
  name: string;
  pic_url: string;
  genre: string;
  rating: number;
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
  activeTab: 'top5' | 'top10' | 'reviews' | 'activity';
  allGames: Game[]; // Keep for other tabs that still need it (temporary)
  sortedReviews: Review[];
  reviewFilter: string;
  onReviewFilterChange: (filter: string) => void;
  isDummy?: boolean;
  userId: string; // Required for direct fetching
  isOwnProfile?: boolean;
}

// Reusable GameCard component for consistent rating display
const GameCard: React.FC<{
  game: Game;
  index: number;
  isDesktop: boolean;
}> = ({ game, index, isDesktop }) => {
  const formatRating = (rating: number) => {
    return rating && typeof rating === 'number' && rating > 0 
      ? rating.toFixed(1) 
      : 'No Rating';
  };

  if (isDesktop) {
    return (
      <Link
        to={`/game/${game.id}`}
        className="group relative hover:scale-105 transition-transform"
      >
        <div className="relative">
          <img
            src={game.coverImage}
            alt={game.title}
            className="w-full h-64 object-cover rounded-lg"
            onError={(e) => {
              e.currentTarget.src = '/default-cover.png';
            }}
          />
          {/* Standardized rating display */}
          <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
            <div className="text-center">
              <span className="text-white text-sm font-bold">
                {formatRating(game.rating)}
              </span>
            </div>
          </div>
          {/* Rank number */}
          <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
            {index + 1}
          </div>
          {/* Data quality indicator */}
          {game.hasGameData === false && (
            <div className="absolute top-2 right-2 bg-yellow-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
              <span className="text-xs">!</span>
            </div>
          )}
        </div>
        <div className="mt-2">
          <h3 className="text-white font-medium text-center group-hover:text-purple-400 transition-colors">
            {game.title}
          </h3>
          <p className="text-gray-400 text-sm text-center">{game.genre}</p>
        </div>
      </Link>
    );
  }

  // Mobile version
  return (
    <Link
      to={`/game/${game.id}`}
      className="group flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
    >
      <div className="relative flex-shrink-0">
        <img
          src={game.coverImage}
          alt={game.title}
          className="w-16 h-20 object-cover rounded"
          onError={(e) => {
            e.currentTarget.src = '/default-cover.png';
          }}
        />
        {/* Standardized rating display */}
        <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-1 py-0.5">
          <div className="text-center">
            <span className="text-white text-xs font-bold">
              {formatRating(game.rating)}
            </span>
          </div>
        </div>
        {/* Rank number for mobile */}
        <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
          {index + 1}
        </div>
        {/* Data quality indicator */}
        {game.hasGameData === false && (
          <div className="absolute top-1 right-1 bg-yellow-600 text-white w-4 h-4 rounded-full flex items-center justify-center">
            <span className="text-xs">!</span>
          </div>
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
          {game.title}
        </h3>
        <p className="text-gray-400 text-sm">{game.genre}</p>
      </div>
    </Link>
  );
};

export const ProfileData: React.FC<ProfileDataProps> = ({
  activeTab,
  allGames,
  sortedReviews,
  reviewFilter,
  onReviewFilterChange,
  isDummy = false,
  userId,
  isOwnProfile = false
}) => {
  // State for directly fetched top games
  const [topGames, setTopGames] = useState<TopGame[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Direct data fetching for top5/top10 - optimized like modals
  const fetchTopGames = async (limit: number) => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rating')
        .select(`
          rating,
          game:game_id (
            id,
            name,
            pic_url,
            genre
          )
        `)
        .eq('user_id', parseInt(userId))
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const processedGames = (data || [])
        .filter(item => item.game)
        .map(item => ({
          id: item.game.id,
          name: item.game.name,
          pic_url: item.game.pic_url || '/default-cover.png',
          genre: item.game.genre || '',
          rating: item.rating
        }));

      setTopGames(processedGames);
    } catch (error) {
      console.error('Error fetching top games:', error);
      setTopGames([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'top5') {
      fetchTopGames(5);
    } else if (activeTab === 'top10') {
      fetchTopGames(10);
    }
  }, [activeTab, userId]);

  // Top 5 Tab Content - single implementation, no redundant component
  if (activeTab === 'top5') {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    if (topGames.length === 0) {
      return (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Rated Games Yet</h3>
          <p className="text-gray-400 mb-4">Rate some games to see your top 5 here.</p>
          {isOwnProfile && (
            <Link
              to="/search"
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Find Games to Rate
            </Link>
          )}
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Top 5 Games</h2>
        
        {/* Desktop Version - Optimized with image optimization */}
        <div className="hidden md:flex gap-6 justify-center">
          {topGames.map((game, index) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group relative flex-shrink-0 hover:scale-105 transition-transform"
            >
              <div className="relative">
                <img
                  src={imageOptimizer.optimizeImage(game.pic_url, { width: 400, height: 600, quality: 85 })}
                  alt={game.name}
                  className="w-48 h-64 object-cover rounded-lg"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = '/default-cover.png';
                  }}
                />
                {/* Rating at the bottom of cover art - full width */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
                  <div className="text-center">
                    <span className="text-white text-sm font-bold">
                      {game.rating && typeof game.rating === 'number' && game.rating > 0 
                        ? game.rating.toFixed(1) 
                        : '-'}
                    </span>
                  </div>
                </div>
                {/* Rank number */}
                <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="mt-2 text-center">
                <h3 className="text-white font-medium text-sm group-hover:text-purple-400 transition-colors">
                  {game.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile Version - Optimized with image optimization */}
        <div className="md:hidden space-y-4">
          {topGames.map((game, index) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={imageOptimizer.optimizeImage(game.pic_url, { width: 200, height: 300, quality: 85 })}
                  alt={game.name}
                  className="w-16 h-20 object-cover rounded"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = '/default-cover.png';
                  }}
                />
                {/* Rating overlay for mobile */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-1 py-0.5">
                  <div className="text-center">
                    <span className="text-white text-xs font-bold">
                      {game.rating && typeof game.rating === 'number' && game.rating > 0 
                        ? game.rating.toFixed(1) 
                        : '-'}
                    </span>
                  </div>
                </div>
                {/* Rank number for mobile */}
                <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  {game.name}
                </h3>
                <p className="text-gray-400 text-sm">{game.genre}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Top 10 Tab Content - Optimized with direct data fetching
  if (activeTab === 'top10') {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      );
    }

    if (topGames.length === 0) {
      return (
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">Top 10 Highest Ranked</h2>
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Star className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Rated Games Yet</h3>
            <p className="text-gray-400 mb-4">
              Rate some games to see your top 10 highest ranked games here.
            </p>
            {isOwnProfile && (
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Find Games to Rate
              </Link>
            )}
          </div>
        </div>
      );
    }

    // Show partial top list if less than 10 games
    if (topGames.length < 10) {
      return (
        <div>
          <h2 className="text-xl font-semibold text-white mb-6">
            Top {topGames.length} Highest Ranked
          </h2>
          
          {/* Desktop Version - Grid Layout */}
          <div className="hidden md:grid grid-cols-5 gap-4">
            {topGames.map((game, index) => (
              <Link
                key={game.id}
                to={`/game/${game.id}`}
                className="group relative hover:scale-105 transition-transform"
              >
                <div className="relative">
                  <img
                    src={imageOptimizer.optimizeImage(game.pic_url, { width: 300, height: 400, quality: 85 })}
                    alt={game.name}
                    className="w-full h-64 object-cover rounded-lg"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = '/default-cover.png';
                    }}
                  />
                  {/* Rating display */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
                    <div className="text-center">
                      <span className="text-white text-sm font-bold">
                        {game.rating && typeof game.rating === 'number' && game.rating > 0 
                          ? game.rating.toFixed(1) 
                          : 'No Rating'}
                      </span>
                    </div>
                  </div>
                  {/* Rank number */}
                  <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-white font-medium text-center group-hover:text-purple-400 transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-gray-400 text-sm text-center">{game.genre}</p>
                </div>
              </Link>
            ))}
            {/* Show empty slots for remaining spots */}
            {Array.from({ length: 10 - topGames.length }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="relative aspect-[3/4] bg-gray-700 border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center"
              >
                <div className="text-center">
                  <Star className="h-6 w-6 text-gray-500 mx-auto mb-2" />
                  <span className="text-gray-500 text-xs">
                    #{topGames.length + i + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Version - List format */}
          <div className="md:hidden space-y-3">
            {topGames.map((game, index) => (
              <Link
                key={game.id}
                to={`/game/${game.id}`}
                className="group flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={imageOptimizer.optimizeImage(game.pic_url, { width: 200, height: 300, quality: 85 })}
                    alt={game.name}
                    className="w-16 h-20 object-cover rounded"
                    loading="eager"
                    onError={(e) => {
                      e.currentTarget.src = '/default-cover.png';
                    }}
                  />
                  {/* Rating display for mobile */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-1 py-0.5">
                    <div className="text-center">
                      <span className="text-white text-xs font-bold">
                        {game.rating && typeof game.rating === 'number' && game.rating > 0 
                          ? game.rating.toFixed(1) 
                          : 'No Rating'}
                      </span>
                    </div>
                  </div>
                  {/* Rank number for mobile */}
                  <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
                    {game.name}
                  </h3>
                  <p className="text-gray-400 text-sm">{game.genre}</p>
                </div>
              </Link>
            ))}
          </div>

          {isOwnProfile && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm mb-4">
                Rate {10 - topGames.length} more game{10 - topGames.length !== 1 ? 's' : ''} to complete your top 10!
              </p>
              <Link
                to="/search"
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Find More Games
              </Link>
            </div>
          )}
        </div>
      );
    }

    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Top 10 Highest Ranked</h2>
        
        {/* Desktop Version - Grid Layout */}
        <div className="hidden md:grid grid-cols-5 gap-4">
          {topGames.map((game, index) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group relative hover:scale-105 transition-transform"
            >
              <div className="relative">
                <img
                  src={imageOptimizer.optimizeImage(game.pic_url, { width: 300, height: 400, quality: 85 })}
                  alt={game.name}
                  className="w-full h-64 object-cover rounded-lg"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = '/default-cover.png';
                  }}
                />
                {/* Rating display */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-2 py-1 rounded-b-lg">
                  <div className="text-center">
                    <span className="text-white text-sm font-bold">
                      {game.rating && typeof game.rating === 'number' && game.rating > 0 
                        ? game.rating.toFixed(1) 
                        : 'No Rating'}
                    </span>
                  </div>
                </div>
                {/* Rank number */}
                <div className="absolute top-2 left-2 bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="mt-2">
                <h3 className="text-white font-medium text-center group-hover:text-purple-400 transition-colors">
                  {game.name}
                </h3>
                <p className="text-gray-400 text-sm text-center">{game.genre}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile Version - List format */}
        <div className="md:hidden space-y-3">
          {topGames.map((game, index) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="group flex items-center gap-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={imageOptimizer.optimizeImage(game.pic_url, { width: 200, height: 300, quality: 85 })}
                  alt={game.name}
                  className="w-16 h-20 object-cover rounded"
                  loading="eager"
                  onError={(e) => {
                    e.currentTarget.src = '/default-cover.png';
                  }}
                />
                {/* Rating display for mobile */}
                <div className="absolute bottom-0 left-0 right-0 bg-gray-900 bg-opacity-75 px-1 py-0.5">
                  <div className="text-center">
                    <span className="text-white text-xs font-bold">
                      {game.rating && typeof game.rating === 'number' && game.rating > 0 
                        ? game.rating.toFixed(1) 
                        : 'No Rating'}
                    </span>
                  </div>
                </div>
                {/* Rank number for mobile */}
                <div className="absolute top-1 left-1 bg-purple-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-medium group-hover:text-purple-400 transition-colors">
                  {game.name}
                </h3>
                <p className="text-gray-400 text-sm">{game.genre}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Wishlist Tab Content (formerly Reviews)
  if (activeTab === 'reviews') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Playlist/Wishlist
        </h2>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ListMusic className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Wishlist Coming Soon</h3>
          <p className="text-gray-400">
            This feature is under development. Check back soon!
          </p>
        </div>
      </div>
    );
  }
  
  // Activity Tab Content
  if (activeTab === 'activity') {
    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">
          {isDummy ? 'Dummy ' : ''}Activity Feed
        </h2>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Activity Coming Soon</h3>
          <p className="text-gray-400">
            This feature is currently under development. Check back soon!
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
