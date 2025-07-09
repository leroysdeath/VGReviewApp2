import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Star, TrendingUp, Users, Search, ArrowRight, Gamepad2 } from 'lucide-react';
import { MobileGameCard } from './MobileGameCard';
import { MobileReviewCard } from './MobileReviewCard';
import { mockReviews } from '../../data/mockData';
import { igdbService, Game } from '../../services/igdbApi';

export const MobileLandingPage: React.FC = () => {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const recentReviews = mockReviews.slice(0, 3);

  useEffect(() => {
    const loadFeaturedGames = async () => {
      try {
        const games = await igdbService.getPopularGames(4);
        setFeaturedGames(games);
      } catch (error) {
        console.error('Failed to load featured games:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedGames();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 px-4 py-12">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <Gamepad2 className="h-12 w-12 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">
            Discover Your Next
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 block">
              Gaming Adventure
            </span>
          </h1>
          <p className="text-gray-300 mb-8 leading-relaxed">
            Join the ultimate gaming community. Rate, review, and discover games through social gaming.
          </p>
          <div className="space-y-3">
            <Link
              to="/search"
              className="block w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <div className="flex items-center justify-center gap-2">
                <Search className="h-5 w-5" />
                Explore Games
              </div>
            </Link>
            <Link
              to="/users"
              className="block w-full px-6 py-3 bg-transparent border-2 border-purple-400 text-purple-400 rounded-lg hover:bg-purple-400 hover:text-white transition-colors font-medium"
            >
              <div className="flex items-center justify-center gap-2">
                Join Community
                <ArrowRight className="h-5 w-5" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-4 py-12 bg-gray-800">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-3">Why GameVault?</h2>
          <p className="text-gray-400">The social gaming platform built for enthusiasts</p>
        </div>
        <div className="space-y-6">
          <div className="text-center p-6 bg-gray-700 rounded-lg">
            <Star className="h-10 w-10 text-purple-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Precise Ratings</h3>
            <p className="text-gray-400 text-sm">Rate games on a 1-10 scale with half-point precision.</p>
          </div>
          <div className="text-center p-6 bg-gray-700 rounded-lg">
            <Users className="h-10 w-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Social Discovery</h3>
            <p className="text-gray-400 text-sm">Follow gamers with similar tastes and discover games.</p>
          </div>
          <div className="text-center p-6 bg-gray-700 rounded-lg">
            <TrendingUp className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Personal Stats</h3>
            <p className="text-gray-400 text-sm">Track your gaming journey with detailed statistics.</p>
          </div>
        </div>
      </div>

      {/* Featured Games Section */}
      <div className="px-4 py-12 bg-gray-900">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Featured Games</h2>
          <Link
            to="/search"
            className="text-purple-400 hover:text-purple-300 transition-colors text-sm flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-gray-700"></div>
                <div className="p-3">
                  <div className="h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {featuredGames.map((game) => (
              <MobileGameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>

      {/* Recent Reviews Section */}
      <div className="px-4 py-12 bg-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Recent Reviews</h2>
          <Link
            to="/users"
            className="text-purple-400 hover:text-purple-300 transition-colors text-sm flex items-center gap-1"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="space-y-4">
          {recentReviews.map((review) => (
            <MobileReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </div>
  );
};